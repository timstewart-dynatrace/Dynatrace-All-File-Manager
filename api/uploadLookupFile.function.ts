/**
 * Upload Lookup File Function
 *
 * Uploads a lookup file to the Resource Store in Grail
 * Accepts a payload object with file details
 *
 * @param payload - Object containing filePath, content, parsePattern, and lookupField
 * @returns Upload result
 */

interface UploadPayload {
  filePath: string;
  content: string;
  parsePattern: string;
  lookupField: string;
  displayName?: string;
  description?: string;
  overwrite?: boolean;
}

export default async function (payload: UploadPayload): Promise<unknown> {
  try {
    const { filePath, content, parsePattern, lookupField, displayName, description, overwrite } = payload;

    // Validate required fields
    if (!filePath || !content || !parsePattern || !lookupField) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "Missing required fields: filePath, content, parsePattern, lookupField",
        },
      };
    }

    // Validate file path
    if (!filePath.startsWith("/lookups/")) {
      return {
        statusCode: 400,
        body: { success: false, error: "File path must start with /lookups/" },
      };
    }

    // Validate file path format — no path traversal, no consecutive dots/slashes
    const pathRegex = /^\/[a-zA-Z0-9\-_./]+[a-zA-Z0-9]$/;
    if (!pathRegex.test(filePath) || filePath.includes("..") || filePath.includes("//")) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: "Invalid file path format. Must contain only alphanumeric characters, -, _, ., or /",
        },
      };
    }

    // Validate content size (10 MB limit)
    const MAX_CONTENT_BYTES = 10 * 1024 * 1024;
    if (content.length > MAX_CONTENT_BYTES) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: `Content exceeds maximum allowed size of 10 MB (got ${(content.length / 1024 / 1024).toFixed(2)} MB)`,
        },
      };
    }

    // Validate content is non-empty after trimming
    if (!content.trim()) {
      return {
        statusCode: 400,
        body: { success: false, error: "Content must not be empty" },
      };
    }

    // Create form data for multipart upload
    const formData = new FormData();

    // Add content as a blob
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("content", blob, "file");

    // Add request parameters as JSON
    const requestParams: Record<string, unknown> = {
      filePath,
      parsePattern,
      lookupField,
    };

    // Only add overwrite if explicitly requested
    if (overwrite) {
      requestParams.overwrite = true;
    }

    // Add optional fields if provided
    if (displayName) {
      requestParams.displayName = displayName;
    }
    if (description) {
      requestParams.description = description;
    }

    formData.append(
      "request",
      new Blob([JSON.stringify(requestParams)], { type: "application/json" })
    );

    console.log(`Uploading lookup file to ${filePath}`);

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

    const result: unknown = await response.json();

    return {
      statusCode: 200,
      body: {
        success: true,
        fileId: filePath,
        filePath,
        result: result as Record<string, unknown>,
      },
    };
  } catch (error) {
    console.error("Error uploading lookup file:", error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}
