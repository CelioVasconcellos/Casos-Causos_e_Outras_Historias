from datetime import datetime, timedelta
from hashlib import sha256
import os
from secrets import token_urlsafe
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request, Response
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models import AdminUser, AnonymousVisitor, DailyVisit, LoggedUserPresence
from app.schemas import PlatformCountersResponse

router = APIRouter(prefix="/api/stats", tags=["stats"])

VISITOR_COOKIE_NAME = "ccoh_visitor"
VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
ACTIVE_WINDOW_MINUTES = 15
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
PLATFORM_TIMEZONE = ZoneInfo("America/Sao_Paulo")

# User-agents de bots, crawlers e health-checks que NAO devem contar como visita real
BOT_USER_AGENT_MARKERS = (
    "bot",
    "crawler",
    "spider",
    "render",
    "uptimerobot",
    "pingdom",
    "healthcheck",
    "curl",
    "wget",
    "python-requests",
    "go-http-client",
    "headlesschrome",
    "slurp",
    "mediapartners-google",
    "postman",
    "insomnia",
    "httpie",
    "lighthouse",
    "pagespeed",
    "gtmetrix",
    "monitor",
    "probe",
    "check",
    "statuscake",
    "freshping",
    "datadog",
    "newrelic",
    "facebookexternalhit",
    "twitterbot",
    "whatsapp",
    "telegrambot",
    "discordbot",
    "slackbot",
)


def _is_bot_user_agent(user_agent: str) -> bool:
    """Detecta se o user-agent pertence a um bot, crawler ou health-check"""
    ua_lower = user_agent.lower()
    return any(marker in ua_lower for marker in BOT_USER_AGENT_MARKERS)


def _hash_value(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _platform_date():
    return datetime.now(PLATFORM_TIMEZONE).date()


def _ensure_visitor_id(request: Request, response: Response) -> str:
    visitor_id = request.cookies.get(VISITOR_COOKIE_NAME)
    if visitor_id and len(visitor_id) <= 80:
        return visitor_id

    visitor_id = token_urlsafe(24)
    response.set_cookie(
        key=VISITOR_COOKIE_NAME,
        value=visitor_id,
        max_age=VISITOR_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return visitor_id


def _get_user_id_from_auth_header(request: Request) -> int | None:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if isinstance(user_id, int):
            return user_id
    except JWTError:
        return None
    return None


def _record_anonymous_visitor(visitor_hash: str, db: Session):
    now = datetime.utcnow()
    visitor = db.query(AnonymousVisitor).filter(AnonymousVisitor.visitor_hash == visitor_hash).first()
    if visitor:
        visitor.last_seen_at = now
    else:
        db.add(AnonymousVisitor(visitor_hash=visitor_hash, first_seen_at=now, last_seen_at=now))


def _record_logged_user_presence(user_id: int, db: Session):
    now = datetime.utcnow()
    presence = db.query(LoggedUserPresence).filter(LoggedUserPresence.user_id == user_id).first()
    if presence:
        presence.last_seen_at = now
    else:
        db.add(LoggedUserPresence(user_id=user_id, first_seen_at=now, last_seen_at=now))


def _record_daily_visit(visitor_hash: str, source: str, db: Session):
    visit_date = _platform_date().isoformat()
    existing = (
        db.query(DailyVisit)
        .filter(DailyVisit.visit_date == visit_date, DailyVisit.visitor_hash == visitor_hash)
        .first()
    )
    if existing:
        return

    db.add(DailyVisit(visit_date=visit_date, visitor_hash=visitor_hash, source=source))


def _build_daily_series(days: int, db: Session) -> tuple[list[dict[str, int | str]], int]:
    labels = []
    now = _platform_date()
    for offset in range(days - 1, -1, -1):
        labels.append((now - timedelta(days=offset)).strftime("%Y-%m-%d"))

    counts = {label: 0 for label in labels}
    rows = db.query(DailyVisit.visit_date).filter(DailyVisit.visit_date.in_(labels)).all()
    for (visit_date,) in rows:
        counts[visit_date] = counts.get(visit_date, 0) + 1

    series = [{"date": label, "count": counts[label]} for label in labels]
    total = sum(item["count"] for item in series)
    return series, total


def _summary(db: Session) -> PlatformCountersResponse:
    active_since = datetime.utcnow() - timedelta(minutes=ACTIVE_WINDOW_MINUTES)
    unique_anonymous_visitors = db.query(AnonymousVisitor).count()
    tracked_logged_users = db.query(LoggedUserPresence).count()
    active_logged_users = (
        db.query(LoggedUserPresence)
        .filter(LoggedUserPresence.last_seen_at >= active_since)
        .count()
    )

    daily_7, visits_last_7_days = _build_daily_series(7, db)
    _, visits_last_30_days = _build_daily_series(30, db)
    visits_today = daily_7[-1]["count"] if daily_7 else 0

    return PlatformCountersResponse(
        unique_anonymous_visitors=unique_anonymous_visitors,
        active_logged_users=active_logged_users,
        tracked_logged_users=tracked_logged_users,
        active_window_minutes=ACTIVE_WINDOW_MINUTES,
        visits_today=visits_today,
        visits_last_7_days=visits_last_7_days,
        visits_last_30_days=visits_last_30_days,
        daily_visits_last_7_days=daily_7,
    )


@router.post("/visit", response_model=PlatformCountersResponse)
def register_visit(request: Request, response: Response, db: Session = Depends(get_db)):
    user_agent = request.headers.get("user-agent", "unknown")[:200]

    # Ignora bots, crawlers e health-checks: retorna o resumo sem registrar nada.
    # A lista de marcadores (inclui "render", "uptimerobot", user-agents headless, etc.)
    # ja e a defesa contra trafego automatizado; visitantes reais sao contados de imediato,
    # sem exigir uma segunda requisicao (isso zerava visitas legitimas de passagem unica).
    if _is_bot_user_agent(user_agent):
        return _summary(db)

    visitor_id = _ensure_visitor_id(request, response)
    visitor_hash = _hash_value(visitor_id)

    user_id = _get_user_id_from_auth_header(request)

    # Ignora visitas de administradores/moderadores: suas navegacoes nao contaminam as metricas
    if user_id is not None:
        is_admin = db.query(AdminUser).filter(AdminUser.user_id == user_id).first() is not None
        if is_admin:
            return _summary(db)

    if user_id is None:
        _record_anonymous_visitor(visitor_hash, db)
        _record_daily_visit(visitor_hash, "anonymous", db)
    else:
        _record_logged_user_presence(user_id, db)
        _record_daily_visit(visitor_hash, "logged", db)

    db.commit()
    return _summary(db)


@router.get("/summary", response_model=PlatformCountersResponse)
def get_summary(db: Session = Depends(get_db)):
    return _summary(db)
