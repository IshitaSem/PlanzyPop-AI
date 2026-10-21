"""FastAPI main application entrypoint for PlanzyPop AI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.routes.chat import router as chat_router
from app.routes.health import router as health_router
from app.routes.planner import router as planner_router

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        f"Backend API for {settings.APP_NAME} — {settings.APP_TAGLINE}\n\n"
        "Provides celebration planning, budget generation, and AI event assistant endpoints."
    ),
    version=settings.APP_VERSION,
)

# Enable GZip compression for efficient JSON response delivery
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include endpoint routers
app.include_router(health_router)
app.include_router(planner_router)
app.include_router(chat_router)


@app.get("/", tags=["Root"])
async def root():
    """Root status endpoint."""
    return {
        "app": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "health_url": "/health",
    }
