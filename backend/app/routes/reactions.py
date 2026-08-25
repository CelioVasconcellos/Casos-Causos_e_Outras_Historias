from collections import defaultdict, deque
from datetime import datetime, timedelta
from hashlib import sha256
import os
from secrets import token_urlsafe
from threading import Lock
import time
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

try:
    import redis
except ImportError:  # pragma: no cover - fallback for environments without redis package
    redis = None

REDIS_ERRORS = (OSError,)
if redis is not None:
    REDIS_ERRORS = (redis.RedisError, OSError)

from app.database import get_db
from app.models import AdminUser, Reaction, ReactionBlock, Story, StoryStatus
from app.routes.admin import verify_admin
from app.schemas import ReactionBlockCreate, ReactionSummaryResponse, ReactionToggleRequest

router = APIRouter(tags=["reactions"])

ALLOWED_EMOJIS = {"❤️", "🙏", "👏", "😮", "😢", "🌟"}
READER_COOKIE_NAME = "ccoh_reader"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "").strip()
REDIS_PREFIX = "ccoh:rate"

RATE_SHORT_LIMIT = 10
RATE_SHORT_WINDOW_SECONDS = 10
RATE_MINUTE_LIMIT = 30
RATE_MINUTE_WINDOW_SECONDS = 60
RATE_HOUR_LIMIT = 200
RATE_HOUR_WINDOW_SECONDS = 3600
COOLDOWN_SHORT_SECONDS = 300
COOLDOWN_LONG_SECONDS = 900

RATE_LOG: Dict[str, deque] = defaultdict(deque)
COOLDOWNS: Dict[str, float] = {}
RATE_LOCK = Lock()

REDIS_CLIENT = None
if redis and REDIS_URL:
    try:
        REDIS_CLIENT = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        REDIS_CLIENT.ping()
    except REDIS_ERRORS:
        REDIS_CLIENT = None



def _hash_value(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()



def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "0.0.0.0"



def _ip_prefix(ip_address: str) -> str:
    if ":" in ip_address:
        pieces = ip_address.split(":")
        return ":".join(pieces[:4])
    pieces = ip_address.split(".")
    if len(pieces) >= 3:
        return ".".join(pieces[:3])
    return ip_address



def _ensure_reader_id(request: Request, response: Response) -> str:
    reader_id = request.cookies.get(READER_COOKIE_NAME)
    if reader_id and len(reader_id) <= 80:
        return reader_id

    reader_id = token_urlsafe(24)
    response.set_cookie(
        key=READER_COOKIE_NAME,
        value=reader_id,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return reader_id



def _build_fingerprint(request: Request, reader_id: str) -> tuple[str, str, str]:
    ip_address = _get_client_ip(request)
    ip_prefix = _ip_prefix(ip_address)
    user_agent = request.headers.get("user-agent", "unknown")[:200]

    fingerprint = _hash_value(f"{reader_id}|{ip_prefix}|{user_agent}")
    ip_hash = _hash_value(ip_prefix)
    user_agent_hash = _hash_value(user_agent)
    return fingerprint, ip_hash, user_agent_hash



def _raise_limit(wait_seconds: int):
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Muitas reações em sequência. Tente novamente em {wait_seconds}s.",
    )


def _enforce_rate_limit_memory(key: str, now_ts: float):
    with RATE_LOCK:
        cooldown_until = COOLDOWNS.get(key, 0)
        if cooldown_until > now_ts:
            wait_seconds = int(cooldown_until - now_ts)
            _raise_limit(wait_seconds)

        bucket = RATE_LOG[key]
        while bucket and now_ts - bucket[0] > RATE_HOUR_WINDOW_SECONDS:
            bucket.popleft()

        short_window = sum(1 for ts in bucket if now_ts - ts <= RATE_SHORT_WINDOW_SECONDS)
        minute_window = sum(1 for ts in bucket if now_ts - ts <= RATE_MINUTE_WINDOW_SECONDS)

        if short_window >= RATE_SHORT_LIMIT:
            COOLDOWNS[key] = now_ts + COOLDOWN_SHORT_SECONDS
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Atividade incomum detectada. Aguarde 5 minutos para reagir novamente.",
            )

        if minute_window >= RATE_MINUTE_LIMIT or len(bucket) >= RATE_HOUR_LIMIT:
            COOLDOWNS[key] = now_ts + COOLDOWN_LONG_SECONDS
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Limite de reações atingido. Aguarde 15 minutos e tente novamente.",
            )

        bucket.append(now_ts)


