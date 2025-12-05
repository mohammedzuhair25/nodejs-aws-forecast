// forecast.js
import { CostExplorerClient, GetCostForecastCommand } from "@aws-sdk/client-cost-explorer";

const SERVICE_MAP = {
  ALL: null,
  EC2: "Amazon Elastic Compute Cloud - Compute",
  RDS: "Amazon Relational Database Service",
  VPC: "Amazon Virtual Private Cloud",
  S3: "Amazon Simple Storage Service",
};

// Create AWS Cost Explorer client
export function createCostClient(region, accessKeyId, secretAccessKey) {
  return new CostExplorerClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Main fetcher
export async function getRemainingMonthForecast(client, serviceKey = "ALL") {
  try {
    const svc = SERVICE_MAP[serviceKey] || null;

    const today = new Date();
    const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      .toISOString()
      .split("T")[0];

    const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1))
      .toISOString()
      .split("T")[0];

    const params = {
      TimePeriod: { Start: startDate, End: endDate },
      Metric: "BLENDED_COST",
      Granularity: "MONTHLY",
    };

    if (svc) {
      params.Filter = {
        Dimensions: {
          Key: "SERVICE",
          Values: [svc],
        },
      };
    }

    const command = new GetCostForecastCommand(params);
    const result = await client.send(command);

    const forecast = result.ForecastResultsByTime?.[0];
    const amount = forecast?.MeanValue ? parseFloat(forecast.MeanValue) : 0;

    return {
      service: serviceKey,
      amount,
      unit: forecast?.Unit || "USD",
    };
  } catch (err) {
    console.error("Forecast error:", err);
    return { service: serviceKey, amount: 0, unit: "USD" };
  }
}
