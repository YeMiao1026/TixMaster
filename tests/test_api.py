import pytest


def test_get_events(base_url, session):
    """取得 events 列表，預期回傳 200 與 JSON shape: { events: [...] }"""
    r = session.get(f"{base_url}/api/events")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert 'events' in data
    assert isinstance(data['events'], list)


def test_get_event_detail_requires_valid_id(base_url, session):
    """檢查單一活動的回應結構（200 或 404），若 200 則回傳 { event: {...} }"""
    r = session.get(f"{base_url}/api/events/1")
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        data = r.json()
        assert isinstance(data, dict)
        assert 'event' in data
