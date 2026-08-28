from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from app.database import engine, Base, get_db
from app.models import Story, StoryStatus
from sqlalchemy.orm import Session
from app.routes import stories, users, admin, reactions, stats, comments


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
app.include_router(comments.router)


@app.get("/google4fe5ed31260d9f02.html", include_in_schema=False)
def google_site_verification():
    return Response(
        content="google-site-verification: google4fe5ed31260d9f02.html",
        media_type="text/plain",
    )


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    public_url = os.getenv(
        "PUBLIC_SITE_URL",
        "https://casos-causos-e-outras-historias.onrender.com",
    ).rstrip("/")
    stories = db.query(Story.id, Story.updated_at).filter(
        Story.status == StoryStatus.approved,
        Story.deleted_at.is_(None),
    ).order_by(Story.id).all()
    urls = [
        f"  <url><loc>{public_url}/</loc></url>",
        *[
            f"  <url><loc>{public_url}/#story-{story_id}</loc><lastmod>{updated_at.date().isoformat()}</lastmod></url>"
            for story_id, updated_at in stories
        ],
    ]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>\n"
    return Response(content=xml, media_type="application/xml")


@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    return Response(
        content=(
            "User-agent: *\n"
            "Allow: /\n"
            "Sitemap: https://casos-causos-e-outras-historias.onrender.com/sitemap.xml\n"
        ),
        media_type="text/plain",
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Casos, Causos e Outras Histórias API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
