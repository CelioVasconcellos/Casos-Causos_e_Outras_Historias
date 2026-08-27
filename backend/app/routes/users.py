from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, UserLogin, TokenResponse
from app.auth import get_password_hash, create_access_token, verify_password
from datetime import timedelta
import logging
from sqlalchemy import func

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    username = user.username.strip().lower()
    if len(username) < 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Username deve ter pelo menos 3 caracteres")

    existing = db.query(User).filter(func.lower(User.username) == username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username já existe")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(username=username, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    username = credentials.username.strip().lower()
    logger.info("Tentativa de login de usuário: username=%s", username)
    user = db.query(User).filter(func.lower(User.username) == username).first()
    if not user:
        logger.warning("Login falhou: usuário não encontrado username=%s", username)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not verify_password(credentials.password, user.password_hash):
        logger.warning("Login falhou: hash de senha não corresponde username=%s user_id=%s", username, user.id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "token_type": "bearer"}
