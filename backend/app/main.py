"""
FastAPI Main Application Entry Point
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.wiki import router as wiki_router
from app.api.rewrite import router as rewrite_router
from app.api.audit import router as audit_router

app = FastAPI(
    title="American English Article Rewrite & Localization Tool for MediaWiki",
    description="Production-grade API for localizing, auditing, proofreading, and safely updating MediaWiki articles into American English.",
    version="1.0.0"
)

# Vercel Path Normalization Middleware
@app.middleware("http")
async def vercel_path_rewrite_middleware(request: Request, call_next):
    # Vercel sends the pre-rewrite original URL path in x-matched-path
    matched_path = request.headers.get("x-matched-path")
    if matched_path and matched_path != request.scope.get("path"):
        request.scope["path"] = matched_path
    return await call_next(request)

# JSON Error Handlers (Guarantees valid JSON on all errors, preventing "Unexpected token I" in frontend)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc.errors())}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api (standard for localhost)
app.include_router(wiki_router, prefix="/api")
app.include_router(rewrite_router, prefix="/api")
app.include_router(audit_router, prefix="/api")

# Also include without /api prefix for Vercel or reverse-proxy setups
app.include_router(wiki_router)
app.include_router(rewrite_router)
app.include_router(audit_router)


@app.get("/api/health")
@app.get("/health")
def health_check():
    from app.core.ai_engine import AIEngine
    ai_avail = AIEngine().is_available()
    return {
        "status": "healthy",
        "service": "MediaWiki American English Localization API",
        "ai_engine_configured": ai_avail,
        "default_wiki_endpoint": "https://justapedia.org/api.php"
    }


# Mount frontend static export if available
frontend_out = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "out")
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")

if os.path.exists(frontend_out):
    app.mount("/", StaticFiles(directory=frontend_out, html=True), name="static")
elif os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
