import pytest


def test_auth_required_for_protected_routes(base_url, session):
    """嘗試存取需要授權的路由應回傳 401/403 而非 200"""
    # 範例：假設 /api/users/profile 為需要登入的路由
    r = session.get(f"{base_url}/api/users/profile")
    assert r.status_code in (401, 403)


def test_sql_injection_login(base_url, session):
    """簡單的 SQL injection 嘗試：確保不可繞過認證"""
    payload = {"email": "' OR '1'='1' --", "password": "anything"}
    r = session.post(f"{base_url}/api/login", json=payload)
    # 如果 API 設計不會回 200，檢查應為失敗 (401/400)
    assert r.status_code not in (200, 201)


def test_missing_csrf_or_headers(base_url, session):
    """若應用有 CSRF 或特殊 header 要求，模擬缺少時應被拒絕（視情況啟用）"""
    r = session.post(f"{base_url}/api/some-protected", json={})
    assert r.status_code in (401, 403, 400, 404)
# 檢查輸入是否安全
# 如果輸入字串包含黑名單 (blacklist) 中任一字詞，視為不安全 (回傳 False)
import os
BASE_URL = os.getenv("SYSTEM_BASE_URL", "http://localhost:5500")

def is_safe_input(text, blacklist=None):
    if blacklist is None:
        blacklist = ["'", "--", "<script>", " OR ", "1=1"]
    for word in blacklist:
        if word.lower() in text.lower():
            return False
    return True


def test_sql_injection():
    # 模擬 SQL injection 攻擊字串，應被判定為不安全
    blacklist = ["'", "--", "<script>", " OR ", "1=1"]
    attack = "' OR 1=1 --"
    assert is_safe_input(attack, blacklist) is False


def test_xss_attack():
    # 模擬 XSS 攻擊字串，應被判定為不安全
    blacklist = ["'", "--", "<script>", " OR ", "1=1"]
    attack = "<script>alert(1)</script>"
    assert is_safe_input(attack, blacklist) is False


def test_normal_input():
    # 一般正常輸入不應被黑名單命中，視為安全
    blacklist = ["'", "--", "<script>", " OR ", "1=1"]
    safe = "user@gmail.com"
    assert is_safe_input(safe, blacklist) is True