def _enforce_rate_limit_redis(key: str):
    cooldown_key = f"{REDIS_PREFIX}:cooldown:{key}"
    events_key = f"{REDIS_PREFIX}:events:{key}"
    now_ms = int(time.time() * 1000)
    hour_ago_ms = now_ms - (RATE_HOUR_WINDOW_SECONDS * 1000)
    minute_ago_ms = now_ms - (RATE_MINUTE_WINDOW_SECONDS * 1000)
    short_ago_ms = now_ms - (RATE_SHORT_WINDOW_SECONDS * 1000)

    with REDIS_CLIENT.pipeline() as pipeline:
        pipeline.ttl(cooldown_key)
        cooldown_ttl = pipeline.execute()[0]
    if cooldown_ttl and cooldown_ttl > 0:
        _raise_limit(cooldown_ttl)

    member = f"{now_ms}:{token_urlsafe(6)}"
    with REDIS_CLIENT.pipeline() as pipeline:
        pipeline.zadd(events_key, {member: now_ms})
        pipeline.zremrangebyscore(events_key, 0, hour_ago_ms)
        pipeline.zcount(events_key, short_ago_ms, "+inf")
        pipeline.zcount(events_key, minute_ago_ms, "+inf")
        pipeline.zcard(events_key)
        pipeline.expire(events_key, RATE_HOUR_WINDOW_SECONDS + 120)
        results = pipeline.execute()

    short_window = int(results[2])
    minute_window = int(results[3])
    hour_window = int(results[4])

    if short_window >= RATE_SHORT_LIMIT:
        REDIS_CLIENT.setex(cooldown_key, COOLDOWN_SHORT_SECONDS, "1")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Atividade incomum detectada. Aguarde 5 minutos para reagir novamente.",
        )

    if minute_window >= RATE_MINUTE_LIMIT or hour_window >= RATE_HOUR_LIMIT:
        REDIS_CLIENT.setex(cooldown_key, COOLDOWN_LONG_SECONDS, "1")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de reações atingido. Aguarde 15 minutos e tente novamente.",
        )


def _enforce_rate_limit(key: str, now_ts: float):
    if REDIS_CLIENT is not None:
        try:
            _enforce_rate_limit_redis(key)
            return
        except HTTPException:
            raise
        except REDIS_ERRORS:
            pass

    _enforce_rate_limit_memory(key, now_ts)



def _assert_story_public(story_id: int, db: Session) -> Story:
    story = db.query(Story).filter(Story.id == story_id, Story.status == StoryStatus.approved).first()
    if not story:
        raise HTTPException(status_code=404, detail="História não encontrada")
    return story



def _assert_not_blocked(fingerprint_hash: str, ip_hash: str, db: Session):
    now = datetime.utcnow()
    blocked = (
        db.query(ReactionBlock)
        .filter(
            (
                (ReactionBlock.fingerprint_hash == fingerprint_hash)
                | (ReactionBlock.ip_hash == ip_hash)
            ),
            (ReactionBlock.expires_at.is_(None) | (ReactionBlock.expires_at > now)),
        )
        .first()
    )
    if blocked:
        raise HTTPException(status_code=403, detail="Origem temporariamente bloqueada para reações")



def _build_summary(story_id: int, fingerprint_hash: str, db: Session) -> ReactionSummaryResponse:
    totals: dict[str, int] = {}
    rows = db.query(Reaction.emoji).filter(Reaction.story_id == story_id).all()
    for row in rows:
        totals[row[0]] = totals.get(row[0], 0) + 1

    my_reactions = [
        row[0]
        for row in db.query(Reaction.emoji)
        .filter(Reaction.story_id == story_id, Reaction.fingerprint_hash == fingerprint_hash)
        .all()
    ]
    return ReactionSummaryResponse(
        story_id=story_id,
        totals=totals,
        my_reactions=my_reactions,
        total_count=sum(totals.values()),
    )


@router.get("/api/stories/reactions/bulk")
def get_bulk_story_reactions(
    request: Request,
    response: Response,
    story_ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
):
    if not story_ids:
        return {"items": []}

    reader_id = _ensure_reader_id(request, response)
    fingerprint_hash, _, _ = _build_fingerprint(request, reader_id)

    approved_rows = (
        db.query(Story.id)
        .filter(Story.id.in_(story_ids), Story.status == StoryStatus.approved)
        .all()
    )
    approved_ids = [row[0] for row in approved_rows]
    if not approved_ids:
        return {"items": []}

    reaction_rows = (
        db.query(Reaction.story_id, Reaction.emoji, Reaction.fingerprint_hash)
        .filter(Reaction.story_id.in_(approved_ids))
        .all()
    )

    totals_by_story: dict[int, dict[str, int]] = {story_id: {} for story_id in approved_ids}
    mine_by_story: dict[int, set[str]] = {story_id: set() for story_id in approved_ids}

    for story_id, emoji, row_fingerprint in reaction_rows:
        story_totals = totals_by_story[story_id]
        story_totals[emoji] = story_totals.get(emoji, 0) + 1
        if row_fingerprint == fingerprint_hash:
            mine_by_story[story_id].add(emoji)

    items = []
    for story_id in approved_ids:
        totals = totals_by_story[story_id]
        items.append(
            ReactionSummaryResponse(
                story_id=story_id,
                totals=totals,
                my_reactions=sorted(list(mine_by_story[story_id])),
                total_count=sum(totals.values()),
            ).model_dump()
        )

    return {"items": items}


