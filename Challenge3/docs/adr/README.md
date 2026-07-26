# ADRs — Vitalis Clinic (heredadas de NutriFit, Challenge 2 → 3)

| ADR | Título | Estado |
| --- | --- | --- |
| [001](ADR-001-auth-strategy.md) | Estrategia de autenticación y modelo de permisos | Aceptado |
| [002](ADR-002-date-storage-timezone.md) | Almacenamiento de fecha del hábito y su límite de timezone | Aceptado (con limitación conocida, ya no aplica al dominio de citas) |
| [003](ADR-003-frontend-folder-structure.md) | Estructura de carpetas del frontend (feature-first) | Aceptado |
| [004](ADR-004-password-policy.md) | Política de contraseña, duplicada y validada en ambos lados | Aceptado |
| [005](ADR-005-prisma-driver-adapter.md) | Conexión a Postgres vía driver adapter (Prisma 7) | Aceptado |
| [006](ADR-006-railpack-install-command.md) | `RAILPACK_INSTALL_CMD=npm install` en vez del `npm ci` por defecto | Aceptado |
| [007](ADR-007-webhook-idempotency.md) | Idempotencia de webhooks de Stripe vía tabla `WebhookEvent` | Aceptado |
| [008](ADR-008-retry-strategy.md) | Retry acotado (3 intentos, backoff exponencial) para jobs en cola | Aceptado |
