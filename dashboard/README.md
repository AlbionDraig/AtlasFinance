# Dashboard local (Streamlit)

Este dashboard consume la API de Atlas Finance y muestra KPI, tendencia mensual y alertas basicas.

## Ejecutar

1. Levanta backend y base de datos.
2. Registra usuario y obtiene JWT.
3. Ejecuta:

```bash
streamlit run dashboard/app.py
```

## Campos requeridos en sidebar

- Base URL de API, por defecto `http://localhost:8000/api/v1`
- Token JWT
- Moneda objetivo (COP/USD)
- Rango de fechas
