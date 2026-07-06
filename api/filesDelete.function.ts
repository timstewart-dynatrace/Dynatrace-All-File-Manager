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
          message: "File ID is required",
        },
      };
    }

    const doc = (await documentsClient.getDocument({
      id: payload.id,
    })) as DocumentResponse;

    const version = doc.metadata?.version || doc.version;
    if (!version) {
      throw new Error(`Unable to retrieve version for file ${payload.id} — cannot safely delete`);
    }
    console.log(`Document ${payload.id} has version: ${version}`);

    await documentsClient.deleteDocument({
      id: payload.id,
      optimisticLockingVersion: version,
    });

    return {
      statusCode: 200,
      body: {
        message: "File deleted successfully",
        id: payload.id,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error deleting file:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to delete file",
        details: error.toString(),
      },
    };
  }
}
