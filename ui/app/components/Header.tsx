import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";
import { ENABLED_FEATURE_LIST } from "../features";

export const Header = () => {
  // Single-feature builds have nothing to switch between, so the nav
  // items are omitted — only the logo (linking to the one page) shows.
  const showNavItems = ENABLED_FEATURE_LIST.length > 1;

  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo as={Link} to="/" />
        {showNavItems &&
          ENABLED_FEATURE_LIST.map((feature) => (
            <AppHeader.NavigationItem key={feature.id} as={Link} to={feature.path}>
              {feature.navLabel}
            </AppHeader.NavigationItem>
          ))}
      </AppHeader.Navigation>
    </AppHeader>
  );
};
