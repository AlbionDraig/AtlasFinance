"""CRUD del catálogo global de países."""
from sqlalchemy.orm import Session

from app.models.country import Country
from app.repositories.banks import BankRepository
from app.repositories.countries import CountryRepository
from app.schemas.country import CountryCreate, CountryUpdate


def create_country(db: Session, payload: CountryCreate) -> Country:
    """Crear una entrada en el catálogo global de países."""
    repo = CountryRepository(db)
    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()

    if repo.find_id_by_code(normalized_code) is not None:
        raise ValueError("Country code already exists")
    if repo.find_id_by_name(normalized_name) is not None:
        raise ValueError("Country name already exists")

    country = Country(code=normalized_code, name=normalized_name)
    return repo.add(country)


def list_countries(db: Session) -> list[Country]:
    """Listar todos los países ordenados por nombre."""
    return CountryRepository(db).list_all()


def update_country(db: Session, country_id: int, payload: CountryUpdate) -> Country:
    """Actualizar code y/o name de un país; si cambia el code se propaga a bancos."""
    repo = CountryRepository(db)
    country = repo.get(country_id)
    if not country:
        raise ValueError(f"Country {country_id} not found")

    if payload.code is None and payload.name is None:
        raise ValueError("At least one country field must be provided")

    if payload.code is not None:
        old_code = country.code
        normalized_code = payload.code.strip().upper()
        if repo.find_id_by_code(normalized_code, exclude_id=country_id) is not None:
            raise ValueError("Country code already exists")
        if old_code != normalized_code:
            # Propagar el cambio de código a los bancos que lo referencian.
            for bank in BankRepository(db).list_by_country_code(old_code):
                bank.country_code = normalized_code
        country.code = normalized_code

    if payload.name is not None:
        normalized_name = payload.name.strip()
        if repo.find_id_by_name(normalized_name, exclude_id=country_id) is not None:
            raise ValueError("Country name already exists")
        country.name = normalized_name

    return repo.commit_refresh(country)


def delete_country(db: Session, country_id: int) -> None:
    """Eliminar un país del catálogo global si ningún banco lo está usando."""
    repo = CountryRepository(db)
    country = repo.get(country_id)
    if not country:
        raise ValueError(f"Country {country_id} not found")
    if BankRepository(db).first_id_by_country_code(country.code) is not None:
        raise ValueError("Country is in use by one or more banks")
    repo.delete(country)
