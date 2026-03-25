import { documentsClient } from "@dynatrace-sdk/client-document";

interface DashboardPayload {
  name?: string;
  displayName?: string;
  metadata?: { name?: string };
  dashboard?: { name?: string };
  title?: string;
  _fileName?: string;
  [key: string]: unknown;
}

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

export default async function (payload: DashboardPayload) {
  try {
    // Validate payload
    if (!payload) {
      return {
        statusCode: 400,
        body: {
          message: "No dashboard data provided",
        },
      };
    }

    // Strip _fileName before saving so the uploaded content remains unmodified
    const { _fileName, ...dashboardData } = payload;

    // Log payload structure to debug name extraction
    console.log("Received payload keys:", Object.keys(payload));
    console.log("Payload sample:", JSON.stringify(payload).substring(0, 500));

    // Extract name from dashboard data - Dynatrace dashboards can have name in various places:
    // - payload.name (direct property)
    // - payload.displayName (display name)
    // - payload.metadata?.name (metadata section)
    // - payload.dashboard?.name (nested dashboard object)
    // - payload._fileName (fallback to uploaded filename without extension)
    const fileNameWithoutExtension = _fileName?.replace(/\.json$/i, "");
    const dashboardName =
      dashboardData.name ||
      dashboardData.displayName ||
      dashboardData.metadata?.name ||
      dashboardData.dashboard?.name ||
      dashboardData.title ||
      fileNameWithoutExtension ||
      "Untitled Dashboard";

    console.log(`Extracted dashboard name: "${dashboardName}"`);

    // The dashboard content needs to be serialized as a Blob
    const dashboardContent = new Blob([JSON.stringify(dashboardData)], {
      type: "application/json",
    });

    console.log(`Creating dashboard: ${dashboardName}`);

    const result = await documentsClient.createDocument({
      body: {
        name: dashboardName,
        type: "dashboard",
        content: dashboardContent,
      },
    });

    console.log(`Dashboard created successfully with id: ${result.id}`);

    return {
      statusCode: 200,
      body: {
        id: result.id,
        message: "Dashboard created successfully",
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error creating dashboard:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to create dashboard",
        details: error.toString(),
      },
    };
  }
}
