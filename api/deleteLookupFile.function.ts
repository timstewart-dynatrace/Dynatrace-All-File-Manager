/**
 * Delete Lookup File Function
 *
 * Deletes a lookup file from the Resource Store in Grail
 *
 * @param filePath - Full path of the file to delete (must start with /lookups/)
 * @returns Deletion result
 */
export default async function (filePath: string): Promise<unknown> {
  try {
    // Validate file path
    if (!filePath.startsWith("/lookups/")) {
      return {
        success: false,
        error: "File path must start with /lookups/",
      };
    }

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
      success: true,
      filePath,
    };
  } catch (error) {
    console.error("Error deleting lookup file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
