import { documentsClient } from "@dynatrace-sdk/client-document";

interface DocumentItem {
  id: string;
  name?: string;
  owner?: string;
  isPrivate?: boolean;
  access?: string[];
  modificationInfo?: {
    createdTime?: Date | string;
    lastModifiedTime?: Date | string;
    createdBy?: string;
    lastModifiedBy?: string;
  };
}

interface ListDocumentsResult {
  documents?: DocumentItem[];
  nextPageKey?: string;
  totalCount?: number;
}

interface ApiError {
  statusCode?: number;
  message?: string;
  toString(): string;
}

export default async function () {
  try {
    console.log("Fetching dashboards...");

    // Fetch all documents with pagination
    const allDocuments: DocumentItem[] = [];
    let nextPageKey: string | undefined = undefined;
    let pageCount = 0;
    let apiTotalCount: number | undefined = undefined;
    const MAX_PAGES = 20; // Safety limit to prevent infinite loops

    do {
      pageCount++;

      // Safety check to prevent infinite loops
      if (pageCount > MAX_PAGES) {
        console.warn(
          `Reached maximum page limit (${MAX_PAGES}), stopping pagination`
        );
        break;
      }

      const params: {
        filter: string;
        pageSize: number;
        sort: string;
        pageKey?: string;
      } = {
        filter: "type=='dashboard'", // Filter for dashboards using single quotes
        pageSize: 1000, // Maximum allowed page size
        sort: "-modificationInfo.lastModifiedTime", // Sort by last modified to ensure consistent pagination
      };

      if (nextPageKey) {
        params.pageKey = nextPageKey; // Correct parameter name is pageKey, not nextPageKey
        console.log(
          `Using pageKey from previous page: ${nextPageKey.substring(0, 50)}...`
        );
      }

      console.log(
        `Fetching page ${pageCount}${nextPageKey ? ` with nextPageKey: ${nextPageKey.substring(0, 30)}...` : " (first page)"}...`
      );
      const result = (await documentsClient.listDocuments(
        params
      )) as unknown as ListDocumentsResult;

      // Log the full response structure to understand what we're getting
      const totalCount = result.totalCount;
      if (totalCount !== undefined) {
        apiTotalCount = totalCount;
      }
      console.log(`Page ${pageCount} response:`, {
        documentsCount: result.documents?.length || 0,
        hasNextPageKey: !!result.nextPageKey,
        nextPageKeyPreview: result.nextPageKey
          ? result.nextPageKey.substring(0, 30) + "..."
          : "none",
        totalCount: totalCount,
        runningTotal: allDocuments.length + (result.documents?.length || 0),
      });

      // Log if we're not getting all documents
      if (
        totalCount &&
        allDocuments.length + (result.documents?.length || 0) < totalCount
      ) {
        console.log(
          `Note: Total accessible documents (${totalCount}) may be higher than what we can fetch`
        );
      }

      if (result.documents && result.documents.length > 0) {
        allDocuments.push(...result.documents);
      }

      // Important: Break if no nextPageKey or if it's the same as before (prevent infinite loop)
      if (!result.nextPageKey || result.nextPageKey === nextPageKey) {
        console.log("No more pages to fetch");
        break;
      }

      nextPageKey = result.nextPageKey;
    } while (nextPageKey);

    console.log(
      `Total documents fetched: ${allDocuments.length} across ${pageCount} page(s)`
    );

    // Server-side filter applied, so all documents should be dashboards
    // Log first document structure to see available fields
    if (allDocuments.length > 0) {
      console.log(
        "Sample document structure:",
        JSON.stringify(allDocuments[0], null, 2).substring(0, 1000)
      );
    }

    const dashboards = allDocuments.map((dashboard: DocumentItem) => ({
      id: dashboard.id,
      displayName: dashboard.name,
      owner: dashboard.owner,
      // Security fields - isPrivate=false means PUBLIC
      isPrivate: dashboard.isPrivate,
      isPublic: dashboard.isPrivate === false,
      access: dashboard.access || [],
      // modificationInfo contains: createdBy, createdTime, lastModifiedBy, lastModifiedTime
      createdTime: dashboard.modificationInfo?.createdTime || null,
      modifiedTime: dashboard.modificationInfo?.lastModifiedTime || null,
      createdBy: dashboard.modificationInfo?.createdBy || null,
      modifiedBy: dashboard.modificationInfo?.lastModifiedBy || null,
    }));

    // Sort dashboards alphabetically by displayName (case-insensitive)
    dashboards.sort((a, b) => {
      const nameA = (a.displayName || "").toLowerCase();
      const nameB = (b.displayName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    console.log(
      `Found ${dashboards.length} dashboards out of ${allDocuments.length} total documents`
    );

    return {
      statusCode: 200,
      body: {
        dashboards,
        total: dashboards.length,
        apiTotalCount: apiTotalCount, // Total reported by API (may be higher than what we can access)
        debug: {
          pagesProcessed: pageCount,
          totalDocuments: allDocuments.length,
          dashboardCount: dashboards.length,
          apiReportedTotal: apiTotalCount,
        },
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error listing dashboards:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to list dashboards",
        details: error.toString(),
      },
    };
  }
}
