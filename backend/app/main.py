from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from app.database import engine, Base
from app.routes import stories, users, admin, reactions, stats


def _parse_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
    return [frontend_url]

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Casos, Causos e Outras Histórias",
    description="Plataforma comunitária de narrativas",
    version="1.0.0"
)

upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

cors_origins = _parse_cors_origins()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(stories.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(reactions.router)
app.include_router(stats.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Casos, Causos e Outras Histórias API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
