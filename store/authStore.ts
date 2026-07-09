import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CustomerData = {
  _id: string;
  name: string;
  shopName: string;
  contactNumber: string;
  shopPhoneNumber: string;
  email?: string | null;
};

type AuthStore = {
  token: string | null;
  user: CustomerData | null;
  hasRegistered: boolean;
  promptDismissedAt: number | null;
  setAuth: (token: string, user: CustomerData) => void;
  logout: () => void;
  dismissPrompt: () => void;
};

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasRegistered: false,
      promptDismissedAt: null,
      setAuth: (token, user) => set({ token, user, hasRegistered: true }),
      logout: () => set({ token: null, user: null, hasRegistered: false }),
      dismissPrompt: () => set({ promptDismissedAt: Date.now() }),
    }),
    {
      name: 'pmj-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
