import { create } from 'zustand';

const useCatalogStore = create((set) => ({
  catalogs: [],

  setCatalogs: (catalogs) => set({ catalogs }),

  addCatalog: (catalog) =>
    set((state) => ({
      catalogs: [catalog, ...state.catalogs]
    }))
}));

export default useCatalogStore;
