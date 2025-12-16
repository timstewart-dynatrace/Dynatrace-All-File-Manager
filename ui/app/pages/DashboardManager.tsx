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
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

type SortField =
  | "displayName"
  | "owner"
  | "createdTime"
  | "modifiedTime"
  | "isPublic";
type SortDirection = "asc" | "desc";

interface Dashboard {
  id: string;
  displayName: string;
  owner?: string;
  createdTime?: string;
  modifiedTime?: string;
  isPrivate?: boolean;
  isPublic?: boolean;
  access?: string[];
}

interface UploadResult {
  fileName: string;
  success: boolean;
  dashboardId?: string;
  error?: string;
}

interface ApiResponse {
  body?: {
    dashboards?: Dashboard[];
    debug?: unknown;
    message?: string;
  };
  dashboards?: Dashboard[];
  id?: string;
  message?: string;
}

export const DashboardManager = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<Set<string>>(
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

  // Filter and sort dashboards
  const filteredAndSortedDashboards = useMemo(() => {
    let result = [...dashboards];

    // Apply "show only mine" filter
    if (showOnlyMine && currentUserId) {
      result = result.filter((d) => d.owner === currentUserId);
    }

    // Apply text filter
    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(
        (d) =>
          (d.displayName || "").toLowerCase().includes(lowerFilter) ||
          (d.owner || "").toLowerCase().includes(lowerFilter)
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
  }, [dashboards, filterText, sortField, sortDirection, showOnlyMine, currentUserId]);

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

  const loadDashboards = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Calling /api/dashboardsList...");
      const response = await fetch("/api/dashboardsList", {
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
        throw new Error(`Failed to load dashboards: ${response.statusText}`);
      }
      const data = (await response.json()) as ApiResponse;
      console.log("Response data:", data);

      // API returns { statusCode: 200, body: { dashboards: [...], total: N, debug: {...} } }
      const dashboardList: Dashboard[] =
        data.body?.dashboards || data.dashboards || [];
      console.log("Dashboards array:", dashboardList);
      console.log("API Debug info:", data.body?.debug);
      setDashboards(dashboardList);
    } catch (error) {
      showToast({
        title: "Error loading dashboards",
        message: error instanceof Error ? error.message : "Unknown error",
        type: "critical",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboards();
    // Load current user info
    try {
      const userDetails = getCurrentUserDetails();
      console.log("Current user:", userDetails);
      setCurrentUserId(userDetails.id);
    } catch (err) {
      console.error("Failed to get current user details:", err);
    }
  }, [loadDashboards]);

  // Check if any selected dashboard is not owned by current user
  const hasNonOwnedSelected = useMemo(() => {
    if (!currentUserId) return false;
    return Array.from(selectedDashboards).some((id) => {
      const dashboard = dashboards.find((d) => d.id === id);
      return dashboard && dashboard.owner !== currentUserId;
    });
  }, [selectedDashboards, dashboards, currentUserId]);

  const handleSelectAll = () => {
    const allIds = filteredAndSortedDashboards.map((d) => d.id);
    const allSelected = allIds.every((id) => selectedDashboards.has(id));

    if (allSelected && allIds.length > 0) {
      // Deselect all
      const newSelected = new Set(selectedDashboards);
      allIds.forEach((id) => newSelected.delete(id));
      setSelectedDashboards(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedDashboards);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedDashboards(newSelected);
    }
  };

  const handleSelectDashboard = (id: string) => {
    const newSelected = new Set(selectedDashboards);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDashboards(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDashboards.size === 0) {
      showToast({
        title: "No dashboards selected",
        message: "Please select at least one dashboard to delete",
        type: "warning",
      });
      return;
    }

    // Get the names of dashboards to be deleted for confirmation
    const dashboardsToDelete = dashboards.filter((d) =>
      selectedDashboards.has(d.id)
    );
    const namesList = dashboardsToDelete
      .map((d) => `  • ${d.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to delete ${selectedDashboards.size} dashboard(s)? This action cannot be undone.\n\nDashboards to delete:\n${namesList}`
      )
    ) {
      return;
    }

    setDeleting(true);
    const dashboardIds = Array.from(selectedDashboards);
    let successCount = 0;
    let failCount = 0;

    const deletedNames: string[] = [];
    const failedNames: string[] = [];

    for (const id of dashboardIds) {
      const dashboard = dashboards.find((d) => d.id === id);
      const name = dashboard?.displayName || id;

      try {
        console.log(`Deleting dashboard: ${name} (${id})`);
        const response = await fetch(`/api/dashboardsDelete`, {
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
    setSelectedDashboards(new Set());

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
    console.log("Refreshing dashboard list after delete...");
    await loadDashboards();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setUploadFiles(Array.from(selectedFiles));
      setUploadResults([]);
    }
  };

  const uploadDashboard = async (file: File): Promise<UploadResult> => {
    try {
      const content = await file.text();
      const dashboardData: unknown = JSON.parse(content);

      const response = await fetch("/api/dashboards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dashboardData),
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
        dashboardId: responseData.id,
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
        message: "Please select at least one dashboard JSON file to upload",
        type: "critical",
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (const file of uploadFiles) {
      const result = await uploadDashboard(file);
      results.push(result);
      setUploadResults([...results]);
    }

    setUploading(false);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      showToast({
        title: "Upload complete",
        message: `Successfully uploaded ${successCount} dashboard(s)`,
        type: "success",
      });
    } else {
      showToast({
        title: "Upload completed with errors",
        message: `${successCount} succeeded, ${failCount} failed`,
        type: "warning",
      });
    }

    await loadDashboards();
  };

  const handleExportSelected = async () => {
    if (selectedDashboards.size === 0) {
      showToast({
        title: "No dashboards selected",
        message: "Please select at least one dashboard to export",
        type: "warning",
      });
      return;
    }

    for (const id of selectedDashboards) {
      try {
        const response = await fetch(`/api/dashboardsGet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });
        if (response.ok) {
          const responseData = await response.json() as { statusCode?: number; body?: unknown };
          // Extract the actual content from the API response wrapper
          const dashboardContent = responseData.body || responseData;
          const dashboard = dashboards.find((d) => d.id === id);
          const fileName = `${dashboard?.displayName || id}.json`;

          const blob = new Blob([JSON.stringify(dashboardContent, null, 2)], {
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
        console.error(`Failed to export dashboard ${id}:`, error);
      }
    }

    showToast({
      title: "Export complete",
      message: `Exported ${selectedDashboards.size} dashboard(s)`,
      type: "success",
    });
  };

  const handleBulkToggleVisibility = async (makePrivate: boolean) => {
    if (selectedDashboards.size === 0) {
      showToast({
        title: "No dashboards selected",
        message: "Please select at least one dashboard to update",
        type: "warning",
      });
      return;
    }

    const action = makePrivate ? "private" : "public";
    const dashboardsToUpdate = dashboards.filter((d) =>
      selectedDashboards.has(d.id)
    );
    const namesList = dashboardsToUpdate
      .map((d) => `  • ${d.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to make ${selectedDashboards.size} dashboard(s) ${action}?\n\nDashboards to update:\n${namesList}`
      )
    ) {
      return;
    }

    setToggling(true);
    const dashboardIds = Array.from(selectedDashboards);
    let successCount = 0;
    let failCount = 0;

    const successNames: string[] = [];
    const failedNames: string[] = [];

    for (const id of dashboardIds) {
      const dashboard = dashboards.find((d) => d.id === id);
      const name = dashboard?.displayName || id;

      try {
        console.log(`Updating dashboard: ${name} (${id}) to ${action}`);
        const response = await fetch(`/api/dashboardsUpdate`, {
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
    setSelectedDashboards(new Set());

    if (failCount === 0 && successCount > 0) {
      showToast({
        title: `Made ${action}`,
        message: `Successfully updated: ${successNames.join(", ")}`,
        type: "success",
      });
    } else if (successCount === 0) {
      showToast({
        title: "Update failed",
        message: `Failed to update: ${failedNames.join(", ")}. Note: Only dashboard owners can change visibility.`,
        type: "critical",
      });
    } else {
      showToast({
        title: "Update completed with errors",
        message: `Updated: ${successNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    console.log("Refreshing dashboard list after visibility update...");
    await loadDashboards();
  };

  // Wrapper functions for async handlers
  const onRefreshClick = () => {
    void loadDashboards();
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

  return (
    <Page>
      <Page.Header>
        <Flex flexDirection="column" gap={8}>
          <Heading level={1}>Dashboard Manager</Heading>
          <Paragraph>
            Upload, manage, export, and delete dashboards in bulk.
          </Paragraph>
        </Flex>
      </Page.Header>
      <Page.Main>
        <Container>
          <Flex flexDirection="column" gap={32}>
            {/* Bulk Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Bulk Upload Dashboards</Heading>
              <Paragraph>
                Select multiple dashboard JSON files to upload them all at once.
              </Paragraph>

              <input
                type="file"
                accept=".json,application/json"
                multiple
                title="Select dashboard JSON files to upload"
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
                  {uploading ? "Uploading..." : "Upload Dashboards"}
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
                            Success - ID: {result.dashboardId}
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

            {/* Dashboards List Section */}
            <Flex flexDirection="column" gap={16}>
              <Flex justifyContent="space-between" alignItems="center">
                <Heading level={2}>Existing Dashboards</Heading>
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
                  Show only my dashboards
                </label>
              </Flex>

              <Flex gap={16} flexWrap="wrap">
                <Button
                  variant="default"
                  onClick={handleSelectAll}
                  disabled={loading || filteredAndSortedDashboards.length === 0}
                >
                  {filteredAndSortedDashboards.every((d) =>
                    selectedDashboards.has(d.id)
                  ) && filteredAndSortedDashboards.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="default"
                  onClick={onExportClick}
                  disabled={selectedDashboards.size === 0}
                >
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  Export Selected ({selectedDashboards.size})
                </Button>
                <Button
                  variant="default"
                  onClick={onMakePrivateClick}
                  disabled={toggling || selectedDashboards.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify dashboards you don't own" : undefined}
                >
                  <Button.Prefix>
                    <LockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Private"}
                </Button>
                <Button
                  color="warning"
                  onClick={onMakePublicClick}
                  disabled={toggling || selectedDashboards.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify dashboards you don't own" : undefined}
                >
                  <Button.Prefix>
                    <UnlockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Public"}
                </Button>
                <Button
                  color="critical"
                  onClick={onDeleteClick}
                  disabled={deleting || selectedDashboards.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot delete dashboards you don't own" : undefined}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {deleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedDashboards.size})`}
                </Button>
              </Flex>

              {loading ? (
                <Flex justifyContent="center" padding={32}>
                  <Paragraph>Loading dashboards...</Paragraph>
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
                            title="Select all dashboards"
                            checked={
                              filteredAndSortedDashboards.length > 0 &&
                              filteredAndSortedDashboards.every((d) => selectedDashboards.has(d.id))
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedDashboards.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: Colors.Text.Neutral.Default,
                            }}
                          >
                            {filterText
                              ? "No dashboards match filter"
                              : "No dashboards found"}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedDashboards.map((dashboard) => (
                          <tr
                            key={dashboard.id}
                            style={{
                              borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                              backgroundColor: selectedDashboards.has(
                                dashboard.id
                              )
                                ? Colors.Background.Surface.Default
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px" }}>
                              <input
                                type="checkbox"
                                title={`Select ${dashboard.displayName || "dashboard"}`}
                                checked={selectedDashboards.has(dashboard.id)}
                                onChange={() =>
                                  handleSelectDashboard(dashboard.id)
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
                                href={`${getEnvironmentUrl()}/ui/apps/dynatrace.dashboards/dashboard/${dashboard.id}`}
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
                                  {dashboard.displayName || "Unnamed"}
                                </Strong>
                              </a>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {dashboard.owner || "N/A"}
                              {currentUserId && dashboard.owner === currentUserId && (
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
                              {dashboard.createdTime
                                ? new Date(
                                    dashboard.createdTime
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
                              {dashboard.modifiedTime
                                ? new Date(
                                    dashboard.modifiedTime
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
                                  backgroundColor: dashboard.isPublic
                                    ? Colors.Background.Field.Warning.Default
                                    : Colors.Background.Field.Success.Default,
                                  color: dashboard.isPublic
                                    ? Colors.Text.Warning.Default
                                    : Colors.Text.Success.Default,
                                  fontWeight: 500,
                                }}
                              >
                                {dashboard.isPublic ? "PUBLIC" : "Private"}
                              </span>
                            </td>
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
                    <Strong>{filteredAndSortedDashboards.length}</Strong> of{" "}
                    <Strong>{dashboards.length}</Strong> dashboards
                  </>
                ) : (
                  <>
                    Total dashboards: <Strong>{dashboards.length}</Strong>
                  </>
                )}{" "}
                | Selected: <Strong>{selectedDashboards.size}</Strong>
              </Paragraph>
            </Flex>
          </Flex>
        </Container>
      </Page.Main>
    </Page>
  );
};
