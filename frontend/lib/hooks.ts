"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Satu kunci per aksi. `get()` selalu mengembalikan kunci yang sama sampai `renew()`,
 * jadi klik ganda atau retry memakai kunci yang sama. Panggil `renew()` setelah sukses.
 */
export function useIdempotencyKey() {
  const ref = useRef<string | null>(null);
  return {
    get: () => (ref.current ??= crypto.randomUUID()),
    renew: () => {
      ref.current = null;
    },
  };
}

export function useDebounce<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
