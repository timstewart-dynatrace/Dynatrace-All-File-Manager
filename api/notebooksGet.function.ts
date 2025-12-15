import { documentsClient } from "@dynatrace-sdk/client-document";

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
          message: "Notebook ID is required",
        },
      };
    }

    const notebook = await documentsClient.getDocument({
      id: payload.id,
    });

    return {
      statusCode: 200,
      body: notebook,
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error getting notebook:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to get notebook",
        details: error.toString(),
      },
    };
  }
}
