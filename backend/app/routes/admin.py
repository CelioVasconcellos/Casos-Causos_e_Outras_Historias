from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models import Story, StoryStatus, User, AdminUser
from app.schemas import StoryResponse, StoryUpdate, AdminLogin, TokenResponse
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.utils.file_handler import delete_file
from datetime import timedelta, datetime
from pathlib import Path
from typing import List

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Verificar se usuário é admin
def verify_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.user_id == current_user.id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return admin

@router.post("/login", response_model=TokenResponse)
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    
    admin = db.query(AdminUser).filter(AdminUser.user_id == user.id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não é admin")
    
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/stories", response_model=List[StoryResponse])
def list_all_stories(
    skip: int = Query(0),
    limit: int = Query(50),
    status_filter: str = Query(None),
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Story)
    if status_filter == "deleted":
        query = query.filter(Story.deleted_at.isnot(None))
    else:
        query = query.filter(Story.deleted_at.is_(None))
        if status_filter and status_filter in ["pending", "needs_revision", "approved"]:
            query = query.filter(Story.status == status_filter)
    
    stories = query.order_by(Story.created_at.desc()).offset(skip).limit(limit).all()
    return stories

@router.put("/stories/{story_id}", response_model=StoryResponse)
def update_story(
    story_id: int,
    update: StoryUpdate,
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História não encontrada")
    
    for field, value in update.dict(exclude_unset=True).items():
        setattr(story, field, value)
    
    db.commit()
    db.refresh(story)
    return story

@router.delete("/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: int,
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Soft delete: marca deleted_at. A história some de todas as listagens, mas
    o registro e a mídia são mantidos para permitir restauração."""
    story = db.query(Story).filter(Story.id == story_id, Story.deleted_at.is_(None)).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História não encontrada")

    story.deleted_at = datetime.utcnow()
    db.commit()
    return None


@router.post("/stories/{story_id}/restore", response_model=StoryResponse)
def restore_story(
    story_id: int,
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Restaura uma história excluída (soft delete), voltando ao status anterior."""
    story = db.query(Story).filter(Story.id == story_id, Story.deleted_at.isnot(None)).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História excluída não encontrada")

    story.deleted_at = None
    db.commit()
    db.refresh(story)
    return story


@router.delete("/stories/{story_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_story_permanently(
    story_id: int,
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Exclusão DEFINITIVA (irreversível): remove registro e mídia do storage.
    Só permitida para histórias já excluídas (deleted), para evitar acidentes."""
    story = db.query(Story).filter(Story.id == story_id, Story.deleted_at.isnot(None)).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História excluída não encontrada")

    # Remove também o arquivo de mídia do storage (local ou S3/R2)
    if story.media_url:
        if story.media_url.startswith("http://") or story.media_url.startswith("https://"):
            delete_file(story.media_url)
        else:
            delete_file(str(Path("uploads") / Path(story.media_url).name))

    db.delete(story)
    db.commit()
    return None
