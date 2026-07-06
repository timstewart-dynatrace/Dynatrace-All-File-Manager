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
  name?: string;
  isPrivate?: boolean;
}

export default async function (payload: UpdatePayload) {
  try {
    if (!payload.id) {
      return {
        statusCode: 400,
        body: {
          message: "Dashboard ID is required",
        },
      };
    }

    if (payload.name === undefined && payload.isPrivate === undefined) {
      return {
        statusCode: 400,
        body: {
          message: "Nothing to update: provide name and/or isPrivate",
        },
      };
    }

    if (payload.name !== undefined && payload.name.trim().length === 0) {
      return {
        statusCode: 400,
        body: {
          message: "Dashboard name cannot be empty",
        },
      };
    }

    // First get the document to obtain optimisticLockingVersion
    const doc = (await documentsClient.getDocument({
      id: payload.id,
    })) as DocumentResponse;

    const version = doc.metadata?.version || doc.version;
    if (!version) {
      throw new Error(`Unable to retrieve version for dashboard ${payload.id} — cannot safely update`);
    }
    console.log(`Document ${payload.id} has version: ${version}`);

    const updateBody: { name?: string; isPrivate?: boolean } = {};
    if (payload.name !== undefined) updateBody.name = payload.name.trim();
    if (payload.isPrivate !== undefined) updateBody.isPrivate = payload.isPrivate;

    await documentsClient.updateDocument({
      id: payload.id,
      optimisticLockingVersion: version,
      body: updateBody,
    });

    let message: string;
    if (payload.name !== undefined && payload.isPrivate !== undefined) {
      const visibility = payload.isPrivate ? "private" : "public";
      message = `Dashboard renamed and updated to ${visibility} successfully`;
    } else if (payload.name !== undefined) {
      message = "Dashboard renamed successfully";
    } else {
      const visibility = payload.isPrivate ? "private" : "public";
      message = `Dashboard updated to ${visibility} successfully`;
    }
    console.log(`Dashboard ${payload.id}: ${message}`);

    return {
      statusCode: 200,
      body: {
        message,
        id: payload.id,
        ...(payload.name !== undefined && { name: updateBody.name }),
        ...(payload.isPrivate !== undefined && { isPrivate: payload.isPrivate }),
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error updating dashboard:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to update dashboard",
        details: error.toString(),
      },
    };
  }
}
