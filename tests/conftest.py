import os
import pytest
import requests
import subprocess


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application under test. Set via env `BASE_URL` or default to localhost."""
    return os.getenv("BASE_URL", "http://localhost:3000")


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    yield s
    s.close()

    
@pytest.fixture(scope='session')
def admin_token():
    """提供 admin token：
    - 若環境變數 `ADMIN_TOKEN` 已設定，直接使用。
    - 否則嘗試呼叫 `node tools/generate_jwt.js` 在本機產生一個測試用 JWT（需 node 可用）。
    - 若失敗，回傳 None（會讓需要 token 的測試跳過）。
    """
    token = os.getenv('ADMIN_TOKEN')
    if token:
        return token

    # 嘗試用 repository 的 Node 工具產生 token（開發/測試用）
    try:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        out = subprocess.check_output(['node', 'tools/generate_jwt.js'], cwd=repo_root, stderr=subprocess.DEVNULL)
        return out.decode().strip()
    except Exception:
        return None
