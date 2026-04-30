"""CRUD del catálogo global de países."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.bank import Bank
from app.models.country import Country
from app.schemas.country import CountryCreate, CountryUpdate
from app.services._common import persist_and_refresh


def create_country(db: Session, payload: CountryCreate) -> Country:
    """Crear una entrada en el catálogo global de países."""
    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()

    existing_by_code = db.scalar(select(Country.id).where(Country.code == normalized_code).limit(1))
    if existing_by_code is not None:
        raise ValueError("Country code already exists")

    existing_by_name = db.scalar(
        select(Country.id)
        .where(func.lower(Country.name) == normalized_name.lower())
        .limit(1)
    )
    if existing_by_name is not None:
        raise ValueError("Country name already exists")

    country = Country(code=normalized_code, name=normalized_name)
    return persist_and_refresh(db, country)


def list_countries(db: Session) -> list[Country]:
    """Listar todos los países ordenados por nombre."""
    query = select(Country).order_by(Country.name.asc())
    return list(db.scalars(query).all())


def update_country(db: Session, country_id: int, payload: CountryUpdate) -> Country:
    """Actualizar code y/o name de un país; si cambia el code se propaga a bancos."""
    country = db.get(Country, country_id)
    if not country:
        raise ValueError(f"Country {country_id} not found")

    if payload.code is None and payload.name is None:
        raise ValueError("At least one country field must be provided")

    if payload.code is not None:
        old_code = country.code
        normalized_code = payload.code.strip().upper()
        duplicated_code = db.scalar(
            select(Country.id)
            .where(Country.code == normalized_code, Country.id != country_id)
            .limit(1)
        )
        if duplicated_code is not None:
            raise ValueError("Country code already exists")
        if old_code != normalized_code:
            banks_using_country = db.scalars(
                select(Bank).where(Bank.country_code == old_code)
            ).all()
            for bank in banks_using_country:
                bank.country_code = normalized_code
        country.code = normalized_code

    if payload.name is not None:
        normalized_name = payload.name.strip()
        duplicated_name = db.scalar(
            select(Country.id)
            .where(func.lower(Country.name) == normalized_name.lower(), Country.id != country_id)
            .limit(1)
        )
        if duplicated_name is not None:
            raise ValueError("Country name already exists")
        country.name = normalized_name

    return persist_and_refresh(db, country)


def delete_country(db: Session, country_id: int) -> None:
    """Eliminar un país del catálogo global si ningún banco lo está usando."""
    country = db.get(Country, country_id)
    if not country:
        raise ValueError(f"Country {country_id} not found")
    linked_bank_id = db.scalar(
        select(Bank.id).where(Bank.country_code == country.code).limit(1)
    )
    if linked_bank_id is not None:
        raise ValueError("Country is in use by one or more banks")
    db.delete(country)
    db.commit()
