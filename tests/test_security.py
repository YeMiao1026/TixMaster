def is_safe_input(text):
    blacklist = ["'", "--", "<script>", " OR ", "1=1"]
    for word in blacklist:
        if word.lower() in text.lower():
            return False
    return True


def test_sql_injection():
    attack = "' OR 1=1 --"
    assert is_safe_input(attack) is False


def test_xss_attack():
    attack = "<script>alert(1)</script>"
    assert is_safe_input(attack) is False


def test_normal_input():
    safe = "user@gmail.com"
    assert is_safe_input(safe) is True
