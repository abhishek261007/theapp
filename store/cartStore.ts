import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [],

  addToCart: (item) =>
    set((state) => ({
      items: [...state.items, item]
    })),

  removeFromCart: (id) =>
    set((state) => ({
      items: state.items.filter(
        (i) => i._id !== id
      )
    })),

  clearCart: () =>
    set({
      items: []
    })
}));

export default useCartStore;