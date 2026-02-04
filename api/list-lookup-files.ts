import { queryExecutionClient } from "@dynatrace-sdk/client-grail";

interface LookupFile {
  id: string;
  name: string;
  size?: number;
  modifiedTime?: string;
  records?: number;
  owner?: string;
  type?: string;
}

interface FileRecord {
  id?: string;
  name?: string;
  sizeInBytes?: number;
  modificationTime?: string;
  recordCount?: number;
  createdBy?: string;
  contentType?: string;
}

interface QueryResponse {
  result?: {
    records?: FileRecord[];
  };
}

export default async function () {
  try {
    console.log("Fetching lookup files from Grail...");

    // Query to fetch all lookup files from Grail
    // Lookup files are stored with paths starting with /lookups/
    const query = `fetch dt.system.files
| filter startsWith(name, "/lookups/")
| fields name, size, modificationTime, recordCount, owner, type`;

    const response: QueryResponse = await queryExecutionClient.queryExecute({
      body: {
        query,
        requestTimeoutMilliseconds: 30000,
        fetchTimeoutSeconds: 60,
      },
    });

    const records = response?.result?.records || [];

    // Map the Grail records to our LookupFile interface
    const files: LookupFile[] = records.map((record: FileRecord) => ({
      id: record.id || record.name || "",
      name: record.name || "",
      size: record.sizeInBytes,
      modifiedTime: record.modificationTime,
      records: record.recordCount,
      owner: record.createdBy,
      type: record.contentType,
    }));

    console.log(`Found ${files.length} lookup files`);

    return {
      success: true,
      files,
      count: files.length,
    };
  } catch (error) {
    console.error("Error listing lookup files:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorDetails =
      error instanceof Error && (error as any).response
        ? JSON.stringify((error as any).response)
        : "";

    return {
      success: false,
      error: `${errorMessage}${errorDetails ? " - " + errorDetails : ""}`,
      files: [],
      count: 0,
    };
  }
}
