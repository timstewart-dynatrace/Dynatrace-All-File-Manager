import { documentsClient } from "@dynatrace-sdk/client-document";

interface NotebookPayload {
  name?: string;
  displayName?: string;
  metadata?: { name?: string };
  notebook?: { name?: string };
  title?: string;
  _fileName?: string;
  [key: string]: unknown;
}

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

export default async function (payload: NotebookPayload) {
  try {
    // Validate payload
    if (!payload) {
      return {
        statusCode: 400,
        body: {
          message: "No notebook data provided",
        },
      };
    }

    // Strip _fileName before saving so the uploaded content remains unmodified
    const { _fileName, ...notebookData } = payload;

    // Log payload structure to debug name extraction
    console.log("Received payload keys:", Object.keys(payload));
    console.log("Payload sample:", JSON.stringify(payload).substring(0, 500));

    // Extract name from notebook data - Dynatrace notebooks can have name in various places:
    // - payload.name (direct property)
    // - payload.displayName (display name)
    // - payload.metadata?.name (metadata section)
    // - payload.notebook?.name (nested notebook object)
    // - payload._fileName (fallback to uploaded filename without extension)
    const fileNameWithoutExtension = _fileName?.replace(/\.json$/i, "");
    const notebookName =
      notebookData.name ||
      notebookData.displayName ||
      notebookData.metadata?.name ||
      notebookData.notebook?.name ||
      notebookData.title ||
      fileNameWithoutExtension ||
      "Untitled Notebook";

    console.log(`Extracted notebook name: "${notebookName}"`);

    // The notebook content needs to be serialized as a Blob
    const notebookContent = new Blob([JSON.stringify(notebookData)], {
      type: "application/json",
    });

    console.log(`Creating notebook: ${notebookName}`);

    const result = await documentsClient.createDocument({
      body: {
        name: notebookName,
        type: "notebook",
        content: notebookContent,
      },
    });

    console.log(`Notebook created successfully with id: ${result.id}`);

    return {
      statusCode: 200,
      body: {
        id: result.id,
        message: "Notebook created successfully",
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error creating notebook:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to create notebook",
        details: error.toString(),
      },
    };
  }
}
