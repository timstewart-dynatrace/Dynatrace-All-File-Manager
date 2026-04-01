import { environmentSharesClient } from "@dynatrace-sdk/client-document";

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

interface ShareListPayload {
  documentId?: string;
}

interface EnvironmentShare {
  id: string;
  documentId: string;
  access: string[];
  claimCount: number;
}

export default async function (payload: ShareListPayload) {
  try {
    const filter = payload.documentId ? `documentId=='${payload.documentId}'` : undefined;

    const result = await environmentSharesClient.listEnvironmentShares({
      filter,
      pageSize: 1000,
    }) as unknown as {
      "environment-shares"?: EnvironmentShare[];
      environmentShares?: EnvironmentShare[];
      totalCount?: number;
    };

    const shares = result["environment-shares"] || result.environmentShares || [];

    return {
      statusCode: 200,
      body: {
        shares,
        total: shares.length,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error listing shares:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to list shares",
        details: error.toString(),
      },
    };
  }
}
