import { request, type APIRequestContext } from "@playwright/test";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const API = process.env.E2E_API_URL ?? "http://localhost:8080";

export const ADMIN = { email: "admin@pos.com", password: "Admin@12345" };
export const CASHIER = { email: "cashier@pos.com", password: "Cashier@12345" };

// ** Admin API Client (Bearer) for data setup—a fast method that bypasses the UI
export async function adminApi(): Promise<APIRequestContext> {
  const anon = await request.newContext({ baseURL: API });
  const res = await anon.post("/api/auth/login", { data: ADMIN });
  if (!res.ok()) {
  const body = await res.text();
  throw new Error(
    `Admin login failed: ${res.status()} - ${body}`
  );
}
  const { token } = await res.json();   // Dev: Backend returns token in the body (expose-token)
  await anon.dispose();
  return request.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

export async function ensureCashier(api: APIRequestContext) {
  const res = await api.post("/api/users", {
    data: { fullName: "E2E Cashier", email: CASHIER.email, password: CASHIER.password, role: "CASHIER" },
  });
  if (!res.ok() && res.status() !== 409) {
    throw new Error(`Cannot create cashier: ${res.status()} ${await res.text()}`);
  }
}

export async function createProduct(api: APIRequestContext, opts: { price: number; stock: number }) {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const product = {
    name: `E2E Coffee ${unique}`,
    sku: `E2E-${unique}`.toUpperCase(),
    barcode: `E2E${unique}`,
  };

  const res = await api.post("/api/products", {
    data: { ...product, price: opts.price, costPrice: 0.5, lowStockThreshold: 1, categoryId: null },
  });
  if (!res.ok()) throw new Error(`Cannot create product: ${res.status()} ${await res.text()}`);
  const created = await res.json();

  if (opts.stock > 0) {
    const stock = await api.post(`/api/inventory/products/${created.id}/stock-in`, {
      data: { quantity: opts.stock, reason: "e2e" },
    });
    if (!stock.ok()) throw new Error(`Cannot add stock: ${stock.status()}`);
  }
  return { id: created.id as number, ...product };
}

export async function stockOf(api: APIRequestContext, productId: number): Promise<number> {
  const res = await api.get(`/api/products/${productId}`);
  return (await res.json()).stockQuantity as number;
}