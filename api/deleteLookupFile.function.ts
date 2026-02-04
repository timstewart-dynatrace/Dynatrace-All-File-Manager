import { resourceClient } from "@dynatrace-sdk/client-document";

interface DeleteRequest {
  fileId: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function (
  request: Request
): Promise<DeleteResponse> {
  try {
    const body: DeleteRequest = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return {
        success: false,
        error: "No fileId provided",
      };
    }

    console.log(`Deleting file: ${fileId}`);

    // Delete from resource store
    await resourceClient.deleteResource({
      resourcePath: fileId,
    });

    console.log(`File deleted successfully: ${fileId}`);

    return {
      success: true,
      message: `File deleted: ${fileId}`,
    };
  } catch (error) {
    console.error("Error deleting file:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Delete failed: ${errorMessage}`,
    };
  }
}
