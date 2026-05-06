import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-prod");
export const COOKIE_NAME = "folilco_admin_token";

export interface AdminPayload {
  username: string;
  rol: string;
}

// ── Firmar token ──────────────────────────────────────────────
export async function firmarToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

// Alias semántico
export const crearToken = firmarToken;

// ── Verificar token ───────────────────────────────────────────
export async function verificarToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

// ── Leer sesión desde cookies (Server Components) ─────────────
export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

// Alias semántico
export const obtenerSesion = getAdminSession;

// ── Proteger API Routes ───────────────────────────────────────
export async function requireAdmin(
  req: NextRequest
): Promise<AdminPayload | NextResponse> {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ??
    req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await verificarToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Sesión expirada o inválida" },
      { status: 401 }
    );
  }

  return payload;
}

// ── Helpers de cookies ────────────────────────────────────────
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

// ── Verificación de credenciales con timing-safe ─────────────
export function verificarCredenciales(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME ?? "";
  const adminPass = process.env.ADMIN_PASSWORD ?? "";

  if (!adminUser || !adminPass) return false;

  try {
    const userMatch = timingSafeEqual(
      Buffer.from(username.padEnd(100)),
      Buffer.from(adminUser.padEnd(100))
    );
    const passMatch = timingSafeEqual(
      Buffer.from(password.padEnd(200)),
      Buffer.from(adminPass.padEnd(200))
    );
    return userMatch && passMatch;
  } catch {
    return false;
  }
}
