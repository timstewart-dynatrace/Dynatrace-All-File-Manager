import { resourceClient } from "@dynatrace-sdk/client-document";

interface ContentRequest {
  fileId: string;
}

interface ContentResponse {
  success: boolean;
  content?: string;
  message?: string;
  error?: string;
}

export default async function (
  request: Request
): Promise<ContentResponse | Uint8Array> {
  try {
    const body: ContentRequest = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return {
        success: false,
        error: "No fileId provided",
      };
    }

    console.log(`Fetching content for file: ${fileId}`);

    // Fetch file from resource store
    const response = await resourceClient.getResource({
      resourcePath: fileId,
    });

    // Get the binary data
    const binary = await response.data.arrayBuffer();
    return new Uint8Array(binary);
  } catch (error) {
    console.error("Error fetching file content:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Fetch failed: ${errorMessage}`,
    };
  }
}
