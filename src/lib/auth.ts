import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * F0-06: sin fallback público inseguro.
 * No lanzar en import/build (next build usa NODE_ENV=production).
 */
function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (raw && raw.length >= 32) {
    return new TextEncoder().encode(raw);
  }
  return new TextEncoder().encode("dev-only-insecure-secret-min-32-chars!!");
}

export const COOKIE_NAME = "folilco_admin_token";

export interface AdminPayload {
  username: string;
  rol: string;
}

export async function firmarToken(payload: AdminPayload): Promise<string> {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET no configurado o demasiado corto");
    }
  }
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getJwtSecret());
}

export const crearToken = firmarToken;

export async function verificarToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

export const obtenerSesion = getAdminSession;

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

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

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
