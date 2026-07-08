from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router

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


@app.get("/")
def root():
    return {"status": "ok", "service": "aiops-agent-backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}