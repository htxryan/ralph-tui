/**
 * Styled Text Component
 *
 * Renders styled segments from markdown parsing.
 */

import React from 'react';
import { Text } from 'ink';
import { StyledSegment } from '../../lib/markdown.js';
import { colors } from '../../lib/colors.js';

export interface StyledTextProps {
  segments: StyledSegment[];
}

export function StyledText({ segments }: StyledTextProps): React.ReactElement {
  return (
    <>
      {segments.map((segment, i) => (
        <Text
          key={i}
          bold={segment.bold}
          italic={segment.italic}
          color={segment.dimmed ? colors.dimmed : segment.color}
          dimColor={segment.dimmed}
        >
          {segment.text}
        </Text>
      ))}
    </>
  );
}
