import { environmentSharesClient } from "@dynatrace-sdk/client-document";

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

interface SharePayload {
  documentId: string;
}

export default async function (payload: SharePayload) {
  console.log("[dashboardsShare] Starting share creation with payload:", JSON.stringify(payload));

  try {
    if (!payload.documentId) {
      console.log("[dashboardsShare] ERROR: No documentId provided");
      return {
        statusCode: 400,
        body: {
          message: "Document ID is required",
        },
      };
    }

    console.log("[dashboardsShare] Creating environment share for document:", payload.documentId);

    // Create environment share with read-only access (always read-only for security)
    const share = await environmentSharesClient.createEnvironmentShare({
      body: {
        documentId: payload.documentId,
        access: "read",
      },
    });

    console.log("[dashboardsShare] Share created successfully:", JSON.stringify(share));

    return {
      statusCode: 200,
      body: {
        shareId: share.id,
        documentId: share.documentId,
        access: share.access,
        claimCount: share.claimCount,
        message: "Share created successfully",
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("[dashboardsShare] ERROR creating share:", error);
    console.error("[dashboardsShare] Error details - statusCode:", error.statusCode, "message:", error.message);

    // Check if share already exists
    if (error.message?.includes("already exists")) {
      return {
        statusCode: 409,
        body: {
          message: "A share with this access level already exists for this document",
          details: error.toString(),
        },
      };
    }

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to create share",
        details: error.toString(),
      },
    };
  }
}
