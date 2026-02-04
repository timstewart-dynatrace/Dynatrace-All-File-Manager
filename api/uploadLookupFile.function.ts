import { resourceClient } from "@dynatrace-sdk/client-document";

interface UploadResponse {
  success: boolean;
  fileId?: string;
  message?: string;
  error?: string;
}

export default async function (
  request: Request
): Promise<UploadResponse> {
  try {
    console.log("Processing file upload...");

    // Get form data from request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/json",
      "text/xml",
      "application/xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type not supported: ${file.type}. Supported: CSV, JSON, JSONL, XML`,
      };
    }

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: `File size exceeds limit. Max: 100MB, Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // Generate file path with /lookups/ prefix
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();
    const filePath = `/lookups/${sanitizedFileName}`;

    // Convert file to binary
    const buffer = await file.arrayBuffer();
    const binary = new Uint8Array(buffer);

    // Upload to resource store
    const response = await resourceClient.createOrUpdateResource({
      resourcePath: filePath,
      body: {
        data: binary,
        contentType: file.type,
      },
    });

    console.log(`File uploaded successfully: ${filePath}`);

    return {
      success: true,
      fileId: filePath,
      message: `File uploaded to ${filePath}`,
    };
  } catch (error) {
    console.error("Error uploading file:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Upload failed: ${errorMessage}`,
    };
  }
}
