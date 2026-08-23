import os
import shutil
from pathlib import Path
from PIL import Image
import io
from fastapi import HTTPException, status

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 5242880))

Path(UPLOAD_DIR).mkdir(exist_ok=True)

def validate_image(file_content: bytes, filename: str) -> tuple:
    if len(file_content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande")
    try:
        img = Image.open(io.BytesIO(file_content))
        img.thumbnail((1200, 1200))
        filename_clean = f"img_{os.urandom(8).hex()}_{Path(filename).stem}.jpg"
        filepath = os.path.join(UPLOAD_DIR, filename_clean)
        img.save(filepath, "JPEG", quality=85, optimize=True)
        return filepath, "image"
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao processar imagem: {str(e)}")

def validate_video(file_content: bytes, filename: str) -> tuple:
    if len(file_content) > MAX_UPLOAD_SIZE * 10:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Vídeo muito grande")
    try:
        filename_clean = f"vid_{os.urandom(8).hex()}_{Path(filename).stem}.mp4"
        filepath = os.path.join(UPLOAD_DIR, filename_clean)
        with open(filepath, "wb") as f:
            f.write(file_content)
        return filepath, "video"
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao salvar vídeo: {str(e)}")

def delete_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception:
        pass
