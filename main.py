"""NIKSEN BAR - Point of Sale System

Command-line interface for the NIKSEN BAR POS system.
"""

from receipt import print_receipt
from menu import Menu
from order import OrderManager
from report import daily_sales_report


def prompt(message: str) -> str:
    return input(f"\n  {message}: ").strip()


def prompt_int(message: str, default: int = 0) -> int:
    try:
        return int(prompt(message))
    except (ValueError, EOFError):
        return default


def main_menu() -> None:
    print("\n" + "=" * 42)
    print("       NIKSEN BAR - POS SYSTEM")
    print("=" * 42)
    print("  1. Show Menu")
    print("  2. New Order")
    print("  3. View Open Orders")
    print("  4. Add Item to Order")
    print("  5. Remove Item from Order")
    print("  6. Close Order (Pay)")
    print("  7. Cancel Order")
    print("  8. Daily Sales Report")
    print("  0. Exit")
    print("=" * 42)


def run() -> None:
    menu = Menu()
    manager = OrderManager(menu)

    while True:
        main_menu()
        choice = prompt_int("Select option")

        if choice == 0:
            print("\n  Goodbye! Thank you for using NIKSEN BAR POS.\n")
            break

        elif choice == 1:
            menu.display()

        elif choice == 2:
            table = prompt_int("Table number")
            server = prompt("Server name")
            if not server:
                server = "Staff"
            order = manager.create_order(table, server)
            print(f"\n  Order #{order.order_id} created for Table {table}.")
            order.display()

        elif choice == 3:
            manager.display_open_orders()

        elif choice == 4:
            order_id = prompt_int("Order ID")
            menu.display()
            item_id = prompt_int("Item ID to add")
            qty = prompt_int("Quantity (default 1)")
            if qty <= 0:
                qty = 1
            note = prompt("Special note (leave blank for none)")
            if manager.add_item_to_order(order_id, item_id, qty, note):
                order = manager.get_order(order_id)
                print(f"\n  Item added successfully.")
                order.display()
            else:
                print("\n  Failed: invalid order/item or item unavailable.")

        elif choice == 5:
            order_id = prompt_int("Order ID")
            order = manager.get_order(order_id)
            if order:
                order.display()
                item_id = prompt_int("Item ID to remove")
                if manager.remove_item_from_order(order_id, item_id):
                    print("\n  Item removed.")
                    order.display()
                else:
                    print("\n  Failed: item not found in order.")
            else:
                print("\n  Order not found.")

        elif choice == 6:
            order_id = prompt_int("Order ID")
            order = manager.get_order(order_id)
            if not order:
                print("\n  Order not found.")
                continue
            order.display()
            payment = prompt("Payment method (Cash/Card/Transfer)")
            if not payment:
                payment = "Cash"
            paid = prompt_int("Amount paid (0 = exact)")
            if paid <= 0:
                paid = order.total
            if manager.close_order(order_id):
                print_receipt(order, payment, paid)
            else:
                print("\n  Failed to close order.")

        elif choice == 7:
            order_id = prompt_int("Order ID")
            if manager.cancel_order(order_id):
                print(f"\n  Order #{order_id} cancelled.")
            else:
                print("\n  Failed: order not found or already closed.")

        elif choice == 8:
            all_orders = manager.get_all_orders()
            print("\n" + daily_sales_report(all_orders))

        else:
            print("\n  Invalid option. Please try again.")


if __name__ == "__main__":
    run()
