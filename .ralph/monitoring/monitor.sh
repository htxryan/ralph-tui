#!/usr/bin/env bash
# Memory monitoring script - logs top processes every 30 seconds

LOG_FILE="/Users/ryan.henderson/src/background-assassins/.ralph/monitoring/memory_log.txt"

echo "=== Memory Monitoring Started $(date) ===" >> "$LOG_FILE"

while true; do
    echo "" >> "$LOG_FILE"
    echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---" >> "$LOG_FILE"

    # System memory overview
    vm_stat | head -5 >> "$LOG_FILE"

    # Top memory consumers (RSS in KB)
    echo "Top processes by memory (RSS in KB):" >> "$LOG_FILE"
    ps -eo pid,rss,comm -r | head -15 >> "$LOG_FILE"

    # Specific process tracking
    echo "Tracked processes:" >> "$LOG_FILE"
    ps -eo pid,rss,comm | grep -E "(claude|Chrome|iTerm|node|Python)" | head -20 >> "$LOG_FILE"

    # Log file size
    if [ -f "/Users/ryan.henderson/src/background-assassins/.ralph/claude_output.jsonl" ]; then
        echo "Log file size: $(ls -lh /Users/ryan.henderson/src/background-assassins/.ralph/claude_output.jsonl | awk '{print $5}')" >> "$LOG_FILE"
    fi

    sleep 30
done
