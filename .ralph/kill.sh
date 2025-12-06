#!/bin/bash
# Kill any running ralph.sh, sync.sh, and related child processes

echo "Looking for ralph-related processes..."

# Kill ralph.sh processes
RALPH_PIDS=$(pgrep -f 'ralph\.sh' 2>/dev/null)
if [ -n "$RALPH_PIDS" ]; then
    echo "Killing ralph.sh processes: $RALPH_PIDS"
    pkill -f 'ralph\.sh'
else
    echo "No ralph.sh processes found"
fi

# Kill sync.sh processes
SYNC_PIDS=$(pgrep -f 'sync\.sh' 2>/dev/null)
if [ -n "$SYNC_PIDS" ]; then
    echo "Killing sync.sh processes: $SYNC_PIDS"
    pkill -f 'sync\.sh'
else
    echo "No sync.sh processes found"
fi

# Kill any child processes spawned from .ralph directory (visualize.py, tee, etc.)
RALPH_DIR_PIDS=$(pgrep -f '\.ralph/' 2>/dev/null)
if [ -n "$RALPH_DIR_PIDS" ]; then
    echo "Killing .ralph child processes: $RALPH_DIR_PIDS"
    pkill -f '\.ralph/'
else
    echo "No .ralph child processes found"
fi

# Kill any remaining visualize.py processes (catches parent bash wrappers)
VIZ_PIDS=$(pgrep -f 'visualize\.py' 2>/dev/null)
if [ -n "$VIZ_PIDS" ]; then
    echo "Killing visualize.py processes: $VIZ_PIDS"
    pkill -f 'visualize\.py'
else
    echo "No visualize.py processes found"
fi

echo "Done"
