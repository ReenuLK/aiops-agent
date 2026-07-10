from docker_agent import DockerAgent
from log_agent import diagnose
import json

agent = DockerAgent()

container_id = input("Enter container ID or name (e.g. demo-oom): ")

logs = agent.get_logs(container_id, tail=100)
exit_info = agent.get_exit_info(container_id)

print("Logs pulled, sending to Log Agent...")
result = diagnose(logs, exit_info)
print(json.dumps(result, indent=2))