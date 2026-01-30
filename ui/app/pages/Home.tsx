import React from "react";

import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";
import { useCurrentTheme } from "@dynatrace/strato-components/core";
import { Flex } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Card } from "../components/Card";
import { APP_VERSION } from "../constants";

export const Home = () => {
  const theme = useCurrentTheme();
  return (
    <Flex flexDirection="column" alignItems="center" padding={32}>
      <img
        src="./assets/Dynatrace_Logo.svg"
        alt="Dynatrace Logo"
        width={150}
        height={150}
        style={{ paddingBottom: 32 }}
      ></img>

      <Heading>ESA Document Management</Heading>
      <Paragraph>
    Additional functions for managing Dynatrace Notebooks and Dashboards.
      </Paragraph>

      <Flex gap={48} paddingTop={64} flexFlow="wrap">
        <Card
          href="/notebook-manager"
          inAppLink
          imgSrc={
            theme === "light"
              ? "./assets/notebook.svg"
              : "./assets/notebook_dark.svg"
          }
          name="Notebook Manager"
        />
        <Card
          href="/dashboard-manager"
          inAppLink
          imgSrc={
            theme === "light"
              ? "./assets/dashboard.svg"
              : "./assets/dashboard_dark.svg"
          }
          name="Dashboard Manager"
        />
      </Flex>
      <Paragraph style={{ marginTop: 48 }}>
        <a 
          href={`${getEnvironmentUrl()}/ui/apps/dynatrace.settings/settings/document-management`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          View Global Document Management Settings
        </a>
      </Paragraph>
      <Paragraph style={{ marginTop: 48, opacity: 0.6 }}>
        Version {APP_VERSION}
      </Paragraph>
    </Flex>
  );
};
