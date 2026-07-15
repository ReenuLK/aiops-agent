"""
models.py

Defines the Incident table - one row per orchestrator run that involved an
actual diagnosis. This is the audit trail: what broke, what the agent
thought, what it suggested/did, and when.
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from .sessions import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, index=True)
    container_name = Column(String, index=True)

    root_cause = Column(Text)
    suggested_fix = Column(Text)
    confidence = Column(Integer)
    risk_level = Column(String)

    intent = Column(String)  # 'status', 'fix', 'general'
    auto_executed = Column(Boolean, default=False)
    action_success = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())