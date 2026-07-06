import React from "react";

import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";
import { useCurrentTheme } from "@dynatrace/strato-components/core";
import { Flex } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
} from "@dynatrace/strato-components/typography";
import { Card } from "../components/Card";
import { APP_VERSION } from "../constants";
import { ENABLED_FEATURE_LIST } from "../features";

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

      <Heading>Dynatrace All File Manager</Heading>
      <Paragraph>
    Additional functions for managing Dynatrace files and documents.
      </Paragraph>

      <Flex gap={48} paddingTop={64} flexFlow="wrap">
        {ENABLED_FEATURE_LIST.map((feature) => (
          <Card
            key={feature.id}
            href={feature.path}
            inAppLink
            imgSrc={theme === "light" ? feature.cardIconLight : feature.cardIconDark}
            name={feature.cardName}
          />
        ))}
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
