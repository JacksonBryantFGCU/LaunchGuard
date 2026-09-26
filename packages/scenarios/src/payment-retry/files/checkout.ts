export const oldContent = `import type { Request, Response } from "express";
import { createPayment } from "../payments/paymentService";

export async function handleCheckout(req: Request, res: Response) {
  const { amount, currency, customerId, orderId } = req.body;

  try {
    const intent = await createPayment({ amount, currency, customerId, orderId });
    res.status(201).json({ status: "created", intentId: intent.id });
  } catch (error) {
    res.status(502).json({ status: "payment_failed" });
  }
}
`;

export const newContent = `import type { Request, Response } from "express";
import { createPayment } from "../payments/paymentService";
import { logger } from "../logger";

export async function handleCheckout(req: Request, res: Response) {
  const { amount, currency, customerId, orderId } = req.body;

  try {
    const intent = await createPayment({ amount, currency, customerId, orderId });
    res.status(201).json({ status: "created", intentId: intent.id });
  } catch (error) {
    logger.error({ orderId, error }, "checkout failed after payment retries");
    res.status(502).json({ status: "payment_failed", retried: true });
  }
}
`;
