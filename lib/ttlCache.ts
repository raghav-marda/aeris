/**
 * Small in-memory cache with a time-to-live and a hard size cap. Used to
 * avoid repeat calls to free upstream APIs for the same place.
 */
export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

export function createTtlCache<V>(ttlMs: number, maxEntries: number): TtlCache<V> {
  const entries = new Map<string, Entry<V>>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      if (entries.size >= maxEntries && !entries.has(key)) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}
