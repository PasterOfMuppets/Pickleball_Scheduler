"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
)


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Start background jobs on application startup."""
    from app.background.jobs import start_background_jobs
    start_background_jobs()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background jobs on application shutdown."""
    from app.background.jobs import stop_background_jobs
    stop_background_jobs()

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Pickleball League Scheduler API",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/health/db")
def health_check_db():
    """Database health check endpoint."""
    from app.database import engine
    from sqlalchemy import text

    try:
        # Try to connect to database
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# Import and include routers
from app.routes import availability

# Include routers
app.include_router(availability.router)

# Additional routers will be added in future phases:
# from app.routes import auth, users, matches, overlap, notifications, admin
# app.include_router(auth.router)
# app.include_router(users.router)
# etc.
