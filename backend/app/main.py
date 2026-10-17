from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import applications, auth, stats
from app.core.config import settings
from app.db.session import Base, engine
from app import models  # noqa: F401 - register ORM models with SQLAlchemy metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Convenient for the MVP/dev container. Production deployments should run Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(stats.router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "careerpilot-api"}
