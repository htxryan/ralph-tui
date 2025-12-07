import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';

export interface SpinnerProps {
  label?: string;
  color?: string;
  type?: 'dots' | 'line' | 'arrow';
}

const spinnerFrames = {
  dots: ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'],
  line: ['-', '\\', '|', '/'],
  arrow: ['\u2190', '\u2191', '\u2192', '\u2193'],
};

export function Spinner({
  label,
  color = colors.running,
  type = 'dots',
}: SpinnerProps): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const frames = spinnerFrames[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <Text color={color}>
      {frames[frame]}
      {label && ` ${label}`}
    </Text>
  );
}
