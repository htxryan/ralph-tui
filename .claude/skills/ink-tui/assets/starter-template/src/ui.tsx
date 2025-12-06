import React, {useState} from 'react';
import {Box, Text, useInput, useApp} from 'ink';

interface Props {
  name?: string;
}

const App: React.FC<Props> = ({name = 'World'}) => {
  const {exit} = useApp();
  const [counter, setCounter] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCounter(c => c + 1);
    }
    if (key.downArrow) {
      setCounter(c => Math.max(0, c - 1));
    }
    if (input === 'q' || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="green" paddingX={2}>
        <Text color="green" bold>
          Hello, {name}!
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>Counter: </Text>
        <Text color="cyan" bold>{counter}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Press <Text color="yellow">↑</Text>/<Text color="yellow">↓</Text> to change counter, <Text color="yellow">q</Text> to quit
        </Text>
      </Box>
    </Box>
  );
};

export default App;
