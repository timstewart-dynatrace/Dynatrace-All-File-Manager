import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  EditIcon,
  PlusIcon,
  XmarkIcon,
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { getCurrentUserDetails } from "@dynatrace-sdk/app-environment";

// Type for file content records
type FileRecord = Record<string, unknown>;

// Safely convert unknown values to string (avoids no-base-to-string lint errors)
const toStr = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val as string | number | boolean);
};

type SortField = "name" | "displayName" | "size" | "modifiedTime" | "records" | "owner";
type SortDirection = "asc" | "desc";

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

interface UploadResult {
  fileName: string;
  success: boolean;
  fileId?: string;
  error?: string;
}

interface DeleteResult {
  name: string;
  id: string;
  success: boolean;
  message: string;
}

interface ApiResponse {
  success?: boolean;
  files?: LookupFile[];
  count?: number;
  message?: string;
  error?: string;
}

interface ContentApiResponse {
  success?: boolean;
  csvContent?: string;
  recordCount?: number;
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
  const [deleteResults, setDeleteResults] = useState<DeleteResult[]>([]);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCustomPath, setUploadCustomPath] = useState("");
  const [uploadLookupField, setUploadLookupField] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<LookupFile | null>(null);
  const [fileContent, setFileContent] = useState<FileRecord[]>([]);
  const [editedData, setEditedData] = useState<FileRecord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
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
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
        case "displayName":
          aVal = (a.displayName || a.name || "").toLowerCase();
          bVal = (b.displayName || b.name || "").toLowerCase();
          break;
        case "size":
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case "modifiedTime":
          aVal = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
          bVal = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
          break;
        case "records":
          aVal = a.records || 0;
          bVal = b.records || 0;
          break;
        case "owner":
          aVal = (a.owner || "").toLowerCase();
          bVal = (b.owner || "").toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [files, filterText, sortField, sortDirection]);

  // Fetch lookup files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/listLookupFiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await response.json()) as ApiResponse;

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

  // Initial fetch and load current user
  useEffect(() => {
    void fetchFiles();
    try {
      const userDetails = getCurrentUserDetails();
      setCurrentUserId(userDetails.id);
    } catch (err) {
      console.error("Failed to get current user details:", err);
    }
  }, [fetchFiles]);

  // Check if any selected file is not owned by current user
  const hasNonOwnedSelected = useMemo(() => {
    if (!currentUserId) return false;
    return Array.from(selectedFiles).some((id) => {
      const file = files.find((f) => f.id === id);
      return file && file.ownerId !== currentUserId;
    });
  }, [selectedFiles, files, currentUserId]);

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

  // Handle select all (for current filtered view)
  const handleSelectAll = () => {
    const allIds = filteredAndSortedFiles.map((f) => f.id);
    const allSelected = allIds.every((id) => selectedFiles.has(id));

    if (allSelected && allIds.length > 0) {
      // Deselect all
      const newSelected = new Set(selectedFiles);
      allIds.forEach((id) => newSelected.delete(id));
      setSelectedFiles(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedFiles);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedFiles(newSelected);
    }
  };

  // Delete selected files
  const deleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const filesToDelete = files.filter((f) => selectedFiles.has(f.id));
    const namesList = filesToDelete.map((f) => `  • ${f.name}`).join("\n");

    if (
      !confirm(
        `Are you sure you want to delete ${selectedFiles.size} lookup file(s)? This action cannot be undone.\n\nFiles to delete:\n${namesList}`
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteResults([]);
    try {
      const selectedArray = Array.from(selectedFiles);
      let successCount = 0;
      let errorCount = 0;
      const deletedNames: string[] = [];
      const failedNames: string[] = [];
      const results: DeleteResult[] = [];

      for (const fileId of selectedArray) {
        const file = files.find((f) => f.id === fileId);
        const name = file?.name || fileId;

        try {
          const response = await fetch("/api/deleteLookupFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId }),
          });

          const data = (await response.json()) as { success?: boolean; fileId?: string; error?: string };
          if (data.success) {
            successCount++;
            deletedNames.push(name);
            results.push({
              name,
              id: data.fileId || fileId,
              success: true,
              message: "Lookup file deleted successfully",
            });
          } else {
            errorCount++;
            failedNames.push(name);
            results.push({
              name,
              id: fileId,
              success: false,
              message: data.error || "Failed to delete lookup file",
            });
          }
        } catch (error) {
          errorCount++;
          failedNames.push(name);
          results.push({
            name,
            id: fileId,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          console.error("Error deleting file:", error);
        }
      }

      setDeleteResults(results);

      if (errorCount === 0 && successCount > 0) {
        showToast({
          type: "success",
          title: "Deletion complete",
          message: `Successfully deleted: ${deletedNames.join(", ")}`,
        });
      } else if (successCount === 0) {
        showToast({
          type: "critical",
          title: "Deletion failed",
          message: `Failed to delete: ${failedNames.join(", ")}`,
        });
      } else {
        showToast({
          type: "warning",
          title: "Deletion completed with errors",
          message: `Deleted: ${deletedNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        });
      }

      setSelectedFiles(new Set());
      await fetchFiles();
    } finally {
      setDeleting(false);
    }
  }, [selectedFiles, files, fetchFiles]);

  // Download selected files
  const downloadSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const selectedArray = Array.from(selectedFiles);

    for (const fileId of selectedArray) {
      try {
        const response = await fetch("/api/getLookupFileContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });

        const data = (await response.json()) as ContentApiResponse;

        if (data.success && data.csvContent) {
          // Create and trigger download
          const blob = new Blob([data.csvContent], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          // Extract filename from fileId (path)
          const fileName = fileId.split("/").pop() || "download";
          link.download = fileName.endsWith(".csv")
            ? fileName
            : `${fileName}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        } else {
          showToast({
            type: "critical",
            title: "Download failed",
            message: data.error || `Failed to download ${fileId}`,
          });
        }
      } catch (error) {
        console.error("Error downloading file:", error);
        showToast({
          type: "critical",
          title: "Download failed",
          message: `Failed to download ${fileId}`,
        });
      }
    }

    showToast({
      title: "Export complete",
      message: `Exported ${selectedFiles.size} file(s)`,
      type: "success",
    });
  }, [selectedFiles]);

  /**
   * Generate parse pattern based on file type and content
   */
  const generateParsePattern = (fileName: string, content: string): string => {
    const ext = fileName.toLowerCase().split(".").pop();

    if (ext === "csv") {
      // Try to extract headers from first line
      const firstLine = content.split("\n")[0];
      if (firstLine) {
        // Simple CSV parsing - split by comma (doesn't handle quoted fields)
        const headers = firstLine
          .split(",")
          .map((h) => h.trim().replace(/^["']|["']$/g, ""));
        if (headers.length > 0) {
          // Generate DPL pattern: LD:col1 ',' LD:col2 ',' LD:col3
          return headers.map((h) => `LD:${h.replace(/\s+/g, "_")}`).join(" ',' ");
        }
      }
      return "LD:field1 ',' LD:field2";
    } else if (ext === "json" || ext === "jsonl") {
      return 'PARSE(content, "JSON")';
    } else if (ext === "xml") {
      return 'PARSE(content, "XML")';
    }

    return "LD:content";
  };

  /**
   * Extract lookup field (first column) from content
   */
  const extractLookupField = (fileName: string, content: string): string => {
    const ext = fileName.toLowerCase().split(".").pop();

    if (ext === "csv") {
      const firstLine = content.split("\n")[0];
      if (firstLine) {
        const headers = firstLine
          .split(",")
          .map((h) => h.trim().replace(/^["']|["']$/g, ""));
        if (headers.length > 0) {
          return headers[0].replace(/\s+/g, "_");
        }
      }
    }

    return "id";
  };

  /**
   * Convert JSON array to JSONL format
   */
  const convertToJsonl = (content: string): string => {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item: unknown) => JSON.stringify(item)).join("\n");
      }
      return content;
    } catch {
      return content;
    }
  };

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    const results: UploadResult[] = [];

    try {
      for (const file of uploadFiles) {
        try {
          // Read file content
          const content = await file.text();
          const fileName = file.name;
          const ext = fileName.toLowerCase().split(".").pop();

          // Process content for JSON files (convert to JSONL)
          let processedContent = content;
          if (ext === "json") {
            processedContent = convertToJsonl(content);
          }

          // Generate file path - use custom path if provided, otherwise use filename
          // Sanitize: replace spaces with underscores, remove invalid characters
          const rawBaseName = uploadCustomPath.trim() || fileName.replace(/\.[^/.]+$/, ""); // Remove extension
          const sanitizedBaseName = rawBaseName
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9\-_./]/g, ""); // Remove other invalid characters
          const filePath = sanitizedBaseName.startsWith("/lookups/")
            ? sanitizedBaseName
            : `/lookups/${sanitizedBaseName}`;

          // Generate parse pattern
          const parsePattern = generateParsePattern(fileName, processedContent);

          // Extract lookup field - use custom if provided, otherwise auto-detect from first column
          const lookupField = uploadLookupField.trim() || extractLookupField(fileName, processedContent);

          // Build request body with optional display name and description
          const requestBody: Record<string, unknown> = {
            filePath,
            content: processedContent,
            parsePattern,
            lookupField,
          };

          if (uploadDisplayName.trim()) {
            requestBody.displayName = uploadDisplayName.trim();
          }
          if (uploadDescription.trim()) {
            requestBody.description = uploadDescription.trim();
          }

          // Send to API (first attempt without overwrite)
          let response = await fetch("/api/uploadLookupFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          let data = (await response.json()) as {
            success?: boolean;
            fileId?: string;
            error?: string;
          };

          // Check if file already exists (409 conflict)
          if (!data.success && data.error?.includes("already exists")) {
            // Find existing file to get its current metadata
            const existingFile = files.find((f) => f.id === filePath);
            const existingName = existingFile?.displayName || "";
            const existingDesc = existingFile?.description || "";

            const confirmOverwrite = window.confirm(
              `File "${filePath}" already exists.\n\n` +
              `Current display name: ${existingName || "(none)"}\n` +
              `Current description: ${existingDesc || "(none)"}\n\n` +
              `Do you want to overwrite it?`
            );

            if (confirmOverwrite) {
              // Preserve existing metadata if user didn't specify new values
              const overwriteBody: Record<string, unknown> = { ...requestBody, overwrite: true };
              if (!overwriteBody.displayName && existingName) {
                overwriteBody.displayName = existingName;
              }
              if (!overwriteBody.description && existingDesc) {
                overwriteBody.description = existingDesc;
              }

              // Retry with overwrite flag and preserved metadata
              response = await fetch("/api/uploadLookupFile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(overwriteBody),
              });

              data = (await response.json()) as {
                success?: boolean;
                fileId?: string;
                error?: string;
              };
            }
          }

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
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        showToast({
          type: "success",
          title: "Upload complete",
          message: `Successfully uploaded ${successCount} file(s)`,
        });
      } else {
        showToast({
          type: "warning",
          title: "Upload completed with errors",
          message: `${successCount} succeeded, ${failCount} failed`,
        });
      }

      setUploadResults(results);
      setUploadFiles([]);
      setUploadDisplayName("");
      setUploadDescription("");
      setUploadCustomPath("");
      setUploadLookupField("");
      await fetchFiles();
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, uploadDisplayName, uploadDescription, uploadCustomPath, uploadLookupField, files, fetchFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setUploadFiles(Array.from(selectedFiles));
      setUploadResults([]);
    }
  };

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  // Wrapper functions for async handlers
  const onRefreshClick = () => {
    void fetchFiles();
  };

  const onUploadClick = () => {
    void handleUpload();
  };

  const onDownloadClick = () => {
    void downloadSelected();
  };

  const onDeleteClick = () => {
    void deleteSelected();
  };

  // Edit modal functions
  const openEditModal = async (file: LookupFile) => {
    setEditingFile(file);
    setEditModalOpen(true);
    setLoadingContent(true);
    setIsEditMode(false);
    setEditedData([]);

    try {
      const response = await fetch("/api/getLookupFileContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        records?: FileRecord[];
        error?: string;
      };

      if (data.success && data.records) {
        setFileContent(data.records);
      } else {
        showToast({
          type: "critical",
          title: "Failed to load file content",
          message: data.error || "Unknown error",
        });
        setFileContent([]);
      }
    } catch (error) {
      console.error("Error loading file content:", error);
      showToast({
        type: "critical",
        title: "Failed to load file content",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setFileContent([]);
    } finally {
      setLoadingContent(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingFile(null);
    setFileContent([]);
    setEditedData([]);
    setIsEditMode(false);
  };

  const enterEditMode = () => {
    // Check if file is large - disable editing for large files
    if (editingFile && ((editingFile.size || 0) > 10 * 1024 * 1024 || (editingFile.records || 0) > 10000)) {
      showToast({
        type: "warning",
        title: "File too large for browser editing",
        message: "Download the file, edit it offline, then re-upload.",
      });
      return;
    }

    // Deep copy the file content for editing
    setEditedData(JSON.parse(JSON.stringify(fileContent)) as FileRecord[]);
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedData([]);
  };

  const updateCell = (rowIndex: number, fieldName: string, value: string) => {
    const newData = [...editedData];
    newData[rowIndex] = { ...newData[rowIndex], [fieldName]: value };
    setEditedData(newData);
  };

  const addRow = () => {
    if (editedData.length === 0 && fileContent.length === 0) return;

    const template = editedData.length > 0 ? editedData[0] : fileContent[0];
    const newRow: FileRecord = {};

    // Initialize with empty values for all fields
    Object.keys(template).forEach((key) => {
      newRow[key] = "";
    });

    setEditedData([...editedData, newRow]);
  };

  const insertRow = (afterIndex: number) => {
    if (editedData.length === 0 && fileContent.length === 0) return;

    const template = editedData.length > 0 ? editedData[0] : fileContent[0];
    const newRow: FileRecord = {};

    // Initialize with empty values for all fields
    Object.keys(template).forEach((key) => {
      newRow[key] = "";
    });

    // Insert the new row after the specified index
    const newData = [
      ...editedData.slice(0, afterIndex + 1),
      newRow,
      ...editedData.slice(afterIndex + 1),
    ];
    setEditedData(newData);
  };

  const deleteRow = (rowIndex: number) => {
    const newData = editedData.filter((_, index) => index !== rowIndex);
    setEditedData(newData);
  };

  const saveChanges = async () => {
    if (!editingFile) {
      showToast({
        type: "critical",
        title: "Cannot save",
        message: "No file selected",
      });
      return;
    }

    if (editedData.length === 0) {
      showToast({
        type: "critical",
        title: "Cannot save",
        message: "No data to save. The file would be empty.",
      });
      return;
    }

    // Get headers (field names) from first record, excluding any internal fields
    const headers = Object.keys(editedData[0]).filter(
      (k) => k !== "tableId" && !k.startsWith("_")
    );

    if (headers.length === 0) {
      showToast({
        type: "critical",
        title: "Cannot save",
        message: "No valid columns found in data.",
      });
      return;
    }

    // Convert to CSV format
    const csvLines = [
      headers.join(","), // Header row
      ...editedData.map((row) =>
        headers
          .map((h) => {
            const value = row[h];
            if (value === null || value === undefined) return "";
            const strValue = toStr(value);
            // Escape values with commas, quotes, or newlines
            if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",")
      ),
    ];
    const csvContent = csvLines.join("\n");

    // Debug logging
    console.log("[Save Debug] File:", editingFile.id);
    console.log("[Save Debug] Headers:", headers);
    console.log("[Save Debug] Total rows:", editedData.length);
    console.log("[Save Debug] First data row:", editedData[0]);
    console.log("[Save Debug] Last data row:", editedData[editedData.length - 1]);
    console.log("[Save Debug] CSV lines count:", csvLines.length);
    console.log("[Save Debug] CSV content length:", csvContent.length);
    console.log("[Save Debug] Full CSV content:\n", csvContent);

    // Log each row to verify all rows are included
    editedData.forEach((row, idx) => {
      const rowValues = headers.map(h => row[h] ?? "");
      console.log(`[Save Debug] Row ${idx}:`, rowValues);
    });

    // Validate CSV content isn't just the header
    if (csvContent.trim() === headers.join(",")) {
      showToast({
        type: "critical",
        title: "Cannot save",
        message: "CSV content appears to contain only headers with no data rows.",
      });
      return;
    }

    // Show confirmation with details
    const confirmSave = window.confirm(
      `Save ${editedData.length} records (${headers.length} columns) to "${editingFile.displayName || editingFile.name}"?\n\n` +
      `File path: ${editingFile.id}\n` +
      `CSV size: ${csvContent.length} bytes\n\n` +
      `This will overwrite the existing file.`
    );
    if (!confirmSave) return;

    setSavingChanges(true);

    try {
      // Generate parse pattern from headers (with proper spacing)
      const parsePattern = headers.map((h) => `LD:${h}`).join(" ',' ");

      // Determine lookup field - must be one of the headers
      let lookupField = editingFile.lookupField || headers[0];
      if (!headers.includes(lookupField)) {
        console.warn(`[Save Debug] lookupField "${lookupField}" not in headers, using "${headers[0]}" instead`);
        lookupField = headers[0];
      }

      console.log("[Save Debug] parsePattern:", parsePattern);
      console.log("[Save Debug] lookupField:", lookupField);

      // Check for rows with empty lookup field values
      const rowsWithEmptyLookupField = editedData.filter((row) => {
        const value = row[lookupField];
        return value === null || value === undefined || toStr(value).trim() === "";
      });

      if (rowsWithEmptyLookupField.length > 0) {
        const rowIndices = editedData
          .map((row, idx) => {
            const value = row[lookupField];
            return value === null || value === undefined || toStr(value).trim() === "" ? idx + 1 : null;
          })
          .filter((idx) => idx !== null);

        const choice = window.confirm(
          `⚠️ CRITICAL: ${rowsWithEmptyLookupField.length} row(s) have empty "${lookupField}" (lookup field).\n\n` +
          `Row numbers with empty lookup field: ${rowIndices.join(", ")}\n\n` +
          `Dynatrace WILL DISCARD these rows - they will NOT be saved!\n\n` +
          `Click OK to REMOVE these rows and save the rest.\n` +
          `Click Cancel to go back and fill in the missing values.`
        );

        if (!choice) {
          setSavingChanges(false);
          return;
        }

        // Remove rows with empty lookup field before saving
        const filteredData = editedData.filter((row) => {
          const value = row[lookupField];
          return value !== null && value !== undefined && toStr(value).trim() !== "";
        });

        if (filteredData.length === 0) {
          showToast({
            type: "critical",
            title: "Cannot save",
            message: "All rows have empty lookup field values. Nothing to save.",
          });
          setSavingChanges(false);
          return;
        }

        // Update editedData to filtered version and regenerate CSV
        setEditedData(filteredData);

        // Regenerate CSV with filtered data
        const filteredCsvLines = [
          headers.join(","),
          ...filteredData.map((row) =>
            headers
              .map((h) => {
                const value = row[h];
                if (value === null || value === undefined) return "";
                const strValue = toStr(value);
                if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
                  return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
              })
              .join(",")
          ),
        ];

        // Use filtered CSV content
        const filteredCsvContent = filteredCsvLines.join("\n");

        // Continue with filtered content
        const formData = new FormData();
        const blob = new Blob([filteredCsvContent], { type: "text/plain" });
        formData.append("content", blob, "file");

        const requestObj = {
          filePath: editingFile.id,
          parsePattern,
          lookupField,
          overwrite: true,
          skippedRecords: 1,
          ...(editingFile.displayName && { displayName: editingFile.displayName }),
          ...(editingFile.description && { description: editingFile.description }),
        };

        console.log("[Save Debug] Saving filtered data:", filteredData.length, "rows");

        formData.append(
          "request",
          new Blob([JSON.stringify(requestObj)], { type: "application/json" })
        );

        const response = await fetch(
          "/platform/storage/resource-store/v1/files/tabular/lookup:upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          await response.json().catch(() => ({}));
          showToast({
            type: "success",
            title: "Changes saved",
            message: `Saved ${filteredData.length} records (removed ${rowsWithEmptyLookupField.length} with empty lookup field)`,
          });
          setIsEditMode(false);
          setEditedData([]);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await openEditModal(editingFile);
          await fetchFiles();
        } else {
          const errorText = await response.text();
          showToast({
            type: "critical",
            title: "Failed to save changes",
            message: errorText.substring(0, 200),
          });
        }
        setSavingChanges(false);
        return;
      }

      // Upload the updated file
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: "text/plain" });
      formData.append("content", blob, "file");

      const requestObj = {
        filePath: editingFile.id,
        parsePattern,
        lookupField,
        overwrite: true,
        skippedRecords: 1, // Skip header row for CSV
        ...(editingFile.displayName && { displayName: editingFile.displayName }),
        ...(editingFile.description && { description: editingFile.description }),
      };

      console.log("[Save Debug] Request object:", JSON.stringify(requestObj, null, 2));

      formData.append(
        "request",
        new Blob([JSON.stringify(requestObj)], { type: "application/json" })
      );

      const response = await fetch(
        "/platform/storage/resource-store/v1/files/tabular/lookup:upload",
        {
          method: "POST",
          body: formData,
        }
      );

      console.log("[Save Debug] Response status:", response.status);

      if (response.ok) {
        const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        console.log("[Save Debug] Response data:", responseData);

        const patternMatches = (responseData.patternMatches as number) || 0;
        const discardedDuplicates = responseData.discardedDuplicates as number | undefined;
        console.log("[Save Debug] Stored records (patternMatches):", patternMatches);
        console.log("[Save Debug] Discarded duplicates:", discardedDuplicates);

        showToast({
          type: "success",
          title: "Changes saved",
          message: `File updated: ${patternMatches || editedData.length} records uploaded`,
        });
        setIsEditMode(false);
        setEditedData([]);

        // Wait for Grail to index the new data before refreshing
        console.log("[Save Debug] Waiting 5 seconds for Grail to index...");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Refresh the file content and log what DQL returns
        console.log("[Save Debug] Reloading file content...");
        const reloadResponse = await fetch("/api/getLookupFileContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: editingFile.id }),
        });
        const reloadData = (await reloadResponse.json()) as { records?: Record<string, unknown>[] };
        console.log("[Save Debug] Reloaded records count:", reloadData.records?.length);
        console.log("[Save Debug] Reloaded records:", reloadData.records);
        // Log lookup field values to debug
        if (reloadData.records?.length) {
          console.log("[Save Debug] Lookup field values in returned records:",
            reloadData.records.map((r: Record<string, unknown>) => r[lookupField]));
        }

        // Now open the modal with this data
        await openEditModal(editingFile);
        // Refresh the file list
        await fetchFiles();
      } else {
        const errorText = await response.text();
        console.error("[Save Debug] Error response:", errorText);

        let errorMessage = `Status ${response.status}`;
        try {
          const errorData = JSON.parse(errorText) as { message?: string; error?: { message?: string } };
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText.substring(0, 200);
        }

        showToast({
          type: "critical",
          title: "Failed to save changes",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("[Save Debug] Exception:", error);
      showToast({
        type: "critical",
        title: "Failed to save changes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const downloadFileAsCSV = () => {
    if (!editingFile) return;

    const dataToDownload = isEditMode && editedData.length > 0 ? editedData : fileContent;
    if (dataToDownload.length === 0) return;

    const headers = Object.keys(dataToDownload[0]);
    const csvLines = [
      headers.join(","),
      ...dataToDownload.map((row) =>
        headers
          .map((h) => {
            const value = row[h];
            if (value === null || value === undefined) return "";
            const strValue = toStr(value);
            if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",")
      ),
    ];

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editingFile.displayName || editingFile.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get column headers for edit table
  const getColumnHeaders = (): string[] => {
    const data = isEditMode && editedData.length > 0 ? editedData : fileContent;
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  return (
    <Page>
      <Page.Header>
        <Flex flexDirection="column" gap={8}>
          <Heading level={1}>Lookup File Manager</Heading>
          <Paragraph>
            Upload, manage, and delete lookup files stored in Dynatrace Grail.
          </Paragraph>
        </Flex>
      </Page.Header>
      <Page.Main>
        <Container>
          <Flex flexDirection="column" gap={32}>
            {/* Bulk Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Upload Lookup Files</Heading>
              <Paragraph>
                Select CSV, JSON, JSONL, or XML files to upload (max 100 MB
                each).
              </Paragraph>

              <input
                type="file"
                accept=".csv,.json,.jsonl,.xml"
                title="Select lookup files to upload"
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
                <Flex flexDirection="column" gap={12}>
                  <Flex gap={16} flexWrap="wrap">
                    <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ fontSize: "12px", color: Colors.Text.Neutral.Default }}>
                        File Path (optional - defaults to filename)
                      </label>
                      <input
                        type="text"
                        placeholder={`/lookups/${uploadFiles[0]?.name.replace(/\.[^/.]+$/, "") || "filename"}`}
                        value={uploadCustomPath}
                        onChange={(e) => setUploadCustomPath(e.target.value)}
                        disabled={uploading}
                        style={{
                          padding: "8px 12px",
                          border: `1px solid ${Colors.Border.Neutral.Default}`,
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          color: Colors.Text.Neutral.Default,
                          fontSize: "14px",
                        }}
                      />
                    </Flex>
                    <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ fontSize: "12px", color: Colors.Text.Neutral.Default }}>
                        Display Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Human-readable name for the file"
                        value={uploadDisplayName}
                        onChange={(e) => setUploadDisplayName(e.target.value)}
                        disabled={uploading}
                        style={{
                          padding: "8px 12px",
                          border: `1px solid ${Colors.Border.Neutral.Default}`,
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          color: Colors.Text.Neutral.Default,
                          fontSize: "14px",
                        }}
                      />
                    </Flex>
                  </Flex>
                  <Flex gap={16} flexWrap="wrap">
                    <Flex flexDirection="column" gap={4} style={{ flex: 2, minWidth: "300px" }}>
                      <label style={{ fontSize: "12px", color: Colors.Text.Neutral.Default }}>
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Description of the lookup file contents"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        disabled={uploading}
                        style={{
                          padding: "8px 12px",
                          border: `1px solid ${Colors.Border.Neutral.Default}`,
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          color: Colors.Text.Neutral.Default,
                          fontSize: "14px",
                        }}
                      />
                    </Flex>
                    <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ fontSize: "12px", color: Colors.Text.Neutral.Default }}>
                        Lookup Field 🔑 (optional - defaults to first column)
                      </label>
                      <input
                        type="text"
                        placeholder="Column name for unique key"
                        value={uploadLookupField}
                        onChange={(e) => setUploadLookupField(e.target.value)}
                        disabled={uploading}
                        style={{
                          padding: "8px 12px",
                          border: `1px solid ${Colors.Border.Neutral.Default}`,
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          color: Colors.Text.Neutral.Default,
                          fontSize: "14px",
                        }}
                      />
                    </Flex>
                  </Flex>
                </Flex>
              )}

              {uploadFiles.length > 0 && (
                <Paragraph>
                  <Strong>{uploadFiles.length}</Strong> file(s) selected
                </Paragraph>
              )}

              <Flex gap={16}>
                <Button
                  variant="emphasized"
                  onClick={onUploadClick}
                  disabled={uploading || uploadFiles.length === 0}
                >
                  <Button.Prefix>
                    <UploadIcon />
                  </Button.Prefix>
                  {uploading ? "Uploading..." : "Upload Files"}
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
                            Success - ID: {result.fileId}
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

            {/* Files List Section */}
            <Flex flexDirection="column" gap={16}>
              <Flex justifyContent="space-between" alignItems="center">
                <Heading level={2}>Existing Lookup Files</Heading>
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
                  placeholder="Filter by filename..."
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
              </Flex>

              <Flex gap={16} flexWrap="wrap">
                <Button
                  variant="default"
                  onClick={handleSelectAll}
                  disabled={loading || filteredAndSortedFiles.length === 0}
                >
                  {filteredAndSortedFiles.every((f) =>
                    selectedFiles.has(f.id)
                  ) && filteredAndSortedFiles.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="default"
                  onClick={onDownloadClick}
                  disabled={selectedFiles.size === 0}
                >
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  Download Selected ({selectedFiles.size})
                </Button>
                <Button
                  color="critical"
                  onClick={onDeleteClick}
                  disabled={deleting || selectedFiles.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot delete lookup files you don't own" : undefined}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {deleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedFiles.size})`}
                </Button>
              </Flex>

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
                  <Paragraph>Loading lookup files...</Paragraph>
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
                            title="Select all files"
                            checked={
                              filteredAndSortedFiles.length > 0 &&
                              filteredAndSortedFiles.every((f) =>
                                selectedFiles.has(f.id)
                              )
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
                          title="Sort by display name"
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
                          onClick={() => handleSort("records")}
                          title="Sort by records"
                        >
                          Records{getSortIndicator("records")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleSort("size")}
                          title="Sort by size"
                        >
                          Size{getSortIndicator("size")}
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: Colors.Text.Neutral.Default,
                          }}
                        >
                          Lookup Field
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
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedFiles.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: Colors.Text.Neutral.Default,
                            }}
                          >
                            {filterText
                              ? "No files match filter"
                              : "No lookup files found"}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedFiles.map((file) => (
                          <tr
                            key={file.id}
                            style={{
                              borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                              backgroundColor: selectedFiles.has(file.id)
                                ? Colors.Background.Surface.Default
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px" }}>
                              <input
                                type="checkbox"
                                title={`Select ${file.displayName || file.name}`}
                                checked={selectedFiles.has(file.id)}
                                onChange={() => toggleFileSelection(file.id)}
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              <Strong>{file.displayName || file.name}</Strong>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: Colors.Text.Neutral.Subdued,
                                }}
                              >
                                {file.id}
                              </div>
                              {file.description && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: Colors.Text.Neutral.Subdued,
                                    fontStyle: "italic",
                                    marginTop: "4px",
                                  }}
                                >
                                  {file.description}
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {file.records?.toLocaleString() || "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {formatFileSize(file.size)}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              <code
                                style={{
                                  backgroundColor: Colors.Background.Field.Neutral.Default,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                }}
                              >
                                {file.lookupField || "—"}
                              </code>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {formatDate(file.modifiedTime)}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {file.owner || "—"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <Button
                                variant="default"
                                onClick={() => void openEditModal(file)}
                              >
                                <Button.Prefix>
                                  <EditIcon />
                                </Button.Prefix>
                                View/Edit
                              </Button>
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
                    Showing: <Strong>{filteredAndSortedFiles.length}</Strong> of{" "}
                    <Strong>{files.length}</Strong> files
                  </>
                ) : (
                  <>
                    Total files: <Strong>{files.length}</Strong>
                  </>
                )}{" "}
                | Selected: <Strong>{selectedFiles.size}</Strong>
              </Paragraph>
            </Flex>
          </Flex>
        </Container>

        {/* Edit Modal */}
        {editModalOpen && editingFile && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                backgroundColor: Colors.Background.Surface.Default,
                borderRadius: "8px",
                width: "95%",
                maxWidth: "1400px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Modal Header */}
              <Flex
                justifyContent="space-between"
                alignItems="center"
                padding={16}
                style={{
                  borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                }}
              >
                <Flex flexDirection="column" gap={4}>
                  <Heading level={3}>
                    {editingFile.displayName || editingFile.name}
                  </Heading>
                  <Paragraph
                    style={{
                      fontSize: "12px",
                      color: Colors.Text.Neutral.Subdued,
                    }}
                  >
                    {editingFile.id}
                  </Paragraph>
                </Flex>
                <Button variant="default" onClick={closeEditModal}>
                  <Button.Prefix>
                    <XmarkIcon />
                  </Button.Prefix>
                  Close
                </Button>
              </Flex>

              {/* File Metadata */}
              <Flex
                gap={24}
                padding={16}
                style={{
                  borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                  backgroundColor: Colors.Background.Container.Neutral.Subdued,
                }}
                flexWrap="wrap"
              >
                {editingFile.description && (
                  <Flex flexDirection="column" gap={4}>
                    <Strong style={{ fontSize: "12px" }}>Description</Strong>
                    <Paragraph style={{ fontSize: "12px" }}>
                      {editingFile.description}
                    </Paragraph>
                  </Flex>
                )}
                <Flex flexDirection="column" gap={4}>
                  <Strong style={{ fontSize: "12px" }}>Records</Strong>
                  <Paragraph style={{ fontSize: "12px" }}>
                    {editingFile.records?.toLocaleString() || "—"}
                  </Paragraph>
                </Flex>
                <Flex flexDirection="column" gap={4}>
                  <Strong style={{ fontSize: "12px" }}>Size</Strong>
                  <Paragraph style={{ fontSize: "12px" }}>
                    {formatFileSize(editingFile.size)}
                  </Paragraph>
                </Flex>
                <Flex flexDirection="column" gap={4}>
                  <Strong style={{ fontSize: "12px" }}>Lookup Field</Strong>
                  <code
                    style={{
                      backgroundColor: Colors.Background.Field.Neutral.Default,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                    }}
                  >
                    {editingFile.lookupField || "—"}
                  </code>
                </Flex>
                <Flex flexDirection="column" gap={4}>
                  <Strong style={{ fontSize: "12px" }}>Owner</Strong>
                  <Paragraph style={{ fontSize: "12px" }}>
                    {editingFile.owner || "—"}
                  </Paragraph>
                </Flex>
                <Flex flexDirection="column" gap={4}>
                  <Strong style={{ fontSize: "12px" }}>Modified</Strong>
                  <Paragraph style={{ fontSize: "12px" }}>
                    {formatDate(editingFile.modifiedTime)}
                  </Paragraph>
                </Flex>
              </Flex>

              {/* Action Buttons */}
              <Flex
                gap={8}
                padding={16}
                style={{
                  borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                }}
              >
                {isEditMode ? (
                  <>
                    <Button
                      variant="emphasized"
                      onClick={() => void saveChanges()}
                      disabled={savingChanges}
                    >
                      {savingChanges ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="default" onClick={addRow}>
                      <Button.Prefix>
                        <PlusIcon />
                      </Button.Prefix>
                      Add Row
                    </Button>
                    <Button variant="default" onClick={downloadFileAsCSV}>
                      <Button.Prefix>
                        <DownloadIcon />
                      </Button.Prefix>
                      Download CSV
                    </Button>
                    <Button
                      variant="default"
                      onClick={cancelEdit}
                      disabled={savingChanges}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="emphasized"
                      onClick={enterEditMode}
                      disabled={loadingContent || fileContent.length === 0}
                    >
                      <Button.Prefix>
                        <EditIcon />
                      </Button.Prefix>
                      Edit Rows
                    </Button>
                    <Button variant="default" onClick={downloadFileAsCSV}>
                      <Button.Prefix>
                        <DownloadIcon />
                      </Button.Prefix>
                      Download CSV
                    </Button>
                  </>
                )}
              </Flex>

              {/* Content Table */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "16px",
                }}
              >
                {loadingContent ? (
                  <Flex justifyContent="center" padding={32}>
                    <Paragraph>Loading file content...</Paragraph>
                  </Flex>
                ) : fileContent.length === 0 ? (
                  <Flex flexDirection="column" alignItems="center" gap={16} padding={32}>
                    <Paragraph>No data in this file.</Paragraph>
                    <Paragraph style={{ fontSize: "12px", color: Colors.Text.Neutral.Subdued, textAlign: "center" }}>
                      To add data to an empty file, you have two options:
                    </Paragraph>
                    <Flex flexDirection="column" gap={8} style={{ textAlign: "left" }}>
                      <Paragraph style={{ fontSize: "12px", color: Colors.Text.Neutral.Subdued }}>
                        1. <Strong>Upload new content:</Strong> Close this modal and use the Upload section to upload a CSV file to this path.
                      </Paragraph>
                      <Paragraph style={{ fontSize: "12px", color: Colors.Text.Neutral.Subdued }}>
                        2. <Strong>Delete and recreate:</Strong> Delete this file and upload a new file with the data you need.
                      </Paragraph>
                    </Flex>
                    <Paragraph style={{ fontSize: "11px", color: Colors.Text.Neutral.Subdued, fontStyle: "italic" }}>
                      Note: Browser-based row insertion requires at least one existing row to determine the column structure.
                    </Paragraph>
                  </Flex>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <thead
                        style={{
                          backgroundColor: Colors.Background.Surface.Default,
                          position: "sticky",
                          top: 0,
                        }}
                      >
                        <tr>
                          {getColumnHeaders().map((header) => {
                            const isLookupField = header === editingFile?.lookupField;
                            return (
                              <th
                                key={header}
                                style={{
                                  padding: "10px 12px",
                                  textAlign: "left",
                                  borderBottom: `2px solid ${isLookupField ? Colors.Border.Primary.Default : Colors.Border.Neutral.Default}`,
                                  color: isLookupField ? Colors.Text.Primary.Default : Colors.Text.Neutral.Default,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  backgroundColor: isLookupField ? Colors.Background.Container.Primary.Default : undefined,
                                }}
                                title={isLookupField ? "Lookup field (required - must be unique and non-empty)" : undefined}
                              >
                                {header}
                                {isLookupField && (
                                  <span style={{ marginLeft: "4px", fontSize: "10px" }}>🔑</span>
                                )}
                              </th>
                            );
                          })}
                          {isEditMode && (
                            <th
                              style={{
                                padding: "10px 12px",
                                textAlign: "left",
                                borderBottom: `2px solid ${Colors.Border.Neutral.Default}`,
                                color: Colors.Text.Neutral.Default,
                                fontWeight: 600,
                                width: "120px",
                              }}
                            >
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(isEditMode ? editedData : fileContent).map(
                          (row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              style={{
                                borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                              }}
                            >
                              {getColumnHeaders().map((header) => (
                                <td
                                  key={header}
                                  style={{
                                    padding: isEditMode ? "6px 8px" : "10px 12px",
                                    color: Colors.Text.Neutral.Default,
                                  }}
                                >
                                  {isEditMode ? (
                                    <input
                                      type="text"
                                      title={`Edit ${header}`}
                                      value={toStr(row[header])}
                                      onChange={(e) =>
                                        updateCell(rowIndex, header, e.target.value)
                                      }
                                      style={{
                                        width: "100%",
                                        minWidth: "100px",
                                        padding: "6px 8px",
                                        backgroundColor: Colors.Background.Field.Neutral.Default,
                                        border: `1px solid ${Colors.Border.Neutral.Default}`,
                                        borderRadius: "4px",
                                        color: Colors.Text.Neutral.Default,
                                        fontSize: "12px",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        display: "block",
                                        maxWidth: "300px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={toStr(row[header])}
                                    >
                                      {toStr(row[header])}
                                    </span>
                                  )}
                                </td>
                              ))}
                              {isEditMode && (
                                <td style={{ padding: "6px 8px" }}>
                                  <Flex gap={4}>
                                    <Button
                                      variant="default"
                                      onClick={() => insertRow(rowIndex)}
                                      title="Insert row below"
                                    >
                                      <Button.Prefix>
                                        <PlusIcon />
                                      </Button.Prefix>
                                    </Button>
                                    <Button
                                      color="critical"
                                      onClick={() => deleteRow(rowIndex)}
                                      title="Delete row"
                                    >
                                      <Button.Prefix>
                                        <DeleteIcon />
                                      </Button.Prefix>
                                    </Button>
                                  </Flex>
                                </td>
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer with record count */}
              <Flex
                padding={16}
                style={{
                  borderTop: `1px solid ${Colors.Border.Neutral.Default}`,
                }}
              >
                <Paragraph
                  style={{ fontSize: "12px", color: Colors.Text.Neutral.Subdued }}
                >
                  {isEditMode ? (
                    <>
                      Editing: <Strong>{editedData.length}</Strong> records
                    </>
                  ) : (
                    <>
                      Loaded: <Strong>{fileContent.length}</Strong> records
                    </>
                  )}
                </Paragraph>
              </Flex>
            </div>
          </div>
        )}
      </Page.Main>
    </Page>
  );
};

export default LookupFileManager;
