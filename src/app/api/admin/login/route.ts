import { NextRequest, NextResponse } from "next/server";
import {
  firmarToken,
  verificarCredenciales,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_NAME,
} from "@/lib/auth";
import { adminLoginLimiter, getClientIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = adminLoginLimiter(ip);

  if (!rl.allowed) {
    logger.warn("[Admin Login] Rate limit excedido", { ip });
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos." },
      {
        status: 429,
        headers: { "Retry-After": "900" },
      }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { username, password } = body;

  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Usuario y contraseña requeridos" },
      { status: 400 }
    );
  }

  if (!verificarCredenciales(username, password)) {
    logger.warn("[Admin Login] Credenciales incorrectas", { ip, username });
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  const token = await firmarToken({ username, rol: "admin" });
  const response = NextResponse.json({ success: true, username });
  setSessionCookie(response, token);

  logger.info("[Admin Login] Acceso concedido", { username, ip });
  return response;
}

export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
