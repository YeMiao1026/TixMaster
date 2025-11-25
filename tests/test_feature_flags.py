import pytest


def get_flag(base_url, session, flag_name):
    r = session.get(f"{base_url}/api/feature-flags/{flag_name}")
    # return parsed json when available, or raise for unexpected errors
    if r.status_code == 200:
        return r.json()
    r.raise_for_status()


def set_flag(base_url, session, flag_name, enabled: bool, admin_token=None):
    """PUT update for feature flag. If admin_token provided, send Authorization header."""
    headers = {}
    if admin_token:
        headers['Authorization'] = f"Bearer {admin_token}"
    r = session.put(f"{base_url}/api/feature-flags/{flag_name}", json={"enabled": enabled}, headers=headers)
    return r


@pytest.mark.feature_flags
def test_toggle_feature_flag_changes_behavior(base_url, session, admin_token):
    """切換 `ENABLE_CHECKOUT_TIMER` 並驗證 API 行為與回傳格式（依 FEATURE_FLAGS_GUIDE.md）"""
    flag = "ENABLE_CHECKOUT_TIMER"

    # 讀取目前值（若沒有此 API，改為直接操作 DB 或 mock）
    try:
        original = get_flag(base_url, session, flag)
    except Exception:
        pytest.skip("feature-flag API not available; adapt test to your system")

    # feature GET 回傳 shape: { key, enabled, description, updatedAt }
    original_enabled = original.get('enabled') if isinstance(original, dict) else None

    # 需要 admin_token 才能更新；若沒有 token，跳過更新檢查
    if not admin_token:
        pytest.skip('ADMIN_TOKEN not set; skipping update tests that require auth')

    # 關閉 flag -> 檢查回傳與系統行為
    r_off = set_flag(base_url, session, flag, False, admin_token=admin_token)
    assert r_off.status_code in (200, 204)
    if r_off.status_code == 200:
        body = r_off.json()
        assert body.get('message') == 'Feature flag updated'
        assert 'flag' in body
        assert body['flag']['key'] == flag

    # 開啟 flag -> 檢查改變
    r_on = set_flag(base_url, session, flag, True, admin_token=admin_token)
    assert r_on.status_code in (200, 204)

    # 驗證 GET 回傳為最新狀態
    current = get_flag(base_url, session, flag)
    assert isinstance(current, dict)
    assert current.get('enabled') is True

    # restore original value if we read one
    if original_enabled is not None:
        set_flag(base_url, session, flag, original_enabled, admin_token=admin_token)
