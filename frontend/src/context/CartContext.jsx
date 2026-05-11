import React, { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i._id === action.item._id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i._id === action.item._id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i._id !== action.id) };
    case 'INCREASE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i._id === action.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    case 'DECREASE_QTY': {
      const item = state.items.find((i) => i._id === action.id);
      if (!item) return state;
      if (item.quantity <= 1) {
        return { ...state, items: state.items.filter((i) => i._id !== action.id) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i._id === action.id ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'OPEN_CART':
      return { ...state, isOpen: true };
    case 'CLOSE_CART':
      return { ...state, isOpen: false };
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
    default:
      return state;
  }
};

const initialState = { items: [], isOpen: false };

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((item) => dispatch({ type: 'ADD_ITEM', item }), []);
  const removeItem = useCallback((id) => dispatch({ type: 'REMOVE_ITEM', id }), []);
  const increaseQty = useCallback((id) => dispatch({ type: 'INCREASE_QTY', id }), []);
  const decreaseQty = useCallback((id) => dispatch({ type: 'DECREASE_QTY', id }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);
  const openCart = useCallback(() => dispatch({ type: 'OPEN_CART' }), []);
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE_CART' }), []);
  const toggleCart = useCallback(() => dispatch({ type: 'TOGGLE_CART' }), []);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        totalItems,
        totalAmount,
        addItem,
        removeItem,
        increaseQty,
        decreaseQty,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
