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

interface UpdatePayload {
  id: string;
  isPrivate?: boolean;
}

export default async function (payload: UpdatePayload) {
  try {
    if (!payload.id) {
      return {
        statusCode: 400,
        body: {
          message: "Notebook ID is required",
        },
      };
    }

    // First get the document to obtain optimisticLockingVersion
    const doc = (await documentsClient.getDocument({
      id: payload.id,
    })) as DocumentResponse;

    const version = doc.metadata?.version || doc.version || "";
    console.log(`Document ${payload.id} has version: ${version}`);

    // Update the document with the new isPrivate value
    await documentsClient.updateDocument({
      id: payload.id,
      optimisticLockingVersion: version,
      body: {
        isPrivate: payload.isPrivate,
      },
    });

    const visibility = payload.isPrivate ? "private" : "public";
    console.log(`Notebook ${payload.id} updated to ${visibility}`);

    return {
      statusCode: 200,
      body: {
        message: `Notebook updated to ${visibility} successfully`,
        id: payload.id,
        isPrivate: payload.isPrivate,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error updating notebook:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to update notebook",
        details: error.toString(),
      },
    };
  }
}
