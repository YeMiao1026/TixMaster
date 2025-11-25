import os
import pytest
import requests


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application under test. Set via env `BASE_URL` or default to localhost."""
    return os.getenv("BASE_URL", "http://localhost:5500")


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    yield s
    s.close()
