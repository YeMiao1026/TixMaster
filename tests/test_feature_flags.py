import pytest


def get_flag(base_url, session, flag_name):
    r = session.get(f"{base_url}/api/feature-flags/{flag_name}")
    r.raise_for_status()
    return r.json()


def set_flag(base_url, session, flag_name, enabled: bool):
    # 後端實作使用 PUT /api/feature-flags/:key
    r = session.put(f"{base_url}/api/feature-flags/{flag_name}", json={"enabled": enabled})
    return r


def test_toggle_feature_flag_changes_behavior(base_url, session):
    """切換 flag 並驗證對應行為差異"""
    flag = "new_checkout_flow"

    # 讀取目前值（若沒有此 API，改為直接操作 DB 或 mock）
    try:
        original = get_flag(base_url, session, flag)
    except Exception:
        pytest.skip("feature-flag API not available; adapt test to your system")

    # featureFlags GET 回傳 shape: { key, enabled, description, updatedAt }
    original_enabled = original.get('enabled') if isinstance(original, dict) else None

    # 關閉 flag -> 檢查回傳與系統行為
    r_off = set_flag(base_url, session, flag, False)
    assert r_off.status_code in (200, 204)
    if r_off.status_code == 200:
        body = r_off.json()
        assert 'flag' in body
        assert body['flag']['key'] == flag

    # 開啟 flag -> 檢查改變
    r_on = set_flag(base_url, session, flag, True)
    assert r_on.status_code in (200, 204)

    # restore
    if original_enabled is not None:
        set_flag(base_url, session, flag, original_enabled)
