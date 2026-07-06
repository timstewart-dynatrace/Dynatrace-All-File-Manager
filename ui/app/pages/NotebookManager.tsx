import React from "react";
import { DocumentManager, DocumentManagerConfig } from "../components/DocumentManager";

const config: DocumentManagerConfig = {
  entityName: "Notebook",
  entityNamePlural: "Notebooks",
  apiList: "/api/notebooksList",
  apiCreate: "/api/notebooks",
  apiDelete: "/api/notebooksDelete",
  apiGet: "/api/notebooksGet",
  apiUpdate: "/api/notebooksUpdate",
  apiShare: "/api/notebooksShare",
  apiShareList: "/api/notebooksShareList",
  responseKey: "notebooks",
  dtLinkPath: "/ui/apps/dynatrace.notebooks/notebook/",
};

export const NotebookManager = () => <DocumentManager config={config} />;
