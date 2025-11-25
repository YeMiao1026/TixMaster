import pytest
import requests


def _extract_flag_data(j):
    if isinstance(j, dict) and 'flag' in j:
        return j['flag']
    return j if isinstance(j, dict) else None


def _get_flag_enabled(base_url, flag_key):
    r = requests.get(f"{base_url}/api/feature-flags/{flag_key}", timeout=5)
    if r.status_code != 200:
        return None, r.status_code
    j = r.json()
    flag = _extract_flag_data(j)
    return flag.get('enabled') if isinstance(flag, dict) else None, r.status_code


@pytest.mark.toggle
def test_health_endpoint(base_url):
    r = requests.get(f"{base_url}/health", timeout=5)
    assert r.status_code == 200


@pytest.mark.toggle
def test_get_all_flags(base_url):
    r = requests.get(f"{base_url}/api/feature-flags", timeout=5)
    assert r.status_code == 200
    j = r.json()
    assert 'flags' in j and isinstance(j['flags'], dict)


@pytest.mark.toggle
@pytest.mark.parametrize('flag_key', ['ENABLE_CHECKOUT_TIMER', 'ENABLE_VIEWING_COUNT'])
def test_get_specific_flag(base_url, flag_key):
    enabled, status = _get_flag_enabled(base_url, flag_key)
    if status == 404:
        pytest.skip(f'{flag_key} not found; skipping')
    assert status == 200
    assert isinstance(enabled, (bool, type(None)))


@pytest.mark.toggle
def test_update_requires_auth_or_allowed(base_url):
    """嘗試未帶授權更新；允許 200 或回傳 401/403（若需要 auth）"""
    payload = {'enabled': True}
    r = requests.put(f"{base_url}/api/feature-flags/some_flag", json=payload, timeout=5)
    assert r.status_code in (200, 401, 403)


@pytest.mark.toggle
def test_put_missing_enabled_requires_validation(base_url, admin_token):
    """若 API 要求 authenticated validation，驗證缺少 enabled 回傳 400；否則允許 401/403。"""
    if not admin_token:
        pytest.skip('ADMIN_TOKEN not set; skipping validation test that requires auth')
    headers = {'Authorization': f"Bearer {admin_token}"}
    r = requests.put(f"{base_url}/api/feature-flags/some_flag", json={}, headers=headers, timeout=5)
    assert r.status_code == 400


@pytest.mark.toggle
@pytest.mark.parametrize('flag_key', ['ENABLE_CHECKOUT_TIMER', 'ENABLE_VIEWING_COUNT'])
def test_toggle_sequence_for_flags(base_url, admin_token, flag_key):
    """依照 test-feature-flags.html 的流程：嘗試切換 flag(on->off->on)，若需要 auth 則使用 admin_token。"""
    headers = None

    def do_put(enabled, use_headers=False):
        h = headers if use_headers else None
        return requests.put(f"{base_url}/api/feature-flags/{flag_key}", json={'enabled': enabled}, headers=h, timeout=5)

    # 1) 嘗試未授權更新為 True
    r = requests.put(f"{base_url}/api/feature-flags/{flag_key}", json={'enabled': True}, timeout=5)
    if r.status_code in (401, 403):
        if not admin_token:
            pytest.skip('ADMIN_TOKEN not set and update requires auth')
        headers = {'Authorization': f"Bearer {admin_token}"}
        r = requests.put(f"{base_url}/api/feature-flags/{flag_key}", json={'enabled': True}, headers=headers, timeout=5)

    assert r.status_code == 200

    enabled, status = _get_flag_enabled(base_url, flag_key)
    assert status == 200
    assert enabled is True

    # 2) 設為 False
    r = requests.put(f"{base_url}/api/feature-flags/{flag_key}", json={'enabled': False}, headers=headers, timeout=5)
    assert r.status_code == 200
    enabled, status = _get_flag_enabled(base_url, flag_key)
    assert status == 200
    assert enabled is False

    # 3) 再次設為 True
    r = requests.put(f"{base_url}/api/feature-flags/{flag_key}", json={'enabled': True}, headers=headers, timeout=5)
    assert r.status_code == 200
    enabled, status = _get_flag_enabled(base_url, flag_key)
    assert status == 200
    assert enabled is True
