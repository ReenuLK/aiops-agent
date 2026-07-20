"""
scenario_routes.py

Dev/demo-only endpoints that run the scenario trigger scripts via
subprocess. This exists purely so the dashboard can have "trigger failure"
buttons for demo purposes, instead of requiring a terminal.
"""

import os
import shlex
import shutil
import subprocess
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

SCENARIOS_DIR = os.path.join(
    os.path.dirname(  # backend/
        os.path.dirname(  # backend/app/
            os.path.dirname(os.path.abspath(__file__))  # backend/app/api/
        )
    ),
    "scenarios",
)

ALLOWED_SCENARIOS = {
    "bad_config": os.path.join(SCENARIOS_DIR, "bad_config", "trigger.sh"),
    "memory_leak": os.path.join(SCENARIOS_DIR, "memory_leak", "trigger.sh"),
    "port_conflict": os.path.join(SCENARIOS_DIR, "port_conflict", "trigger.sh"),
    "missing_env": os.path.join(SCENARIOS_DIR, "missing_env", "trigger.sh"),
}

RESET_SCRIPT = os.path.join(SCENARIOS_DIR, "reset_all.sh")


# Common Git for Windows bash locations to prefer over WSL bash
_GIT_BASH_CANDIDATES = [
    r"C:\Program Files\Git\bin\bash.exe",
    r"C:\Program Files (x86)\Git\bin\bash.exe",
]


def _find_git_bash() -> str | None:
    """Return the path to Git Bash if installed, else None."""
    for candidate in _GIT_BASH_CANDIDATES:
        if os.path.isfile(candidate):
            return candidate
    return None


def _is_wsl_bash(bash_path: str) -> bool:
    """Return True if the given bash path is the WSL shim (system32\\bash.exe)."""
    return "system32" in bash_path.lower()


def _find_shell() -> str:
    """Find the best available shell, preferring Git Bash over WSL bash on Windows."""
    if os.name == "nt":
        # Prefer Git Bash — its path understanding matches cygpath output (/c/...)
        git_bash = _find_git_bash()
        if git_bash:
            return git_bash
        # Prefer pwsh/powershell over WSL bash to avoid path-translation mismatch
        for shell in ("pwsh", "powershell", "sh"):
            if shutil.which(shell):
                return shell
        # Last resort: whatever 'bash' resolves to
        return shutil.which("bash") or "bash"

    for shell in ("bash", "sh"):
        if shutil.which(shell):
            return shell
    return "bash"


def _convert_path_for_unix_shell(script_path: str, shell: str = "") -> str:
    """Convert a Windows path to a POSIX path appropriate for the target shell."""
    if os.name != "nt":
        return script_path

    # Determine whether we are targeting WSL bash or a MINGW/Git Bash shell.
    # WSL bash needs /mnt/<drive>/... paths; Git Bash needs /<drive>/... paths.
    using_wsl = shell and _is_wsl_bash(shell)

    if using_wsl:
        # WSL bash: use wslpath if available, otherwise build /mnt/ path manually
        if shutil.which("wslpath"):
            try:
                result = subprocess.run(
                    ["wslpath", "-u", script_path],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                return result.stdout.strip()
            except subprocess.CalledProcessError:
                pass
        if len(script_path) >= 2 and script_path[1] == ":":
            drive_letter = script_path[0].lower()
            rest = script_path[2:].replace("\\", "/")
            return f"/mnt/{drive_letter}{rest}"
        return script_path.replace("\\", "/")

    # Git Bash / MINGW: use cygpath if available, otherwise build /<drive>/ path
    if shutil.which("cygpath"):
        try:
            result = subprocess.run(
                ["cygpath", "-u", script_path],
                capture_output=True,
                text=True,
                check=True,
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError:
            pass

    if len(script_path) >= 2 and script_path[1] == ":":
        drive_letter = script_path[0].lower()
        rest = script_path[2:].replace("\\", "/")
        return f"/{drive_letter}{rest}"

    return script_path.replace("\\", "/")


def _run_script(script_path: str) -> dict:
    if not os.path.exists(script_path):
        raise HTTPException(status_code=500, detail=f"script not found: {script_path}")

    shell = _find_shell()
    shell_basename = os.path.basename(shell).lower()
    if shell_basename in ("pwsh.exe", "powershell.exe", "pwsh", "powershell"):
        command = [shell, "-NoLogo", "-NoProfile", "-Command", f"& {shlex.quote(script_path)}"]
    else:
        command = [shell, _convert_path_for_unix_shell(script_path, shell)]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail={
                    "command": command,
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                },
            )

        return {
            "success": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": command,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="script timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{scenario_name}/trigger")
def trigger_scenario(scenario_name: str):
    if scenario_name not in ALLOWED_SCENARIOS:
        raise HTTPException(
            status_code=404,
            detail=f"unknown scenario '{scenario_name}'. Allowed: {list(ALLOWED_SCENARIOS.keys())}",
        )
    return _run_script(ALLOWED_SCENARIOS[scenario_name])


@router.post("/reset")
def reset_scenarios():
    return _run_script(RESET_SCRIPT)