import type { FastifyInstance } from 'fastify';
import { stripe } from '../lib/stripe.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import content from '../content/es.json' with { type: 'json' };
import { processCheckoutCompleted } from '../services/webhook.service.js';

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  // Scoped a este plugin (encapsulamiento de Fastify): Stripe firma el body
  // crudo, así que esta ruta necesita el buffer sin parsear como JSON. No
  // afecta al resto de las rutas registradas fuera de este plugin.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/webhooks/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new AppError(400, content.errors.invalidStripeSignature);
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(request.body as Buffer, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError(400, content.errors.invalidStripeSignature);
    }

    if (event.type === 'checkout.session.completed') {
      await processCheckoutCompleted(event, request.id);
    }

    // Siempre 200 ante un evento con firma válida, incluso si ya se procesó
    // antes (idempotencia) o si el tipo de evento no nos interesa — así Stripe
    // no lo vuelve a reintentar.
    reply.code(200).send({ received: true });
  });
}
