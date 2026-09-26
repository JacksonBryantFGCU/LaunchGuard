import express from "express";

const app = express();
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(process.env.PORT ?? 3000);
