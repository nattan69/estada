"""Bootstrap: crea el tenant i l'usuari owner inicials si la BD està buida.

Sense això no hi ha manera de crear el primer usuari (els endpoints de
`users` exigeixen token, i el token exigeix un usuari). S'executa un cop
a l'arrencada, de forma idempotent.
"""
from sqlalchemy.orm import Session

from ..config import settings
from ..models.models import Tenant, User
from .security import hash_password


def bootstrap(session: Session) -> None:
    """Crea el tenant i l'usuari owner per defecte si no n'hi ha cap."""
    if session.query(User).count() > 0:
        return  # Ja hi ha usuaris: no tocar res.

    tenant = session.query(Tenant).filter(Tenant.slug == settings.BOOTSTRAP_TENANT_SLUG).first()
    if tenant is None:
        tenant = Tenant(
            name=settings.BOOTSTRAP_TENANT_NAME,
            slug=settings.BOOTSTRAP_TENANT_SLUG,
            active=True,
        )
        session.add(tenant)
        session.flush()  # per obtenir tenant.id

    owner = User(
        tenant_id=tenant.id,
        email=settings.BOOTSTRAP_ADMIN_EMAIL,
        name='Administrador',
        password_hash=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
        role='owner',
        active=True,
    )
    session.add(owner)
    session.commit()
