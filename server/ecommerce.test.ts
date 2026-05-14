import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Anime", slug: "anime", description: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getCategoryBySlug: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({ id: 2, name: "Gaming", slug: "gaming" }),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getProducts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getProductBySlug: vi.fn().mockResolvedValue(null),
  getProductById: vi.fn().mockResolvedValue(null),
  createProduct: vi.fn().mockResolvedValue({ id: 1, name: "Test Product", slug: "test-product", price: "29.99", stock: 10, status: "draft", featured: false }),
  updateProduct: vi.fn().mockResolvedValue(undefined),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
  addProductImage: vi.fn().mockResolvedValue(undefined),
  deleteProductImage: vi.fn().mockResolvedValue(undefined),
  upsertProductVariant: vi.fn().mockResolvedValue(undefined),
  deleteProductVariant: vi.fn().mockResolvedValue(undefined),
  getCartItems: vi.fn().mockResolvedValue([]),
  upsertCartItem: vi.fn().mockResolvedValue(undefined),
  removeCartItem: vi.fn().mockResolvedValue(undefined),
  clearCart: vi.fn().mockResolvedValue(undefined),
  createOrder: vi.fn().mockResolvedValue({ id: 1, orderNumber: "ISK-TEST-001", status: "pending", total: "59.99" }),
  getOrders: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getOrderById: vi.fn().mockResolvedValue(null),
  getOrderByNumber: vi.fn().mockResolvedValue(null),
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
  getDashboardMetrics: vi.fn().mockResolvedValue({ totalRevenue: 0, totalOrders: 0, recentOrders: [], topProducts: [] }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Context factories ────────────────────────────────────────────────────────
function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createUserCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "user-123",
      email: "user@test.com",
      name: "Test User",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "admin-456",
      email: "admin@test.com",
      name: "Admin User",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx } = { ctx: createUserCtx() };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });

  it("auth.me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("user");
  });
});

describe("categories", () => {
  it("list returns categories for public users", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("Anime");
  });

  it("create requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(
      caller.categories.create({ name: "Test", slug: "test" })
    ).rejects.toThrow();
  });

  it("create succeeds for admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.categories.create({ name: "Gaming", slug: "gaming" });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Gaming");
  });
});

describe("products", () => {
  it("list returns empty array for public users when no products", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.products.list();
    expect(result.items).toEqual([]);
  });

  it("create requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(
      caller.products.create({ name: "Test", slug: "test", price: "9.99" })
    ).rejects.toThrow();
  });

  it("create succeeds for admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.products.create({ name: "Test Product", slug: "test-product", price: "29.99" });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Product");
  });

  it("adminList requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(caller.products.adminList()).rejects.toThrow();
  });
});

describe("cart", () => {
  it("get returns empty cart for guest without session", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.cart.get({});
    expect(result).toEqual([]);
  });

  it("upsert adds item to cart", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(
      caller.cart.upsert({ productId: 1, quantity: 2 })
    ).resolves.not.toThrow();
  });

  it("remove deletes cart item", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(caller.cart.remove({ id: 1 })).resolves.not.toThrow();
  });
});

describe("orders", () => {
  it("create order succeeds for public user", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.orders.create({
      customerName: "Juan Pérez",
      customerEmail: "juan@test.com",
      subtotal: "59.99",
      total: "59.99",
      items: [{ productId: 1, productName: "Test Product", price: "59.99", quantity: 1 }],
    });
    expect(result).toBeDefined();
    expect(result.orderNumber).toBe("ISK-TEST-001");
  });

  it("myOrders requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.orders.myOrders()).rejects.toThrow();
  });

  it("myOrders returns orders for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.orders.myOrders();
    expect(result.items).toEqual([]);
  });

  it("adminList requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(caller.orders.adminList()).rejects.toThrow();
  });

  it("updateStatus requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(
      caller.orders.updateStatus({ id: 1, status: "processing" })
    ).rejects.toThrow();
  });
});

describe("admin metrics", () => {
  it("metrics requires admin role", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    await expect(caller.admin.metrics()).rejects.toThrow();
  });

  it("metrics returns data for admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.admin.metrics();
    expect(result).toBeDefined();
    expect(result.totalOrders).toBe(0);
  });
});