@router.get("/api/stories/{story_id}/reactions", response_model=ReactionSummaryResponse)
def get_story_reactions(story_id: int, request: Request, response: Response, db: Session = Depends(get_db)):
    _assert_story_public(story_id, db)
    reader_id = _ensure_reader_id(request, response)
    fingerprint_hash, _, _ = _build_fingerprint(request, reader_id)
    return _build_summary(story_id, fingerprint_hash, db)


@router.post("/api/stories/{story_id}/reactions", response_model=ReactionSummaryResponse)
def toggle_story_reaction(
    story_id: int,
    payload: ReactionToggleRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    if payload.emoji not in ALLOWED_EMOJIS:
        raise HTTPException(status_code=422, detail="Emoji não permitido")

    _assert_story_public(story_id, db)

    reader_id = _ensure_reader_id(request, response)
    fingerprint_hash, ip_hash, user_agent_hash = _build_fingerprint(request, reader_id)
    _assert_not_blocked(fingerprint_hash, ip_hash, db)

    now_ts = datetime.utcnow().timestamp()
    _enforce_rate_limit(f"fp:{fingerprint_hash}", now_ts)
    _enforce_rate_limit(f"ip:{ip_hash}", now_ts)

    existing = (
        db.query(Reaction)
        .filter(
            Reaction.story_id == story_id,
            Reaction.emoji == payload.emoji,
            Reaction.fingerprint_hash == fingerprint_hash,
        )
        .first()
    )

    reacted = True
    if existing:
        db.delete(existing)
        reacted = False
    else:
        db.add(
            Reaction(
                story_id=story_id,
                emoji=payload.emoji,
                fingerprint_hash=fingerprint_hash,
                ip_hash=ip_hash,
                user_agent_hash=user_agent_hash,
            )
        )

    db.commit()
    summary = _build_summary(story_id, fingerprint_hash, db)
    summary.changed_emoji = payload.emoji
    summary.changed_emoji_reacted = reacted
    return summary


@router.get("/api/admin/reactions/abuse-signals")
def get_reaction_abuse_signals(
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    _ = admin
    since = datetime.utcnow() - timedelta(hours=24)
    fingerprint_counts: dict[str, int] = {}
    ip_counts: dict[str, int] = {}

    rows = db.query(Reaction.fingerprint_hash, Reaction.ip_hash).filter(Reaction.created_at >= since).all()
    for fingerprint_hash, ip_hash in rows:
        if fingerprint_hash:
            fingerprint_counts[fingerprint_hash] = fingerprint_counts.get(fingerprint_hash, 0) + 1
        if ip_hash:
            ip_counts[ip_hash] = ip_counts.get(ip_hash, 0) + 1

    top_fingerprints = sorted(fingerprint_counts.items(), key=lambda item: item[1], reverse=True)[:20]
    top_ips = sorted(ip_counts.items(), key=lambda item: item[1], reverse=True)[:20]
    return {
        "window": "24h",
        "top_fingerprints": [{"fingerprint_hash": key, "count": total} for key, total in top_fingerprints],
        "top_ips": [{"ip_hash": key, "count": total} for key, total in top_ips],
    }


@router.post("/api/admin/reactions/block")
def block_reaction_source(
    payload: ReactionBlockCreate,
    admin: AdminUser = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    _ = admin
    if not payload.fingerprint_hash and not payload.ip_hash:
        raise HTTPException(status_code=422, detail="Informe fingerprint_hash ou ip_hash para bloquear")

    expires_at = datetime.utcnow() + timedelta(hours=payload.hours)
    db.add(
        ReactionBlock(
            fingerprint_hash=payload.fingerprint_hash,
            ip_hash=payload.ip_hash,
            reason=payload.reason,
            expires_at=expires_at,
        )
    )
    db.commit()
    return {
        "status": "blocked",
        "expires_at": expires_at.isoformat(),
        "fingerprint_hash": payload.fingerprint_hash,
        "ip_hash": payload.ip_hash,
    }
