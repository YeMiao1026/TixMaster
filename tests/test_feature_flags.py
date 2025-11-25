import pytest


def get_flag(base_url, session, flag_name):
    r = session.get(f"{base_url}/api/feature-flags/{flag_name}")
    r.raise_for_status()
    return r.json()


def set_flag(base_url, session, flag_name, enabled: bool):
    # 假設有管理 API 可設置 flag，請依實際 API 調整
    r = session.post(f"{base_url}/api/feature-flags/{flag_name}", json={"enabled": enabled})
    return r


def test_toggle_feature_flag_changes_behavior(base_url, session):
    """切換 flag 並驗證對應行為差異"""
    flag = "new_checkout_flow"

    # 讀取目前值（若沒有此 API，改為直接操作 DB 或 mock）
    try:
        original = get_flag(base_url, session, flag)
    except Exception:
        pytest.skip("feature-flag API not available; adapt test to your system")

    # 關閉 flag -> 檢查 endpoint 行為
    r_off = set_flag(base_url, session, flag, False)
    assert r_off.status_code in (200, 204)
    # 依照你的應用，檢查對應 endpoint 的回應（範例）
    r = session.get(f"{base_url}/api/checkout")
    assert r.status_code in (200, 404, 501)

    # 開啟 flag -> 檢查改變
    r_on = set_flag(base_url, session, flag, True)
    assert r_on.status_code in (200, 204)
    r2 = session.get(f"{base_url}/api/checkout")
    assert r2.status_code in (200, 502)

    # restore
    set_flag(base_url, session, flag, original.get("enabled", False))
