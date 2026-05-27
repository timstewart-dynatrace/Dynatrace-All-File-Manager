import { documentsClient } from "@dynatrace-sdk/client-document";

interface DocumentItem {
  id: string;
  name?: string;
  type?: string;
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
    console.log("Fetching files (non-notebook, non-dashboard)...");

    const allDocuments: DocumentItem[] = [];
    let nextPageKey: string | undefined = undefined;
    let pageCount = 0;
    let apiTotalCount: number | undefined = undefined;
    const MAX_PAGES = 20;

    do {
      pageCount++;

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
        filter: "type != 'notebook' and type != 'dashboard'",
        pageSize: 1000,
        sort: "-modificationInfo.lastModifiedTime",
      };

      if (nextPageKey) {
        params.pageKey = nextPageKey;
      }

      console.log(
        `Fetching page ${pageCount}${nextPageKey ? ` with nextPageKey` : " (first page)"}...`
      );
      const result = (await documentsClient.listDocuments(
        params
      )) as unknown as ListDocumentsResult;

      const totalCount = result.totalCount;
      if (totalCount !== undefined) {
        apiTotalCount = totalCount;
      }
      console.log(`Page ${pageCount}: ${result.documents?.length || 0} documents`);

      if (result.documents && result.documents.length > 0) {
        allDocuments.push(...result.documents);
      }

      if (!result.nextPageKey || result.nextPageKey === nextPageKey) {
        break;
      }

      nextPageKey = result.nextPageKey;
    } while (nextPageKey);

    console.log(
      `Total documents fetched: ${allDocuments.length} across ${pageCount} page(s)`
    );

    const files = allDocuments.map((doc: DocumentItem) => ({
      id: doc.id,
      displayName: doc.name,
      type: doc.type || "unknown",
      owner: doc.owner,
      isPrivate: doc.isPrivate,
      isPublic: doc.isPrivate === false,
      access: doc.access || [],
      createdTime: doc.modificationInfo?.createdTime || null,
      modifiedTime: doc.modificationInfo?.lastModifiedTime || null,
      createdBy: doc.modificationInfo?.createdBy || null,
      modifiedBy: doc.modificationInfo?.lastModifiedBy || null,
    }));

    files.sort((a, b) => {
      const nameA = (a.displayName || "").toLowerCase();
      const nameB = (b.displayName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    console.log(`Found ${files.length} files`);

    return {
      statusCode: 200,
      body: {
        files,
        total: files.length,
        apiTotalCount,
        debug: {
          pagesProcessed: pageCount,
          totalDocuments: allDocuments.length,
          fileCount: files.length,
          apiReportedTotal: apiTotalCount,
        },
      },
    };
  } catch (err: unknown) {
    const error = err as ApiError;
    console.error("Error listing files:", error);

    return {
      statusCode: error.statusCode || 500,
      body: {
        message: error.message || "Failed to list files",
        details: error.toString(),
      },
    };
  }
}
