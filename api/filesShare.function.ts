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
  try {
    if (!payload.documentId) {
      return {
        statusCode: 400,
        body: {
          message: "Document ID is required",
        },
      };
    }

    const share = await environmentSharesClient.createEnvironmentShare({
      body: {
        documentId: payload.documentId,
        access: "read",
      },
    });

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
    console.error("Error creating share:", error);

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
