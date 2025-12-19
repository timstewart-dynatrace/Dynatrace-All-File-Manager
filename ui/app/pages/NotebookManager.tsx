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
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

type SortField =
  | "displayName"
  | "owner"
  | "createdTime"
  | "modifiedTime"
  | "isPublic";
type SortDirection = "asc" | "desc";

interface Notebook {
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
  notebookId?: string;
  error?: string;
}

interface ApiResponse {
  body?: {
    notebooks?: Notebook[];
    debug?: unknown;
    message?: string;
  };
  notebooks?: Notebook[];
  id?: string;
  message?: string;
}

export const NotebookManager = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<SortField>("displayName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showShareUrls, setShowShareUrls] = useState(false);
  const [shares, setShares] = useState<Map<string, EnvironmentShare>>(new Map());
  const [generatingShare, setGeneratingShare] = useState(false);

  // Filter and sort notebooks
  const filteredAndSortedNotebooks = useMemo(() => {
    let result = [...notebooks];

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
  }, [notebooks, filterText, sortField, sortDirection, showOnlyMine, currentUserId]);

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

  const loadNotebooks = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Calling /api/notebooksList...");
      const response = await fetch("/api/notebooksList", {
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
        throw new Error(`Failed to load notebooks: ${response.statusText}`);
      }
      const data = (await response.json()) as ApiResponse;
      console.log("Response data:", data);

      // API returns { statusCode: 200, body: { notebooks: [...], total: N, debug: {...} } }
      const notebookList: Notebook[] =
        data.body?.notebooks || data.notebooks || [];
      console.log("Notebooks array:", notebookList);
      console.log("API Debug info:", data.body?.debug);
      setNotebooks(notebookList);
    } catch (error) {
      showToast({
        title: "Error loading notebooks",
        message: error instanceof Error ? error.message : "Unknown error",
        type: "critical",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShares = useCallback(async () => {
    console.log("[NotebookManager] loadShares() called");
    try {
      const response = await fetch("/api/notebooksShareList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      console.log("[NotebookManager] loadShares response status:", response.status);
      if (response.ok) {
        const data = await response.json() as { body?: { shares?: EnvironmentShare[] } };
        console.log("[NotebookManager] loadShares raw data:", JSON.stringify(data));
        const sharesList = data.body?.shares || [];
        console.log("[NotebookManager] loadShares found", sharesList.length, "shares");
        const sharesMap = new Map<string, EnvironmentShare>();
        sharesList.forEach((share: EnvironmentShare) => {
          console.log("[NotebookManager] Mapping share:", share.id, "-> documentId:", share.documentId);
          sharesMap.set(share.documentId, share);
        });
        setShares(sharesMap);
        console.log("[NotebookManager] shares state updated with", sharesMap.size, "entries");
      } else {
        const errorText = await response.text();
        console.error("[NotebookManager] loadShares failed:", response.status, errorText);
      }
    } catch (err) {
      console.error("[NotebookManager] Failed to load shares:", err);
    }
  }, []);

  useEffect(() => {
    void loadNotebooks();
    void loadShares();
    // Load current user info
    try {
      const userDetails = getCurrentUserDetails();
      console.log("Current user:", userDetails);
      setCurrentUserId(userDetails.id);
    } catch (err) {
      console.error("Failed to get current user details:", err);
    }
  }, [loadNotebooks, loadShares]);

  // Check if any selected notebook is not owned by current user
  const hasNonOwnedSelected = useMemo(() => {
    if (!currentUserId) return false;
    return Array.from(selectedNotebooks).some((id) => {
      const notebook = notebooks.find((n) => n.id === id);
      return notebook && notebook.owner !== currentUserId;
    });
  }, [selectedNotebooks, notebooks, currentUserId]);

  const handleSelectAll = () => {
    const allIds = filteredAndSortedNotebooks.map((n) => n.id);
    const allSelected = allIds.every((id) => selectedNotebooks.has(id));

    if (allSelected && allIds.length > 0) {
      // Deselect all
      const newSelected = new Set(selectedNotebooks);
      allIds.forEach((id) => newSelected.delete(id));
      setSelectedNotebooks(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedNotebooks);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedNotebooks(newSelected);
    }
  };

  const handleSelectNotebook = (id: string) => {
    const newSelected = new Set(selectedNotebooks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotebooks(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedNotebooks.size === 0) {
      showToast({
        title: "No notebooks selected",
        message: "Please select at least one notebook to delete",
        type: "warning",
      });
      return;
    }

    // Get the names of notebooks to be deleted for confirmation
    const notebooksToDelete = notebooks.filter((n) =>
      selectedNotebooks.has(n.id)
    );
    const namesList = notebooksToDelete
      .map((n) => `  • ${n.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to delete ${selectedNotebooks.size} notebook(s)? This action cannot be undone.\n\nNotebooks to delete:\n${namesList}`
      )
    ) {
      return;
    }

    setDeleting(true);
    const notebookIds = Array.from(selectedNotebooks);
    let successCount = 0;
    let failCount = 0;

    const deletedNames: string[] = [];
    const failedNames: string[] = [];

    for (const id of notebookIds) {
      const notebook = notebooks.find((n) => n.id === id);
      const name = notebook?.displayName || id;

      try {
        console.log(`Deleting notebook: ${name} (${id})`);
        const response = await fetch(`/api/notebooksDelete`, {
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
        } else {
          console.error(`Failed to delete ${name}:`, responseData);
          failCount++;
          failedNames.push(name);
        }
      } catch (error) {
        console.error(`Error deleting ${name}:`, error);
        failCount++;
        failedNames.push(name);
      }
    }

    setDeleting(false);
    setSelectedNotebooks(new Set());

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
    console.log("Refreshing notebook list after delete...");
    await loadNotebooks();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setUploadFiles(Array.from(selectedFiles));
      setUploadResults([]);
    }
  };

  const uploadNotebook = async (file: File): Promise<UploadResult> => {
    try {
      const content = await file.text();
      const notebookData: unknown = JSON.parse(content);

      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notebookData),
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
        notebookId: responseData.id,
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
        message: "Please select at least one notebook JSON file to upload",
        type: "critical",
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (const file of uploadFiles) {
      const result = await uploadNotebook(file);
      results.push(result);
      setUploadResults([...results]);
    }

    setUploading(false);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      showToast({
        title: "Upload complete",
        message: `Successfully uploaded ${successCount} notebook(s)`,
        type: "success",
      });
    } else {
      showToast({
        title: "Upload completed with errors",
        message: `${successCount} succeeded, ${failCount} failed`,
        type: "warning",
      });
    }

    await loadNotebooks();
  };

  const handleExportSelected = async () => {
    if (selectedNotebooks.size === 0) {
      showToast({
        title: "No notebooks selected",
        message: "Please select at least one notebook to export",
        type: "warning",
      });
      return;
    }

    for (const id of selectedNotebooks) {
      try {
        const response = await fetch(`/api/notebooksGet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });
        if (response.ok) {
          const responseData = await response.json() as { statusCode?: number; body?: unknown };
          // Extract the actual content from the API response wrapper
          const notebookContent = responseData.body || responseData;
          const notebook = notebooks.find((n) => n.id === id);
          const fileName = `${notebook?.displayName || id}.json`;

          const blob = new Blob([JSON.stringify(notebookContent, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error(`Failed to export notebook ${id}:`, error);
      }
    }

    showToast({
      title: "Export complete",
      message: `Exported ${selectedNotebooks.size} notebook(s)`,
      type: "success",
    });
  };

  const handleBulkToggleVisibility = async (makePrivate: boolean) => {
    if (selectedNotebooks.size === 0) {
      showToast({
        title: "No notebooks selected",
        message: "Please select at least one notebook to update",
        type: "warning",
      });
      return;
    }

    const action = makePrivate ? "private" : "public";
    const notebooksToUpdate = notebooks.filter((n) =>
      selectedNotebooks.has(n.id)
    );
    const namesList = notebooksToUpdate
      .map((n) => `  • ${n.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to make ${selectedNotebooks.size} notebook(s) ${action}?\n\nNotebooks to update:\n${namesList}`
      )
    ) {
      return;
    }

    setToggling(true);
    const notebookIds = Array.from(selectedNotebooks);
    let successCount = 0;
    let failCount = 0;

    const successNames: string[] = [];
    const failedNames: string[] = [];

    for (const id of notebookIds) {
      const notebook = notebooks.find((n) => n.id === id);
      const name = notebook?.displayName || id;

      try {
        console.log(`Updating notebook: ${name} (${id}) to ${action}`);
        const response = await fetch(`/api/notebooksUpdate`, {
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
        } else {
          console.error(`Failed to update ${name}:`, responseData);
          failCount++;
          failedNames.push(name);
        }
      } catch (error) {
        console.error(`Error updating ${name}:`, error);
        failCount++;
        failedNames.push(name);
      }
    }

    setToggling(false);
    setSelectedNotebooks(new Set());

    if (failCount === 0 && successCount > 0) {
      showToast({
        title: `Made ${action}`,
        message: `Successfully updated: ${successNames.join(", ")}`,
        type: "success",
      });
    } else if (successCount === 0) {
      showToast({
        title: "Update failed",
        message: `Failed to update: ${failedNames.join(", ")}. Note: Only notebook owners can change visibility.`,
        type: "critical",
      });
    } else {
      showToast({
        title: "Update completed with errors",
        message: `Updated: ${successNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    console.log("Refreshing notebook list after visibility update...");
    await loadNotebooks();
  };

  // Wrapper functions for async handlers
  const onRefreshClick = () => {
    void loadNotebooks();
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
    console.log("[NotebookManager] handleGenerateShares() called, selected:", selectedNotebooks.size);
    if (selectedNotebooks.size === 0) {
      showToast({
        title: "No notebooks selected",
        message: "Please select at least one notebook to generate share links",
        type: "warning",
      });
      return;
    }

    setGeneratingShare(true);
    let successCount = 0;
    let failCount = 0;
    let alreadyExistsCount = 0;

    for (const id of selectedNotebooks) {
      console.log("[NotebookManager] Processing notebook:", id);
      // Skip if share already exists
      if (shares.has(id)) {
        console.log("[NotebookManager] Share already exists for:", id);
        alreadyExistsCount++;
        continue;
      }

      try {
        console.log("[NotebookManager] Creating share for:", id);
        const response = await fetch("/api/notebooksShare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: id }),
        });

        console.log("[NotebookManager] Share creation response status:", response.status);
        const responseData = await response.json() as { body?: { message?: string; shareId?: string } };
        console.log("[NotebookManager] Share creation response data:", JSON.stringify(responseData));

        if (response.ok) {
          console.log("[NotebookManager] Share created successfully for:", id, "shareId:", responseData.body?.shareId);
          successCount++;
        } else {
          if (responseData.body?.message?.includes("already exists")) {
            console.log("[NotebookManager] Share already exists (API response) for:", id);
            alreadyExistsCount++;
          } else {
            console.error("[NotebookManager] Failed to create share for:", id, responseData);
            failCount++;
          }
        }
      } catch (err) {
        console.error(`[NotebookManager] Exception creating share for ${id}:`, err);
        failCount++;
      }
    }

    console.log("[NotebookManager] Generation complete - success:", successCount, "failed:", failCount, "existed:", alreadyExistsCount);
    setGeneratingShare(false);

    // Refresh both notebooks list and shares list to update the UI
    console.log("[NotebookManager] Refreshing notebooks and shares...");
    await Promise.all([loadNotebooks(), loadShares()]);
    console.log("[NotebookManager] Refresh complete, shares map size:", shares.size);

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
          <Heading level={1}>Notebook Manager</Heading>
          <Paragraph>
            Upload, manage, export, and delete notebooks in bulk.
          </Paragraph>
        </Flex>
      </Page.Header>
      <Page.Main>
        <Container>
          <Flex flexDirection="column" gap={32}>
            {/* Bulk Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Bulk Upload Notebooks</Heading>
              <Paragraph>
                Select multiple notebook JSON files to upload them all at once.
              </Paragraph>

              <input
                type="file"
                accept=".json,application/json"
                multiple
                title="Select notebook JSON files to upload"
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
                  {uploading ? "Uploading..." : "Upload Notebooks"}
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
                            Success - ID: {result.notebookId}
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

            {/* Notebooks List Section */}
            <Flex flexDirection="column" gap={16}>
              <Flex justifyContent="space-between" alignItems="center">
                <Heading level={2}>Existing Notebooks</Heading>
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
                  Show only my notebooks
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
              </Flex>

              <Flex gap={16} flexWrap="wrap">
                <Button
                  variant="default"
                  onClick={handleSelectAll}
                  disabled={loading || filteredAndSortedNotebooks.length === 0}
                >
                  {filteredAndSortedNotebooks.every((n) =>
                    selectedNotebooks.has(n.id)
                  ) && filteredAndSortedNotebooks.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="default"
                  onClick={onExportClick}
                  disabled={selectedNotebooks.size === 0}
                >
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  Export Selected ({selectedNotebooks.size})
                </Button>
                <Button
                  variant="default"
                  onClick={onMakePrivateClick}
                  disabled={toggling || selectedNotebooks.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify notebooks you don't own" : undefined}
                >
                  <Button.Prefix>
                    <LockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Private"}
                </Button>
                <Button
                  color="warning"
                  onClick={onMakePublicClick}
                  disabled={toggling || selectedNotebooks.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify notebooks you don't own" : undefined}
                >
                  <Button.Prefix>
                    <UnlockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Public"}
                </Button>
                <Button
                  variant="default"
                  onClick={onGenerateSharesClick}
                  disabled={generatingShare || selectedNotebooks.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot create shares for notebooks you don't own" : "Generate shareable URLs for selected notebooks"}
                >
                  <Button.Prefix>
                    <LinkIcon />
                  </Button.Prefix>
                  {generatingShare ? "Generating..." : "Generate Share Links"}
                </Button>
                <Button
                  color="critical"
                  onClick={onDeleteClick}
                  disabled={deleting || selectedNotebooks.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot delete notebooks you don't own" : undefined}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {deleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedNotebooks.size})`}
                </Button>
              </Flex>

              {loading ? (
                <Flex justifyContent="center" padding={32}>
                  <Paragraph>Loading notebooks...</Paragraph>
                </Flex>
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
                            title="Select all notebooks"
                            checked={
                              filteredAndSortedNotebooks.length > 0 &&
                              filteredAndSortedNotebooks.every((n) => selectedNotebooks.has(n.id))
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
                      {filteredAndSortedNotebooks.length === 0 ? (
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
                              ? "No notebooks match filter"
                              : "No notebooks found"}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedNotebooks.map((notebook) => (
                          <tr
                            key={notebook.id}
                            style={{
                              borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                              backgroundColor: selectedNotebooks.has(
                                notebook.id
                              )
                                ? Colors.Background.Surface.Default
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px" }}>
                              <input
                                type="checkbox"
                                title={`Select ${notebook.displayName || "notebook"}`}
                                checked={selectedNotebooks.has(notebook.id)}
                                onChange={() =>
                                  handleSelectNotebook(notebook.id)
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
                              <a
                                href={`${getEnvironmentUrl()}/ui/apps/dynatrace.notebooks/notebook/${notebook.id}`}
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
                                  {notebook.displayName || "Unnamed"}
                                </Strong>
                              </a>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {notebook.owner || "N/A"}
                              {currentUserId && notebook.owner === currentUserId && (
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
                              {notebook.createdTime
                                ? new Date(
                                    notebook.createdTime
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
                              {notebook.modifiedTime
                                ? new Date(
                                    notebook.modifiedTime
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
                                  backgroundColor: notebook.isPublic
                                    ? Colors.Background.Field.Warning.Default
                                    : Colors.Background.Field.Success.Default,
                                  color: notebook.isPublic
                                    ? Colors.Text.Warning.Default
                                    : Colors.Text.Success.Default,
                                  fontWeight: 500,
                                }}
                              >
                                {notebook.isPublic ? "PUBLIC" : "Private"}
                              </span>
                            </td>
                            {showShareUrls && (
                              <td
                                style={{
                                  padding: "12px",
                                  fontSize: "12px",
                                }}
                              >
                                {shares.has(notebook.id) ? (
                                  <Flex gap={8} alignItems="center">
                                    <input
                                      type="text"
                                      readOnly
                                      title="Share URL - click to select"
                                      value={generateShareUrl(shares.get(notebook.id)!.id)}
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
                                      onClick={() => void copyToClipboard(generateShareUrl(shares.get(notebook.id)!.id))}
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
                    <Strong>{filteredAndSortedNotebooks.length}</Strong> of{" "}
                    <Strong>{notebooks.length}</Strong> notebooks
                  </>
                ) : (
                  <>
                    Total notebooks: <Strong>{notebooks.length}</Strong>
                  </>
                )}{" "}
                | Selected: <Strong>{selectedNotebooks.size}</Strong>
              </Paragraph>
            </Flex>
          </Flex>
        </Container>
      </Page.Main>
    </Page>
  );
};
