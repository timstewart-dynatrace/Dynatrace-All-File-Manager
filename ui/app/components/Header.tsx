import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo as={Link} to="/" />
        <AppHeader.NavigationItem as={Link} to="/notebook-manager">
          Notebooks
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/dashboard-manager">
          Dashboards
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/lookup-file-manager">
          Lookup Tables
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/file-manager">
          Documents
        </AppHeader.NavigationItem>
      </AppHeader.Navigation>
    </AppHeader>
  );
};
