import { NextResponse } from "next/server";
import { hasAdminSession } from "@/server/auth";
import { getSupabase } from "@/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const { data, error } = await getSupabase().rpc("get_election_results");
    if (error) throw error;
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Results query failed", error);
    return NextResponse.json({ error: "No se pudieron consultar los resultados." }, { status: 503 });
  }
}