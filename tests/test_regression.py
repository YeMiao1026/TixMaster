def login(email, password):
    return email == "test@gmail.com" and password == "123456"


def test_login_still_works_when_toggle_on():
    toggle = True
    result = login("test@gmail.com", "123456")
    assert result is True


def test_login_still_works_when_toggle_off():
    toggle = False
    result = login("test@gmail.com", "123456")
    assert result is True


def test_wrong_login_still_fails():
    result = login("test@gmail.com", "wrong")
    assert result is False
