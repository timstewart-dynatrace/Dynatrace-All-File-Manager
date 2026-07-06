import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { NotebookManager } from "./pages/NotebookManager";
import { DashboardManager } from "./pages/DashboardManager";
import { LookupFileManager } from "./pages/LookupFileManager";
import { FileManager } from "./pages/FileManager";
import { ENABLED_FEATURE_LIST, FEATURE_REGISTRY, isFeatureEnabled } from "./features";

// Single-feature deploy targets skip Home and land straight on their manager.
const singleFeature =
  ENABLED_FEATURE_LIST.length === 1 ? ENABLED_FEATURE_LIST[0] : null;

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route
            path="/"
            element={
              singleFeature ? (
                <Navigate to={singleFeature.path} replace />
              ) : (
                <Home />
              )
            }
          />
          {isFeatureEnabled("notebooks") && (
            <Route
              path={FEATURE_REGISTRY.notebooks.path}
              element={<NotebookManager />}
            />
          )}
          {isFeatureEnabled("dashboards") && (
            <Route
              path={FEATURE_REGISTRY.dashboards.path}
              element={<DashboardManager />}
            />
          )}
          {isFeatureEnabled("lookup") && (
            <Route
              path={FEATURE_REGISTRY.lookup.path}
              element={<LookupFileManager />}
            />
          )}
          {isFeatureEnabled("documents") && (
            <Route
              path={FEATURE_REGISTRY.documents.path}
              element={<FileManager />}
            />
          )}
        </Routes>
      </Page.Main>
    </Page>
  );
};
