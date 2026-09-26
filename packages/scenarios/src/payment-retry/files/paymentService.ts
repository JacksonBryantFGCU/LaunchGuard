export const oldContent = `import Stripe from "stripe";
import { logger } from "../logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  customerId: string;
  orderId: string;
}

export async function createPayment(input: CreatePaymentInput) {
  const intent = await stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency,
    customer: input.customerId,
    metadata: { orderId: input.orderId },
  });

  logger.info({ orderId: input.orderId, intentId: intent.id }, "payment intent created");

  return intent;
}
`;

export const newContent = `import Stripe from "stripe";
import { logger } from "../logger";
import { shouldRetry, nextBackoffMs, MAX_ATTEMPTS } from "./retryPolicy";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  customerId: string;
  orderId: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createPayment(input: CreatePaymentInput) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const intent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        customer: input.customerId,
        metadata: { orderId: input.orderId },
      });

      logger.info({ orderId: input.orderId, intentId: intent.id, attempt }, "payment intent created");

      return intent;
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === MAX_ATTEMPTS - 1) {
        logger.error({ orderId: input.orderId, attempt }, "payment intent failed");
        throw error;
      }

      await sleep(nextBackoffMs(attempt));
    }
  }

  throw lastError;
}
`;
