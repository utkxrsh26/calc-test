import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


def get_service_url(config: Dict[str, str], service_name: str) -> Optional[str]:
    key = f"{service_name}_url"
    if key not in config:
        raise KeyError(f"Missing required service URL for '{service_name}'")
    return config[key]


def load_service_config(raw: Dict[str, str]) -> Dict[str, Optional[str]]:
    services = ["go_parser", "python_reviewer", "ruby_gateway"]
    return {svc: get_service_url(raw, svc) for svc in services}
