#!/usr/bin/env python3
"""Exit with code 42 — tests non-zero exitCode handling."""

import sys

print("about_to_fail")
print("FAIL_42", file=sys.stderr)
sys.exit(42)
