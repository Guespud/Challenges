# ADR-011: Versionado de APIs

**Fecha:** 2026-08-20
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Hoy ningún endpoint tiene versión en la URL (`/auth/login`, `/appointments`,
etc.) — son, implícitamente, "v1". Con 4 servicios desplegables por separado
(a diferencia del monolito, donde todo el sistema se versiona junto en cada
deploy), un cambio breaking en el contrato de un servicio puede romper al
frontend o a otro servicio que lo consume sin que ambos se enteren al mismo
tiempo. Hace falta una estrategia explícita de qué hacer cuando un contrato
necesita cambiar de forma incompatible, antes de que la primera vez que pase
sea también la primera vez que se piensa en esto.

## Opciones consideradas

1. **Versionar todo desde ya (`/v1/...` en cada ruta, en cada servicio).**
   - Pros: no hay que migrar rutas después.
   - Contras: complejidad y ceremonia por adelantado para un sistema que
     hoy tiene un solo consumidor real (el frontend propio) y cero cambios
     breaking pendientes — versionar "por si acaso" sin un caso real todavía
     es la clase de decisión que este mismo programa pide evitar (no
     sobre-diseñar para requisitos hipotéticos).
2. **Versionar por header (`Accept: application/vnd.vitalis.v2+json`).**
   - Pros: URLs limpias, es el estilo "más RESTful" según algunos.
   - Contras: mucho más difícil de debuggear a mano (curl, browser, logs no
     muestran la versión a simple vista), y ninguna herramienta del stack
     actual (Fastify, el gateway) lo necesita para nada más.
3. **No versionar hasta que haya un cambio breaking real; cuando aparezca,
   versionar por path solo en el servicio afectado (`/v2/...`), coexistiendo
   con `/v1` (implícito, sin prefijo) el tiempo que el consumidor viejo lo
   necesite** (elegida).

## Decisión

- **Aditivo no rompe nada, no necesita versión.** Agregar un campo opcional a
  una respuesta, un endpoint nuevo, un método HTTP nuevo sobre un recurso
  existente — se despliega directo, sin coordinación especial. Esta es la
  gran mayoría de los cambios esperables (ver el ejercicio de "PR contra
  reloj" de este challenge: agregar notificación SMS sin tocar Appointments,
  es aditivo por diseño).
- **Cuando un cambio es breaking** (se quita/renombra un campo, cambia el
  significado de un status code, cambia la forma de autenticación de un
  endpoint), el servicio afectado agrega el prefijo `/v2` **solo a las rutas
  que cambiaron**, y las mantiene corriendo junto a las `/v1` (implícitas)
  existentes en el mismo proceso — no hace falta desplegar dos versiones del
  servicio por separado para esto, ya que es el mismo código sirviendo dos
  formas del contrato mientras dure la migración.
- El **gateway no reescribe versiones** — pasa el path tal cual llega
  (`rewritePrefix = prefix`, ver `gateway/src/routes/proxy.routes.ts`), así
  que versionar un servicio no requiere tocar el gateway, solo el servicio
  dueño de la ruta.
- **Cada contrato OpenAPI se versiona junto con su servicio** (semver del
  documento, no del servicio): un cambio breaking en el YAML es un major
  bump del spec, aditivo es minor/patch — así el pipeline de contract tests
  (pendiente de implementar) puede fallar el build si un PR introduce un
  cambio breaking sin bump de major.
- **Deprecación:** una ruta `/v1` que fue reemplazada por `/v2` se marca
  `deprecated: true` en su OpenAPI y se documenta una fecha de retiro; no se
  borra hasta esa fecha.

## Consecuencias

- **Positivas:** cero costo de versionado para el 95% de los cambios
  (aditivos). Cuando de verdad hace falta versionar, el prefijo solo aparece
  donde el contrato cambió, no contamina servicios que no se tocaron.
- **Negativas / tradeoffs:** como hoy no hay ningún endpoint versionado
  todavía, esta es una decisión "de papel" sin validar contra un caso real
  — el primer breaking change real va a ser también la primera vez que se
  prueba este proceso en la práctica.
- **Cosas a monitorear:** si empiezan a acumularse varias rutas `/v2`
  sueltas en distintos servicios sin un plan de retiro de `/v1`, es señal de
  que hace falta un proceso más formal de deprecación (con fecha dura y
  aviso a consumidores), no solo la convención actual.

## Referencias

- `gateway/src/routes/proxy.routes.ts`
- ADR-001-auth-strategy.md (heredado — versión de contrato distinta a
  versión de token, no se mezclan)
