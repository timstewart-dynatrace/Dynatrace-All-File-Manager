/**
 * Upload Lookup File Function
 *
 * Uploads a lookup file to the Resource Store in Grail
 * Requires a file path starting with /lookups/, file content, parse pattern, and lookup field
 */
export default async function (
  filePath: string,
  content: string,
  parsePattern: string,
  lookupField: string
): Promise<unknown> {
  try {
    // Validate file path
    if (!filePath.startsWith("/lookups/")) {
      return {
        success: false,
        error: "File path must start with /lookups/",
      };
    }

    // Validate file path format
    const pathRegex = /^\/[a-zA-Z0-9\-_.\/]+[a-zA-Z0-9]$/;
    if (!pathRegex.test(filePath)) {
      return {
        success: false,
        error:
          "Invalid file path format. Must contain only alphanumeric characters, -, _, ., or /",
      };
    }

    // Create form data for multipart upload
    const formData = new FormData();

    // Add content as a blob
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("content", blob, "file");

    // Add request parameters as JSON
    const requestParams = {
      filePath,
      parsePattern,
      lookupField,
    };
    formData.append(
      "request",
      new Blob([JSON.stringify(requestParams)], { type: "application/json" })
    );

    // Make API call to upload
    const response = await fetch(
      "/platform/storage/resource-store/v1/files/tabular/lookup:upload",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      filePath,
      result,
    };
  } catch (error) {
    console.error("Error uploading lookup file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
