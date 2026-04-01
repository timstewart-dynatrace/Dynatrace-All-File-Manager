import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/notebook-manager">
          Notebooks
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/dashboard-manager">
          Dashboards
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/lookup-file-manager">
          Lookup Tables
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/file-manager">
          Documents
        </AppHeader.NavItem>
      </AppHeader.NavItems>
    </AppHeader>
  );
};
