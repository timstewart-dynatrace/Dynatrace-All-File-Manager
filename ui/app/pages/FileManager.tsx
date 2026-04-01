import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getCurrentUserDetails } from "@dynatrace-sdk/app-environment";
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
  XmarkIcon,
} from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

type SortField =
  | "displayName"
  | "type"
  | "owner"
  | "createdTime"
  | "modifiedTime"
  | "isPublic";
type SortDirection = "asc" | "desc";

interface FileDoc {
  id: string;
  displayName: string;
  type?: string;
  owner?: string;
  createdTime?: string;
  modifiedTime?: string;
  isPrivate?: boolean;
  isPublic?: boolean;
  access?: string[];
  shareId?: string;
  shareUrl?: string;
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

interface UpdateResult {
  name: string;
  id: string;
  success: boolean;
  message: string;
}

interface ApiResponse {
  body?: {
    files?: FileDoc[];
    debug?: unknown;
    message?: string;
    id?: string;
  };
  files?: FileDoc[];
  id?: string;
  message?: string;
}

// Required metadata fields for bulk upload validation
const REQUIRED_METADATA_FIELDS = ["name", "type"];

// Checks if a parsed JSON object conforms to the document standard
const isConformingDocument = (data: Record<string, unknown>): boolean => {
  return REQUIRED_METADATA_FIELDS.every(
    (field) => field in data && typeof data[field] === "string" && String(data[field]).trim() !== ""
  );
};

export const FileManager = () => {
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
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

  // Single upload state
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleFileConforms, setSingleFileConforms] = useState(false);
  const [singleFileContent, setSingleFileContent] = useState<string>("");
  const [singleName, setSingleName] = useState("");
  const [singleType, setSingleType] = useState("");
  const [singleIsPrivate, setSingleIsPrivate] = useState(true);
  const [singleExternalId, setSingleExternalId] = useState("");
  const [singleUploading, setSingleUploading] = useState(false);
  const [singleUploadResult, setSingleUploadResult] = useState<UploadResult | null>(null);

