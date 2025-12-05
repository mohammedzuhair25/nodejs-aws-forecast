// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { createCostClient, getRemainingMonthForecast } from "./forecast.js";

// Resolve dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("ENV CHECK:", {
  AWS_REGION: process.env.AWS_REGION,
  ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID ? "LOADED" : "MISSING",
  SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "LOADED" : "MISSING",
});

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Create the AWS client from env
const client = createCostClient(
  process.env.AWS_REGION,
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY
);

// API endpoint
app.get("/forecast", async (req, res) => {
  const key = req.query.service ? req.query.service.toUpperCase() : "ALL";
  const data = await getRemainingMonthForecast(client, key);
  res.json(data);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
