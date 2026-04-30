"""Fachada de los servicios financieros.

Mantenida por compatibilidad: rutas y tests existentes importan desde este
módulo. La lógica real vive en módulos por dominio que respetan SRP:

- `banks_service` — bancos del usuario.
- `accounts_service` — cuentas bancarias.
- `pockets_service` — bolsillos y movimientos a bolsillo.
- `investment_entities_service` — entidades de inversión.
- `investments_service` — inversiones del usuario.
- `categories_service` — catálogo global de categorías.
- `countries_service` — catálogo global de países.
- `transactions_service` — registros, transferencias y listados.
- `metrics_service` — agregados del dashboard.

Reexportar aquí evita romper los imports `from app.services.finance_service import ...`
mientras los nuevos módulos pueden ser importados directamente para nuevo código.
"""
# pylint: disable=unused-import
from app.services.accounts_service import (
    create_account,
    delete_account,
    list_accounts,
    update_account,
)
from app.services.banks_service import (
    create_bank,
    delete_bank,
    list_banks,
    update_bank,
)
from app.services.categories_service import (
    create_category,
    delete_category,
    list_categories,
    update_category,
)
from app.services.countries_service import (
    create_country,
    delete_country,
    list_countries,
    update_country,
)
from app.services.investment_entities_service import (
    create_investment_entity,
    delete_investment_entity,
    list_investment_entities,
    update_investment_entity,
)
from app.services.investments_service import (
    create_investment,
    delete_investment,
    get_investment,
    list_investments,
    update_investment,
)
from app.services.metrics_service import (
    get_dashboard_aggregates,
    get_dashboard_metrics,
)
from app.services.pockets_service import (
    create_pocket,
    delete_pocket,
    get_pocket,
    list_pockets,
    move_amount_to_pocket,
    update_pocket,
)
from app.services.transactions_service import (
    create_transfer,
    delete_transaction,
    list_transactions,
    register_transaction,
    update_transaction,
)

__all__ = [
    "create_account",
    "create_bank",
    "create_category",
    "create_country",
    "create_investment",
    "create_investment_entity",
    "create_pocket",
    "create_transfer",
    "delete_account",
    "delete_bank",
    "delete_category",
    "delete_country",
    "delete_investment",
    "delete_investment_entity",
    "delete_pocket",
    "delete_transaction",
    "get_dashboard_aggregates",
    "get_dashboard_metrics",
    "get_investment",
    "get_pocket",
    "list_accounts",
    "list_banks",
    "list_categories",
    "list_countries",
    "list_investment_entities",
    "list_investments",
    "list_pockets",
    "list_transactions",
    "move_amount_to_pocket",
    "register_transaction",
    "update_account",
    "update_bank",
    "update_category",
    "update_country",
    "update_investment",
    "update_investment_entity",
    "update_pocket",
    "update_transaction",
]