  // Viewer modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerFile, setViewerFile] = useState<FileDoc | null>(null);
  const [viewerContent, setViewerContent] = useState<string>("");

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    if (showOnlyMine && currentUserId) {
      result = result.filter((f) => f.owner === currentUserId);
    }

    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(
        (f) =>
          (f.displayName || "").toLowerCase().includes(lowerFilter) ||
          (f.owner || "").toLowerCase().includes(lowerFilter) ||
          (f.type || "").toLowerCase().includes(lowerFilter)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "displayName":
          aVal = (a.displayName || "").toLowerCase();
          bVal = (b.displayName || "").toLowerCase();
          break;
        case "type":
          aVal = (a.type || "").toLowerCase();
          bVal = (b.type || "").toLowerCase();
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
  }, [files, filterText, sortField, sortDirection, showOnlyMine, currentUserId]);

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

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/filesList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }
      const data = (await response.json()) as ApiResponse;
      const fileList: FileDoc[] = data.body?.files || data.files || [];
      setFiles(fileList);
    } catch (error) {
      showToast({
        title: "Error loading files",
        message: error instanceof Error ? error.message : "Unknown error",
        type: "critical",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
    try {
      const userDetails = getCurrentUserDetails();
      setCurrentUserId(userDetails.id);
    } catch (err) {
      console.error("Failed to get current user details:", err);
    }
  }, [loadFiles]);

  const hasNonOwnedSelected = useMemo(() => {
    if (!currentUserId) return false;
    return Array.from(selectedFiles).some((id) => {
      const file = files.find((f) => f.id === id);
      return file && file.owner !== currentUserId;
    });
  }, [selectedFiles, files, currentUserId]);

  const handleSelectAll = () => {
    const allIds = filteredAndSortedFiles.map((f) => f.id);
    const allSelected = allIds.every((id) => selectedFiles.has(id));

    if (allSelected && allIds.length > 0) {
      const newSelected = new Set(selectedFiles);
      allIds.forEach((id) => newSelected.delete(id));
      setSelectedFiles(newSelected);
    } else {
      const newSelected = new Set(selectedFiles);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedFiles(newSelected);
    }
  };

  const handleSelectFile = (id: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFiles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) {
      showToast({
        title: "No files selected",
        message: "Please select at least one file to delete",
        type: "warning",
      });
      return;
    }

    const filesToDelete = files.filter((f) => selectedFiles.has(f.id));
    const namesList = filesToDelete
      .map((f) => `  • ${f.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to delete ${selectedFiles.size} file(s)? This action cannot be undone.\n\nFiles to delete:\n${namesList}`
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteResults([]);
    const fileIds = Array.from(selectedFiles);
    let successCount = 0;
    let failCount = 0;
    const deletedNames: string[] = [];
    const failedNames: string[] = [];
    const results: DeleteResult[] = [];

    for (const id of fileIds) {
      const file = files.find((f) => f.id === id);
      const name = file?.displayName || id;

      try {
        const response = await fetch("/api/filesDelete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        const responseData = (await response
          .json()
          .catch(() => ({}))) as ApiResponse;

        if (
          response.ok &&
          responseData.body?.message?.includes("successfully")
        ) {
          successCount++;
          deletedNames.push(name);
          results.push({
            name,
            id: responseData.body?.id || id,
            success: true,
            message: responseData.body?.message || "File deleted successfully",
          });
        } else {
          failCount++;
          failedNames.push(name);
          results.push({
            name,
            id,
            success: false,
            message: responseData.body?.message || "Failed to delete file",
          });
        }
      } catch (error) {
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
    setSelectedFiles(new Set());
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
        message: `Deleted: ${deletedNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    await loadFiles();
  };

  // --- Bulk Upload (requires conforming format) ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFilesList = event.target.files;
    if (selectedFilesList) {
      setUploadFiles(Array.from(selectedFilesList));
      setUploadResults([]);
    }
  };

  const uploadConformingFile = async (file: File): Promise<UploadResult> => {
    try {
      const content = await file.text();
      let fileData: Record<string, unknown>;
      try {
        fileData = JSON.parse(content) as Record<string, unknown>;
      } catch {
        return {
          fileName: file.name,
          success: false,
          error: "Invalid JSON",
        };
      }

      if (!isConformingDocument(fileData)) {
        return {
          fileName: file.name,
          success: false,
          error: "Missing required fields: name, type. Use Single Upload for non-conforming files.",
        };
      }

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fileData, _fileName: file.name }),
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
        fileId: responseData.id,
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
        message: "Please select at least one JSON file to upload",
        type: "critical",
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (const file of uploadFiles) {
      const result = await uploadConformingFile(file);
      results.push(result);
      setUploadResults([...results]);
    }

    setUploading(false);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      showToast({
        title: "Upload complete",
        message: `Successfully uploaded ${successCount} file(s)`,
        type: "success",
      });
    } else {
      showToast({
        title: "Upload completed with errors",
        message: `${successCount} succeeded, ${failCount} failed`,
        type: "warning",
      });
    }

    await loadFiles();
  };

  // --- Single Upload (prompts for metadata if non-conforming) ---

  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSingleFile(file);
    setSingleUploadResult(null);
    setSingleName("");
    setSingleType("");
    setSingleIsPrivate(true);
    setSingleExternalId("");
    setSingleFileConforms(false);
    setSingleFileContent("");

    if (!file) return;

    try {
      const text = await file.text();
      setSingleFileContent(text);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Not valid JSON — treat as raw content, user must fill in metadata
        setSingleFileConforms(false);
        setSingleName(file.name.replace(/\.[^.]+$/, ""));
        return;
      }

      if (isConformingDocument(parsed)) {
        setSingleFileConforms(true);
        setSingleName((parsed.name as string) || "");
        setSingleType((parsed.type as string) || "");
        setSingleIsPrivate(parsed.isPrivate !== false);
        setSingleExternalId((parsed.externalId as string) || "");
      } else {
        setSingleFileConforms(false);
        // Pre-fill name from file if available in JSON
        setSingleName((parsed.name as string) || file.name.replace(/\.[^.]+$/, ""));
        setSingleType((parsed.type as string) || "");
      }
    } catch {
      setSingleFileConforms(false);
      setSingleName(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleSingleUpload = async () => {
    if (!singleFile) return;

    if (!singleName.trim() || !singleType.trim()) {
      showToast({
        title: "Missing required fields",
        message: "Name and Type are required",
        type: "critical",
      });
      return;
    }

    setSingleUploading(true);
    setSingleUploadResult(null);

    try {
      let payload: Record<string, unknown>;

      if (singleFileConforms) {
        // File conforms — parse and send as-is (metadata will be extracted by API)
        const parsed = JSON.parse(singleFileContent) as Record<string, unknown>;
        payload = {
          ...parsed,
          // Allow overrides from form fields
          name: singleName,
          type: singleType,
          isPrivate: singleIsPrivate,
          ...(singleExternalId.trim() ? { externalId: singleExternalId } : {}),
          _fileName: singleFile.name,
        };
      } else {
        // File doesn't conform — wrap content in rawText
        payload = {
          name: singleName,
          type: singleType,
          isPrivate: singleIsPrivate,
          ...(singleExternalId.trim() ? { externalId: singleExternalId } : {}),
          rawText: singleFileContent,
          _fileName: singleFile.name,
        };
      }

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setSingleUploadResult({
        fileName: singleFile.name,
        success: true,
        fileId: responseData.id,
      });

      showToast({
        title: "Upload complete",
        message: `Successfully uploaded ${singleName}`,
        type: "success",
      });

      await loadFiles();
    } catch (error) {
      setSingleUploadResult({
        fileName: singleFile.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSingleUploading(false);
    }
  };

  const onSingleUploadClick = () => {
    void handleSingleUpload();
  };

  // --- Viewer Modal ---

  const openViewer = async (file: FileDoc) => {
    setViewerFile(file);
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerContent("");

    try {
      const response = await fetch("/api/filesGet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const responseData = await response.json() as { statusCode?: number; body?: Record<string, unknown> };
      const body = (responseData.body || responseData) as Record<string, unknown>;
      const rawText = body.rawText;
      if (rawText && typeof rawText === "string") {
        setViewerContent(rawText);
      } else {
        setViewerContent("No rawText content found for this document.");
      }
    } catch (error) {
      setViewerContent(
        `Error loading file content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerFile(null);
    setViewerContent("");
  };

  const handleExportSelected = async () => {
    if (selectedFiles.size === 0) {
      showToast({
        title: "No files selected",
        message: "Please select at least one file to export",
        type: "warning",
      });
      return;
    }

    for (const id of selectedFiles) {
      try {
        const response = await fetch("/api/filesGet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (response.ok) {
          const responseData = await response.json() as { statusCode?: number; body?: unknown };
          const fileContent = responseData.body || responseData;
          const file = files.find((f) => f.id === id);
          const fileName = `${file?.displayName || id}.json`;

          const blob = new Blob([JSON.stringify(fileContent, null, 2)], {
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
        console.error(`Failed to export file ${id}:`, error);
      }
    }

    showToast({
      title: "Export complete",
      message: `Exported ${selectedFiles.size} file(s)`,
      type: "success",
    });
  };

  const handleBulkToggleVisibility = async (makePrivate: boolean) => {
    if (selectedFiles.size === 0) {
      showToast({
        title: "No files selected",
        message: "Please select at least one file to update",
        type: "warning",
      });
      return;
    }

    const action = makePrivate ? "private" : "public";
    const filesToUpdate = files.filter((f) => selectedFiles.has(f.id));
    const namesList = filesToUpdate
      .map((f) => `  • ${f.displayName || "Unnamed"}`)
      .join("\n");

    if (
      !confirm(
        `Are you sure you want to make ${selectedFiles.size} file(s) ${action}?\n\nFiles to update:\n${namesList}`
      )
    ) {
      return;
    }

    setToggling(true);
    setUpdateResults([]);
    const fileIds = Array.from(selectedFiles);
    let successCount = 0;
    let failCount = 0;
    const successNames: string[] = [];
    const failedNames: string[] = [];
    const results: UpdateResult[] = [];

    for (const id of fileIds) {
      const file = files.find((f) => f.id === id);
      const name = file?.displayName || id;

      try {
        const response = await fetch("/api/filesUpdate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isPrivate: makePrivate }),
        });

        const responseData = (await response
          .json()
          .catch(() => ({}))) as ApiResponse;

        if (
          response.ok &&
          responseData.body?.message?.includes("successfully")
        ) {
          successCount++;
          successNames.push(name);
          results.push({
            name,
            id: responseData.body?.id || id,
            success: true,
            message: responseData.body?.message || "File updated successfully",
          });
        } else {
          failCount++;
          failedNames.push(name);
          results.push({
            name,
            id,
            success: false,
            message: responseData.body?.message || "Failed to update file",
          });
        }
      } catch (error) {
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
    setSelectedFiles(new Set());
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
        message: `Failed to update: ${failedNames.join(", ")}. Note: Only file owners can change visibility.`,
        type: "critical",
      });
    } else {
      showToast({
        title: "Update completed with errors",
        message: `Updated: ${successNames.join(", ")}. Failed: ${failedNames.join(", ")}`,
        type: "warning",
      });
    }

    await loadFiles();
  };

  const onRefreshClick = () => {
    setDeleteResults([]);
    setUploadResults([]);
    setUpdateResults([]);
    void loadFiles();
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

  const inputStyle = {
    padding: "10px 12px",
    border: `1px solid ${Colors.Border.Neutral.Default}`,
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: Colors.Text.Neutral.Default,
    fontSize: "14px",
    width: "100%",
    maxWidth: "400px",
  };

  return (
    <Page>
      <Page.Header>
        <Flex flexDirection="column" gap={8}>
          <Heading level={1}>Document Manager</Heading>
          <Paragraph>
            Upload, manage, export, and delete document files. Shows all document types except notebooks, dashboards, and launchpads.
          </Paragraph>
        </Flex>
      </Page.Header>
      <Page.Main>
        <Container>
          <Flex flexDirection="column" gap={32}>
            {/* Single Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Upload Single File</Heading>
              <Paragraph>
                Upload a single file. If the file contains standard metadata (name, type), it will be used automatically. Otherwise, fill in the fields below.
              </Paragraph>

              <input
                type="file"
                title="Select a file to upload"
                onChange={(e) => void handleSingleFileChange(e)}
                disabled={singleUploading}
                style={{
                  padding: "12px",
                  border: `2px dashed ${Colors.Border.Neutral.Default}`,
                  borderRadius: "4px",
                  cursor: singleUploading ? "not-allowed" : "pointer",
                }}
              />

              {singleFile && (
                <>
                  {singleFileConforms ? (
                    <Paragraph style={{ color: Colors.Text.Success.Default }}>
                      File conforms to document standard. Metadata auto-populated.
                    </Paragraph>
                  ) : (
                    <Paragraph style={{ color: Colors.Text.Warning.Default }}>
                      File does not contain required metadata. Content will be stored as rawText. Please fill in the fields below.
                    </Paragraph>
                  )}

                  <Flex flexDirection="column" gap={12}>
                    <Flex flexDirection="column" gap={4}>
                      <label style={{ color: Colors.Text.Neutral.Default, fontSize: "13px", fontWeight: 500 }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Document name"
                        value={singleName}
                        onChange={(e) => setSingleName(e.target.value)}
                        style={inputStyle}
                      />
                    </Flex>

                    <Flex flexDirection="column" gap={4}>
                      <label style={{ color: Colors.Text.Neutral.Default, fontSize: "13px", fontWeight: 500 }}>
                        Type *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. application/json, workflow-template, extension-yaml"
                        value={singleType}
                        onChange={(e) => setSingleType(e.target.value)}
                        style={inputStyle}
                      />
                    </Flex>

                    <Flex flexDirection="column" gap={4}>
                      <label style={{ color: Colors.Text.Neutral.Default, fontSize: "13px", fontWeight: 500 }}>
                        External ID (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="External identifier"
                        value={singleExternalId}
                        onChange={(e) => setSingleExternalId(e.target.value)}
                        style={inputStyle}
                      />
                    </Flex>

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
                        checked={singleIsPrivate}
                        onChange={(e) => setSingleIsPrivate(e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                      Private
                    </label>
                  </Flex>

                  <Flex gap={16}>
                    <Button
                      variant="emphasized"
                      onClick={onSingleUploadClick}
                      disabled={singleUploading || !singleName.trim() || !singleType.trim()}
                    >
                      <Button.Prefix>
                        <UploadIcon />
                      </Button.Prefix>
                      {singleUploading ? "Uploading..." : "Upload File"}
                    </Button>
                  </Flex>

                  {singleUploadResult && (
                    <Paragraph
                      style={{
                        fontSize: "12px",
                        color: singleUploadResult.success
                          ? Colors.Text.Success.Default
                          : Colors.Text.Critical.Default,
                      }}
                    >
                      {singleUploadResult.success
                        ? `Success - ID: ${singleUploadResult.fileId}`
                        : `Error: ${singleUploadResult.error}`}
                    </Paragraph>
                  )}
                </>
              )}
            </Flex>

            {/* Bulk Upload Section */}
            <Flex flexDirection="column" gap={16}>
              <Heading level={2}>Bulk Upload Files</Heading>
              <Paragraph>
                Select multiple JSON files to upload. Each file must conform to the document standard (requires name and type fields). Non-conforming files will be rejected.
              </Paragraph>

              <input
                type="file"
                accept=".json,application/json"
                multiple
                title="Select JSON files to upload"
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
                  {uploading ? "Uploading..." : "Bulk Upload Files"}
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
                <Heading level={2}>Existing Files</Heading>
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
                  placeholder="Filter by name, owner, or type..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={inputStyle}
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
                  Show only my files
                </label>
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
                  onClick={onExportClick}
                  disabled={selectedFiles.size === 0}
                >
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  Export Selected ({selectedFiles.size})
                </Button>
                <Button
                  variant="default"
                  onClick={onMakePrivateClick}
                  disabled={toggling || selectedFiles.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify files you don't own" : undefined}
                >
                  <Button.Prefix>
                    <LockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Private"}
                </Button>
                <Button
                  color="warning"
                  onClick={onMakePublicClick}
                  disabled={toggling || selectedFiles.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot modify files you don't own" : undefined}
                >
                  <Button.Prefix>
                    <UnlockIcon />
                  </Button.Prefix>
                  {toggling ? "Updating..." : "Make Public"}
                </Button>
                <Button
                  color="critical"
                  onClick={onDeleteClick}
                  disabled={deleting || selectedFiles.size === 0 || hasNonOwnedSelected}
                  title={hasNonOwnedSelected ? "Cannot delete files you don't own" : undefined}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {deleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedFiles.size})`}
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
                  <Paragraph>Loading files...</Paragraph>
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
                            title="Select all files"
                            checked={
                              filteredAndSortedFiles.length > 0 &&
                              filteredAndSortedFiles.every((f) => selectedFiles.has(f.id))
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
                          onClick={() => handleSort("type")}
                          title="Sort by type"
                        >
                          Type{getSortIndicator("type")}
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
                      {filteredAndSortedFiles.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: Colors.Text.Neutral.Default,
                            }}
                          >
                            {filterText
                              ? "No files match filter"
                              : "No files found"}
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
                                title={`Select ${file.displayName || "file"}`}
                                checked={selectedFiles.has(file.id)}
                                onChange={() => handleSelectFile(file.id)}
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {currentUserId && file.owner === currentUserId ? (
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    void openViewer(file);
                                  }}
                                  style={{
                                    color: Colors.Text.Primary.Default,
                                    textDecoration: "none",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.textDecoration = "underline")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.textDecoration = "none")
                                  }
                                >
                                  <Strong>{file.displayName || "Unnamed"}</Strong>
                                </a>
                              ) : (
                                <Strong>{file.displayName || "Unnamed"}</Strong>
                              )}
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
                                  backgroundColor: Colors.Background.Surface.Default,
                                  color: Colors.Text.Neutral.Default,
                                  fontWeight: 500,
                                }}
                              >
                                {file.type || "unknown"}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {file.owner || "N/A"}
                              {currentUserId && file.owner === currentUserId && (
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
                              {file.createdTime
                                ? new Date(file.createdTime).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "12px",
                                color: Colors.Text.Neutral.Default,
                              }}
                            >
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString()
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
                                  backgroundColor: file.isPublic
                                    ? Colors.Background.Field.Warning.Default
                                    : Colors.Background.Field.Success.Default,
                                  color: file.isPublic
                                    ? Colors.Text.Warning.Default
                                    : Colors.Text.Success.Default,
                                  fontWeight: 500,
                                }}
                              >
                                {file.isPublic ? "PUBLIC" : "Private"}
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
                    <Strong>{filteredAndSortedFiles.length}</Strong> of{" "}
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

        {/* Viewer Modal */}
        {viewerOpen && viewerFile && (
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
            onClick={(e) => {
              if (e.target === e.currentTarget) closeViewer();
            }}
          >
            <div
              style={{
                backgroundColor: Colors.Background.Surface.Default,
                borderRadius: "8px",
                width: "90%",
                maxWidth: "1000px",
                maxHeight: "85vh",
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
                    {viewerFile.displayName || "Unnamed"}
                  </Heading>
                  <Paragraph
                    style={{
                      fontSize: "12px",
                      color: Colors.Text.Neutral.Subdued,
                    }}
                  >
                    Type: {viewerFile.type || "unknown"} | ID: {viewerFile.id}
                  </Paragraph>
                </Flex>
                <Button variant="default" onClick={closeViewer}>
                  <Button.Prefix>
                    <XmarkIcon />
                  </Button.Prefix>
                  Close
                </Button>
              </Flex>

              {/* Modal Content */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "16px",
                }}
              >
                {viewerLoading ? (
                  <Flex justifyContent="center" padding={32}>
                    <Paragraph>Loading content...</Paragraph>
                  </Flex>
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      padding: "16px",
                      backgroundColor: Colors.Background.Container.Neutral.Subdued,
                      borderRadius: "4px",
                      border: `1px solid ${Colors.Border.Neutral.Default}`,
                      color: Colors.Text.Neutral.Default,
                      fontSize: "13px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "monospace",
                      overflow: "auto",
                      maxHeight: "calc(85vh - 120px)",
                    }}
                  >
                    {viewerContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </Page.Main>
    </Page>
  );
};
