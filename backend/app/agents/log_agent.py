"""
log_agent.py

Takes raw container logs (+ exit info) and asks a locally-hosted LLM
(via Ollama) to diagnose the root cause and suggest a fix. This is the
"reason" layer of the system — it does not touch Docker directly and does
not decide whether to act; it only produces a structured diagnosis that
the Orchestrator (Day 6) will use to decide what happens next.
"""

import json
import re
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1:8b"

# Risk levels the Orchestrator will later use to decide auto-execute vs
# require-approval. Keeping this vocabulary fixed and small makes the
# LLM's output more consistent and easier to parse reliably.
VALID_RISK_LEVELS = {"low", "medium", "high"}


SYSTEM_PROMPT = """You are an expert DevOps engineer diagnosing a failed Docker container.
You will be given the container's recent logs and metadata (exit code, OOM status).
 
Respond with ONLY a JSON object, no other text, no markdown formatting, no code fences.
The JSON must have exactly these fields:
 
{
  "root_cause": "one clear sentence describing what actually went wrong",
  "suggested_fix": "one specific, actionable command or step to fix it",
  "confidence": "a number from 0 to 100 representing how sure you are",
  "risk_level": "low, medium, or high - how risky is the EXACT suggested_fix above to auto-execute without human approval"
}
 
Rules:
- Base your diagnosis only on the evidence given. Do not invent details not present in the logs.
- If the logs contain a specific error message or line number, quote or reference it directly in root_cause instead of describing the error category generically.
- If OOMKilled is true, that is a very strong signal the cause is memory exhaustion, even if logs don't explicitly say so.
- If daemon_error is non-empty, that is a very strong signal of a daemon-level failure (e.g. port conflict, volume mount error) that occurred before the container process started. Treat it with the same high confidence as OOMKilled=true. Quote the daemon_error string directly in root_cause.
- Only use confidence above 90 when the logs contain explicit, unambiguous evidence (e.g. an exact error message or OOMKilled=true or a non-empty daemon_error). Use 50-80 when you are inferring from partial evidence, and below 50 when genuinely uncertain.
- risk_level must be based on the exact action described in suggested_fix, not on the general type of incident. Use these fixed categories, in this priority order:
  - "low": the fix is only a restart, with no other change (e.g. "restart the container").
  - "medium": the fix changes one specific thing before restarting (e.g. set one environment variable, edit one config line, adjust one resource limit).
  - "high": the fix requires rebuilding an image, changing multiple settings, or the exact change needed is unclear/requires investigation.
  Re-read your own suggested_fix and match it to exactly one category above - do not treat "edit a config file" as automatically high risk if it's a single, well-defined change; that is medium.
- Do NOT invent a container name. Never write a placeholder name like "my_container" or "<container_name>" in suggested_fix - describe the action generically instead (e.g. "restart the container" not "docker restart my_container").
- If the logs are empty, contain no error messages, and exit_info gives no clear signal (oom_killed is false, exit_code is 0 or missing), do NOT invent a plausible-sounding cause. Instead respond with root_cause "Insufficient log data to determine root cause - the container may have failed before producing logs (e.g. a port conflict or resource allocation failure at the Docker daemon level)", suggested_fix "Check `docker ps -a` and the host's Docker daemon output for errors that occurred before this container started", confidence below 20, and risk_level "low".
 
Example of correct output for a simple crash with no config issue:
{
  "root_cause": "The process exited unexpectedly with exit code 1 and no clear error in the logs.",
  "suggested_fix": "Restart the container.",
  "confidence": 60,
  "risk_level": "low"
}
 
Example of correct output for an OOM kill:
{
  "root_cause": "The container was killed by the OOM killer (OOMKilled=true, exit code 137) due to exceeding its memory limit.",
  "suggested_fix": "Increase the container's memory limit before restarting.",
  "confidence": 95,
  "risk_level": "medium"
}
 
- Keep root_cause and suggested_fix each under 2 sentences.
- Output ONLY the JSON object. Nothing before it, nothing after it.
"""

