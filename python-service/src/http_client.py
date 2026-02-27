import time
import logging
from typing import Optional, Dict, Any

import requests

logger = logging.getLogger(__name__)


class ServiceClient:
    max_retries = 3
    base_timeout = 5

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()

    def health_check(self) -> bool:
        try:
            resp = self._session.get(
                f"{self.base_url}/health", timeout=self.base_timeout
            )
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def post(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            resp = self._session.post(url, json=payload, timeout=self.base_timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.error("POST %s failed: %s", url, exc)
            return None

    def fetch(self, endpoint: str) -> Optional[Dict]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        resp = self._session.get(url, timeout=self.base_timeout)
        resp.raise_for_status()
        return resp.json()

    def close(self):
        self._session.close()
