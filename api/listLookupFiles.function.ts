import { queryExecutionClient } from "@dynatrace-sdk/client-query";

/**
 * List Lookup Files Function
 *
 * Lists all lookup files stored in Grail using DQL query
 * Files are stored with paths starting with /lookups/
 *
 * @returns List of lookup files with metadata
 */

interface LookupFile {
  id: string; // Full file path (e.g., /lookups/myfile)
  name: string; // Filename extracted from path
  displayName?: string; // Human-readable display name
  description?: string; // File description
  size?: number; // Size in bytes
  modifiedTime?: string; // Modification timestamp
  records?: number; // Number of records
  owner?: string; // Owner email
  ownerId?: string; // Owner user ID
  lookupField?: string; // Lookup field name
  type?: string; // File type (e.g., tabular/lookup)
}

export default async function () {
  try {
    console.log("Fetching lookup files via DQL...");

    // Query to fetch all lookup files from Grail
    // The dt.system.files schema uses 'name' for the file path
    // Fetch all fields and filter for /lookups/ prefix
    const query = `fetch dt.system.files
| filter startsWith(name, "/lookups/")`;

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
    // dt.system.files schema fields: name, display_name, description, records, size,
    // user.id, user.email, modified.timestamp, lookup_field, type
    const files: LookupFile[] = records
      .map((record: unknown) => {
        const r = record as Record<string, unknown>;
        // The 'name' field contains the full path like /lookups/filename
        const filePath = (r.name as string) || "";
        // Extract just the filename from the path for display
        const fileName = filePath.split("/").pop() || filePath;

        // Parse numeric fields (API returns them as strings)
        const sizeVal = r.size;
        const recordsVal = r.records;

        return {
          id: filePath, // Use full path as id for consistency with other APIs
          name: fileName,
          displayName: (r.display_name as string) || undefined,
          description: (r.description as string) || undefined,
          size:
            typeof sizeVal === "number"
              ? sizeVal
              : typeof sizeVal === "string"
                ? parseInt(sizeVal, 10)
                : undefined,
          modifiedTime: (r["modified.timestamp"] as string) || undefined,
          records:
            typeof recordsVal === "number"
              ? recordsVal
              : typeof recordsVal === "string"
                ? parseInt(recordsVal, 10)
                : undefined,
          owner: (r["user.email"] as string) || undefined,
          ownerId: (r["user.id"] as string) || undefined,
          lookupField: (r.lookup_field as string) || undefined,
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
