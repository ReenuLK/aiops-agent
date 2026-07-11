"""
diagnose_routes.py

Exposes the Log Agent's diagnosis capability as an HTTP endpoint. This
endpoint ties together DockerAgent (pull logs + exit info) and log_agent
(reason about them) — it's the first place in the codebase where
"perceive" and "reason" are wired together, ahead of the full Orchestrator
in Day 6.
"""

from fastapi import APIRouter, HTTPException

try:
    from ..agents.docker_agent import DockerAgent
    from ..agents.log_agent import diagnose
except ImportError: 
    from agents.docker_agent import DockerAgent
    from agents.log_agent import diagnose

router = APIRouter(prefix="/diagnose", tags=["diagnose"])

docker_agent = DockerAgent()


@router.post("/{container_id}")
def diagnose_container(container_id: str, tail: int = 100):
    """
    Pulls logs + exit info for a container and returns an LLM-generated
    diagnosis: root cause, suggested fix, confidence, and risk level.

    POST /diagnose/{container_id}
    POST /diagnose/{container_id}?tail=200
    """
    logs = docker_agent.get_logs(container_id, tail=tail)
    if logs.startswith("[error]"):
        raise HTTPException(status_code=404, detail=logs)

    exit_info = docker_agent.get_exit_info(container_id)
    if "not_found" in exit_info:
        raise HTTPException(status_code=404, detail=exit_info["not_found"])

    result = diagnose(logs, exit_info)

    if not result.get("success"):
        # LLM/parsing failure is a server-side issue, not a "container not
        # found" issue, so this is a 502 (bad gateway to the LLM) rather
        # than a 404 or plain 500.
        raise HTTPException(
            status_code=502,
            detail=result.get("error", "diagnosis failed"),
        )

    return {
        "container_id": container_id,
        "exit_info": exit_info,
        "diagnosis": {
            "root_cause": result["root_cause"],
            "suggested_fix": result["suggested_fix"],
            "confidence": result["confidence"],
            "risk_level": result["risk_level"],
        },
    }