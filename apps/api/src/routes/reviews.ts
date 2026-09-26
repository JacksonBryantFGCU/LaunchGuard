import { Router } from "express";
import { ZodError } from "zod";
import { submitReview, ReviewValidationError } from "../services/reviewService.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", (req, res) => {
  try {
    const result = submitReview(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "invalid_submission",
        message: "The review submission failed validation.",
        issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      });
      return;
    }
    if (error instanceof ReviewValidationError) {
      res.status(400).json({ error: "invalid_submission", message: error.message });
      return;
    }
    throw error;
  }
});
