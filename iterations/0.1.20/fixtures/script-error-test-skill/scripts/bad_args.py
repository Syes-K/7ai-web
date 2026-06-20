#!/usr/bin/env python3
"""Requires one arg — call with no args to get exit 2."""

import sys

if len(sys.argv) < 2:
    print("ERROR: usage bad_args.py <label>", file=sys.stderr)
    sys.exit(2)

print(f"ok label={sys.argv[1]}")
