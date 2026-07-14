"""
orchestrator.py

The "decide" layer of the agent. Takes a natural language message from the
user, figures out which container it's about, pulls a diagnosis from the
Log Agent, and decides whether to auto-execute a fix or return it for
human approval.
"""

try:
    from .docker_agent import DockerAgent
    from .log_agent import diagnose
except ImportError: 
    from docker_agent import DockerAgent
    from log_agent import diagnose

docker_agent = DockerAgent()

AUTO_EXECUTE_RISK_LEVELS = {"low"}
AUTO_EXECUTE_MIN_CONFIDENCE = 70

STATUS_KEYWORDS = ["why", "status", "down", "health", "what's wrong", "what is wrong"]
FIX_KEYWORDS = ["fix", "restart", "resolve", "repair", "recover"]


def _classify_intent(message: str) -> str:
    lower = message.lower()
    if any(kw in lower for kw in FIX_KEYWORDS):
        return "fix"
    if any(kw in lower for kw in STATUS_KEYWORDS):
        return "status"
    return "general"


def _resolve_container(message: str, containers: list[dict]) -> dict | None:
    lower = message.lower()
    for c in containers:
        if c["name"].lower() in lower:
            return c
    return None


def _find_unhealthy_container(containers: list[dict]) -> dict | None:
    for c in containers:
        if c["status"] != "running":
            return c
    return None


def _should_auto_execute(diagnosis: dict) -> bool:
    """
    Auto-execute is only safe when BOTH:
    1. risk_level/confidence clear the bar, AND
    2. the suggested_fix text itself implies a plain restart is sufficient.

    Without check #2, a "low risk" label alone isn't enough - e.g. an OOM
    diagnosis might say "increase the memory limit" and still get labeled
    low risk, but auto-restarting without changing the limit wouldn't
    actually fix anything. This keeps auto-execute scoped to genuinely
    restart-equivalent fixes only.
    """
    if diagnosis.get("risk_level") not in AUTO_EXECUTE_RISK_LEVELS:
        return False
    if diagnosis.get("confidence", 0) < AUTO_EXECUTE_MIN_CONFIDENCE:
        return False

    fix_text = diagnosis.get("suggested_fix", "").lower()
    restart_only_phrases = ["restart the container", "simply restart", "just restart", "restart it"]
    implies_config_change = any(
        kw in fix_text for kw in ["memory limit", "increase memory", "edit", "rebuild", "config", "environment variable", "env var", "set the"]
    )

    if implies_config_change:
        return False

    return any(phrase in fix_text for phrase in restart_only_phrases) or fix_text.strip() == ""


def handle_chat(message: str) -> dict:
    """
    Main orchestration entrypoint. Returns a structured response describing
    what was found, diagnosed, and (if applicable) done.
    """
    containers = docker_agent.list_containers(all_containers=True)

    target = _resolve_container(message, containers)

    # Classify intent using the message with the matched container's name
    # stripped out first - otherwise a container named e.g. "test-healthy"
    # would false-trigger the "health" keyword and misclassify a general
    # question as a status check.
    intent_source = message.lower()
    if target is not None:
        intent_source = intent_source.replace(target["name"].lower(), "")
    intent = _classify_intent(intent_source)

    if target is None:
        target = _find_unhealthy_container(containers)

    if target is None:
        return {
            "intent": intent,
            "response": "All containers appear to be running normally. No unhealthy containers found.",
            "container": None,
            "diagnosis": None,
            "action_taken": None,
        }

    # Never attempt a diagnosis on a container that's actually running -
    # regardless of how intent was classified. A healthy container has
    # nothing to diagnose, and asking the LLM anyway risks a hallucinated
    # "problem" being invented from essentially normal logs.
    if target["status"] == "running":
        return {
            "intent": intent,
            "response": f"'{target['name']}' is currently running normally.",
            "container": target,
            "diagnosis": None,
            "action_taken": None,
        }

    logs = docker_agent.get_logs(target["id"], tail=100)
    exit_info = docker_agent.get_exit_info(target["id"])
    diagnosis_result = diagnose(logs, exit_info)

    if not diagnosis_result.get("success"):
        return {
            "intent": intent,
            "response": f"Found an issue with '{target['name']}' but couldn't get a diagnosis: {diagnosis_result.get('error')}",
            "container": target,
            "diagnosis": None,
            "action_taken": None,
        }

    action_taken = None

    if intent == "fix" and _should_auto_execute(diagnosis_result):
        restart_result = docker_agent.restart(target["id"])
        action_taken = {
            "action": "restart",
            "success": restart_result.get("success", False),
            "auto_executed": True,
        }
        response_text = (
            f"Diagnosed '{target['name']}': {diagnosis_result['root_cause']} "
            f"Auto-executed a restart (low risk, {diagnosis_result['confidence']}% confidence)."
        )
    else:
        response_text = (
            f"Diagnosed '{target['name']}': {diagnosis_result['root_cause']} "
            f"Suggested fix: {diagnosis_result['suggested_fix']} "
            f"(risk: {diagnosis_result['risk_level']}, confidence: {diagnosis_result['confidence']}%). "
            f"Approval required before this is applied."
        )

    return {
        "intent": intent,
        "response": response_text,
        "container": target,
        "diagnosis": diagnosis_result,
        "action_taken": action_taken,
    }