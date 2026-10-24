import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getOfficialReview } from "@/data/official-matches";
import { selectAnalysis } from "@/lib/analysis-query";
import type { EngineAnalysis } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = new Map<
  string,
  { mtime: number; value: Promise<EngineAnalysis> }
>();

/** Only active IDs may resolve files. Large engine outputs never enter the client bundle. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const review = getOfficialReview(id);
  if (!review)
    return Response.json({ error: "Partida não encontrada." }, { status: 404 });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "team",
    period = params.get("period") ?? "match";
  if (
    !["team", "player"].includes(kind) ||
    !["match", "round"].includes(period)
  )
    return Response.json({ error: "Recorte inválido." }, { status: 400 });
  try {
    const file = path.join(process.cwd(), "src/data/analyses", `${id}.json`);
    const { mtimeMs } = await stat(file);
    let item = cache.get(id);
    if (!item || item.mtime !== mtimeMs) {
      item = {
        mtime: mtimeMs,
        value: readFile(file, "utf8").then(
          (text) => JSON.parse(text) as EngineAnalysis,
        ),
      };
      cache.delete(id);
      cache.set(id, item);
      if (cache.size > 2) cache.delete(cache.keys().next().value!);
    }
    const raw = await item.value;
    const result = selectAnalysis(raw, review, {
      kind: kind as "team" | "player",
      period: period as "match" | "round",
      ...(period === "round" ? { round: Number(params.get("round")) } : {}),
      ...(kind === "player" ? { playerId: params.get("player") ?? "" } : {}),
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RangeError)
      return Response.json({ error: error.message }, { status: 400 });
    console.error("Analysis unavailable", id, error);
    return Response.json(
      {
        error:
          "Análise indisponível ou incompatível. Reimporte e execute o motor para esta partida.",
      },
      { status: 503 },
    );
  }
}
