#!/usr/bin/env python3
"""Loop test — after all rounds: args [total]."""

import sys


def main() -> None:
    if len(sys.argv) < 2:
        print("ERROR: usage finalize.py <total>", file=sys.stderr)
        sys.exit(2)

    total = sys.argv[1]
    try:
        n = int(total)
    except ValueError:
        print("ERROR: total must be an integer", file=sys.stderr)
        sys.exit(2)

    # init(1) + N loop runs + finalize(1) = N + 2 tool calls
    expected_runs = n + 2
    print(f"DONE total_rounds={n} expected_run_skill_script_calls={expected_runs}")
    print("phase=finalize script=finalize.py")


if __name__ == "__main__":
    main()
