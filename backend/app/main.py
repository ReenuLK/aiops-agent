"""
main.py

FastAPI application entrypoint. Creates the app, sets up CORS (so the React
frontend on a different port/domain can call this API), and includes the
routes defined in routes.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .api.diagonise_routes import router as diagnose_router
from .api.chat_routes import router as chat_router
from .api.history_routes import router as history_router
from .db.sessions import Base, engine
from .db import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AIOps Agent API",
    description="Autonomous container monitoring, diagnosis, and recovery agent",
    version="0.1.0",
)

# Allow the frontend (running on a different port during dev, or a different
# domain once deployed) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your actual frontend URL before deploying
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(diagnose_router)
app.include_router(chat_router)
app.include_router(history_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "aiops-agent-backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}
