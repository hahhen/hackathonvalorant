import imported from "./official-match.json";
import type { MatchInfo, Player, Round } from "@/types/match";

/** Generated locally from the organization JSON; no external match data. */
export interface OfficialReview {
  match: MatchInfo;
  players: Player[];
  rounds: Round[];
  source: {
    file: string;
    matchId: string;
    sha256: string;
    gameVersion: string;
    notes: string[];
    friendlyTeamId?: string;
    localPlayerToPuuid?: Record<string, string>;
  };
  metrics: Record<
    "opening" | "trades" | "postplant",
    { value: string; detail: string }
  >;
}
export const officialReview = imported as OfficialReview;
export const officialMatch = officialReview.match;
