---
description: "Use when implementing or reviewing authentication, authorization, input validation, secrets handling, HTTP headers, rate limiting, CORS, or any security-sensitive code. Covers OWASP Top 10 applied to this stack."
applyTo: "**"
---

# Security Guidelines

## Authentication & tokens (OWASP A07)
- JWT logic lives exclusively in `app/core/security.py` — never inline token creation or validation elsewhere.
- Access tokens are set as `HttpOnly`, `SameSite=strict` cookies; `Secure=true` in production only.
- Tokens are stored hashed (`SHA-256`) for revocation checks — never store raw JWTs in the DB.
- Refresh token rotation must invalidate the previous token immediately upon use.
- Never include sensitive claims (passwords, PII) in JWT payloads.

## Authorization (OWASP A01)
- Every protected endpoint must declare a dependency on the current user via `Depends(get_current_user)`.
- Enforce resource ownership checks in the **service layer**, not in routers.
- Apply least privilege: users must never access or mutate resources that belong to other users.

## Input validation (OWASP A03)
- All external input is validated at the **Pydantic schema layer** before reaching services.
- Use `Annotated[type, Field(..., strict=True)]` for numeric boundaries; never trust raw query params.
- Never construct raw SQL strings — use SQLAlchemy ORM or parameterized queries only.
- Sanitize string inputs that will be rendered, stored, or logged.

## Secrets & configuration (OWASP A02 / A05)
- No secrets, tokens, or credentials in source code or committed `.env` files.
- Load all secrets from environment variables via `app/core/config.py` (`get_settings()`).
- Use `example.env` to document required variables without real values.

## HTTP headers & transport (OWASP A05)
- `SecurityHeadersMiddleware` is registered in `app/main.py` — do not remove or bypass it.
- Headers enforced: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production only).
- CORS origins must be explicit — never use `allow_origins=["*"]` in production.

## Rate limiting (OWASP A04)
- Sensitive endpoints (auth, registration, password reset) must use `@limiter.limit(...)` from `app/core/rate_limit.py`.
- Rate limiting is disabled in tests via `settings.rate_limit_enabled = False` — do not disable it in production code.

## Frontend security
- Never store tokens in `localStorage` or `sessionStorage` — rely on `HttpOnly` cookies set by the backend.
- Never render user-supplied content with `dangerouslySetInnerHTML`.
- Validate and sanitize any data used to build URLs or DOM attributes.
- CSP is enforced server-side; do not add inline scripts or styles that would require relaxing it.

## Logging & observability (OWASP A09)
- Log security-relevant events (failed logins, token revocations, permission denials) with structured context.
- Never log passwords, raw tokens, or full credit card / account numbers.
- Use the obfuscation helpers in `app/core/obfuscate.py` for any sensitive field that must appear in logs.

## Dependency hygiene (OWASP A06)
- Keep `requirements.txt` pinned to specific versions.
- Run `bandit -q -r backend/app -ll` before every backend PR.
- Review Dependabot alerts in `.github/dependabot.yml` promptly.

## Error responses (OWASP A05 — information exposure)
- API errors must never leak stack traces, internal paths, query details, or framework versions.
- All 5xx responses must return `{"detail": "<human message>"}` only — translate exceptions in `app/api/error_handlers.py`.
- Validation errors (422) from Pydantic are safe to return as-is; DB errors must be caught and re-raised as generic 500.

## Financial data integrity
- Monetary amounts must use `Decimal` in Python and `Numeric(14, 2)` in the DB — never `float`.
- Reject amounts ≤ 0 at the schema layer (`Field(..., gt=0)`); reject implausibly large values with an upper bound.
- Mutating operations (transfers, contributions, withdrawals) must be wrapped in an explicit DB transaction to prevent partial state.
- When the same operation may be retried (network errors, double-submit), design endpoints to be idempotent or document the risk explicitly.

## Observability without PII exposure (OWASP A09)
- Sentry is configured with `send_default_pii=False` — do not override this.
- Never pass raw request bodies, user emails, or account numbers to Sentry or any log sink.
- Use correlation IDs (`app/core/correlation.py`) to trace requests across logs without embedding personal data.

## SSRF prevention (OWASP A10)
- The app currently makes no outbound HTTP calls; if ETL or webhook integrations are added, all target URLs must come from allowlisted configuration — never from user input.
- Validate and restrict URL schemes (`https` only) and domains before any outbound request.
