"""
FastAPI Main Application Entry Point
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.api.wiki import router as wiki_router
from app.api.rewrite import router as rewrite_router
from app.api.audit import router as audit_router

app = FastAPI(
    title="American English Article Rewrite & Localization Tool for MediaWiki",
    description="Production-grade API for localizing, auditing, proofreading, and safely updating MediaWiki articles into American English.",
    version="1.0.0"
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api
app.include_router(wiki_router, prefix="/api")
app.include_router(rewrite_router, prefix="/api")
app.include_router(audit_router, prefix="/api")


@app.get("/api/health")
def health_check():
    from app.core.ai_engine import AIEngine
    ai_avail = AIEngine().is_available()
    return {
        "status": "healthy",
        "service": "MediaWiki American English Localization API",
        "ai_engine_configured": ai_avail,
        "default_wiki_endpoint": "https://justapedia.org/api.php"
    }


# If frontend static build exists, mount it
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
