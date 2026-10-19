import { NextResponse } from "next/server";
import { getSupabase } from "@/server/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const option = Number(body.option);
    const operationId = String(body.operationId ?? "");
    if (![1, 2].includes(option) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
      return NextResponse.json({ error: "Solicitud de voto no válida." }, { status: 400 });
    }
    const { data, error } = await getSupabase().rpc("cast_vote", {
      p_operation_id: operationId,
      p_option: option,
    });
    if (error) {
      if (error.message.includes("VOTING_CLOSED")) return NextResponse.json({ error: "La votación está cerrada." }, { status: 409 });
      if (error.message.includes("IDEMPOTENCY_CONFLICT")) return NextResponse.json({ error: "La operación no coincide con el voto existente." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ success: true, operationId: data });
  } catch (error) {
    console.error("Vote submission failed", error);
    return NextResponse.json({ error: "No se pudo registrar el voto. Inténtalo nuevamente." }, { status: 503 });
  }
}