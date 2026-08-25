import getpass

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import AdminUser, User


def main():
    Base.metadata.create_all(bind=engine)
    username = input('Usuário do moderador: ').strip()
    password = getpass.getpass('Senha do moderador: ')

    if len(username) < 3 or len(password) < 6:
        raise SystemExit('O usuário deve ter 3 caracteres e a senha, 6 no mínimo.')

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(username=username, password_hash=get_password_hash(password))
            db.add(user)
            db.flush()
        else:
            user.password_hash = get_password_hash(password)

        admin = db.query(AdminUser).filter(AdminUser.user_id == user.id).first()
        if not admin:
            db.add(AdminUser(user_id=user.id, role='moderator'))
        db.commit()
        print(f'Moderador {username} configurado com sucesso.')
    finally:
        db.close()


if __name__ == '__main__':
    main()
