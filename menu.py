"""Menu management for NIKSEN BAR POS system."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class MenuItem:
    id: int
    name: str
    price: float
    category: str
    available: bool = True

    def __str__(self) -> str:
        status = "" if self.available else " [UNAVAILABLE]"
        return f"{self.id:3}. {self.name:<30} Rp {self.price:>10,.0f}{status}"


class Menu:
    def __init__(self) -> None:
        self._items: Dict[int, MenuItem] = {}
        self._next_id: int = 1
        self._load_default_menu()

    def _load_default_menu(self) -> None:
        default_items = [
            # Beers
            ("Bintang Beer", 35000.0, "Beer"),
            ("Heineken", 40000.0, "Beer"),
            ("Bir Bintang Radler", 30000.0, "Beer"),
            ("Corona", 45000.0, "Beer"),
            # Cocktails
            ("Mojito", 65000.0, "Cocktail"),
            ("Margarita", 65000.0, "Cocktail"),
            ("Long Island Iced Tea", 75000.0, "Cocktail"),
            ("Cosmopolitan", 65000.0, "Cocktail"),
            ("Negroni", 70000.0, "Cocktail"),
            # Spirits
            ("Whisky On The Rocks", 80000.0, "Spirit"),
            ("Vodka Soda", 60000.0, "Spirit"),
            ("Gin Tonic", 60000.0, "Spirit"),
            # Soft Drinks
            ("Coca-Cola", 20000.0, "Soft Drink"),
            ("Sprite", 20000.0, "Soft Drink"),
            ("Mineral Water", 15000.0, "Soft Drink"),
            ("Fresh Juice", 25000.0, "Soft Drink"),
            # Food
            ("Nachos", 45000.0, "Food"),
            ("French Fries", 35000.0, "Food"),
            ("Chicken Wings (6 pcs)", 65000.0, "Food"),
            ("Sausage Platter", 75000.0, "Food"),
        ]
        for name, price, category in default_items:
            self.add_item(name, price, category)

    def add_item(self, name: str, price: float, category: str) -> MenuItem:
        item = MenuItem(id=self._next_id, name=name, price=price, category=category)
        self._items[self._next_id] = item
        self._next_id += 1
        return item

    def get_item(self, item_id: int) -> Optional[MenuItem]:
        return self._items.get(item_id)

    def get_items_by_category(self, category: str) -> List[MenuItem]:
        return [i for i in self._items.values() if i.category == category]

    def get_categories(self) -> List[str]:
        seen = []
        for item in self._items.values():
            if item.category not in seen:
                seen.append(item.category)
        return seen

    def set_availability(self, item_id: int, available: bool) -> bool:
        item = self._items.get(item_id)
        if item:
            item.available = available
            return True
        return False

    def display(self) -> None:
        print("\n" + "=" * 50)
        print("         NIKSEN BAR - MENU")
        print("=" * 50)
        for category in self.get_categories():
            print(f"\n  [ {category.upper()} ]")
            for item in self.get_items_by_category(category):
                print(f"  {item}")
        print("=" * 50)
