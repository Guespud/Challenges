import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { load } from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Sirve el contrato OpenAPI 3.1 ya escrito a mano en docs/openapi/*.yaml
 * (no autogenerado desde las rutas — las rutas validan con Zod directo, no
 * con el `schema` de Fastify) como JSON crudo + Swagger UI en /docs. El path
 * es relativo al cwd del proceso, que en dev (tsx) y en Docker (working_dir)
 * siempre es la carpeta del servicio (services/<nombre>), dos niveles abajo
 * del root del monorepo.
 */
export async function registerDocs(app: FastifyInstance, openapiFileName: string): Promise<void> {
  const specPath = resolve(process.cwd(), '..', '..', 'docs', 'openapi', openapiFileName);
  const document = load(readFileSync(specPath, 'utf-8')) as OpenAPIV3.Document;

  await app.register(swagger, { mode: 'static', specification: { document } });
  await app.register(swaggerUi, { routePrefix: '/docs' });
}
