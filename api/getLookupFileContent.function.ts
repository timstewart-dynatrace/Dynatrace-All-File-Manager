import { queryExecutionClient } from "@dynatrace-sdk/client-query";

/**
 * Get Lookup File Content Function
 *
 * Retrieves the content of a lookup file by querying it in Grail
 *
 * @param payload - Object containing fileId (the file path)
 * @returns File content as records and CSV string
 */

interface GetContentPayload {
  fileId: string;
}

export default async function (payload: GetContentPayload): Promise<unknown> {
  try {
    const { fileId } = payload;

    // fileId is the full path (e.g., /lookups/myfile.csv)
    const filePath = fileId;

    if (!filePath) {
      return {
        statusCode: 400,
        body: { success: false, error: "fileId is required" },
      };
    }

    // Validate file path
    if (!filePath.startsWith("/lookups/")) {
      return {
        statusCode: 400,
        body: { success: false, error: "File path must start with /lookups/" },
      };
    }

    console.log(`Loading lookup file content: ${filePath}`);

    // Query to load the lookup file content
    // Use double quotes for the file path (DQL string literal), not backticks
    const contentQuery = `load "${filePath}"`;

    const MAX_RECORDS = 100000;
    const contentResponse = await queryExecutionClient.queryExecute({
      body: {
        query: contentQuery,
        requestTimeoutMilliseconds: 30000,
        fetchTimeoutSeconds: 60,
        maxResultRecords: MAX_RECORDS,
      },
    });

    const records = contentResponse?.result?.records || [];
    const truncated = records.length >= MAX_RECORDS;

    // Convert records to CSV format
    let csvContent = "";
    if (records.length > 0) {
      // Get headers from first record
      const firstRecord = records[0] as Record<string, unknown>;
      const headers = Object.keys(firstRecord);

      // Add header row
      csvContent = headers.map(escapeCSVField).join(",") + "\n";

      // Add data rows
      for (const record of records) {
        const row = record as Record<string, unknown>;
        const values = headers.map((h) => {
          const val: unknown = row[h];
          if (val === null || val === undefined) return "";
          // Handle objects by JSON stringifying, primitives by converting to string
          if (typeof val === "object") {
            return escapeCSVField(JSON.stringify(val));
          }
          return escapeCSVField(typeof val === "string" ? val : JSON.stringify(val));
        });
        csvContent += values.join(",") + "\n";
      }
    }

    if (truncated) {
      console.warn(`getLookupFileContent: result truncated at ${MAX_RECORDS} records for ${filePath}`);
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        records,
        recordCount: records.length,
        truncated,
        csvContent,
        filePath,
      },
    };
  } catch (error) {
    console.error("Error fetching file content:", error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
    };
  }
}

/**
 * Escape a field value for CSV format
 */
function escapeCSVField(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
