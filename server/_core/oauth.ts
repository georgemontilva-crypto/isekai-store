/**
 * OAuth routes — pendiente de implementar auth propia.
 *
 * El sistema de auth de Manus fue eliminado.
 * Aquí se registrarán las rutas para:
 *   - GET  /api/auth/google          → redirect a Google
 *   - GET  /api/auth/google/callback → recibir code, crear sesión
 *   - POST /api/auth/magic-link      → enviar email con token
 *   - GET  /api/auth/verify          → verificar token del email
 *   - POST /api/auth/logout          → limpiar cookie
 *
 * TODO: implementar en el siguiente paso.
 */
import type { Express } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // Pendiente: implementación de Google OAuth2 y Magic Link con Resend.
  console.log("[Auth] Sistema de autenticación pendiente de configurar. Ver server/_core/oauth.ts");
}
