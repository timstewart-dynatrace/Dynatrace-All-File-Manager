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
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

type SortField = "name" | "size" | "modifiedTime" | "records";
type SortDirection = "asc" | "desc";

interface LookupFile {
  id: string;
  name: string;
  size?: number;
  modifiedTime?: string;
  records?: number;
  owner?: string;
  type?: string;
}

interface UploadResult {
  fileName: string;
  success: boolean;
  fileId?: string;
  error?: string;
}

interface ApiResponse {
  success?: boolean;
  files?: LookupFile[];
  count?: number;
  message?: string;
  error?: string;
}

export const LookupFileManager = () => {
  const [files, setFiles] = useState<LookupFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Apply text filter
    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(lowerFilter)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "name":
          aVal = a.name || "";
          bVal = b.name || "";
          break;
        case "size":
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case "modifiedTime":
          aVal = a.modifiedTime || "";
          bVal = b.modifiedTime || "";
          break;
        case "records":
          aVal = a.records || 0;
          bVal = b.records || 0;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });

    return result;
  }, [files, filterText, sortField, sortDirection]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUserDetails();
        setCurrentUserId(user.id);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch lookup files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/listLookupFiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.files) {
        setFiles(data.files);
      } else {
        showToast({
          type: "critical",
          title: "Failed to load lookup files",
          message: data.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      showToast({
        type: "critical",
        title: "Failed to load lookup files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Select all
  const selectAll = () => {
    setSelectedFiles(new Set(filteredAndSortedFiles.map((f) => f.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // Delete selected files
  const deleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const confirmDelete = window.confirm(
      `Delete ${selectedFiles.size} lookup file(s)?`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const selectedArray = Array.from(selectedFiles);
      let successCount = 0;
      let errorCount = 0;

      for (const fileId of selectedArray) {
        try {
          const response = await fetch("/api/deleteLookupFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId }),
          });

          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          console.error("Error deleting file:", error);
        }
      }

      if (successCount > 0) {
        showToast({
          type: "success",
          title: "Files deleted",
          message: `Deleted ${successCount} file(s)`,
        });
        await fetchFiles();
      }

      if (errorCount > 0) {
        showToast({
          type: "warning",
          title: "Delete errors",
          message: `Failed to delete ${errorCount} file(s)`,
        });
      }

      setSelectedFiles(new Set());
    } finally {
      setDeleting(false);
    }
  }, [selectedFiles, fetchFiles]);

  // Download selected files
  const downloadSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    try {
      const selectedArray = Array.from(selectedFiles);

      for (const fileId of selectedArray) {
        try {
          const response = await fetch("/api/getLookupFileContent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId }),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${fileId}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error downloading file:", error);
          showToast({
            type: "critical",
            title: "Download failed",
            message: `Failed to download ${fileId}`,
          });
        }
      }
    } finally {
      setSelectedFiles(new Set());
    }
  }, [selectedFiles]);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    const results: UploadResult[] = [];

    try {
      for (const file of uploadFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/uploadLookupFile", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            results.push({
              fileName: file.name,
              success: true,
              fileId: data.fileId,
            });
          } else {
            results.push({
              fileName: file.name,
              success: false,
              error: data.error || "Upload failed",
            });
          }
        } catch (error) {
          results.push({
            fileName: file.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        showToast({
          type: "success",
          title: "Upload complete",
          message: `Uploaded ${successCount} file(s)`,
        });
        setUploadFiles([]);
        await fetchFiles();
      }

      if (successCount < results.length) {
        showToast({
          type: "warning",
          title: "Upload partial",
          message: `${results.length - successCount} file(s) failed`,
        });
      }

      setUploadResults(results);
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, fetchFiles]);

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (newFiles) {
      setUploadFiles(Array.from(newFiles));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Page>
      <Page.Main>
        <Container style={{ padding: "16px 24px" }}>
          <Flex flexDirection="column" gap={24}>
            {/* Header */}
            <Flex flexDirection="column" gap={8}>
              <Heading level={1}>Lookup File Manager</Heading>
              <Paragraph>
                Manage lookup files stored in Dynatrace Grail. Upload, browse, download, and delete files.
              </Paragraph>
            </Flex>

            {/* Upload Section */}
            <Flex flexDirection="column" gap={12}>
              <Heading level={3}>Upload Files</Heading>
              <Flex gap={8}>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  accept=".csv,.jsonl,.json,.xml"
                />
                <Button
                  onClick={handleUpload}
                  disabled={uploadFiles.length === 0 || uploading}
                >
                  <UploadIcon /> {uploading ? "Uploading..." : "Upload"}
                </Button>
              </Flex>
              {uploadFiles.length > 0 && (
                <Paragraph>Selected: {uploadFiles.length} file(s)</Paragraph>
              )}
              {uploadResults.length > 0 && (
                <div>
                  <Heading level={4}>Upload Results</Heading>
                  {uploadResults.map((result, idx) => (
                    <Paragraph key={idx}>
                      {result.fileName}: {result.success ? "✓ Success" : `✗ ${result.error}`}
                    </Paragraph>
                  ))}
                </div>
              )}
            </Flex>

            {/* Actions */}
            <Flex gap={8}>
              <Button onClick={selectAll} disabled={files.length === 0}>
                Select All
              </Button>
              <Button
                onClick={deselectAll}
                disabled={selectedFiles.size === 0}
              >
                Deselect All
              </Button>
              <Button
                onClick={downloadSelected}
                disabled={selectedFiles.size === 0}
              >
                <DownloadIcon /> Download ({selectedFiles.size})
              </Button>
              <Button
                onClick={deleteSelected}
                disabled={selectedFiles.size === 0 || deleting}
                color="critical"
              >
                <DeleteIcon /> Delete ({selectedFiles.size})
              </Button>
              <Button
                onClick={fetchFiles}
                disabled={loading}
              >
                <RefreshIcon /> Refresh
              </Button>
            </Flex>

            {/* Filter */}
            <Flex gap={8} alignItems="center">
              <input
                type="text"
                placeholder="Filter by filename..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </Flex>

            {/* Sort Controls */}
            <Flex gap={8}>
              <label>
                Sort by:
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  style={{ marginLeft: "8px" }}
                >
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="modifiedTime">Modified Time</option>
                  <option value="records">Records</option>
                </select>
              </label>
              <Button
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
              >
                {sortDirection === "asc" ? "↓ Asc" : "↑ Desc"}
              </Button>
            </Flex>

            {/* Files Table */}
            <Flex flexDirection="column" gap={8}>
              <Heading level={3}>
                Lookup Files ({filteredAndSortedFiles.length})
              </Heading>
              {loading ? (
                <Paragraph>Loading...</Paragraph>
              ) : filteredAndSortedFiles.length === 0 ? (
                <Paragraph>No lookup files found.</Paragraph>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                        <th style={{ padding: "12px", textAlign: "left", width: "40px" }}>
                          <input
                            type="checkbox"
                            checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                            onChange={(e) =>
                              e.target.checked ? selectAll() : deselectAll()
                            }
                          />
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", cursor: "pointer" }}>
                          Name
                        </th>
                        <th style={{ padding: "12px", textAlign: "left" }}>
                          Size
                        </th>
                        <th style={{ padding: "12px", textAlign: "left" }}>
                          Records
                        </th>
                        <th style={{ padding: "12px", textAlign: "left" }}>
                          Modified
                        </th>
                        <th style={{ padding: "12px", textAlign: "left" }}>
                          Owner
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedFiles.map((file) => (
                        <tr key={file.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "12px" }}>
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.id)}
                              onChange={() => toggleFileSelection(file.id)}
                            />
                          </td>
                          <td style={{ padding: "12px" }}>
                            <Strong>{file.name}</Strong>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {formatFileSize(file.size)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {file.records || "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {formatDate(file.modifiedTime)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {file.owner || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Flex>
          </Flex>
        </Container>
      </Page.Main>
    </Page>
  );
};

export default LookupFileManager;
