"""
orchestrator.py

The "decide" layer of the agent. Takes a natural language message from the
user, figures out which container it's about, pulls a diagnosis from the
Log Agent, and decides whether to auto-execute a fix or return it for
human approval.

Deliberately simple intent classification (keyword-based, not another LLM
call) — this keeps the system fast and free for routing decisions that
don't need deep reasoning, reserving the LLM call for the part that
actually needs it (log diagnosis).
"""
from .docker_agent import DockerAgent
from .log_agent import diagnose
from ..db.sessions import SessionLocal
from ..db.models import Incident

docker_agent = DockerAgent()

# Only these risk levels + confidence threshold are allowed to auto-execute.
# Everything else is always suggest-only. This is the safety boundary of
# the whole system - keep it conservative on purpose.
AUTO_EXECUTE_RISK_LEVELS = {"low"}
AUTO_EXECUTE_MIN_CONFIDENCE = 70

STATUS_KEYWORDS = ["why", "status", "down", "health", "what's wrong", "what is wrong"]
FIX_KEYWORDS = ["fix", "restart", "resolve", "repair", "recover"]


def _classify_intent(message: str) -> str:
    """
    Very lightweight rule-based classification. Returns one of:
    'status', 'fix', 'general'
    """
    lower = message.lower()

    if any(kw in lower for kw in FIX_KEYWORDS):
        return "fix"
    if any(kw in lower for kw in STATUS_KEYWORDS):
        return "status"
    return "general"


def _resolve_container(message: str, containers: list[dict]) -> dict | None:
    """
    Tries to find which container the user is talking about by matching
    container names mentioned in the message. Falls back to None if no
    name is mentioned - caller decides what to do in that case (e.g.
    auto-pick the first unhealthy one).
    """
    lower = message.lower()
    for c in containers:
        # Match on the container name (or a meaningful substring of it,
        # e.g. "nginx" matches "demo-bad-config" only if literally named
        # that, so this works best when users mention the actual name).
        if c["name"].lower() in lower:
            return c
    return None


def _find_unhealthy_container(containers: list[dict]) -> dict | None:
    """Returns the first container that isn't in a healthy 'running' state."""
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


def _log_incident(target: dict, intent: str, diagnosis: dict, action_taken: dict | None) -> None:
    """
    Writes a record of this diagnosis to Postgres. Failures here are
    logged but never allowed to break the actual chat response - the
    audit trail is important but secondary to the user getting an answer.
    """
    db = SessionLocal()
    try:
        incident = Incident(
            container_id=target["id"],
            container_name=target["name"],
            root_cause=diagnosis.get("root_cause"),
            suggested_fix=diagnosis.get("suggested_fix"),
            confidence=diagnosis.get("confidence"),
            risk_level=diagnosis.get("risk_level"),
            intent=intent,
            auto_executed=bool(action_taken and action_taken.get("auto_executed")),
            action_success=action_taken.get("success") if action_taken else None,
        )
        db.add(incident)
        db.commit()
    except Exception as e:
        print(f"[warning] failed to log incident to database: {e}")
        db.rollback()
    finally:
        db.close()


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

    # For general chat with no clear fix/status intent, just report status
    # without running a full LLM diagnosis (keeps it fast/cheap).
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

    # Only attempt auto-execution when the user's intent was explicitly a
    # fix request AND the diagnosis clears the safety bar. A "why is it
    # down" status question never auto-executes, even if risk is low -
    # the user asked a question, not for an action.
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

    _log_incident(target, intent, diagnosis_result, action_taken)

    return {
        "intent": intent,
        "response": response_text,
        "container": target,
        "diagnosis": diagnosis_result,
        "action_taken": action_taken,
    }