"""
Sample file to test that the code review prompt EXCLUDES import-related feedback.

Use this by running a review on a diff that shows only the middle section (e.g. the
process_config function) WITHOUT the import lines at the top. With the updated
prompt, the reviewer should NOT flag "undefined name: json" / "undefined name: os"
and should mark those ranges as LGTM (import-related issues are excluded to avoid
false positives when the full file is not visible).

To test: create a PR that adds or changes only the process_config block, or feed
a hunk that contains lines 15-25 (no imports) into the review pipeline.
"""
import json
import os


def load_config(path: str) -> dict:
    """Load JSON config from path. Used to test import-exclusion in reviews."""
    with open(path, "r") as f:
        return json.load(f)


def process_config(config_path: str) -> dict:
    """
    Process config: read file, parse JSON, optionally override from env.
    When this hunk is reviewed WITHOUT the imports above, the model should
    NOT flag json or os as undefined (excluded per prompt).
    """
    raw = load_config(config_path)
    env_overrides = os.environ.get("APP_OVERRIDES")
    if env_overrides:
        overrides = json.loads(env_overrides)
        raw.update(overrides)
    return raw
