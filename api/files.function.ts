import { documentsClient } from "@dynatrace-sdk/client-document";

interface FilePayload {
  // Document API metadata fields
  id?: string;
  name?: string;
  type?: string;
  owner?: string;
  version?: number;
  isPrivate?: boolean;
  externalId?: string;
  originAppId?: string;
  modificationInfo?: unknown;
  access?: string[];
  // Internal field for filename fallback
  _fileName?: string;
  // Everything else is content
  [key: string]: unknown;
}

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

// Fields that are Document API metadata and should not be stored as content
const METADATA_FIELDS = [
  "id",
  "name",
  "type",
  "owner",
  "version",
  "isPrivate",
  "externalId",
  "originAppId",
  "modificationInfo",
  "access",
  "_fileName",
];

export default async function (payload: FilePayload) {
  try {
    if (!payload) {
      return {
        statusCode: 400,
        body: {
          message: "No file data provided",
        },
      };
    }

    // Separate metadata from content
    const content: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!METADATA_FIELDS.includes(key)) {
        content[key] = value;
      }
    }

    // Extract document metadata
    const fileNameWithoutExtension = payload._fileName?.replace(/\.json$/i, "");
    const fileName = payload.name || fileNameWithoutExtension || "Untitled File";
    const fileType = payload.type || "file";
    const isPrivate = payload.isPrivate ?? true;
    const externalId = payload.externalId;

    console.log(`Creating file: ${fileName} (type: ${fileType}, isPrivate: ${isPrivate})`);

    const fileContent = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });

    // Note: documentsClient.createDocument always creates documents as private —
    // the body's isPrivate field is not honored on create. To make a document
    // public we must follow up with updateDocument.
    const body: {
      name: string;
      type: string;
      content: Blob;
      externalId?: string;
    } = {
      name: fileName,
      type: fileType,
      content: fileContent,
    };

    if (externalId) {
      body.externalId = externalId;
    }

    const result = await documentsClient.createDocument({ body });

    console.log(`File created successfully with id: ${result.id}`);

    if (isPrivate === false) {
      try {
        const created = (await documentsClient.getDocument({
          id: result.id,
        })) as { metadata?: { version?: string }; version?: string };
        const version = created.metadata?.version || created.version || "";
        await documentsClient.updateDocument({
          id: result.id,
          optimisticLockingVersion: version,
          body: { isPrivate: false },
        });
        console.log(`File ${result.id} updated to public`);
      } catch (updateErr: unknown) {
        const e = updateErr as ApiError;
        console.error(`Failed to set ${result.id} public after create:`, e);
        return {
          statusCode: 207,
          body: {
            id: result.id,
            message: "File created but visibility update to public failed",
            visibilityWarning: e.message || "updateDocument failed",
          },
        };
      }
    }

    return {
      statusCode: 200,
      body: {
        id: result.id,
        message: "File created successfully",
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error creating file:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to create file",
        details: error.toString(),
      },
    };
  }
}
