const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

const store = new Map(); // key -> { value, expiry }
const inflight = new Map(); // key -> Promise (currently fetching)

function now() {
  return Date.now();
}
function isFresh(entry) {
  return entry && entry.expiry > now();
}

export default {
  // Does cache have fresh version?
  hasFresh(key) {
    const entry = store.get(key);
    return isFresh(entry);
  },

  // Get quickly without waiting (if available and not expired)
  peek(key) {
    const entry = store.get(key);
    return isFresh(entry) ? entry.value : undefined;
  },

  // Set manually
  set(key, value, ttl = DEFAULT_TTL) {
    store.set(key, { value, expiry: now() + ttl });
  },

  // Remove one key
  invalidate(key) {
    store.delete(key);
    inflight.delete(key);
  },

  // Clear all
  clear() {
    store.clear();
    inflight.clear();
  },

  // Get from cache, if not available/expired then call fetcher() and cache result.
  // Dedupe: if multiple places call same key simultaneously, only 1 request runs.
  async getOrFetch(key, fetcher, { ttl = DEFAULT_TTL } = {}) {
    const entry = store.get(key);
    if (isFresh(entry)) return entry.value;

    // if there's already a request for same key -> wait together
    if (inflight.has(key)) {
      return inflight.get(key);
    }

    const p = (async () => {
      try {
        const value = await fetcher();
        store.set(key, { value, expiry: now() + ttl });
        return value;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, p);
    return p;
  },
};
