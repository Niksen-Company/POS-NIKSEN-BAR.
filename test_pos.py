"""Tests for NIKSEN BAR POS system."""

import sys
import os
from unittest.mock import patch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from menu import Menu, MenuItem
from order import Order, OrderManager, OrderStatus
from receipt import generate_receipt
from report import daily_sales_report
from main import run


# ── Menu Tests ────────────────────────────────────────────────────────────────

def test_menu_has_default_items():
    menu = Menu()
    categories = menu.get_categories()
    assert len(categories) > 0
    assert "Beer" in categories
    assert "Cocktail" in categories


def test_menu_add_item():
    menu = Menu()
    initial_count = len(menu.get_categories())
    item = menu.add_item("Test Drink", 50000.0, "Test")
    assert item.name == "Test Drink"
    assert item.price == 50000.0
    assert item.category == "Test"
    assert menu.get_item(item.id) == item


def test_menu_get_item_not_found():
    menu = Menu()
    assert menu.get_item(9999) is None


def test_menu_set_availability():
    menu = Menu()
    item = menu.add_item("Temp Drink", 20000.0, "Test")
    assert item.available is True
    result = menu.set_availability(item.id, False)
    assert result is True
    assert item.available is False


def test_menu_set_availability_not_found():
    menu = Menu()
    assert menu.set_availability(9999, False) is False


def test_menu_get_items_by_category():
    menu = Menu()
    beers = menu.get_items_by_category("Beer")
    assert len(beers) > 0
    for beer in beers:
        assert beer.category == "Beer"


def test_menu_item_str():
    item = MenuItem(id=1, name="Test", price=35000.0, category="Beer")
    s = str(item)
    assert "Test" in s
    assert "35,000" in s


# ── Order Tests ───────────────────────────────────────────────────────────────

def test_create_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(table_number=1, server_name="Alice")
    assert order.order_id == 1
    assert order.table_number == 1
    assert order.server_name == "Alice"
    assert order.status == OrderStatus.OPEN
    assert order.items == []


def test_add_item_to_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Bob")
    item = menu.get_items_by_category("Beer")[0]
    result = manager.add_item_to_order(order.order_id, item.id, quantity=2)
    assert result is True
    assert len(order.items) == 1
    assert order.items[0].quantity == 2
    assert order.items[0].menu_item.id == item.id


def test_add_same_item_merges_quantity():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Bob")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id, quantity=1)
    manager.add_item_to_order(order.order_id, item.id, quantity=2)
    assert len(order.items) == 1
    assert order.items[0].quantity == 3


def test_add_item_unavailable():
    menu = Menu()
    item = menu.get_items_by_category("Beer")[0]
    menu.set_availability(item.id, False)
    manager = OrderManager(menu)
    order = manager.create_order(1, "Bob")
    result = manager.add_item_to_order(order.order_id, item.id)
    assert result is False
    assert len(order.items) == 0


def test_remove_item_from_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Carol")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id)
    result = manager.remove_item_from_order(order.order_id, item.id)
    assert result is True
    assert len(order.items) == 0


def test_remove_item_not_found():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Carol")
    assert manager.remove_item_from_order(order.order_id, 9999) is False


def test_order_totals():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Dave")
    # Add a beer at known price
    beer = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, beer.id, quantity=2)
    expected_subtotal = beer.price * 2
    assert abs(order.subtotal - expected_subtotal) < 0.01
    assert abs(order.tax - expected_subtotal * 0.10) < 0.01
    assert abs(order.service_charge - expected_subtotal * 0.05) < 0.01
    assert abs(order.total - expected_subtotal * 1.15) < 0.01


def test_close_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Eve")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id)
    result = manager.close_order(order.order_id)
    assert result is True
    assert order.status == OrderStatus.PAID


def test_cancel_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Frank")
    result = manager.cancel_order(order.order_id)
    assert result is True
    assert order.status == OrderStatus.CANCELLED


def test_close_already_closed_order():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Grace")
    manager.close_order(order.order_id)
    result = manager.close_order(order.order_id)
    assert result is False


def test_get_open_orders():
    menu = Menu()
    manager = OrderManager(menu)
    o1 = manager.create_order(1, "H")
    o2 = manager.create_order(2, "I")
    manager.close_order(o1.order_id)
    open_orders = manager.get_open_orders()
    assert o2 in open_orders
    assert o1 not in open_orders


def test_get_orders_by_table():
    menu = Menu()
    manager = OrderManager(menu)
    o1 = manager.create_order(5, "J")
    o2 = manager.create_order(5, "K")
    manager.create_order(6, "L")
    table5 = manager.get_orders_by_table(5)
    assert o1 in table5
    assert o2 in table5
    assert len(table5) == 2


# ── Receipt Tests ──────────────────────────────────────────────────────────────

def test_receipt_contains_key_info():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(3, "Mike")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id, quantity=2)
    manager.close_order(order.order_id)
    receipt = generate_receipt(order, payment_method="Cash", amount_paid=order.total)
    assert "NIKSEN BAR" in receipt
    assert "Table" in receipt
    assert "Mike" in receipt
    assert "TOTAL" in receipt
    assert "Cash" in receipt


def test_receipt_with_change():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Test")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id)
    manager.close_order(order.order_id)
    receipt = generate_receipt(order, "Cash", order.total + 10000)
    assert "Change" in receipt


# ── Report Tests ───────────────────────────────────────────────────────────────

def test_daily_report_empty():
    report = daily_sales_report([])
    assert "DAILY SALES REPORT" in report
    assert "Total Orders  : 0" in report


def test_daily_report_with_orders():
    menu = Menu()
    manager = OrderManager(menu)
    order = manager.create_order(1, "Staff")
    item = menu.get_items_by_category("Beer")[0]
    manager.add_item_to_order(order.order_id, item.id, 3)
    manager.close_order(order.order_id)
    all_orders = manager.get_all_orders()
    report = daily_sales_report(all_orders)
    assert "Total Orders  : 1" in report
    assert "Beer" in report


# ── Run Tests ──────────────────────────────────────────────────────────────────

def test_run_exits_on_zero():
    with patch("builtins.input", return_value="0"):
        with patch("builtins.print") as mock_print:
            run()
    printed = " ".join(str(a) for call in mock_print.call_args_list for a in call.args)
    assert "Goodbye" in printed


if __name__ == "__main__":
    import traceback
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS  {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL  {test.__name__}: {e}")
            traceback.print_exc()
            failed += 1
    print(f"\n  {passed} passed, {failed} failed")