def _build_user_prompt(logs: str, exit_info: dict, daemon_error: str = "") -> str:
    daemon_error_section = (
        f"- daemon_error: {daemon_error}"
        if daemon_error
        else "- daemon_error: (none — container process started normally or error not recorded at daemon level)"
    )
    return f"""Container exit info:
- status: {exit_info.get('status')}
- exit_code: {exit_info.get('exit_code')}
- oom_killed: {exit_info.get('oom_killed')}
{daemon_error_section}

Recent logs:
{logs.strip()[-3000:] or '(empty — container process never produced output)'}

Diagnose the root cause and suggest a fix, following the JSON format exactly.
"""


def _extract_json(raw_text: str) -> dict:
    """
    LLMs (especially smaller local ones) sometimes wrap JSON in markdown
    code fences or add stray text despite instructions. This pulls out the
    first {...} block found so parsing doesn't fail on small formatting
    slip-ups.
    """
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()

    # Find the first { ... } block
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in model output: {raw_text[:200]}")

    return json.loads(match.group(0))


def diagnose(logs: str, exit_info: dict, daemon_error: str = "") -> dict:
    """
    Sends logs + exit info + daemon_error to the local LLM and returns a
    structured diagnosis. Returns a dict with a `success` flag so callers
    can handle failures (model down, bad output) without crashing.

    daemon_error is the Docker daemon-level error from State["Error"] —
    critical for containers that failed before the process started (e.g.
    port conflicts), where logs are empty and this is the only evidence.
    """
    prompt = _build_user_prompt(logs, exit_info, daemon_error=daemon_error)

    payload = {
        "model": MODEL_NAME,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.0  # low temperature: we want consistent, factual diagnosis, not creative variation
        },
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
    except requests.RequestException as e:
        return {
            "success": False,
            "error": f"Could not reach Ollama at {OLLAMA_URL}: {e}",
        }

    raw_output = response.json().get("response", "")

    try:
        parsed = _extract_json(raw_output)
    except (ValueError, json.JSONDecodeError) as e:
        return {
            "success": False,
            "error": f"Failed to parse model output as JSON: {e}",
            "raw_output": raw_output,
        }

    # Validate + normalize fields so the Orchestrator can rely on their shape
    root_cause = str(parsed.get("root_cause", "")).strip()
    suggested_fix = str(parsed.get("suggested_fix", "")).strip()

    try:
        confidence = int(float(parsed.get("confidence", 0)))
    except (ValueError, TypeError):
        confidence = 0
    confidence = max(0, min(100, confidence))

    risk_level = str(parsed.get("risk_level", "medium")).strip().lower()
    if risk_level not in VALID_RISK_LEVELS:
        risk_level = "medium"  # default to safer/cautious if the model gives something unexpected

    if not root_cause or not suggested_fix:
        return {
            "success": False,
            "error": "Model response missing required fields",
            "raw_output": raw_output,
        }

    return {
        "success": True,
        "root_cause": root_cause,
        "suggested_fix": suggested_fix,
        "confidence": confidence,
        "risk_level": risk_level,
    }


# ---------- Manual test (run: python log_agent.py) ----------
if __name__ == "__main__":
    # Simulate the OOM scenario's logs/exit-info for a quick standalone test,
    # without needing docker_agent.py wired up yet.
    test_logs = """Starting leaky app... will consume memory until OOM killed.
Iteration 1: allocated ~5MB total
Iteration 2: allocated ~10MB total
Iteration 15: allocated ~75MB total
Iteration 19: allocated ~95MB total
"""
    test_exit_info = {
        "status": "exited",
        "exit_code": 137,
        "oom_killed": True,
    }

    print("Sending test logs to Ollama, this may take a few seconds...")
    result = diagnose(test_logs, test_exit_info)
    print(json.dumps(result, indent=2))