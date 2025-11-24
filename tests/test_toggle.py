feature_flags = {
    "view_count": True,
    "countdown": False
}

def get_view_count_status():
    return feature_flags["view_count"]

def get_countdown_status():
    return feature_flags["countdown"]


def test_view_count_on():
    feature_flags["view_count"] = True
    assert get_view_count_status() is True


def test_view_count_off():
    feature_flags["view_count"] = False
    assert get_view_count_status() is False


def test_countdown_on():
    feature_flags["countdown"] = True
    assert get_countdown_status() is True


def test_countdown_off():
    feature_flags["countdown"] = False
    assert get_countdown_status() is False
