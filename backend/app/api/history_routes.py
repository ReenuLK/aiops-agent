"""
history_routes.py

Exposes the incident audit trail stored in Postgres. This is what makes
the system look like a "real" ops tool - every diagnosis and action is
recorded and queryable after the fact.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..db.sessions import SessionLocal
from ..db.models import Incident

router = APIRouter(prefix="/history", tags=["history"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_history(
    limit: int = Query(default=50, ge=1, le=500),
    container_name: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Returns past incidents, most recent first.
    GET /history
    GET /history?limit=20
    GET /history?container_name=demo-oom
    """
    query = db.query(Incident).order_by(desc(Incident.created_at))

    if container_name:
        query = query.filter(Incident.container_name == container_name)

    incidents = query.limit(limit).all()

    return [
        {
            "id": i.id,
            "container_id": i.container_id,
            "container_name": i.container_name,
            "root_cause": i.root_cause,
            "suggested_fix": i.suggested_fix,
            "confidence": i.confidence,
            "risk_level": i.risk_level,
            "intent": i.intent,
            "auto_executed": i.auto_executed,
            "action_success": i.action_success,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]