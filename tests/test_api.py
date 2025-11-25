import pytest


def test_get_events(base_url, session):
    """簡單的 API 正常性檢查：取得 events 列表並回傳 200 與 list 型別"""
    r = session.get(f"{base_url}/api/events")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_get_event_detail_requires_valid_id(base_url, session):
    """檢查單一資源的回應結構（若無該 endpoint，請依專案調整）"""
    # TODO: 若你的 API 路徑不同，請調整下列路徑與期待值
    r = session.get(f"{base_url}/api/events/1")
    assert r.status_code in (200, 404)
