from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.api import projects, reports, signals, threads, dashboard, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Mechela API",
    description="Narrative Evidence Index & Change Progression Builder",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(reports.router)
app.include_router(signals.router)
app.include_router(threads.router)
app.include_router(dashboard.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
