import { documentsClient } from "@dynatrace-sdk/client-document";

interface DocumentResponse {
  metadata?: { version?: string };
  version?: string;
}

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

export default async function (payload: { id: string }) {
  try {
    if (!payload.id) {
      return {
        statusCode: 400,
        body: {
          message: "Dashboard ID is required",
        },
      };
    }

    // First get the document to obtain optimisticLockingVersion
    const doc = (await documentsClient.getDocument({
      id: payload.id,
    })) as DocumentResponse;

    // The version is in metadata.version (from getDocument response)
    const version = doc.metadata?.version || doc.version || "";
    console.log(`Document ${payload.id} has version: ${version}`);

    await documentsClient.deleteDocument({
      id: payload.id,
      optimisticLockingVersion: version,
    });

    return {
      statusCode: 200,
      body: {
        message: "Dashboard deleted successfully",
        id: payload.id,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error deleting dashboard:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to delete dashboard",
        details: error.toString(),
      },
    };
  }
}
