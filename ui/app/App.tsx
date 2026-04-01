import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { NotebookManager } from "./pages/NotebookManager";
import { DashboardManager } from "./pages/DashboardManager";
import { LookupFileManager } from "./pages/LookupFileManager";
import { FileManager } from "./pages/FileManager";

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notebook-manager" element={<NotebookManager />} />
          <Route path="/dashboard-manager" element={<DashboardManager />} />
          <Route path="/lookup-file-manager" element={<LookupFileManager />} />
          <Route path="/file-manager" element={<FileManager />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
