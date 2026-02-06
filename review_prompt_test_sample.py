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
