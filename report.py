"""Sales reporting for NIKSEN BAR POS system."""

from collections import defaultdict
from datetime import date
from typing import Dict, List

from order import Order, OrderStatus


def daily_sales_report(orders: List[Order], report_date: date = None) -> str:
    if report_date is None:
        report_date = date.today()

    paid_orders = [
        o for o in orders
        if o.status == OrderStatus.PAID
        and o.created_at.date() == report_date
    ]

    total_revenue = sum(o.total for o in paid_orders)
    total_orders = len(paid_orders)

    item_sales: Dict[str, int] = defaultdict(int)
    category_sales: Dict[str, float] = defaultdict(float)
    for order in paid_orders:
        for item in order.items:
            item_sales[item.menu_item.name] += item.quantity
            category_sales[item.menu_item.category] += item.subtotal

    width = 42
    lines = []
    lines.append("=" * width)
    lines.append("  NIKSEN BAR - DAILY SALES REPORT".center(width))
    lines.append(f"  Date: {report_date.strftime('%d %B %Y')}".center(width))
    lines.append("=" * width)
    lines.append(f"  Total Orders  : {total_orders}")
    lines.append(f"  Total Revenue : Rp {total_revenue:>12,.0f}")
    lines.append("-" * width)
    lines.append("  SALES BY CATEGORY")
    lines.append("-" * width)
    for category, amount in sorted(category_sales.items()):
        lines.append(f"  {category:<20} Rp {amount:>12,.0f}")
    lines.append("-" * width)
    lines.append("  TOP SELLING ITEMS")
    lines.append("-" * width)
    top_items = sorted(item_sales.items(), key=lambda x: x[1], reverse=True)[:10]
    for name, qty in top_items:
        lines.append(f"  {name:<28}  {qty:>4} pcs")
    lines.append("=" * width)

    return "\n".join(lines)
