"""
chat_routes.py

Exposes the Orchestrator as a conversational endpoint.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from ..agents.orchestration import handle_chat
except ImportError:  # pragma: no cover - fallback for direct script execution
    from backend.app.agents.orchestration import handle_chat

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    try:
        result = handle_chat(request.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"orchestrator error: {e}")

    return result