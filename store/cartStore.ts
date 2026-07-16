import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartItem = {
  _id: string;
  title?: string;
  sku: string;
  weight: number;
  status: string;
  imageUrl?: string;
  catalogName?: string;
};

export type CartStore = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (item) => {
        const alreadyInCart = get().items.some((i) => i._id === item._id);
        if (alreadyInCart) return;
        set((state) => ({ items: [...state.items, item] }));
      },

      removeFromCart: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i._id !== id),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'pmj-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useCartStore;