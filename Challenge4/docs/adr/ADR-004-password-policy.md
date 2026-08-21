# ADR-004: Política de contraseña, duplicada y validada en ambos lados

**Fecha:** 2026-07-25
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

El registro necesita una contraseña razonablemente fuerte, con feedback en vivo
para el usuario (qué falta, marcado en verde según se cumple), y — por la regla
de "cero confianza en el cliente" del SPEC — el backend no puede confiar en que
el frontend hizo bien su trabajo.

## Opciones consideradas

1. **Validar solo en el frontend.**
   - Pros: feedback inmediato, simple.
   - Contras: viola directamente "cero confianza en el cliente" — cualquiera que
     le pegue a `/auth/register` sin pasar por el formulario podría registrar una
     contraseña débil.
2. **Validar solo en el backend, sin feedback en vivo en el front.**
   - Pros: la única fuente de verdad real.
   - Contras: mala experiencia (el usuario solo se entera al enviar el form).
3. **Duplicar la misma regla en Zod, en ambos repos** — elegida.
   - Pros: feedback en vivo en el front (checklist que se pone verde por regla)
     Y el backend rechaza igual una contraseña débil si alguien se salta el
     formulario.
   - Contras: la regla vive en dos archivos (`front/.../password-rules.ts` y
     `back/.../auth.schema.ts`) que hay que mantener sincronizados a mano —
     aceptable porque son repos separados sin workspace compartido (ver nota).

## Decisión

Regla: mínimo 8 caracteres, una mayúscula, una minúscula, un número, un carácter
especial. Implementada con Zod `.refine()` encadenados en ambos repos. Además,
ambos lados aplican `.trim()` a email/password/nombre antes de validar — se
agregó después de un bug real: un password pegado con un tab (`\t`) al final
producía 401 en vez de éxito. `.trim()` es un tradeoff explícito: una contraseña
que *de verdad* tuviera espacio al final dejaría de funcionar, pero se prefirió
eliminar la fricción de copy-paste sobre ese caso extremadamente raro.

## Consecuencias

- **Positivas:** ningún registro entra con contraseña débil, sin importar si
  pasó por el formulario o no. El usuario ve exactamente qué le falta mientras
  escribe.
- **Negativas / tradeoffs:** la regla está duplicada; si cambia, hay que
  actualizar los dos archivos y no hay ningún chequeo automático que avise si se
  desincronizan.
- **Cosas a monitorear:** si el proyecto pasa a un monorepo con paquete
  compartido (`packages/shared-validation`), esta sería la primera regla a
  mover ahí — eliminaría la duplicación de raíz.

## Referencias

- `front/src/features/auth/data/password-rules.ts`
- `back/src/schemas/auth.schema.ts`
