import React from "react";

import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";

export const NotebookManager = () => {
  return (
    <Flex flexDirection="column" alignItems="center" padding={32}>
      <Heading>Notebook Manager</Heading>
      <Paragraph>Manage your Dynatrace notebooks here.</Paragraph>
    </Flex>
  );
};
