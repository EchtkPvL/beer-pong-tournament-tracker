export async function register() {
  // Node.js 22+ has a built-in localStorage global (Web Storage API).
  // Next.js passes --localstorage-file without a valid path, which creates
  // a broken localStorage where .getItem() is not a function.
  // Patch it with a working in-memory implementation for the server.
  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.getItem('__test');
    } catch {
      const store = new Map<string, string>();
      globalThis.localStorage = {
        getItem(key: string) {
          return store.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          store.set(key, String(value));
        },
        removeItem(key: string) {
          store.delete(key);
        },
        clear() {
          store.clear();
        },
        get length() {
          return store.size;
        },
        key(index: number) {
          return [...store.keys()][index] ?? null;
        },
      } as Storage;
    }
  }
}
