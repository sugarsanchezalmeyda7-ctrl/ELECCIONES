import { NextResponse } from "next/server";
import { hasAdminSession } from "@/server/auth";
import { getSupabase } from "@/server/supabase";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const open = Boolean((await request.json()).open);
    const { error } = await getSupabase().rpc("set_election_state", { p_is_open: open });
    if (error) throw error;
    return NextResponse.json({ success: true, open });
  } catch (error) {
    console.error("Election control failed", error);
    return NextResponse.json({ error: "No se pudo cambiar el estado de la votación." }, { status: 503 });
  }
}