import fastapi
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api.routes import router
    from .api.diagonise_routes import router as diagnose_router
except ImportError:
    from api.routes import router
    from api.diagonise_routes import router as diagnose_router

app = fastapi.FastAPI(
    title="AIOps Agent API",
    description="Autonomous container monitoring, diagnosis, and recovery agent",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(diagnose_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "aiops-agent-backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}

