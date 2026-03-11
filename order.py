"""Order management for NIKSEN BAR POS system."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from menu import Menu, MenuItem


class OrderStatus(Enum):
    OPEN = "open"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass
class OrderItem:
    menu_item: MenuItem
    quantity: int
    note: str = ""

    @property
    def subtotal(self) -> float:
        return self.menu_item.price * self.quantity

    def __str__(self) -> str:
        note_str = f" ({self.note})" if self.note else ""
        return (
            f"  {self.menu_item.name:<30} x{self.quantity}  "
            f"Rp {self.subtotal:>12,.0f}{note_str}"
        )


@dataclass
class Order:
    order_id: int
    table_number: int
    server_name: str
    created_at: datetime = field(default_factory=datetime.now)
    status: OrderStatus = OrderStatus.OPEN
    items: List[OrderItem] = field(default_factory=list)

    @property
    def subtotal(self) -> float:
        return sum(item.subtotal for item in self.items)

    @property
    def tax(self) -> float:
        return self.subtotal * 0.10  # 10% tax

    @property
    def service_charge(self) -> float:
        return self.subtotal * 0.05  # 5% service charge

    @property
    def total(self) -> float:
        return self.subtotal + self.tax + self.service_charge

    def add_item(self, menu_item: MenuItem, quantity: int = 1, note: str = "") -> None:
        for order_item in self.items:
            if order_item.menu_item.id == menu_item.id and order_item.note == note:
                order_item.quantity += quantity
                return
        self.items.append(OrderItem(menu_item=menu_item, quantity=quantity, note=note))

    def remove_item(self, menu_item_id: int) -> bool:
        for i, order_item in enumerate(self.items):
            if order_item.menu_item.id == menu_item_id:
                self.items.pop(i)
                return True
        return False

    def update_quantity(self, menu_item_id: int, quantity: int) -> bool:
        for order_item in self.items:
            if order_item.menu_item.id == menu_item_id:
                if quantity <= 0:
                    return self.remove_item(menu_item_id)
                order_item.quantity = quantity
                return True
        return False

    def display(self) -> None:
        print(f"\n  Order #{self.order_id} | Table {self.table_number} | Server: {self.server_name}")
        print(f"  Created: {self.created_at.strftime('%Y-%m-%d %H:%M:%S')} | Status: {self.status.value.upper()}")
        print("  " + "-" * 55)
        if not self.items:
            print("  (no items)")
        else:
            for item in self.items:
                print(item)
        print("  " + "-" * 55)
        print(f"  {'Subtotal':<38} Rp {self.subtotal:>12,.0f}")
        print(f"  {'Tax (10%)':<38} Rp {self.tax:>12,.0f}")
        print(f"  {'Service Charge (5%)':<38} Rp {self.service_charge:>12,.0f}")
        print(f"  {'TOTAL':<38} Rp {self.total:>12,.0f}")


class OrderManager:
    def __init__(self, menu: Menu) -> None:
        self.menu = menu
        self._orders: Dict[int, Order] = {}
        self._next_id: int = 1

    def create_order(self, table_number: int, server_name: str) -> Order:
        order = Order(
            order_id=self._next_id,
            table_number=table_number,
            server_name=server_name,
        )
        self._orders[self._next_id] = order
        self._next_id += 1
        return order

    def get_order(self, order_id: int) -> Optional[Order]:
        return self._orders.get(order_id)

    def get_all_orders(self) -> List[Order]:
        return list(self._orders.values())

    def get_open_orders(self) -> List[Order]:        return [o for o in self._orders.values() if o.status == OrderStatus.OPEN]

    def get_orders_by_table(self, table_number: int) -> List[Order]:
        return [
            o for o in self._orders.values()
            if o.table_number == table_number and o.status == OrderStatus.OPEN
        ]

    def add_item_to_order(
        self, order_id: int, item_id: int, quantity: int = 1, note: str = ""
    ) -> bool:
        order = self._orders.get(order_id)
        if not order or order.status != OrderStatus.OPEN:
            return False
        menu_item = self.menu.get_item(item_id)
        if not menu_item or not menu_item.available:
            return False
        order.add_item(menu_item, quantity, note)
        return True

    def remove_item_from_order(self, order_id: int, item_id: int) -> bool:
        order = self._orders.get(order_id)
        if not order or order.status != OrderStatus.OPEN:
            return False
        return order.remove_item(item_id)

    def close_order(self, order_id: int) -> bool:
        order = self._orders.get(order_id)
        if not order or order.status != OrderStatus.OPEN:
            return False
        order.status = OrderStatus.PAID
        return True

    def cancel_order(self, order_id: int) -> bool:
        order = self._orders.get(order_id)
        if not order or order.status != OrderStatus.OPEN:
            return False
        order.status = OrderStatus.CANCELLED
        return True

    def display_open_orders(self) -> None:
        open_orders = self.get_open_orders()
        print("\n" + "=" * 60)
        print("           NIKSEN BAR - OPEN ORDERS")
        print("=" * 60)
        if not open_orders:
            print("  No open orders.")
        else:
            for order in open_orders:
                order.display()
        print("=" * 60)
