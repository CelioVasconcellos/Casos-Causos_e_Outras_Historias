"""
Armazenamento de mídia com suporte a S3/R2 (produção) e disco local (desenvolvimento).

Como funciona:
- Se S3_ENDPOINT_URL + credenciais estiverem configuradas, os arquivos vão para o
  bucket S3/R2 e a URL pública permanente é retornada (ex.: Cloudflare R2).
- Caso contrário, usa o disco local (UPLOAD_DIR), como antes — ideal para dev local.
"""
import os
import shutil
from pathlib import Path
from PIL import Image
import io
from fastapi import HTTPException, status

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 5242880))

Path(UPLOAD_DIR).mkdir(exist_ok=True)

# --- Configuração de storage externo (S3 / Cloudflare R2) ---
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")  # ex.: https://<accountid>.r2.cloudflarestorage.com
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
S3_BUCKET = os.getenv("S3_BUCKET")
S3_PUBLIC_URL = os.getenv("S3_PUBLIC_URL")  # ex.: https://pub-xxx.r2.dev ou domínio custom

USE_S3 = all([S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_PUBLIC_URL])

_s3_client = None


def _get_s3_client():
    """Cria (lazy) o cliente S3/R2. Importa boto3 somente quando necessário."""
    global _s3_client
    if _s3_client is None:
        import boto3
        _s3_client = boto3.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
        )
    return _s3_client


def _upload_to_s3(data: bytes, object_key: str, content_type: str) -> str:
    """Envia bytes para o bucket e retorna a URL pública permanente."""
    client = _get_s3_client()
    client.put_object(
        Bucket=S3_BUCKET,
        Key=object_key,
        Body=data,
        ContentType=content_type,
    )
    return f"{S3_PUBLIC_URL.rstrip('/')}/{object_key}"


def _save_locally(data: bytes, filename: str) -> str:
    """Salva no disco local e retorna o caminho do arquivo."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    return filepath

def validate_image(file_content: bytes, filename: str) -> tuple:
    if len(file_content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande")
    try:
        img = Image.open(io.BytesIO(file_content))
        img.thumbnail((1200, 1200))
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, "white")
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.getchannel("A") if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        filename_clean = f"img_{os.urandom(8).hex()}_{Path(filename).stem}.jpg"

        if USE_S3:
            buffer = io.BytesIO()
            img.save(buffer, "JPEG", quality=85, optimize=True)
            url = _upload_to_s3(buffer.getvalue(), filename_clean, "image/jpeg")
            return url, "image"

        filepath = os.path.join(UPLOAD_DIR, filename_clean)
        img.save(filepath, "JPEG", quality=85, optimize=True)
        return filepath, "image"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao processar imagem: {str(e)}")

def validate_video(file_content: bytes, filename: str) -> tuple:
    if len(file_content) > MAX_UPLOAD_SIZE * 10:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Vídeo muito grande")
    try:
        filename_clean = f"vid_{os.urandom(8).hex()}_{Path(filename).stem}.mp4"

        if USE_S3:
            url = _upload_to_s3(file_content, filename_clean, "video/mp4")
            return url, "video"

        filepath = _save_locally(file_content, filename_clean)
        return filepath, "video"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao salvar vídeo: {str(e)}")

def validate_audio(file_content: bytes, filename: str, content_type: str = "audio/octet-stream") -> tuple:
    if len(file_content) > MAX_UPLOAD_SIZE * 10:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Áudio muito grande")
    try:
        extension = Path(filename).suffix.lower() or ".audio"
        filename_clean = f"aud_{os.urandom(8).hex()}_{Path(filename).stem}{extension}"

        if USE_S3:
            url = _upload_to_s3(file_content, filename_clean, content_type)
            return url, "audio"

        filepath = _save_locally(file_content, filename_clean)
        return filepath, "audio"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao salvar áudio: {str(e)}")

def delete_file(filepath_or_url: str):
    """Remove arquivo do disco local ou do bucket S3/R2, conforme o formato do caminho."""
    try:
        # URL remota (S3/R2)?
        if filepath_or_url.startswith("http://") or filepath_or_url.startswith("https://"):
            if USE_S3 and S3_PUBLIC_URL and filepath_or_url.startswith(S3_PUBLIC_URL.rstrip("/")):
                object_key = filepath_or_url[len(S3_PUBLIC_URL.rstrip("/")) + 1:]
                _get_s3_client().delete_object(Bucket=S3_BUCKET, Key=object_key)
            return
        # Caminho local
        if os.path.exists(filepath_or_url):
            os.remove(filepath_or_url)
    except Exception:
        pass
