// server.js
import express from "express";
import dotenv from "dotenv";
import { CostExplorerClient, GetCostForecastCommand } from "@aws-sdk/client-cost-explorer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// AWS Cost Explorer client
const client = new CostExplorerClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Map friendly service names to AWS Cost Explorer names
const SERVICE_MAP = {
  ALL: null,
  EC2: "Amazon Elastic Compute Cloud - Compute",
  RDS: "Amazon Relational Database Service",
  VPC: "Amazon Virtual Private Cloud",
  S3: "Amazon Simple Storage Service"
};

// Function to get forecast (always returns 0 if no data)
async function getRemainingMonthForecast(serviceKey = "ALL") {
  try {
    const awsService = SERVICE_MAP[serviceKey] || null;

    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const startDate = start.toISOString().split("T")[0];

    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    const endDate = end.toISOString().split("T")[0];

    const params = {
      TimePeriod: { Start: startDate, End: endDate },
      Metric: "BLENDED_COST",
      Granularity: "MONTHLY",
    };

    if (awsService) {
      params.Filter = {
        Dimensions: { Key: "SERVICE", Values: [awsService] },
      };
    }

    const command = new GetCostForecastCommand(params);
    const result = await client.send(command);

    const forecast = result.ForecastResultsByTime?.[0];
    const amount = forecast?.MeanValue ? parseFloat(forecast.MeanValue) : 0;
    const unit = forecast?.Unit ?? "USD";

    return { service: serviceKey, amount, unit };
  } catch (err) {
    console.error("Error fetching forecast:", err);
    return { service: serviceKey, amount: 0, unit: "USD" };
  }
}

// API endpoint: /forecast?service=EC2|RDS|VPC|S3|ALL
app.get("/forecast", async (req, res) => {
  const { service } = req.query;
  const serviceKey = service ? service.toUpperCase() : "ALL";
  const forecast = await getRemainingMonthForecast(serviceKey);
  res.json(forecast);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
