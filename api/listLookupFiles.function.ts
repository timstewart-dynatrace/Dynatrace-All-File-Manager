import { queryExecutionClient } from "@dynatrace-sdk/client-query";

// Lookup Files API - List all lookup files
// Queries Dynatrace system files via DQL

interface LookupFile {
  id: string;
  name: string;
  size?: number;
  modifiedTime?: string;
  records?: number;
  owner?: string;
  type?: string;
}

export default async function () {
  try {
    console.log("Fetching lookup files via DQL...");

    // DQL query to fetch all system files
    const query = `fetch dt.system.files | fields id, name, sizeInBytes, modificationTime, recordCount, createdBy, contentType`;

    const response = await queryExecutionClient.queryExecute({
      body: {
        query,
        requestTimeoutMilliseconds: 30000,
        fetchTimeoutSeconds: 60,
      },
    });

    // Extract records from response and filter nulls
    const rawRecords = response?.result?.records || [];
    const records = rawRecords.filter((r) => r !== null);

    // Map the query records to our LookupFile interface
    const files: LookupFile[] = records
      .map((record: unknown) => {
        const r = record as Record<string, unknown>;
        return {
          id: (r.id as string) || (r.name as string) || "",
          name: (r.name as string) || "",
          size:
            typeof r.sizeInBytes === "number" ? r.sizeInBytes : undefined,
          modifiedTime:
            r.modificationTime instanceof Date
              ? r.modificationTime.toISOString()
              : (r.modificationTime as string | undefined),
          records:
            typeof r.recordCount === "number" ? r.recordCount : undefined,
          owner: r.createdBy ? String(r.createdBy) : undefined,
          type: r.contentType ? String(r.contentType) : undefined,
        };
      })
      .filter((f) => {
        // Filter for lookup files (in /lookups/ directory)
        return f.name.includes("/lookups/") || f.name.startsWith("lookups");
      });

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

    return {
      success: false,
      error: `${errorMessage}`,
      files: [],
      count: 0,
    };
  }
}
