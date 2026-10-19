import { timingSafeEqual, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { clientKey, createAdminSession, secureCookieOptions, SESSION_COOKIE } from "@/server/auth";
import { getSupabase } from "@/server/supabase";

function sameSecret(input: string, expected: string) {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    const password = String((await request.json()).password ?? "");
    if (password.length > 256) return NextResponse.json({ error: "CONTRASEÑA INCORRECTA" }, { status: 401 });
    const supabase = getSupabase();
    const key = clientKey(request);
    const { data: allowed, error: limitError } = await supabase.rpc("admin_login_allowed", { p_client_key: key });
    if (limitError) throw limitError;
    if (!allowed) return NextResponse.json({ error: "Demasiados intentos. Prueba nuevamente en 15 minutos." }, { status: 429 });

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD no está configurada.");
    if (!sameSecret(password, expected)) {
      const { error: attemptError } = await supabase.rpc("admin_login_failed", { p_client_key: key });
      if (attemptError) throw attemptError;
      return NextResponse.json({ error: "CONTRASEÑA INCORRECTA" }, { status: 401 });
    }

    const { error: resetError } = await supabase.rpc("admin_login_succeeded", { p_client_key: key });
    if (resetError) throw resetError;
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, await createAdminSession(), secureCookieOptions());
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ error: "No se pudo validar el acceso administrativo." }, { status: 503 });
  }
}