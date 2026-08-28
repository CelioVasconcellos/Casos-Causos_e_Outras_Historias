from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models import Story, StoryStatus, User, MediaType
from app.schemas import StoryResponse
from app.auth import get_current_user
from app.utils.file_handler import validate_image, validate_video, validate_audio, delete_file
from pathlib import Path
from typing import List

router = APIRouter(prefix="/api/stories", tags=["stories"])

def save_media(media, content: bytes):
    """Salva mídia e retorna a URL pública (local /uploads/... ou remota S3/R2)."""
    if media.content_type and media.content_type.startswith("image/"):
        filepath, _ = validate_image(content, media.filename)
        return _to_public_url(filepath), MediaType.image
    if media.content_type in {"video/mp4", "video/webm", "video/quicktime"}:
        filepath, _ = validate_video(content, media.filename)
        return _to_public_url(filepath), MediaType.video
    if media.content_type and media.content_type.startswith("audio/"):
        filepath, _ = validate_audio(content, media.filename, media.content_type)
        return _to_public_url(filepath), MediaType.audio
    raise HTTPException(status_code=415, detail="Envie uma imagem, vídeo ou áudio compatível")


def _to_public_url(filepath: str) -> str:
    """Se o storage retornou URL completa (S3/R2), usa direto; senão, monta caminho local."""
    if filepath.startswith("http://") or filepath.startswith("https://"):
        return filepath
    return f"/uploads/{Path(filepath).name}"

@router.get("/", response_model=List[StoryResponse])
def list_stories(
    db: Session = Depends(get_db),
    search: str = Query(None),
    category: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Story).filter(Story.status == StoryStatus.approved, Story.deleted_at.is_(None))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Story.title.ilike(search_term),
                Story.author_name.ilike(search_term),
                Story.story_text.ilike(search_term)
            )
        )
    
    if category:
        query = query.filter(Story.category == category)
    
    stories = query.order_by(Story.created_at.desc()).offset(skip).limit(limit).all()
    return stories

@router.get("/mine", response_model=List[StoryResponse])
def list_my_stories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Story).filter(Story.author_id == current_user.id, Story.deleted_at.is_(None)).order_by(Story.created_at.desc()).all()

@router.get("/{story_id}", response_model=StoryResponse)
def get_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(
        and_(Story.id == story_id, Story.status == StoryStatus.approved, Story.deleted_at.is_(None))
    ).first()

    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História não encontrada")

    return story

@router.post("/", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    title: str = Form(""),
    author_name: str = Form(""),
    category: str = Form("Geral"),
    story_text: str = Form(""),
    media: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if title.strip() and (len(title.strip()) < 5 or len(title) > 150):
        raise HTTPException(status_code=422, detail="O título deve ter entre 5 e 150 caracteres")
    if author_name.strip() and (len(author_name.strip()) < 2 or len(author_name) > 100):
        raise HTTPException(status_code=422, detail="O nome deve ter entre 2 e 100 caracteres")
    if len(story_text.strip()) < 10 and not media:
        raise HTTPException(status_code=422, detail="A história deve ter pelo menos 10 caracteres")

    media_url = None
    media_type = MediaType.none
    if media and media.filename:
        content = await media.read()
        media_url, media_type = save_media(media, content)

    db_story = Story(
        title=title.strip() or "Áudio aguardando curadoria",
        author_name=author_name.strip() or current_user.username,
        category=category.strip() or "Geral",
        story_text=story_text.strip(),
        author_id=current_user.id,
        media_url=media_url,
        media_type=media_type,
        status=StoryStatus.pending,
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story

@router.put("/{story_id}", response_model=StoryResponse)
async def resubmit_story(
    story_id: int,
    title: str = Form(""),
    author_name: str = Form(""),
    category: str = Form("Geral"),
    story_text: str = Form(""),
    media: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(Story).filter(Story.id == story_id, Story.author_id == current_user.id).first()
    if not story or story.status != StoryStatus.needs_revision:
        raise HTTPException(status_code=404, detail="História não disponível para correção")
    if len(title.strip()) < 5 or len(title) > 150:
        raise HTTPException(status_code=422, detail="O título deve ter entre 5 e 150 caracteres")
    if len(author_name.strip()) < 2 or len(author_name) > 100:
        raise HTTPException(status_code=422, detail="O nome deve ter entre 2 e 100 caracteres")
    if len(story_text.strip()) < 10 and not (media and media.filename):
        raise HTTPException(status_code=422, detail="A história deve ter pelo menos 10 caracteres")
    story.title = title.strip()
    story.author_name = author_name.strip()
    story.category = category.strip() or "Geral"
    story.story_text = story_text.strip()
    story.status = StoryStatus.pending
    story.moderation_note = None
    if media and media.filename:
        content = await media.read()
        if story.media_url:
            if story.media_url.startswith("http://") or story.media_url.startswith("https://"):
                delete_file(story.media_url)
            else:
                delete_file(str(Path("uploads") / Path(story.media_url).name))
        story.media_url, story.media_type = save_media(media, content)
    db.commit()
    db.refresh(story)
    return story

@router.get("/categories/all", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Story.category).filter(Story.status == StoryStatus.approved).distinct().all()
    return [cat[0] for cat in categories if cat[0]]
