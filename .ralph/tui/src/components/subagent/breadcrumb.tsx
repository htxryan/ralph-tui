import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../../lib/colors.js';

export interface BreadcrumbProps {
  path: string[];
}

export function Breadcrumb({ path }: BreadcrumbProps): React.ReactElement {
  return (
    <Box flexDirection="row">
      {path.map((segment, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text color={colors.dimmed}> {'\u203A'} </Text>}
          <Text
            color={i === path.length - 1 ? colors.selected : colors.subagent}
            bold={i === path.length - 1}
          >
            {segment}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  );
}
