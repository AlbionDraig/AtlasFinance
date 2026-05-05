"""Repositorios: capa de acceso a datos.

Cada repositorio recibe la `Session` de SQLAlchemy y expone operaciones
de persistencia para un agregado concreto. Los servicios consumen
estos repositorios para mantener la lógica de negocio desacoplada del ORM.

Beneficios:
- DIP: los servicios dependen de una abstracción por agregado, no de
  consultas SQL inline.
- Testeo: se pueden mockear repos sin tocar la BD.
- SRP: queries específicas (filtros, joins) viven en un solo lugar.
"""
from app.repositories.accounts import AccountRepository
from app.repositories.banks import BankRepository
from app.repositories.base import BaseRepository
from app.repositories.categories import CategoryRepository
from app.repositories.countries import CountryRepository
from app.repositories.investment_entities import InvestmentEntityRepository
from app.repositories.investments import InvestmentRepository
from app.repositories.pockets import PocketRepository
from app.repositories.transactions import TransactionRepository
from app.repositories.users import UserRepository

__all__ = [
    "AccountRepository",
    "BankRepository",
    "BaseRepository",
    "CategoryRepository",
    "CountryRepository",
    "InvestmentEntityRepository",
    "InvestmentRepository",
    "PocketRepository",
    "TransactionRepository",
    "UserRepository",
]
