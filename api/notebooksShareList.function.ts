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
  console.log("[notebooksShareList] Starting share list with payload:", JSON.stringify(payload));

  try {
    // List environment shares, optionally filtered by document ID
    const filter = payload.documentId ? `documentId=='${payload.documentId}'` : undefined;
    console.log("[notebooksShareList] Using filter:", filter || "(no filter - listing all)");

    const result = await environmentSharesClient.listEnvironmentShares({
      filter,
      pageSize: 1000,
    }) as unknown as {
      "environment-shares"?: EnvironmentShare[];
      environmentShares?: EnvironmentShare[];
      totalCount?: number;
    };

    console.log("[notebooksShareList] Raw API result:", JSON.stringify(result));
    console.log("[notebooksShareList] Result keys:", Object.keys(result || {}));

    // The API returns "environment-shares" (with hyphen)
    const shares = result["environment-shares"] || result.environmentShares || [];
    console.log("[notebooksShareList] Found", shares.length, "shares");
    if (shares.length > 0) {
      console.log("[notebooksShareList] First share:", JSON.stringify(shares[0]));
    }

    return {
      statusCode: 200,
      body: {
        shares,
        total: shares.length,
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("[notebooksShareList] ERROR listing shares:", error);
    console.error("[notebooksShareList] Error details - statusCode:", error.statusCode, "message:", error.message);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to list shares",
        details: error.toString(),
      },
    };
  }
}
