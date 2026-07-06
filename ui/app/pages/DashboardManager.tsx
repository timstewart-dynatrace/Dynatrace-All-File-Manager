import React from "react";
import { DocumentManager, DocumentManagerConfig } from "../components/DocumentManager";

const config: DocumentManagerConfig = {
  entityName: "Dashboard",
  entityNamePlural: "Dashboards",
  apiList: "/api/dashboardsList",
  apiCreate: "/api/dashboards",
  apiDelete: "/api/dashboardsDelete",
  apiGet: "/api/dashboardsGet",
  apiUpdate: "/api/dashboardsUpdate",
  apiShare: "/api/dashboardsShare",
  apiShareList: "/api/dashboardsShareList",
  responseKey: "dashboards",
  dtLinkPath: "/ui/apps/dynatrace.dashboards/dashboard/",
};

export const DashboardManager = () => <DocumentManager config={config} />;
