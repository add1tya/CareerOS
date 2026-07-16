/**
 * Decision Engine Inspector — INTERNAL debugging tool (Sprint 5 / M5).
 *
 * Shows every candidate and its per-factor values in ranked order, so we can
 * verify the deterministic lexicographic ranking is behaving as intended.
 * Not a user-facing feature.
 */
import type { RankingResult } from "@/lib/decision-engine/types";

export function DecisionInspector({ ranking }: { ranking: RankingResult }) {
  const { ranked, winner, decidingFactorId, confidence } = ranking;
  const factorColumns = ranked[0]?.factors ?? [];

  return (
    <section className="mt-6 space-y-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Decision Engine (inspection)
        </h2>
        <p className="text-sm text-muted-foreground">
          Internal debugging view — {ranked.length} available candidate
          {ranked.length === 1 ? "" : "s"}, ranked lexicographically. Winner:{" "}
          <span className="font-medium">{winner?.name ?? "none"}</span>; decided by{" "}
          <span className="font-medium">{decidingFactorId ?? "—"}</span>; confidence{" "}
          <span className="font-medium">{confidence}</span>. Factors are ordered by
          priority (left = highest); every value is normalized so lower is better.
          Not a finished feature.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Skill</th>
              {factorColumns.map((factor) => (
                <th key={factor.factorId} className="px-3 py-2">
                  {factor.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((candidate, index) => {
              const isWinner = candidate.skillKey === winner?.skillKey;
              return (
                <tr
                  key={candidate.skillKey}
                  className={isWinner ? "bg-primary/5 font-medium" : ""}
                >
                  <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-2">
                    {candidate.name}
                    {isWinner ? " ★" : ""}
                  </td>
                  {candidate.factors.map((factor) => (
                    <td key={factor.factorId} className="px-3 py-2 text-muted-foreground">
                      {factor.display}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
