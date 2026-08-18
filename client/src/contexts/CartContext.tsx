import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { nanoid } from "nanoid";

export interface CartItemLocal {
  id: number;
  productId: number;
  variantId?: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    price: string;
    slug: string;
  } | null;
  variant?: {
    id: number;
    name: string;
    price: string | null;
  } | null;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItemLocal[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** `openDrawer: false` agrega sin abrir el carrito (ej. "Comprar ahora") */
  addItem: (productId: number, variantId?: number, quantity?: number, openDrawer?: boolean) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const SESSION_KEY = "isekai-session-id";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = nanoid();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(getSessionId);

  const cartQuery = trpc.cart.get.useQuery(
    { sessionId: user ? undefined : sessionId },
    { refetchOnWindowFocus: false }
  );

  const upsertMutation = trpc.cart.upsert.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });
  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });
  const clearMutation = trpc.cart.clear.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });

  const items: CartItemLocal[] = (cartQuery.data ?? []) as CartItemLocal[];

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.variant?.price ?? item.product?.price ?? "0");
    return sum + price * item.quantity;
  }, 0);

  const addItem = useCallback(async (productId: number, variantId?: number, quantity = 1, openDrawer = true) => {
    const existing = items.find(
      (i) => i.productId === productId && i.variantId === variantId
    );
    const newQty = (existing?.quantity ?? 0) + quantity;
    await upsertMutation.mutateAsync({
      sessionId: user ? undefined : sessionId,
      productId,
      variantId,
      quantity: newQty,
    });
    if (openDrawer) setIsOpen(true);
  }, [items, upsertMutation, sessionId, user]);

  const updateQuantity = useCallback(async (id: number, quantity: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (quantity <= 0) {
      await removeMutation.mutateAsync({ id });
    } else {
      await upsertMutation.mutateAsync({
        sessionId: user ? undefined : sessionId,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity,
      });
    }
  }, [items, upsertMutation, removeMutation, sessionId, user]);

  const removeItem = useCallback(async (id: number) => {
    await removeMutation.mutateAsync({ id });
  }, [removeMutation]);

  const clearCartFn = useCallback(async () => {
    await clearMutation.mutateAsync({ sessionId: user ? undefined : sessionId });
  }, [clearMutation, sessionId, user]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart: clearCartFn,
        totalItems,
        subtotal,
        isLoading: cartQuery.isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
