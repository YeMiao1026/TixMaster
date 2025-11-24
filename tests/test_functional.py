def calculate_total(price, qty):
    return price * qty


def test_price_calculation_basic():
    price = 500
    qty = 2
    assert calculate_total(price, qty) == 1000


def test_price_zero_quantity():
    price = 500
    qty = 0
    assert calculate_total(price, qty) == 0


def test_quantity_increase():
    qty = 1
    qty += 1
    assert qty == 2
