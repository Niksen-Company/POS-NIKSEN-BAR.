"""Receipt generation for NIKSEN BAR POS system."""

from datetime import datetime
from typing import Optional

from order import Order


RECEIPT_WIDTH = 42


def _center(text: str, width: int = RECEIPT_WIDTH) -> str:
    return text.center(width)


def _line(char: str = "-", width: int = RECEIPT_WIDTH) -> str:
    return char * width


def generate_receipt(order: Order, payment_method: str = "Cash", amount_paid: float = 0.0) -> str:
    lines = []
    lines.append(_line("="))
    lines.append(_center("NIKSEN BAR"))
    lines.append(_center("Jl. Contoh No. 1, Bali, Indonesia"))
    lines.append(_center("Tel: +62 361 000000"))
    lines.append(_line("="))
    lines.append(f"Receipt #: {order.order_id:04d}")
    lines.append(f"Date     : {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    lines.append(f"Table    : {order.table_number}")
    lines.append(f"Server   : {order.server_name}")
    lines.append(_line())
    lines.append(f"{'ITEM':<24} {'QTY':>3} {'TOTAL':>10}")
    lines.append(_line())

    for item in order.items:
        name = item.menu_item.name
        # Wrap long names
        if len(name) > 24:
            name = name[:21] + "..."
        lines.append(f"{name:<24} {item.quantity:>3} {item.subtotal:>9,.0f}")
        if item.note:
            lines.append(f"  * {item.note}")

    lines.append(_line())
    lines.append(f"{'Subtotal':<28} {order.subtotal:>9,.0f}")
    lines.append(f"{'Tax (10%)':<28} {order.tax:>9,.0f}")
    lines.append(f"{'Service Charge (5%)':<28} {order.service_charge:>9,.0f}")
    lines.append(_line())
    lines.append(f"{'TOTAL':<28} {order.total:>9,.0f}")
    lines.append(_line())
    lines.append(f"{'Payment':<28} {payment_method}")

    if amount_paid > 0:
        change = amount_paid - order.total
        lines.append(f"{'Amount Paid':<28} {amount_paid:>9,.0f}")
        if change >= 0:
            lines.append(f"{'Change':<28} {change:>9,.0f}")

    lines.append(_line("="))
    lines.append(_center("Thank you for visiting NIKSEN BAR!"))
    lines.append(_center("Please come again :)"))
    lines.append(_line("="))

    return "\n".join(lines)


def print_receipt(order: Order, payment_method: str = "Cash", amount_paid: float = 0.0) -> None:
    print("\n" + generate_receipt(order, payment_method, amount_paid))
