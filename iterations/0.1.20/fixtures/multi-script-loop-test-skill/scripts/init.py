#!/usr/bin/env python3
"""Loop test — phase init (single run before the round loop)."""

import json
import sys
from pathlib import Path


def main() -> None:
    config_path = Path(__file__).resolve().parent.parent / "data" / "loop-config.json"
    default_rounds = 3
    if config_path.is_file():
        try:
            cfg = json.loads(config_path.read_text(encoding="utf-8"))
            default_rounds = int(cfg.get("defaultRounds", 3))
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

    print("INIT_OK")
    print(f"default_rounds={default_rounds}")
    print("next=tick_or_ping_loop")


if __name__ == "__main__":
    main()
    sys.exit(0)
