import { queryExecutionClient } from "@dynatrace-sdk/client-query";

// Lookup Files API - List all lookup files
// Queries Dynatrace system files via DQL using fetch dt.system.files

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

    // Query to fetch all lookup files from Grail
    const query = `fetch dt.system.files
| filter startsWith(name, "/lookups/")
| fields name, size, modified.timestamp, records, user.email, type`;

    const response = await queryExecutionClient.queryExecute({
      body: {
        query,
        requestTimeoutMilliseconds: 30000,
        fetchTimeoutSeconds: 60,
      },
    });

    // Extract records from response
    const records = response?.result?.records || [];

    console.log(`DQL returned ${records.length} records`);

    // Map the query records to our LookupFile interface
    const files: LookupFile[] = records
      .map((record: unknown) => {
        const r = record as Record<string, unknown>;
        return {
          id: (r.name as string) || "",
          name: (r.name as string) || "",
          size:
            typeof r.size === "number" ? r.size : undefined,
          modifiedTime: (r["modified.timestamp"] as string) || undefined,
          records: typeof r.records === "number" ? r.records : typeof r.records === "string" ? parseInt(r.records as string, 10) : undefined,
          owner: (r["user.email"] as string) || undefined,
          type: (r.type as string) || undefined,
        };
      })
      .filter((f) => f.id.length > 0);

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
