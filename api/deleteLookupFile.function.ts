/**
 * Delete Lookup File Function
 *
 * Deletes a lookup file from the Resource Store in Grail
 *
 * @param payload - Object containing fileId (the file path)
 * @returns Deletion result
 */

interface DeletePayload {
  fileId: string;
}

export default async function (payload: DeletePayload): Promise<unknown> {
  try {
    const { fileId } = payload;

    // fileId is the full path (e.g., /lookups/myfile.csv)
    const filePath = fileId;

    if (!filePath) {
      return {
        statusCode: 400,
        body: { success: false, error: "fileId is required" },
      };
    }

    // Validate file path
    if (!filePath.startsWith("/lookups/")) {
      return {
        statusCode: 400,
        body: { success: false, error: "File path must start with /lookups/" },
      };
    }

    console.log(`Deleting lookup file: ${filePath}`);

    // Make API call to delete
    const response = await fetch(
      "/platform/storage/resource-store/v1/files:delete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete failed: ${response.status} - ${errorText}`);
    }

    return {
      statusCode: 200,
      body: { success: true, fileId, filePath },
    };
  } catch (error) {
    console.error("Error deleting lookup file:", error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}
