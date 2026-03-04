# POS-NIKSEN-BAR.

Full system NIKSEN bar — a command-line Point of Sale (POS) system built in Python.

## Features

- **Menu Management** — pre-loaded drinks (beer, cocktails, spirits, soft drinks) and food items; add custom items, toggle availability
- **Order Management** — create orders per table, add/remove items, merge duplicate entries, track status (open / paid / cancelled)
- **Receipt Generation** — formatted receipt with subtotal, 10% tax, 5% service charge, payment method, and change
- **Daily Sales Report** — revenue totals, breakdown by category, and top-selling items

## Requirements

- Python 3.8+
- No external dependencies

## Usage

```bash
# Start the interactive POS terminal
python main.py

# Run the test suite
python test_pos.py
```

## Project Structure

```
main.py      # CLI entry point
menu.py      # Menu and MenuItem classes
order.py     # Order, OrderItem, and OrderManager classes
receipt.py   # Receipt generation
report.py    # Daily sales report
test_pos.py  # Unit tests (23 tests)
```
