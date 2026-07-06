import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getCurrentUserDetails, getEnvironmentUrl } from "@dynatrace-sdk/app-environment";
import { Page } from "@dynatrace/strato-components-preview/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Container, Flex } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { showToast } from "@dynatrace/strato-components-preview/notifications";
import {
  UploadIcon,
  DeleteIcon,
  RefreshIcon,
  DownloadIcon,
  LockIcon,
  UnlockIcon,
  LinkIcon,
  CopyIcon,
  EditIcon,
  SaveIcon,
  XmarkIcon,
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

export interface DocumentManagerConfig {
  entityName: string;        // "Notebook" | "Dashboard"
  entityNamePlural: string;  // "Notebooks" | "Dashboards"
  apiList: string;           // "/api/notebooksList"
  apiCreate: string;         // "/api/notebooks"
  apiDelete: string;         // "/api/notebooksDelete"
  apiGet: string;            // "/api/notebooksGet"
  apiUpdate: string;         // "/api/notebooksUpdate"
  apiShare: string;          // "/api/notebooksShare"
  apiShareList: string;      // "/api/notebooksShareList"
  responseKey: string;       // "notebooks" | "dashboards"
  dtLinkPath: string;        // "/ui/apps/dynatrace.notebooks/notebook/"
}

type SortField =
  | "displayName"
  | "owner"
  | "createdTime"
  | "modifiedTime"
  | "isPublic";
type SortDirection = "asc" | "desc";

interface Document {
  id: string;
  displayName: string;
  owner?: string;
  createdTime?: string;
  modifiedTime?: string;
  isPrivate?: boolean;
  isPublic?: boolean;
  access?: string[];
  shareId?: string;
  shareUrl?: string;
}

interface EnvironmentShare {
  id: string;
  documentId: string;
  access: string[];
  claimCount: number;
}

interface UploadResult {
  fileName: string;
  success: boolean;
  entityId?: string;
  error?: string;
}

interface DeleteResult {
  name: string;
  id: string;
  success: boolean;
  message: string;
}

interface UpdateResult {
  name: string;
  id: string;
  success: boolean;
  message: string;
}

interface ApiResponse {
  body?: {
    [key: string]: unknown;
    debug?: unknown;
    message?: string;
    id?: string;
  };
  [key: string]: unknown;
  id?: string;
  message?: string;
}

interface DocumentManagerProps {
  config: DocumentManagerConfig;
}

export const DocumentManager = ({ config }: DocumentManagerProps) => {
  const {
    entityName,
    entityNamePlural,
    apiList,
    apiCreate,
    apiDelete,
    apiGet,
    apiUpdate,
    apiShare,
    apiShareList,
    responseKey,
    dtLinkPath,
  } = config;

  const entityNameLower = entityName.toLowerCase();
  const entityNamePluralLower = entityNamePlural.toLowerCase();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [deleteResults, setDeleteResults] = useState<DeleteResult[]>([]);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<SortField>("displayName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showShareUrls, setShowShareUrls] = useState(false);
  const [shares, setShares] = useState<Map<string, EnvironmentShare>>(new Map());
  const [generatingShare, setGeneratingShare] = useState(false);
  const [alternateView, setAlternateView] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    // Apply "show only mine" filter
    if (showOnlyMine && currentUserId) {
      result = result.filter((n) => n.owner === currentUserId);
    }

    // Apply text filter
    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(
        (n) =>
          (n.displayName || "").toLowerCase().includes(lowerFilter) ||
          (n.owner || "").toLowerCase().includes(lowerFilter)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "displayName":
          aVal = (a.displayName || "").toLowerCase();
          bVal = (b.displayName || "").toLowerCase();
          break;
        case "owner":
          aVal = (a.owner || "").toLowerCase();
          bVal = (b.owner || "").toLowerCase();
          break;
        case "createdTime":
          aVal = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bVal = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case "modifiedTime":
          aVal = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
          bVal = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
          break;
        case "isPublic":
          aVal = a.isPublic ? 1 : 0;
          bVal = b.isPublic ? 1 : 0;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, filterText, sortField, sortDirection, showOnlyMine, currentUserId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`Calling ${apiList}...`);
      const response = await fetch(apiList, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      console.log("Response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to load ${entityNamePluralLower}: ${response.statusText}`);
      }
      const data = (await response.json()) as ApiResponse;
      console.log("Response data:", data);

      // API returns { statusCode: 200, body: { [responseKey]: [...], total: N, debug: {...} } }
      const bodyData = data.body;
      const documentList: Document[] =
        (bodyData?.[responseKey] as Document[] | undefined) ||
        (data[responseKey] as Document[] | undefined) ||
        [];
      console.log(`${entityNamePlural} array:`, documentList);
      console.log("API Debug info:", data.body?.debug);
      setDocuments(documentList);
    } catch (error) {
      showToast({
        title: `Error loading ${entityNamePluralLower}`,
        message: error instanceof Error ? error.message : "Unknown error",
        type: "critical",
      });
    } finally {
      setLoading(false);
    }
  }, [apiList, entityNamePlural, entityNamePluralLower, responseKey]);

  const loadShares = useCallback(async () => {
    console.log(`[${entityName}Manager] loadShares() called`);
    try {
      const response = await fetch(apiShareList, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      console.log(`[${entityName}Manager] loadShares response status:`, response.status);
      if (response.ok) {
        const data = await response.json() as { body?: { shares?: EnvironmentShare[] } };
        console.log(`[${entityName}Manager] loadShares raw data:`, JSON.stringify(data));
        const sharesList = data.body?.shares || [];
        console.log(`[${entityName}Manager] loadShares found`, sharesList.length, "shares");
        const sharesMap = new Map<string, EnvironmentShare>();
        sharesList.forEach((share: EnvironmentShare) => {
          console.log(`[${entityName}Manager] Mapping share:`, share.id, "-> documentId:", share.documentId);
          sharesMap.set(share.documentId, share);
        });
        setShares(sharesMap);
        console.log(`[${entityName}Manager] shares state updated with`, sharesMap.size, "entries");
      } else {
        const errorText = await response.text();
        console.error(`[${entityName}Manager] loadShares failed:`, response.status, errorText);
      }
    } catch (err) {
      console.error(`[${entityName}Manager] Failed to load shares:`, err);
    }
  }, [apiShareList, entityName]);

  useEffect(() => {
    void loadDocuments();
    void loadShares();
    // Load current user info
    try {
      const userDetails = getCurrentUserDetails();
      console.log("Current user:", userDetails);
      setCurrentUserId(userDetails.id);
    } catch (err) {
      console.error("Failed to get current user details:", err);
    }
  }, [loadDocuments, loadShares]);

  // Check if any selected document is not owned by current user
  const hasNonOwnedSelected = useMemo(() => {
    if (!currentUserId) return false;
    return Array.from(selectedDocuments).some((id) => {
      const document = documents.find((n) => n.id === id);
      return document && document.owner !== currentUserId;
    });
  }, [selectedDocuments, documents, currentUserId]);

  const handleSelectAll = () => {
    const allIds = filteredAndSortedDocuments.map((n) => n.id);
    const allSelected = allIds.every((id) => selectedDocuments.has(id));

    if (allSelected && allIds.length > 0) {
      // Deselect all
      const newSelected = new Set(selectedDocuments);
      allIds.forEach((id) => newSelected.delete(id));
      setSelectedDocuments(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedDocuments);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedDocuments(newSelected);
    }
  };

  const handleSelectDocument = (id: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocuments(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) {
      showToast({
        title: `No ${entityNamePluralLower} selected`,
        message: `Please select at least one ${entityNameLower} to delete`,
        type: "warning",
      });
      return;
    }

    // Get the names of documents to be deleted for confirmation
    const documentsToDelete = documents.filter((n) =>
      selectedDocuments.has(n.id)
    );
    const namesList = documentsToDelete
      .map((n) => `  • ${n.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to delete ${selectedDocuments.size} ${entityNameLower}(s)? This action cannot be undone.\n\n${entityNamePlural} to delete:\n${namesList}`
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteResults([]);
    const documentIds = Array.from(selectedDocuments);
    let successCount = 0;
    let failCount = 0;

    const deletedNames: string[] = [];
    const failedNames: string[] = [];
    const results: DeleteResult[] = [];

    for (const id of documentIds) {
      const document = documents.find((n) => n.id === id);
      const name = document?.displayName || id;

      try {
        console.log(`Deleting ${entityNameLower}: ${name} (${id})`);
        const response = await fetch(apiDelete, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const responseData = (await response
          .json()
          .catch(() => ({}))) as ApiResponse;
        console.log(
          `Delete response for ${name}:`,
          response.status,
          responseData
        );

        if (
          response.ok &&
          responseData.body?.message?.includes("successfully")
        ) {
          successCount++;
          deletedNames.push(name);
          results.push({
            name,
            id: (responseData.body?.id as string | undefined) || id,
            success: true,
            message: (responseData.body?.message as string | undefined) || `${entityName} deleted successfully`,
          });
        } else {
          console.error(`Failed to delete ${name}:`, responseData);
          failCount++;
          failedNames.push(name);
          results.push({
            name,
            id,
            success: false,
            message: (responseData.body?.message as string | undefined) || `Failed to delete ${entityNameLower}`,
          });
        }
      } catch (error) {
        console.error(`Error deleting ${name}:`, error);
        failCount++;
        failedNames.push(name);
        results.push({
          name,
          id,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setDeleting(false);
    setSelectedDocuments(new Set());
    setDeleteResults(results);

    if (failCount === 0 && successCount > 0) {
      showToast({
        title: "Deletion complete",
        message: `Successfully deleted: ${deletedNames.join(", ")}`,
        type: "success",
      });
    } else if (successCount === 0) {
      showToast({
        title: "Deletion failed",
        message: `Failed to delete: ${failedNames.join(", ")}`,
        type: "critical",
      });
    } else {
      showToast({
        title: "Deletion completed with errors",
        message: `Deleted: ${deletedNames.join(
          ", "
        )}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    // Force refresh the list
    console.log(`Refreshing ${entityNameLower} list after delete...`);
    await loadDocuments();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setUploadFiles(Array.from(selectedFiles));
      setUploadResults([]);
    }
  };

  const uploadDocument = async (file: File): Promise<UploadResult> => {
    try {
      const content = await file.text();
      const documentData = JSON.parse(content) as Record<string, unknown>;

      const response = await fetch(apiCreate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...documentData, _fileName: file.name }),
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ message: response.statusText }))) as {
          message?: string;
        };
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const responseData = (await response.json()) as ApiResponse;
      return {
        fileName: file.name,
        success: true,
        entityId: responseData.id,
      };
    } catch (error) {
      return {
        fileName: file.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const handleBulkUpload = async () => {
    if (uploadFiles.length === 0) {
      showToast({
        title: "No files selected",
        message: `Please select at least one ${entityNameLower} JSON file to upload`,
        type: "critical",
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (const file of uploadFiles) {
      const result = await uploadDocument(file);
      results.push(result);
      setUploadResults([...results]);
    }

    setUploading(false);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      showToast({
        title: "Upload complete",
        message: `Successfully uploaded ${successCount} ${entityNameLower}(s)`,
        type: "success",
      });
    } else {
      showToast({
        title: "Upload completed with errors",
        message: `${successCount} succeeded, ${failCount} failed`,
        type: "warning",
      });
    }

    await loadDocuments();
  };

  const handleExportSelected = async () => {
    if (selectedDocuments.size === 0) {
      showToast({
        title: `No ${entityNamePluralLower} selected`,
        message: `Please select at least one ${entityNameLower} to export`,
        type: "warning",
      });
      return;
    }

    for (const id of selectedDocuments) {
      try {
        const response = await fetch(apiGet, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });
        if (response.ok) {
          const responseData = await response.json() as { statusCode?: number; body?: unknown };
          // Extract the actual content from the API response wrapper
          const documentContent = responseData.body || responseData;
          const document = documents.find((n) => n.id === id);
          const fileName = `${document?.displayName || id}.json`;

          const blob = new Blob([JSON.stringify(documentContent, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement("a");
          a.href = url;
          a.download = fileName;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error(`Failed to export ${entityNameLower} ${id}:`, error);
      }
    }

    showToast({
      title: "Export complete",
      message: `Exported ${selectedDocuments.size} ${entityNameLower}(s)`,
      type: "success",
    });
  };

  const handleBulkToggleVisibility = async (makePrivate: boolean) => {
    if (selectedDocuments.size === 0) {
      showToast({
        title: `No ${entityNamePluralLower} selected`,
        message: `Please select at least one ${entityNameLower} to update`,
        type: "warning",
      });
      return;
    }

    const action = makePrivate ? "private" : "public";
    const documentsToUpdate = documents.filter((n) =>
      selectedDocuments.has(n.id)
    );
    const namesList = documentsToUpdate
      .map((n) => `  • ${n.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to make ${selectedDocuments.size} ${entityNameLower}(s) ${action}?\n\n${entityNamePlural} to update:\n${namesList}`
      )
    ) {
      return;
    }

    setToggling(true);
    setUpdateResults([]);
    const documentIds = Array.from(selectedDocuments);
    let successCount = 0;
    let failCount = 0;

    const successNames: string[] = [];
    const failedNames: string[] = [];
    const results: UpdateResult[] = [];

    for (const id of documentIds) {
      const document = documents.find((n) => n.id === id);
      const name = document?.displayName || id;

      try {
        console.log(`Updating ${entityNameLower}: ${name} (${id}) to ${action}`);
        const response = await fetch(apiUpdate, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, isPrivate: makePrivate }),
        });

        const responseData = (await response
          .json()
          .catch(() => ({}))) as ApiResponse;
        console.log(
          `Update response for ${name}:`,
          response.status,
          responseData
        );

        if (
          response.ok &&
          responseData.body?.message?.includes("successfully")
        ) {
          successCount++;
          successNames.push(name);
          results.push({
            name,
            id: (responseData.body?.id as string | undefined) || id,
            success: true,
            message: (responseData.body?.message as string | undefined) || `${entityName} updated successfully`,
          });
        } else {
          console.error(`Failed to update ${name}:`, responseData);
          failCount++;
          failedNames.push(name);
          results.push({
            name,
            id,
            success: false,
            message: (responseData.body?.message as string | undefined) || `Failed to update ${entityNameLower}`,
          });
        }
      } catch (error) {
        console.error(`Error updating ${name}:`, error);
        failCount++;
        failedNames.push(name);
        results.push({
          name,
          id,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setToggling(false);
    setSelectedDocuments(new Set());
    setUpdateResults(results);

    if (failCount === 0 && successCount > 0) {
      showToast({
        title: `Made ${action}`,
        message: `Successfully updated: ${successNames.join(", ")}`,
        type: "success",
      });
    } else if (successCount === 0) {
      showToast({
        title: "Update failed",
        message: `Failed to update: ${failedNames.join(", ")}. Note: Only ${entityNameLower} owners can change visibility.`,
        type: "critical",
      });
    } else {
      showToast({
        title: "Update completed with errors",
        message: `Updated: ${successNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    console.log(`Refreshing ${entityNameLower} list after visibility update...`);
    await loadDocuments();
  };

  const handleStartRename = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameValue(doc.displayName || "");
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleSaveRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      showToast({
        title: "Name cannot be empty",
        message: `Please enter a name for the ${entityNameLower}`,
        type: "warning",
      });
      return;
    }

    const document = documents.find((n) => n.id === id);
    if (trimmed === document?.displayName) {
      handleCancelRename();
      return;
    }

    setRenaming(true);
    try {
      const response = await fetch(apiUpdate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, name: trimmed }),
      });

      const responseData = (await response
        .json()
        .catch(() => ({}))) as ApiResponse;

      if (
        response.ok &&
        responseData.body?.message?.includes("successfully")
      ) {
        showToast({
          title: `${entityName} renamed`,
          message: `Renamed to "${trimmed}"`,
          type: "success",
        });
        handleCancelRename();
        await loadDocuments();
      } else {
        showToast({
          title: "Rename failed",
          message:
            (responseData.body?.message as string | undefined) ||
            `Failed to rename ${entityNameLower}`,
          type: "critical",
        });
      }
    } catch (error) {
      showToast({
        title: "Rename failed",
        message: error instanceof Error ? error.message : "Unknown error",
        type: "critical",
      });
    } finally {
      setRenaming(false);
    }
  };

  // Wrapper functions for async handlers
  const onRefreshClick = () => {
    setDeleteResults([]);
    setUploadResults([]);
    setUpdateResults([]);
    void loadDocuments();
  };

  const onBulkUploadClick = () => {
    void handleBulkUpload();
  };

  const onExportClick = () => {
    void handleExportSelected();
  };

  const onDeleteClick = () => {
    void handleBulkDelete();
  };

  const onMakePrivateClick = () => {
    void handleBulkToggleVisibility(true);
  };

  const onMakePublicClick = () => {
    void handleBulkToggleVisibility(false);
  };

  const generateShareUrl = (shareId: string): string => {
    return `${getEnvironmentUrl()}/ui/document/v0/#share=${shareId}`;
  };

  const handleGenerateShares = async () => {
    console.log(`[${entityName}Manager] handleGenerateShares() called, selected:`, selectedDocuments.size);
    if (selectedDocuments.size === 0) {
      showToast({
        title: `No ${entityNamePluralLower} selected`,
        message: `Please select at least one ${entityNameLower} to generate share links`,
        type: "warning",
      });
      return;
    }

    setGeneratingShare(true);
    let successCount = 0;
    let failCount = 0;
    let alreadyExistsCount = 0;

    for (const id of selectedDocuments) {
      console.log(`[${entityName}Manager] Processing ${entityNameLower}:`, id);
      // Skip if share already exists
      if (shares.has(id)) {
        console.log(`[${entityName}Manager] Share already exists for:`, id);
        alreadyExistsCount++;
        continue;
      }

      try {
        console.log(`[${entityName}Manager] Creating share for:`, id);
        const response = await fetch(apiShare, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: id }),
        });

        console.log(`[${entityName}Manager] Share creation response status:`, response.status);
        const responseData = await response.json() as { body?: { message?: string; shareId?: string } };
        console.log(`[${entityName}Manager] Share creation response data:`, JSON.stringify(responseData));

        if (response.ok) {
          console.log(`[${entityName}Manager] Share created successfully for:`, id, "shareId:", responseData.body?.shareId);
          successCount++;
        } else {
          if (responseData.body?.message?.includes("already exists")) {
            console.log(`[${entityName}Manager] Share already exists (API response) for:`, id);
            alreadyExistsCount++;
          } else {
            console.error(`[${entityName}Manager] Failed to create share for:`, id, responseData);
            failCount++;
          }
        }
      } catch (err) {
        console.error(`[${entityName}Manager] Exception creating share for ${id}:`, err);
        failCount++;
      }
    }

    console.log(`[${entityName}Manager] Generation complete - success:`, successCount, "failed:", failCount, "existed:", alreadyExistsCount);
    setGeneratingShare(false);

    // Refresh both documents list and shares list to update the UI
    console.log(`[${entityName}Manager] Refreshing ${entityNamePluralLower} and shares...`);
    await Promise.all([loadDocuments(), loadShares()]);
    console.log(`[${entityName}Manager] Refresh complete, shares map size:`, shares.size);

    if (successCount > 0 || alreadyExistsCount > 0) {
      showToast({
        title: "Share links generated (read-only)",
        message: `Created: ${successCount}, Already existed: ${alreadyExistsCount}${failCount > 0 ? `, Failed: ${failCount}` : ""}`,
        type: failCount > 0 ? "warning" : "success",
      });
      // Enable show share URLs toggle
      setShowShareUrls(true);
    } else {
      showToast({
        title: "Failed to generate shares",
        message: "Could not create share links. Only document owners can create shares.",
        type: "critical",
      });
    }
  };

  const onGenerateSharesClick = () => {
    void handleGenerateShares();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        title: "Copied",
        message: "Share URL copied to clipboard",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast({
        title: "Copy failed",
        message: "Could not copy to clipboard",
        type: "critical",
      });
    }
  };

  return (
    <Page>
      <Page.Header>
        <Flex flexDirection="column" gap={8}>
          <Heading level={1}>{entityName} Manager</Heading>
          <Paragraph>
            Upload, manage, export, and delete {entityNamePluralLower} in bulk.
          </Paragraph>
        </Flex>
      </Page.Header>
      <Page.Main>
        <Container>
          <Flex flexDirection="column" gap={32}>
            {/* Bulk Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Bulk Upload {entityNamePlural}</Heading>
              <Paragraph>
                Select multiple {entityNameLower} JSON files to upload them all at once.
              </Paragraph>

              <input
                type="file"
                accept=".json,application/json"
                multiple
                title={`Select ${entityNameLower} JSON files to upload`}
                onChange={handleFileChange}
                disabled={uploading}
                style={{
                  padding: "12px",
                  border: `2px dashed ${Colors.Border.Neutral.Default}`,
                  borderRadius: "4px",
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              />

              {uploadFiles.length > 0 && (
                <Paragraph>
                  <Strong>{uploadFiles.length}</Strong> file(s) selected
                </Paragraph>
              )}

              <Flex gap={16}>
                <Button
                  variant="emphasized"
                  onClick={onBulkUploadClick}
                  disabled={uploading || uploadFiles.length === 0}
                >
                  <Button.Prefix>
                    <UploadIcon />
                  </Button.Prefix>
                  {uploading ? "Uploading..." : `Upload ${entityNamePlural}`}
                </Button>
              </Flex>

              {uploadResults.length > 0 && (
                <div
                  style={{
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    padding: "16px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: Colors.Background.Surface.Default,
                  }}
                >
                  {uploadResults.map((result, index) => (
                    <Flex
                      key={index}
                      gap={12}
                      alignItems="center"
                      padding={8}
                      style={{
                        borderBottom:
                          index < uploadResults.length - 1
                            ? `1px solid ${Colors.Border.Neutral.Default}`
                            : "none",
                      }}
                    >
                      <Flex flexDirection="column" gap={4} style={{ flex: 1 }}>
                        <Strong>{result.fileName}</Strong>
                        {result.success ? (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Success.Default,
                            }}
                          >
                            Success - ID: {result.entityId}
                          </Paragraph>
                        ) : (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Critical.Default,
                            }}
                          >
                            Error: {result.error}
                          </Paragraph>
                        )}
                      </Flex>
                    </Flex>
                  ))}
                </div>
              )}
            </Flex>

            {/* Documents List Section */}
            <Flex flexDirection="column" gap={16}>
              <Flex justifyContent="space-between" alignItems="center">
                <Heading level={2}>Existing {entityNamePlural}</Heading>
                <Button onClick={onRefreshClick} disabled={loading}>
                  <Button.Prefix>
                    <RefreshIcon />
                  </Button.Prefix>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </Flex>

              {/* Filter Input */}
              <Flex gap={16} alignItems="center" flexWrap="wrap">
                <input
                  type="text"
                  placeholder="Filter by name or owner..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    backgroundColor: "transparent",
                    color: Colors.Text.Neutral.Default,
                    fontSize: "14px",
                    width: "100%",
                    maxWidth: "400px",
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: Colors.Text.Neutral.Default,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showOnlyMine}
                    onChange={(e) => setShowOnlyMine(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Show only my {entityNamePluralLower}
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: Colors.Text.Neutral.Default,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showShareUrls}
                    onChange={(e) => setShowShareUrls(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Show share URLs
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: Colors.Text.Neutral.Default,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={alternateView}
                    onChange={(e) => setAlternateView(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Simple view (for copy/paste)
                </label>
              </Flex>

              <Flex gap={16} flexWrap="wrap">
                <Button
                  variant="default"
                  onClick={handleSelectAll}
                  disabled={loading || filteredAndSortedDocuments.length === 0}
                >
                  {filteredAndSortedDocuments.every((n) =>
                    selectedDocuments.has(n.id)
                  ) && filteredAndSortedDocuments.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="default"
                  onClick={onExportClick}
                  disabled={selectedDocuments.size === 0}
                >
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  Export Selected ({selectedDocuments.size})
                </Button>
                <Button
                  variant="default"
                  onClick={onMakePrivateClick}
                  disabled={toggling || selectedDocuments.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? `Cannot modify ${entityNamePluralLower} you don't own` : undefined}
                >
                  <Button.Prefix>
                    <LockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Private"}
                </Button>
                <Button
                  color="warning"
                  onClick={onMakePublicClick}
                  disabled={toggling || selectedDocuments.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? `Cannot modify ${entityNamePluralLower} you don't own` : undefined}
                >
                  <Button.Prefix>
                    <UnlockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Public"}
                </Button>
                <Button
                  variant="default"
                  onClick={onGenerateSharesClick}
                  disabled={generatingShare || selectedDocuments.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? `Cannot create shares for ${entityNamePluralLower} you don't own` : `Generate shareable URLs for selected ${entityNamePluralLower}`}
                >
                  <Button.Prefix>
                    <LinkIcon />
                  </Button.Prefix>
                  {generatingShare ? "Generating..." : "Generate Share Links"}
                </Button>
                <Button
                  color="critical"
                  onClick={onDeleteClick}
                  disabled={deleting || selectedDocuments.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? `Cannot delete ${entityNamePluralLower} you don't own` : undefined}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {deleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedDocuments.size})`}
                </Button>
              </Flex>

              {updateResults.length > 0 && (
                <div
                  style={{
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    padding: "16px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: Colors.Background.Surface.Default,
                  }}
                >
                  {updateResults.map((result, index) => (
                    <Flex
                      key={index}
                      gap={12}
                      alignItems="center"
                      padding={8}
                      style={{
                        borderBottom:
                          index < updateResults.length - 1
                            ? `1px solid ${Colors.Border.Neutral.Default}`
                            : "none",
                      }}
                    >
                      <Flex flexDirection="column" gap={4} style={{ flex: 1 }}>
                        <Strong>{result.name}</Strong>
                        {result.success ? (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Success.Default,
                            }}
                          >
                            {result.message} - ID: {result.id}
                          </Paragraph>
                        ) : (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Critical.Default,
                            }}
                          >
                            Error: {result.message} - ID: {result.id}
                          </Paragraph>
                        )}
                      </Flex>
                    </Flex>
                  ))}
                </div>
              )}

              {deleteResults.length > 0 && (
                <div
                  style={{
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    padding: "16px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: Colors.Background.Surface.Default,
                  }}
                >
                  {deleteResults.map((result, index) => (
                    <Flex
                      key={index}
                      gap={12}
                      alignItems="center"
                      padding={8}
                      style={{
                        borderBottom:
                          index < deleteResults.length - 1
                            ? `1px solid ${Colors.Border.Neutral.Default}`
                            : "none",
                      }}
                    >
                      <Flex flexDirection="column" gap={4} style={{ flex: 1 }}>
                        <Strong>{result.name}</Strong>
                        {result.success ? (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Success.Default,
                            }}
                          >
                            {result.message} - ID: {result.id}
                          </Paragraph>
                        ) : (
                          <Paragraph
                            style={{
                              fontSize: "12px",
                              color: Colors.Text.Critical.Default,
                            }}
                          >
                            Error: {result.message} - ID: {result.id}
                          </Paragraph>
                        )}
                      </Flex>
                    </Flex>
                  ))}
                </div>
              )}

              {loading ? (
                <Flex justifyContent="center" padding={32}>
                  <Paragraph>Loading {entityNamePluralLower}...</Paragraph>
                </Flex>
              ) : alternateView ? (
                <div
                  style={{
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    maxHeight: "500px",
                    overflowY: "auto",
                    padding: "16px",
                  }}
                >
                  {filteredAndSortedDocuments
                    .filter((doc) => !showShareUrls || shares.has(doc.id))
                    .map((doc) => (
                      <div key={doc.id} style={{ marginBottom: "8px" }}>
                        {showShareUrls && shares.has(doc.id) ? (
                          <a
                            href={generateShareUrl(shares.get(doc.id)!.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: Colors.Text.Primary.Default,
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.textDecoration = "underline")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.textDecoration = "none")
                            }
                          >
                            {doc.displayName || "Unnamed"}
                          </a>
                        ) : (
                          <a
                            href={`${getEnvironmentUrl()}${dtLinkPath}${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: Colors.Text.Primary.Default,
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.textDecoration = "underline")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.textDecoration = "none")
                            }
                          >
                            {doc.displayName || "Unnamed"}
                          </a>
                        )}
                      </div>
                    ))}
                  {showShareUrls && filteredAndSortedDocuments.filter((n) => shares.has(n.id)).length === 0 && (
                    <Paragraph style={{ color: Colors.Text.Neutral.Subdued, fontStyle: "italic" }}>
                      No {entityNamePluralLower} with share links. Generate share links first.
                    </Paragraph>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: "4px",
                    maxHeight: "500px",
                    overflowY: "auto",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead
                      style={{
                        backgroundColor: Colors.Background.Surface.Default,
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            width: "40px",
                            color: Colors.Text.Neutral.Default,
                          }}
                        >
                          <input
                            type="checkbox"
                            title={`Select all ${entityNamePluralLower}`}
                            checked={
                              filteredAndSortedDocuments.length > 0 &&
                              filteredAndSortedDocuments.every((n) => selectedDocuments.has(n.id))
                            }
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("displayName")}
                          title="Sort by name"
                        >
                          Name{getSortIndicator("displayName")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("owner")}
                          title="Sort by owner"
                        >
                          Owner{getSortIndicator("owner")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("createdTime")}
                          title="Sort by created date"
                        >
                          Created{getSortIndicator("createdTime")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("modifiedTime")}
                          title="Sort by modified date"
                        >
                          Modified{getSortIndicator("modifiedTime")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("isPublic")}
                          title="Sort by visibility"
                        >
                          Visibility{getSortIndicator("isPublic")}
                        </th>
                        {showShareUrls && (
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              color: Colors.Text.Neutral.Default,
                            }}
                          >
                            Share URL
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedDocuments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={showShareUrls ? 7 : 6}
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: Colors.Text.Neutral.Default,
                            }}
                          >
                            {filterText
                              ? `No ${entityNamePluralLower} match filter`
                              : `No ${entityNamePluralLower} found`}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedDocuments.map((doc) => (
                          <tr
                            key={doc.id}
                            style={{
                              borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                              backgroundColor: selectedDocuments.has(
                                doc.id
                              )
                                ? Colors.Background.Surface.Default
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px" }}>
                              <input
                                type="checkbox"
                                title={`Select ${doc.displayName || entityNameLower}`}
                                checked={selectedDocuments.has(doc.id)}
                                onChange={() =>
                                  handleSelectDocument(doc.id)
                                }
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {renamingId === doc.id ? (
                                <Flex gap={4} alignItems="center">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={renameValue}
                                    maxLength={128}
                                    disabled={renaming}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void handleSaveRename(doc.id);
                                      if (e.key === "Escape") handleCancelRename();
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "13px",
                                      border: `1px solid ${Colors.Border.Neutral.Default}`,
                                      borderRadius: "4px",
                                      backgroundColor: "transparent",
                                      color: Colors.Text.Neutral.Default,
                                      width: "180px",
                                    }}
                                  />
                                  <Button
                                    variant="default"
                                    disabled={renaming}
                                    onClick={() => void handleSaveRename(doc.id)}
                                    title="Save"
                                  >
                                    <SaveIcon />
                                  </Button>
                                  <Button
                                    variant="default"
                                    disabled={renaming}
                                    onClick={handleCancelRename}
                                    title="Cancel"
                                  >
                                    <XmarkIcon />
                                  </Button>
                                </Flex>
                              ) : (
                                <Flex gap={4} alignItems="center">
                                  <a
                                    href={`${getEnvironmentUrl()}${dtLinkPath}${doc.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: Colors.Text.Primary.Default,
                                      textDecoration: "none",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.textDecoration =
                                        "underline")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.textDecoration =
                                        "none")
                                    }
                                  >
                                    <Strong>
                                      {doc.displayName || "Unnamed"}
                                    </Strong>
                                  </a>
                                  {currentUserId && doc.owner === currentUserId && (
                                    <Button
                                      variant="default"
                                      onClick={() => handleStartRename(doc)}
                                      title={`Rename ${entityNameLower}`}
                                    >
                                      <EditIcon />
                                    </Button>
                                  )}
                                </Flex>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {doc.owner || "N/A"}
                              {currentUserId && doc.owner === currentUserId && (
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: Colors.Background.Field.Primary.Default,
                                    color: Colors.Text.Primary.Default,
                                    fontSize: "11px",
                                    fontWeight: 500,
                                  }}
                                >
                                  Mine
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {doc.createdTime
                                ? new Date(
                                    doc.createdTime
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {doc.modifiedTime
                                ? new Date(
                                    doc.modifiedTime
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                              }}
                            >
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: doc.isPublic
                                    ? Colors.Background.Field.Warning.Default
                                    : Colors.Background.Field.Success.Default,
                                  color: doc.isPublic
                                    ? Colors.Text.Warning.Default
                                    : Colors.Text.Success.Default,
                                  fontWeight: 500,
                                }}
                              >
                                {doc.isPublic ? "PUBLIC" : "Private"}
                              </span>
                            </td>
                            {showShareUrls && (
                              <td
                                style={{
                                  padding: "12px",
                                  fontSize: "12px",
                                }}
                              >
                                {shares.has(doc.id) ? (
                                  <Flex gap={8} alignItems="center">
                                    <input
                                      type="text"
                                      readOnly
                                      title="Share URL - click to select"
                                      value={generateShareUrl(shares.get(doc.id)!.id)}
                                      style={{
                                        padding: "4px 8px",
                                        fontSize: "11px",
                                        border: `1px solid ${Colors.Border.Neutral.Default}`,
                                        borderRadius: "4px",
                                        backgroundColor: "transparent",
                                        color: Colors.Text.Neutral.Default,
                                        width: "200px",
                                      }}
                                      onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <Button
                                      variant="default"
                                      onClick={() => void copyToClipboard(generateShareUrl(shares.get(doc.id)!.id))}
                                      title="Copy share URL"
                                    >
                                      <CopyIcon />
                                    </Button>
                                  </Flex>
                                ) : (
                                  <span style={{ color: Colors.Text.Neutral.Subdued, fontStyle: "italic" }}>
                                    No share
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <Paragraph
                style={{ fontSize: "12px", color: Colors.Text.Neutral.Subdued }}
              >
                {filterText ? (
                  <>
                    Showing:{" "}
                    <Strong>{filteredAndSortedDocuments.length}</Strong> of{" "}
                    <Strong>{documents.length}</Strong> {entityNamePluralLower}
                  </>
                ) : (
                  <>
                    Total {entityNamePluralLower}: <Strong>{documents.length}</Strong>
                  </>
                )}{" "}
                | Selected: <Strong>{selectedDocuments.size}</Strong>
              </Paragraph>
            </Flex>
          </Flex>
        </Container>
      </Page.Main>
    </Page>
  );
};
