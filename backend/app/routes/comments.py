from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Comment, CommentStatus, Story, StoryStatus, User
from app.routes.admin import verify_admin
from app.schemas import CommentCreate, CommentResponse, CommentUpdate

router = APIRouter(tags=["comments"])


@router.get("/api/stories/{story_id}/comments", response_model=List[CommentResponse])
def list_public_comments(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.status == StoryStatus.approved, Story.deleted_at.is_(None)).first()
    if not story:
        raise HTTPException(status_code=404, detail="História não encontrada")
    return db.query(Comment).filter(
        Comment.story_id == story_id,
        Comment.status == CommentStatus.approved,
        Comment.deleted_at.is_(None),
    ).order_by(Comment.created_at.asc()).all()


@router.post("/api/stories/{story_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    story_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    story = db.query(Story).filter(Story.id == story_id, Story.status == StoryStatus.approved, Story.deleted_at.is_(None)).first()
    if not story:
        raise HTTPException(status_code=404, detail="História não encontrada")
    comment = Comment(
        story_id=story_id,
        author_id=current_user.id,
        author_name=current_user.username,
        comment_text=payload.comment_text.strip(),
        status=CommentStatus.pending,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/api/comments/mine", response_model=List[CommentResponse])
def list_my_comments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.author_id == current_user.id).order_by(Comment.created_at.desc()).all()


@router.put("/api/comments/{comment_id}", response_model=CommentResponse)
def resubmit_comment(
    comment_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.author_id == current_user.id).first()
    if not comment or comment.status != CommentStatus.needs_revision or comment.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Comentário não disponível para correção")
    comment.comment_text = payload.comment_text.strip()
    comment.status = CommentStatus.pending
    comment.moderation_note = None
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/api/admin/comments", response_model=List[CommentResponse])
def list_comments(
    status_filter: str = Query(None),
    admin=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Comment)
    if status_filter == "deleted":
        query = query.filter(Comment.deleted_at.isnot(None))
    else:
        query = query.filter(Comment.deleted_at.is_(None))
        if status_filter in {"pending", "needs_revision", "approved"}:
            query = query.filter(Comment.status == status_filter)
    return query.order_by(Comment.created_at.desc()).limit(100).all()


@router.put("/api/admin/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    admin=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(comment, field, value)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/api/admin/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    reason: str = Query(None, max_length=1000),
    admin=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at.is_(None)).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    comment.moderation_note = reason.strip() if reason and reason.strip() else None
    comment.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/api/admin/comments/{comment_id}/restore", response_model=CommentResponse)
def restore_comment(comment_id: int, admin=Depends(verify_admin), db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at.isnot(None)).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário excluído não encontrado")
    comment.deleted_at = None
    db.commit()
    db.refresh(comment)
    return comment
