
import docker
from docker.errors import NotFound, APIError
from typing import Optional


class DockerAgent:
    def __init__(self):
        # Connects to the local Docker daemon using environment settings
        # (same as running `docker` CLI commands on this machine).
        self.client = None
        self.connection_error = None
        self._connect()

    def _connect(self) -> None:
        try:
            self.client = docker.from_env()
            self.connection_error = None
        except Exception as exc:
            self.client = None
            self.connection_error = str(exc)

    def _ensure_client(self):
        if self.client is None:
            self._connect()
        if self.client is None:
            raise RuntimeError(
                f"Docker daemon is unavailable: {self.connection_error or 'unknown error'}"
            )
        return self.client

    # ---------- READ / PERCEIVE ----------

    def list_containers(self, all_containers: bool = True) -> list[dict]:
        """
        Returns a list of containers with basic status info.
        all_containers=True includes stopped/exited containers too,
        which matters since a crashed container is exactly what we
        want to detect.
        """
        client = self._ensure_client()
        containers = client.containers.list(all=all_containers)
        result = []
        for c in containers:
            result.append({
                "id": c.short_id,
                "name": c.name,
                "status": c.status,  # running, exited, restarting, paused, etc.
                "image": c.image.tags[0] if c.image.tags else c.image.short_id,
            })
        return result

    def get_container_stats(self, container_id: str) -> dict:
        """
        Returns a single snapshot of CPU/RAM usage for a container.
        stream=False gives one reading instead of an ongoing stream.
        """
        try:
            container = self._ensure_client().containers.get(container_id)
        except RuntimeError as exc:
            return {"error": str(exc)}
        except NotFound:
            return {"error": f"container {container_id} not found"}

        if container.status != "running":
            return {
                "id": container.short_id,
                "name": container.name,
                "status": container.status,
                "cpu_percent": None,
                "mem_usage_mb": None,
                "mem_limit_mb": None,
            }

        stats = container.stats(stream=False)

        cpu_percent = self._calculate_cpu_percent(stats)
        mem_usage = stats["memory_stats"].get("usage", 0)
        mem_limit = stats["memory_stats"].get("limit", 0)

        return {
            "id": container.short_id,
            "name": container.name,
            "status": container.status,
            "cpu_percent": round(cpu_percent, 2),
            "mem_usage_mb": round(mem_usage / (1024 * 1024), 2),
            "mem_limit_mb": round(mem_limit / (1024 * 1024), 2),
        }

    def _calculate_cpu_percent(self, stats: dict) -> float:
        """
        Docker's raw stats API gives cumulative CPU counters, not a percentage.
        This is the standard delta calculation (same logic `docker stats` uses
        internally) to convert those counters into a usable CPU% figure.
        """
        try:
            cpu_delta = (
                stats["cpu_stats"]["cpu_usage"]["total_usage"]
                - stats["precpu_stats"]["cpu_usage"]["total_usage"]
            )
            system_delta = (
                stats["cpu_stats"]["system_cpu_usage"]
                - stats["precpu_stats"]["system_cpu_usage"]
            )
            num_cpus = stats["cpu_stats"].get("online_cpus", 1)

            if system_delta > 0 and cpu_delta > 0:
                return (cpu_delta / system_delta) * num_cpus * 100.0
            return 0.0
        except (KeyError, ZeroDivisionError):
            return 0.0

    def get_logs(self, container_id: str, tail: int = 100) -> str:
        """
        Returns the last `tail` lines of a container's logs as a plain string.
        This is what gets handed to the Log Agent for LLM diagnosis.
        """
        try:
            container = self._ensure_client().containers.get(container_id)
        except RuntimeError as exc:
            return f"[error] {exc}"
        except NotFound:
            return f"[error] container {container_id} not found"

        raw_logs = container.logs(tail=tail, stdout=True, stderr=True)
        return raw_logs.decode("utf-8", errors="replace")

    def get_exit_info(self, container_id: str) -> dict:
        """
        Returns exit code and OOM status — useful signal for the Log Agent
        in addition to raw log text (e.g. OOMKilled=True is a strong hint
        even before reading a single log line).
        """
        try:
            container = self._ensure_client().containers.get(container_id)
        except RuntimeError as exc:
            return {"error": str(exc)}
        except NotFound:
            return {"error": f"container {container_id} not found"}

        container.reload()  # refresh attrs to get latest state
        state = container.attrs.get("State", {})
        return {
            "status": state.get("Status"),
            "exit_code": state.get("ExitCode"),
            "oom_killed": state.get("OOMKilled", False),
            "error": state.get("Error", ""),
            "started_at": state.get("StartedAt"),
            "finished_at": state.get("FinishedAt"),
        }

    # ---------- WRITE / ACT ----------

    def start(self, container_id: str) -> dict:
        try:
            container = self._ensure_client().containers.get(container_id)
            container.start()
            return {"success": True, "action": "start", "container": container.name}
        except (NotFound, APIError, RuntimeError) as e:
            return {"success": False, "action": "start", "error": str(e)}

    def stop(self, container_id: str) -> dict:
        try:
            container = self._ensure_client().containers.get(container_id)
            container.stop()
            return {"success": True, "action": "stop", "container": container.name}
        except (NotFound, APIError, RuntimeError) as e:
            return {"success": False, "action": "stop", "error": str(e)}

    def restart(self, container_id: str) -> dict:
        try:
            container = self._ensure_client().containers.get(container_id)
            container.restart(timeout=10)
            return {"success": True, "action": "restart", "container": container.name}
        except (NotFound, APIError, RuntimeError) as e:
            return {"success": False, "action": "restart", "error": str(e)}

    def build_image(self, path: str, tag: str) -> dict:
        """
        Builds an image from a Dockerfile at `path`, tagged as `tag`.
        Used later for the "rebuild" recovery action / scenario apps.
        """
        try:
            image, logs = self._ensure_client().images.build(path=path, tag=tag, rm=True)
            return {"success": True, "action": "build", "tag": tag, "image_id": image.short_id}
        except (APIError, RuntimeError) as e:
            return {"success": False, "action": "build", "error": str(e)}


# ---------- Quick manual test (run: python docker_agent.py) ----------
if __name__ == "__main__":
    agent = DockerAgent()

    print("== Containers ==")
    containers = agent.list_containers()
    for c in containers:
        print(c)

    if containers:
        first_id = containers[0]["id"]
        print(f"\n== Stats for {first_id} ==")
        print(agent.get_container_stats(first_id))

        print(f"\n== Logs for {first_id} (last 20 lines) ==")
        print(agent.get_logs(first_id, tail=20))

        print(f"\n== Exit info for {first_id} ==")
        print(agent.get_exit_info(first_id))