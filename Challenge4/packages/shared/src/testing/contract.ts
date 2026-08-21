import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';
import type { IOpenAPIResponseValidator, OpenAPIResponseValidatorArgs } from 'openapi-response-validator';

// El paquete es CJS puro; bajo NodeNext el import ESM normal resuelve al
// namespace del módulo en vez de a la clase exportada por defecto. `require`
// vía createRequire evita esa fricción de interop sin perder los tipos.
const require = createRequire(import.meta.url);
const openApiResponseValidatorModule = require('openapi-response-validator') as {
  default: new (args: OpenAPIResponseValidatorArgs) => IOpenAPIResponseValidator;
};
const OpenAPIResponseValidator = openApiResponseValidatorModule.default;

/** Resuelve un "$ref": "#/a/b/c" contra el documento raíz — solo referencias internas. */
function resolveRef<T>(document: OpenAPIV3.Document, ref: string): T {
  const path = ref.replace(/^#\//, '').split('/');
  let node: unknown = document;
  for (const segment of path) {
    node = (node as Record<string, unknown>)?.[segment];
  }
  return node as T;
}

function resolveResponse(
  document: OpenAPIV3.Document,
  entry: OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject,
): OpenAPIV3.ResponseObject {
  if ('$ref' in entry) {
    return resolveRef<OpenAPIV3.ResponseObject>(document, entry.$ref);
  }
  return entry;
}

interface ContractCheckInput {
  method: string;
  /** Path con el formato del contrato, ej. "/appointments/{id}/cancel" (no el de Fastify con ":id"). */
  path: string;
  statusCode: number;
  body: unknown;
}

/**
 * Valida que una respuesta real (capturada con `app.inject()`, sin levantar
 * un puerto de verdad) cumple el schema que el propio contrato OpenAPI
 * declara para esa operación — así el contrato deja de ser documentación
 * que nadie verifica y pasa a ser algo que el CI rompe si el código y el
 * YAML se desalinean.
 */
export function createContractChecker(openapiFileName: string) {
  const specPath = resolve(process.cwd(), '..', '..', 'docs', 'openapi', openapiFileName);
  const document = load(readFileSync(specPath, 'utf-8')) as OpenAPIV3.Document;

  function check(input: ContractCheckInput): void {
    const pathItem = document.paths?.[input.path] as Record<string, OpenAPIV3.OperationObject> | undefined;
    if (!pathItem) {
      throw new Error(`El contrato no define el path "${input.path}" (¿existe en ${openapiFileName}?)`);
    }

    const operation = pathItem[input.method.toLowerCase()];
    if (!operation) {
      throw new Error(`El contrato no define ${input.method} ${input.path}`);
    }

    const responses: Record<string, { schema: OpenAPIV3.SchemaObject }> = {};
    for (const [code, responseEntry] of Object.entries(operation.responses ?? {})) {
      const response = resolveResponse(document, responseEntry as OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject);
      const schema = response.content?.['application/json']?.schema;
      if (schema) {
        responses[code] = { schema: schema as OpenAPIV3.SchemaObject };
      }
    }

    const validator = new OpenAPIResponseValidator({
      responses,
      components: document.components,
    });

    const result = validator.validateResponse(String(input.statusCode), input.body);
    if (result) {
      throw new Error(
        `${input.method} ${input.path} → ${input.statusCode} no cumple el contrato de ${openapiFileName}:\n` +
          JSON.stringify(result.errors ?? result, null, 2),
      );
    }
  }

  return { check };
}
