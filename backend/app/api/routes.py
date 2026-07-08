
from fastapi import APIRouter, HTTPException, Query
from ..agents.docker_agent import DockerAgent

router = APIRouter(prefix="/containers", tags=["containers"])

# Single shared instance — the Docker SDK client is safe to reuse across
# requests, no need to create a new one per call.
docker_agent = DockerAgent()


@router.get("")
def get_containers(all: bool = Query(default=True, description="Include stopped containers")):
    """
    List all containers with basic status info.
    GET /containers
    GET /containers?all=false   -> running containers only
    """
    try:
        return docker_agent.list_containers(all_containers=all)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{container_id}/stats")
def get_stats(container_id: str):
    """
    CPU/RAM snapshot for a single container.
    GET /containers/{container_id}/stats
    """
    result = docker_agent.get_container_stats(container_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/{container_id}/logs")
def get_logs(container_id: str, tail: int = Query(default=100, ge=1, le=1000)):
    """
    Last N lines of logs for a container.
    GET /containers/{container_id}/logs?tail=200
    """
    logs = docker_agent.get_logs(container_id, tail=tail)
    if logs.startswith("[error]"):
        raise HTTPException(status_code=404, detail=logs)
    return {"container_id": container_id, "logs": logs}


@router.get("/{container_id}/exit-info")
def get_exit_info(container_id: str):
    """
    Exit code / OOM status / error state for a container.
    GET /containers/{container_id}/exit-info
    """
    result = docker_agent.get_exit_info(container_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/{container_id}/start")
def start_container(container_id: str):
    """POST /containers/{container_id}/start"""
    result = docker_agent.start(container_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{container_id}/stop")
def stop_container(container_id: str):
    """POST /containers/{container_id}/stop"""
    result = docker_agent.stop(container_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{container_id}/restart")
def restart_container(container_id: str):
    """POST /containers/{container_id}/restart"""
    result = docker_agent.restart(container_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result