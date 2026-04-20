from fastapi import APIRouter

from app.api.v1.routes import accounts, auth, banks, categories, ingestion, metrics, pockets, transactions

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(banks.router, prefix="/banks", tags=["banks"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(pockets.router, prefix="/pockets", tags=["pockets"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
