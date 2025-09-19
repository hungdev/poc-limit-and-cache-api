// apiCache.js
// Cache TTL + dedupe in-flight + evict prioritizes expired first, then FIFO.
// Includes purgeExpired() for manual/periodic cleanup.

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 500; // adjust as needed

const store = new Map(); // key -> { value, expiry }
const inflight = new Map(); // key -> Promise

const now = () => Date.now();
const isFresh = (entry) => entry && entry.expiry > now();

/** Remove expired TTL entries, return number of removed entries */
function purgeExpired() {
  let removed = 0;
  const t = now();
  for (const [key, entry] of store.entries()) {
    if (!entry || entry.expiry <= t) {
      store.delete(key);
      removed++;
    }
  }
  return removed;
}

/** When exceeding MAX_ENTRIES: remove expired first, if still over then FIFO until sufficient */
function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;

  // 1) Prioritize removing expired TTL entries
  purgeExpired();
  if (store.size <= MAX_ENTRIES) return;

  // 2) If still over size => remove next FIFO (oldest first)
  while (store.size > MAX_ENTRIES) {
    const firstKey = store.keys().next().value; // Map maintains insertion order
    if (firstKey === undefined) break;
    store.delete(firstKey);
  }
}

const apiCache = {
  // Is there a fresh copy in cache?
  hasFresh(key) {
    return isFresh(store.get(key));
  },

  // Get quickly without waiting (if available and not expired)
  peek(key) {
    const entry = store.get(key);
    return isFresh(entry) ? entry.value : undefined;
  },

  // Set manually
  set(key, value, ttl = DEFAULT_TTL) {
    store.set(key, { value, expiry: now() + ttl });
    evictIfNeeded(); // cleanup if over limit
  },

  // Remove 1 key
  invalidate(key) {
    store.delete(key);
    inflight.delete(key);
  },

  // Remove all
  clear() {
    store.clear();
    inflight.clear();
  },

  // Clean expired TTL entries (can be called manually/periodically)
  purgeExpired,

  // Get from cache, if expired/not exists then fetch and cache again.
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
        evictIfNeeded();
        return value;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, p);
    return p;
  },
};

export default apiCache;

// (Optional) want auto periodic cleanup:
// setInterval(() => apiCache.purgeExpired(), 5 * 60 * 1000); // every 5 minutes
