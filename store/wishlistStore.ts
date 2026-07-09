import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WishlistItem = {
  _id: string;
  catalogName: string;
  sku: string;
  weight: number;
  imageUrl?: string;
  thumbnailUrl?: string;
};

type WishlistStore = {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
};

const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) => {
          const exists = state.items.find((i) => i._id === item._id);
          return {
            items: exists
              ? state.items.filter((i) => i._id !== item._id)
              : [...state.items, item],
          };
        }),
      has: (id) => get().items.some((i) => i._id === id),
      remove: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i._id !== id),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'pmj-wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useWishlistStore;
