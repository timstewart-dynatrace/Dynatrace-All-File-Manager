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
          message: "Dashboard ID is required",
        },
      };
    }

    // Get document metadata using listDocuments with filter
    const listResult = await documentsClient.listDocuments({
      filter: `id=='${payload.id}'`,
    }) as unknown as {
      documents?: Array<{
        id: string;
        name?: string;
        type?: string;
        owner?: string;
        version?: number;
        isPrivate?: boolean;
        externalId?: string;
      }>;
    };
    const metadata = listResult.documents?.[0] || { id: payload.id };

    // Download the actual document content
    const binaryContent = await documentsClient.downloadDocumentContent({
      id: payload.id,
    });

    // Get content as text and parse
    const textContent = await binaryContent.get("text");

    let content: unknown;
    if (textContent) {
      try {
        content = JSON.parse(textContent);
      } catch {
        content = { rawText: textContent };
      }
    } else {
      content = await binaryContent.get("json");
    }

    // Combine metadata and content for complete export
    const dashboardData = {
      id: metadata.id,
      name: metadata.name,
      type: metadata.type,
      owner: metadata.owner,
      version: metadata.version,
      isPrivate: metadata.isPrivate,
      externalId: metadata.externalId,
      ...content as object,
    };

    return {
      statusCode: 200,
      body: dashboardData,
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error getting dashboard:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to get dashboard",
        details: error.toString(),
      },
    };
  }
}
