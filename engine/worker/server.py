import os
import secrets
from fastapi import Depends, FastAPI, Header, HTTPException

from engine.worker.models.analyze_job import AnalyzeJob

app = FastAPI()

def verify_worker_secret(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("WORKER_SECRET")
    
    if not expected:
        raise RuntimeError("WORKER_SECRET is not configured")
    received = authorization.removeprefix("Bearer ") if authorization else ""
    if not secrets.compare_digest(received, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
def analyze(job: AnalyzeJob, _: None = Depends(verify_worker_secret)):
    return {"hey": "you made it!"}