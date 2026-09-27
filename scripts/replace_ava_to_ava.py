#!/usr/bin/env python3
"""
replace_ava_to_ava.py
=======================
AvA Code source-tree branding replacement tool.
Safely replaces 'ava' -> 'ava-code' (and case variants) across the source.

Usage:
    python3 scripts/replace_ava_to_ava.py           # dry-run (safe, no writes)
    python3 scripts/replace_ava_to_ava.py --apply   # actually apply changes
    python3 scripts/replace_ava_to_ava.py --apply --path ava-rs/tui
"""

import argparse
import os
import re
import sys
from pathlib import Path

# ANSI colors
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

# Directories to skip entirely
SKIP_DIRS = {
    ".git", "node_modules", "target", ".tmp", "__pycache__",
    "vendor", ".cache", "dist", "build", "out",
}

# File extensions to skip
SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz", ".bz2", ".xz",
    ".so", ".dylib", ".dll", ".a", ".lib",
    ".exe", ".bin", ".wasm",
    ".pdf", ".db", ".sqlite", ".sqlite3",
    ".lock", ".snap",
}

# Specific filenames to never touch
SKIP_FILENAMES = {
    "MODULE.bazel.lock", "pnpm-lock.yaml", "package-lock.json",
    "Cargo.lock", "yarn.lock", "flake.lock",
}

# AGENTS.md rule: NEVER touch these patterns
PROTECTED_PATTERNS = [
    "AVA_SANDBOX_NETWORK_DISABLED_ENV_VAR",
    "AVA_SANDBOX_NETWORK_DISABLED",
    "AVA_SANDBOX_ENV_VAR",
    "AVA_SANDBOX",
]

# Replacement rules (most specific first!)
RULES = [
    # env-var style
    (r"\bAVA_HOME\b",             "AVA_CODE_HOME"),
    (r"\bAVA_SQLITE_HOME\b",      "AVA_CODE_SQLITE_HOME"),
    # CamelCase identifiers
    (r"\bAvaHome\b",              "AvaCodeHome"),
    (r"\bAvaConfig\b",            "AvaCodeConfig"),
    (r"\bAvaApp\b",               "AvaCodeApp"),
    (r"\bAvaError\b",             "AvaCodeError"),
    (r"\bAvaState\b",             "AvaCodeState"),
    (r"\bAvaSession\b",           "AvaCodeSession"),
    (r"\bAvaAgent\b",             "AvaCodeAgent"),
    # snake_case
    (r"\bava_home\b",             "ava_code_home"),
    (r"\bava_config\b",           "ava_code_config"),
    (r"\bava_state\b",            "ava_code_state"),
    (r"\bava_session\b",          "ava_code_session"),
    (r"\bava_agent\b",            "ava_code_agent"),
    (r"\bava_error\b",            "ava_code_error"),
    # kebab-case crate names: ava-core -> ava-code-core
    (r"\bava-([\w-]+)\b",         r"ava-code-\1"),
    # Title case standalone
    (r"\bAva\b",                  "Ava Code"),
    # ALL_CAPS standalone
    (r"\bAVA\b",                  "AVA_CODE"),
    # lowercase standalone
    (r"\bava\b",                  "ava-code"),
]

COMPILED_RULES = [(re.compile(pat), repl) for pat, repl in RULES]
_PROTECTED_RE  = re.compile("|".join(re.escape(p) for p in PROTECTED_PATTERNS))


def protect(text):
    placeholders = {}
    def _sub(m):
        key = f"\x00PROTECT{len(placeholders)}\x00"
        placeholders[key] = m.group(0)
        return key
    return _PROTECTED_RE.sub(_sub, text), placeholders


def unprotect(text, placeholders):
    for key, val in placeholders.items():
        text = text.replace(key, val)
    return text


def apply_replacements(text):
    guarded, placeholders = protect(text)
    count = 0
    for pattern, repl in COMPILED_RULES:
        guarded, n = pattern.subn(repl, guarded)
        count += n
    return unprotect(guarded, placeholders), count


def is_binary(data):
    if not data:
        return False
    sample = data[:8192]
    non_text = sum(1 for b in sample if b < 9 or (13 < b < 32 and b not in (9, 10, 13)))
    return non_text / len(sample) > 0.05


def process_tree(root, apply_flag):
    files_changed = total_replacements = skipped_binary = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        for filename in sorted(filenames):
            filepath = Path(dirpath) / filename

            if filepath.suffix.lower() in SKIP_EXTENSIONS:
                continue
            if filepath.name in SKIP_FILENAMES:
                continue

            try:
                raw = filepath.read_bytes()
            except (PermissionError, OSError):
                continue

            if is_binary(raw):
                skipped_binary += 1
                continue

            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                skipped_binary += 1
                continue

            new_text, count = apply_replacements(text)
            if count == 0:
                continue

            rel = filepath.relative_to(root)
            print(f"\n{BOLD}{CYAN}{rel}{RESET}  {DIM}({count} change{'s' if count != 1 else ''}){RESET}")

            old_lines = text.splitlines()
            new_lines = new_text.splitlines()
            shown = 0
            for i, (ol, nl) in enumerate(zip(old_lines, new_lines), 1):
                if ol != nl:
                    print(f"  {DIM}L{i:4d}{RESET}  {RED}- {ol.rstrip()}{RESET}")
                    print(f"        {GREEN}+ {nl.rstrip()}{RESET}")
                    shown += 1
                    if shown >= 6:
                        remaining = sum(1 for a, b in zip(old_lines, new_lines) if a != b) - shown
                        if remaining > 0:
                            print(f"        {DIM}... {remaining} more line(s){RESET}")
                        break

            if apply_flag:
                filepath.write_text(new_text, encoding="utf-8")
                print(f"  {GREEN}✔ written{RESET}")
            else:
                print(f"  {YELLOW}⚡ dry-run{RESET}")

            files_changed      += 1
            total_replacements += count

    return files_changed, total_replacements, skipped_binary


def main():
    parser = argparse.ArgumentParser(description="Replace ava branding with ava-code in source.")
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    parser.add_argument("--path", default=".", help="Subdirectory to scope (default: repo root)")
    args = parser.parse_args()

    repo_root = Path(__file__).parent.parent
    target    = (repo_root / args.path).resolve()

    if not target.exists():
        print(f"{RED}Error: {target} does not exist{RESET}", file=sys.stderr)
        sys.exit(1)

    mode = f"{BOLD}{GREEN}APPLY{RESET}" if args.apply else f"{BOLD}{YELLOW}DRY-RUN{RESET}"
    print(f"\n{BOLD}{'─'*62}{RESET}")
    print(f"  AvA Code Branding Replacer  [{mode}]")
    print(f"  Root  : {target}")
    print(f"  Mode  : {'Writing files' if args.apply else 'Preview only — pass --apply to write'}")
    print(f"{BOLD}{'─'*62}{RESET}")

    files_changed, total, skipped = process_tree(target, args.apply)

    print(f"\n{BOLD}{'─'*62}{RESET}")
    print(f"  Files changed        : {BOLD}{files_changed}{RESET}")
    print(f"  Total replacements   : {BOLD}{total}{RESET}")
    print(f"  Binary files skipped : {DIM}{skipped}{RESET}")
    if not args.apply:
        print(f"\n  {YELLOW}Dry-run complete. Run with --apply to write.{RESET}")
    else:
        print(f"\n  {GREEN}✔ Done!{RESET}")
    print(f"{BOLD}{'─'*62}{RESET}\n")


if __name__ == "__main__":
    main()
