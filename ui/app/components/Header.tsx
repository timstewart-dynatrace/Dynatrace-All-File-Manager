import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/data">
          Explore Data
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/notebook-manager">
          Notebook Manager
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/dashboard-manager">
          Dashboard Manager
        </AppHeader.NavItem>
      </AppHeader.NavItems>
    </AppHeader>
  );
};
