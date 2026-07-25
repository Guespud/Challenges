# nota — CLI para gestión de notas personales

CLI local para crear, listar, buscar, exportar y eliminar notas con etiquetas. Sin servidor, sin nube — todo se guarda en un archivo SQLite en el directorio donde lo ejecutas.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

```bash
git clone <url-del-repo>
cd nota-cli
npm install
```

No requiere compilación para uso local: se ejecuta directo con `tsx`. Si prefieres compilar a JavaScript:

```bash
npm run build
node dist/cli.js --help
```

## Estructura del proyecto

```
nota-cli/
├── src/
│   ├── db.ts                  # Capa de datos: conexión SQLite, CRUD, exportación, manejo de BD corrupta
│   ├── cli.ts                 # Punto de entrada, registra los 6 comandos con commander
│   ├── commands/
│   │   ├── add.ts             # nota add "texto" --tag t1,t2
│   │   ├── list.ts            # nota list [--tag t1]
│   │   ├── search.ts          # nota search "palabra"
│   │   ├── delete.ts          # nota delete <id>
│   │   ├── export.ts          # nota export --format json|md
│   │   └── repair.ts          # nota repair
│   └── __tests__/
│       └── db.test.ts         # Tests de la capa de lógica (8 casos)
├── docs/
│   └── ADR-001-sqlite-vs-json.md
├── SPEC.md                    # Especificación escrita antes de programar
├── README.md
├── tsconfig.json
├── package.json
└── .gitignore
```

**Por qué está separado así**: `db.ts` contiene solo lógica pura (recibe una conexión, hace queries, devuelve datos o lanza errores) — no sabe nada de terminal ni de `process.exit`. Cada archivo en `commands/` es la capa fina que conecta esa lógica con la entrada/salida de consola y decide cómo mostrar errores. Esto permite testear `db.ts` con una base de datos en memoria (`:memory:`) sin tocar el sistema de archivos ni la terminal.

## Uso

```bash
npx tsx src/cli.ts <comando> [opciones]
```

### Agregar una nota

```bash
npx tsx src/cli.ts add "Comprar leche" --tag hogar,pendientes
```

### Listar notas

```bash
npx tsx src/cli.ts list
npx tsx src/cli.ts list --tag trabajo
```

### Buscar notas por palabra

```bash
npx tsx src/cli.ts search "leche"
```

### Eliminar una nota

```bash
npx tsx src/cli.ts delete 3
```

### Exportar notas

```bash
npx tsx src/cli.ts export --format json
npx tsx src/cli.ts export --format md
```

Genera `notas.json` o `notas.md` en el directorio actual.

### Reparar la base de datos

Si la base de datos se corrompe, la app no truena: te avisa y puedes ejecutar:

```bash
npx tsx src/cli.ts repair
```

Esto respalda el archivo dañado con timestamp (`notas.db.corrupted-<timestamp>.bak`) y regenera una base limpia.

### Ayuda

```bash
npx tsx src/cli.ts --help
```

## Correr los tests

```bash
npm run test
```

8 tests cubriendo la capa de lógica (`db.ts`): creación, validación de texto vacío, orden por fecha (con desempate por id), filtro por tag, búsqueda, borrado (éxito y error), y exportación a JSON.

## Decisiones tomadas

- **SQLite en vez de un archivo JSON plano** — ver `docs/ADR-001-sqlite-vs-json.md`.
- **Desempate por `id DESC` al ordenar por fecha** — dos notas creadas en el mismo milisegundo pueden tener el mismo `created_at`; el id autoincremental garantiza un orden determinista y evita tests inconsistentes (`flaky`).
- **Separación entre `db.ts` (lógica pura) y `commands/*.ts` (I/O y manejo de errores)** — permite testear la lógica sin tocar la terminal, y aislar el `process.exit()` fuera de las funciones reutilizables.
- **Errores nunca como stack trace crudo** — cada comando captura excepciones y las traduce a un mensaje claro en `stderr` con exit code distinto de 0.
- **`repair` respalda en vez de borrar** — si la base se corrompe, el archivo dañado se renombra con timestamp en vez de eliminarse, por si hay datos rescatables.

## Qué haría diferente con más tiempo

- Modo interactivo (`nota` sin argumentos abre un prompt), como estaba en los stretch goals originales.
- Subir cobertura de tests a la capa de comandos (`commands/*.ts`), actualmente solo probada manualmente.
- Comando `nota archive <id>` (soft delete) en vez de solo `delete` destructivo.
- Validar que `--tag` no acepte tags vacíos, duplicados o con espacios sin recortar.
- CI básico con GitHub Actions corriendo `npm run test` en cada push.