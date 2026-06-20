#!/usr/bin/env bash
# Loop test — even rounds: args [round]

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "ERROR: usage ping.sh <round>" >&2
  exit 2
fi

round="$1"
if ! [[ "$round" =~ ^[0-9]+$ ]]; then
  echo "ERROR: round must be an integer" >&2
  exit 2
fi

echo "PONG round=${round}"
echo "phase=ping script=ping.sh"
