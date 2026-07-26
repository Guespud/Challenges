# SPEC — CLI `nota`

## Objetivo
Herramienta de línea de comandos para gestionar notas personales con etiquetas y búsqueda. Todo local, sin servidor, sin nube. Persistencia en SQLite.

## Modelo de datos

Tabla `notes`:

| Campo      | Tipo      | Descripción                              |
|------------|-----------|-------------------------------------------|
| id         | INTEGER   | Autoincremental, clave primaria           |
| text       | TEXT      | Contenido de la nota (obligatorio)        |
| tags       | TEXT      | Lista de tags separados por coma          |
| created_at | TEXT      | Fecha ISO 8601 de creación                |

## Comandos

### `nota add "<texto>" [--tag tag1,tag2]`
- Crea una nueva nota.
- `texto` es obligatorio, no puede estar vacío.
- `--tag` es opcional. Si se pasa, se guarda como lista separada por comas.
- Salida esperada: confirma con el id asignado. Ej: `Nota #4 creada.`
- Error: si `texto` viene vacío → exit code 1, mensaje en stderr: `Error: el texto de la nota no puede estar vacío.`

### `nota list [--tag <tag>]`
- Lista todas las notas ordenadas por fecha de creación descendente.
- `--tag` opcional filtra notas que contengan ese tag.
- Salida esperada: tabla simple con id, texto (truncado a 50 caracteres), tags, fecha.
- Si no hay notas → mensaje: `No hay notas guardadas.` (no es error, exit code 0).

### `nota search "<palabra>"`
- Busca notas cuyo texto contenga la palabra (case-insensitive).
- Salida esperada: mismo formato que `list`, solo con los resultados que coinciden.
- Si no hay coincidencias → mensaje: `No se encontraron notas con "<palabra>".` (exit code 0).

### `nota delete <id>`
- Borra la nota con el id indicado.
- Si el id no existe → exit code 1, mensaje en stderr: `Error: no existe una nota con id <id>.`
- Si se borra correctamente → confirma: `Nota #<id> eliminada.`

### `nota export --format json|md`
- Exporta todas las notas a un archivo (`notas.json` o `notas.md`) en el directorio actual.
- Si `--format` no es `json` ni `md` → exit code 1, mensaje: `Error: formato no soportado. Usa "json" o "md".`
- Si se exporta correctamente → confirma: `Notas exportadas a notas.json` (o `.md`).

### `nota --help`
- Muestra ayuda con la lista de comandos, sus opciones y un ejemplo de uso por comando.

## Manejo de errores (regla general)
- Ningún error interno (excepción de SQLite, error de parseo, etc.) debe mostrarse como stack trace crudo al usuario.
- Todo error esperado: mensaje claro y corto en `stderr` + `exit code` distinto de 0.
- Si la base de datos está corrupta o inaccesible → mensaje: `Error: no se pudo acceder a la base de datos. Ejecuta "nota repair".`

## Fuera de alcance (para esta entrega)
- Modo interactivo.
- Sincronización con archivos `.md` externos.
- Publicación como paquete npm.
