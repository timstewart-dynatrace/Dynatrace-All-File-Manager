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
          message: "File ID is required",
        },
      };
    }

    const doc = (await documentsClient.getDocument({
      id: payload.id,
    })) as DocumentResponse;

    const version = doc.metadata?.version || doc.version;
    if (!version) {
      throw new Error(`Unable to retrieve version for file ${payload.id} — cannot safely update`);
    }
    console.log(`Document ${payload.id} has version: ${version}`);

    await documentsClient.updateDocument({
      id: payload.id,
      optimisticLockingVersion: version,
      body: {
        isPrivate: payload.isPrivate,
      },
    });

    const visibility = payload.isPrivate ? "private" : "public";
    console.log(`File ${payload.id} updated to ${visibility}`);

    return {
      statusCode: 200,
      body: {
        message: `File updated to ${visibility} successfully`,
        id: payload.id,
        isPrivate: payload.isPrivate,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error updating file:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to update file",
        details: error.toString(),
      },
    };
  }
}
