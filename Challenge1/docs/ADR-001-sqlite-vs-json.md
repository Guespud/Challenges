# ADR-001: Usar SQLite en vez de un archivo JSON plano

**Fecha:** 2026-07-25
**Estado:** Aceptado
**Decisor(es):** Alejandro Guespud

## Contexto

El CLI `nota` necesita persistir notas localmente sin servidor ni base de datos externa. Las dos opciones evidentes para un proyecto de este tamaño son: un archivo JSON que se lee y reescribe completo en cada operación, o una base de datos embebida como SQLite.

El stack obligatorio del challenge ya especifica `better-sqlite3`, pero vale documentar por qué esa elección tiene sentido más allá de ser un requisito.

## Opciones consideradas

1. **Archivo JSON plano** — leer todo el archivo a memoria, modificar el arreglo, reescribir el archivo completo en cada operación.
   - Pros: cero dependencias, humano-legible, trivial de inspeccionar a mano.
   - Contras: no escala bien con muchas notas (reescribe todo el archivo en cada `add`/`delete`), sin garantías de integridad si el proceso se interrumpe a mitad de escritura, sin soporte nativo para filtros o búsquedas (hay que iterar en JS), riesgo de corrupción si dos procesos escriben a la vez.

2. **SQLite vía `better-sqlite3`** — base de datos embebida en un solo archivo.
   - Pros: transacciones ACID (una escritura interrumpida no corrompe el archivo completo), queries con `WHERE`/`LIKE`/`ORDER BY` en vez de filtrar en memoria, escala sin cambios de arquitectura si el volumen de notas crece, `better-sqlite3` es síncrono (encaja natural con un CLI de un solo comando por invocación, sin necesidad de manejar promesas).
   - Contras: el archivo `.db` no es legible a simple vista, agrega una dependencia nativa (requiere compilación en `npm install`).

3. **LowDB u otra librería sobre JSON** — capa de abstracción sobre archivo JSON.
   - Pros: API más cómoda que JSON crudo.
   - Contras: sigue teniendo los mismos problemas de fondo del JSON plano (reescritura completa, sin transacciones reales); agrega dependencia sin resolver la limitación central.

## Decisión

Elegimos **SQLite vía `better-sqlite3`** porque el proyecto necesita filtros (`--tag`), búsqueda por texto (`search`) y borrado por id — operaciones que SQLite resuelve de forma nativa y eficiente con SQL, mientras que en JSON plano implicarían iterar el arreglo completo en JavaScript en cada llamada. Además, al ser un CLI que se ejecuta como proceso corto (no un servidor de larga duración), la naturaleza síncrona de `better-sqlite3` simplifica el código: no hay que lidiar con `async/await` innecesario para operaciones que en la práctica son instantáneas sobre un archivo local pequeño.

## Consecuencias

- **Positivas:** las queries son más simples de escribir y más rápidas de ejecutar que filtrar arreglos en memoria; el archivo `.db` resiste mejor una interrupción a mitad de escritura que un JSON reescrito por completo; el modelo de datos es fácil de extender (agregar columnas) sin migraciones manuales de formato.
- **Negativas / tradeoffs:** el archivo `notas.db` no es inspeccionable con un editor de texto plano — si algo se ve raro, hay que usar `sqlite3` CLI o una herramienta gráfica para revisarlo. La dependencia nativa (`better-sqlite3`) puede requerir recompilación si cambia la versión de Node.
- **Cosas a monitorear:** si el archivo `.db` se corrompe (disco lleno, proceso matado a mitad de escritura), el comando `nota repair` respalda el archivo dañado y regenera uno limpio — pero esto implica pérdida de datos no recuperados manualmente. Si el proyecto creciera a necesitar sincronización entre dispositivos, SQLite por sí solo no lo resuelve y habría que evaluar una capa adicional.

## Referencias

- Documentación de `better-sqlite3`: https://github.com/WiseLibs/better-sqlite3
