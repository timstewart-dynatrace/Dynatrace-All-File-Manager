// Lookup Files API - List all lookup files
// This is a placeholder implementation that returns mock data
// In a full implementation, this would query Dynatrace Grail for actual lookup files

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
    console.log("Fetching lookup files...");

    // Mock data - in production, this would query Grail
    const files: LookupFile[] = [
      {
        id: "/lookups/example-1",
        name: "/lookups/example-1",
        size: 2048,
        modifiedTime: new Date().toISOString(),
        records: 100,
        owner: "system",
        type: "csv",
      },
    ];

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
