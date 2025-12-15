import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Data } from "./pages/Data";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { NotebookManager } from "./pages/NotebookManager";

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/data" element={<Data />} />
          <Route path="/notebook-manager" element={<NotebookManager />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
