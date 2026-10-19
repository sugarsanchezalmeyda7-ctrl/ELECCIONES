import { NextResponse } from "next/server";
import { hasAdminSession } from "@/server/auth";
import { getSupabase } from "@/server/supabase";

export async function POST() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const { data: round, error } = await getSupabase().rpc("reset_election_results");
    if (error) {
      if (error.message.includes("VOTING_MUST_BE_CLOSED")) {
        return NextResponse.json({ error: "Cierra la votación antes de reiniciar los resultados." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ success: true, round });
  } catch (error) {
    console.error("Election results reset failed", error);
    return NextResponse.json({ error: "No se pudieron reiniciar los resultados." }, { status: 503 });
  }
}