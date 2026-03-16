"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem, MenuItem } from "./types";

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | {
      type: "ADD_ITEM";
      payload: {
        menuItem: MenuItem;
        variationId: string;
        variationName: string;
        modifiers: { id: string; name: string; price: number }[];
        specialInstructions?: string;
      };
    }
  | { type: "REMOVE_ITEM"; payload: { index: number } }
  | { type: "UPDATE_QUANTITY"; payload: { index: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

function calculateLineTotal(item: CartItem): number {
  const variation = item.menuItem.variations.find(v => v.id === item.variationId);
  const basePrice = variation?.price ?? item.menuItem.price;
  const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
  return (basePrice + modifiersTotal) * item.quantity;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { menuItem, variationId, variationName, modifiers, specialInstructions } =
        action.payload;

      // Check if identical item already exists
      const existingIndex = state.items.findIndex(
        (item) =>
          item.menuItem.id === menuItem.id &&
          item.variationId === variationId &&
          JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
      );

      // Cap at stock quantity if tracked
      const stock = menuItem.variations.find(v => v.id === variationId)?.stockQuantity;

      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = [...state.items];
        const cappedQty = stock != null
          ? Math.min(state.items[existingIndex].quantity + 1, stock)
          : state.items[existingIndex].quantity + 1;
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: cappedQty,
          lineTotal: calculateLineTotal({
            ...newItems[existingIndex],
            quantity: cappedQty,
          }),
        };
      } else {
        const newItem: CartItem = {
          menuItem,
          variationId,
          variationName,
          quantity: 1,
          modifiers,
          specialInstructions,
          lineTotal: 0,
        };
        newItem.lineTotal = calculateLineTotal(newItem);
        newItems = [...state.items, newItem];
      }

      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter(
        (_, index) => index !== action.payload.index
      );
      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    case "UPDATE_QUANTITY": {
      let { index, quantity } = action.payload;
      if (quantity <= 0) {
        const newItems = state.items.filter((_, i) => i !== index);
        return {
          items: newItems,
          total: calculateTotal(newItems),
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }
      // Cap at stock quantity if tracked
      const item = state.items[index];
      const itemStock = item.menuItem.variations.find(v => v.id === item.variationId)?.stockQuantity;
      if (itemStock != null) {
        quantity = Math.min(quantity, itemStock);
      }
      const newItems = [...state.items];
      newItems[index] = {
        ...newItems[index],
        quantity,
        lineTotal: calculateLineTotal({ ...newItems[index], quantity }),
      };
      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    case "CLEAR_CART":
      return { items: [], total: 0, itemCount: 0 };

    case "LOAD_CART": {
      const items = action.payload;
      return {
        items,
        total: calculateTotal(items),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    default:
      return state;
  }
}

interface AddItemPayload {
  menuItem: MenuItem;
  variationId: string;
  variationName: string;
  modifiers: { id: string; name: string; price: number }[];
  specialInstructions?: string;
}

interface CartContextType extends CartState {
  addItem: (payload: AddItemPayload) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "vietnoms-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const items = JSON.parse(saved) as CartItem[];
        dispatch({ type: "LOAD_CART", payload: items });
      }
    } catch {
      // ignore
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore
    }
  }, [state.items]);

  const value: CartContextType = {
    ...state,
    addItem: (payload) => dispatch({ type: "ADD_ITEM", payload }),
    removeItem: (index) => dispatch({ type: "REMOVE_ITEM", payload: { index } }),
    updateQuantity: (index, quantity) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { index, quantity } }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
    isCartOpen,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
