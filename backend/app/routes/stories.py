from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models import Story, StoryStatus, User
from app.schemas import StoryCreate, StoryResponse, StoryUpdate
from app.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/stories", tags=["stories"])

@router.get("/", response_model=List[StoryResponse])
def list_stories(
    db: Session = Depends(get_db),
    search: str = Query(None),
    category: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Story).filter(Story.status == StoryStatus.approved)
    
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

@router.get("/{story_id}", response_model=StoryResponse)
def get_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(
        and_(Story.id == story_id, Story.status == StoryStatus.approved)
    ).first()
    
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="História não encontrada")
    
    return story

@router.post("/", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
def create_story(
    story: StoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_story = Story(**story.dict())
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story

@router.get("/categories/all", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Story.category).filter(Story.status == StoryStatus.approved).distinct().all()
    return [cat[0] for cat in categories if cat[0]]
