"""Servicios de autenticación y gestión de usuarios.

Este módulo concentra la lógica de negocio relacionada con el ciclo de vida
de la cuenta (registro, autenticación, actualización de perfil) y la
revocación de tokens (logout). Se separa de los routes para que la lógica
sea testeable sin levantar HTTP y reutilizable desde scripts (ej. seed).
"""
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, hash_token, verify_password
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.user import UserCreate, UserUpdate


def create_user(db: Session, payload: UserCreate) -> User:
    """Crea una cuenta de usuario si el email no está registrado.

    Lanza ValueError en lugar de HTTPException para mantener este módulo
    libre de dependencias web; el route correspondiente lo traduce a 400.
    """
    # Validamos unicidad antes de hash + insert para evitar trabajo innecesario
    # y para devolver un mensaje claro en lugar de un IntegrityError genérico.
    repo = UserRepository(db)
    if repo.get_by_email(payload.email):
        raise ValueError("Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        # Nunca almacenamos la contraseña en claro: get_password_hash usa bcrypt.
        hashed_password=get_password_hash(payload.password),
    )
    return repo.add(user)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Valida credenciales y devuelve el usuario; None si no coinciden.

    Devolvemos None (no excepción) porque el caller necesita distinguir
    "credenciales inválidas" de un error inesperado.
    """
    user = UserRepository(db).get_by_email(email)
    if not user:
        # No diferenciamos "usuario inexistente" de "password incorrecta" en el mensaje
        # del route para no filtrar qué emails están registrados (mitiga user enumeration).
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    """Actualiza campos mutables del perfil. Lanza ValueError en validaciones."""
    # Solo aplicamos los campos provistos: payload usa Optional[...] para soportar PATCH parcial.
    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.email is not None and payload.email != user.email:
        # Validamos unicidad antes de mutar el modelo para que un fallo no deje el objeto sucio.
        if UserRepository(db).get_by_email(payload.email):
            raise ValueError("Email already in use")
        user.email = payload.email

    if payload.new_password is not None:
        # Exigimos current_password para evitar que un token robado permita
        # cambiar la contraseña sin reautenticación.
        if not payload.current_password:
            raise ValueError("current_password is required to set a new password")
        if not verify_password(payload.current_password, user.hashed_password):
            raise ValueError("Incorrect current password")
        user.hashed_password = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(user)
    return user


def revoke_access_token(db: Session, token: str, expires_at: datetime) -> None:
    """Inserta el hash del token en la denylist hasta su expiración.

    Guardamos el hash y no el token literal para que un dump de la tabla
    no permita reusar tokens válidos (defensa en profundidad).
    """
    # Forzamos UTC porque la BD almacena timestamps naive y comparamos contra datetime.now(UTC).
    if expires_at.tzinfo is None:
        expires_at = expires_at.astimezone().astimezone(timezone.utc)

    token_hash = hash_token(token)
    # Si el mismo token ya fue revocado (doble logout) salimos para evitar
    # violación de unique constraint y commits innecesarios.
    existing = db.scalar(select(RevokedToken).where(RevokedToken.token_hash == token_hash))
    if existing:
        return

    db.add(RevokedToken(token_hash=token_hash, expires_at=expires_at))
    db.commit()


def is_access_token_revoked(db: Session, token: str) -> bool:
    """Devuelve True si el hash del token está en la denylist y aún no expiró."""
    now = datetime.now(timezone.utc)
    # Limpieza oportunista: borramos entradas vencidas en cada chequeo para mantener
    # la tabla pequeña sin depender de un scheduler externo (cron/celery).
    db.execute(
        delete(RevokedToken)
        .where(RevokedToken.expires_at < now)
        .execution_options(synchronize_session=False)
    )
    db.commit()

    token_hash = hash_token(token)
    revoked = db.scalar(select(RevokedToken).where(RevokedToken.token_hash == token_hash))
    if not revoked:
        return False

    # Algunos backends (SQLite) devuelven datetime naive aunque guardemos en UTC;
    # forzamos tz=UTC para que la comparación sea válida.
    expires_at = revoked.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at >= now
