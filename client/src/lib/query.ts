import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API Error");
  }
  return res.json();
}

export const api = {
  get:    (url: string)                 => apiFetch(url),
  post:   (url: string, body: unknown)  => apiFetch(url, { method: "POST",   body: JSON.stringify(body) }),
  patch:  (url: string, body: unknown)  => apiFetch(url, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (url: string)                 => apiFetch(url, { method: "DELETE" }),

  // Dedicated image save — sends base64 or URL, gets back updated product
  saveImage: (productId: number, imgUrl: string | null) =>
    apiFetch(`/api/products/${productId}/image`, {
      method: "PATCH",
      body: JSON.stringify({ imgUrl }),
    }),
};
