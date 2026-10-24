import c3012 from "./matches/d766d406-4eb2-4166-9cce-c067db61dcba.json";
import c3022 from "./matches/898d4f25-f93f-48c4-ab69-b7cb9bbc7fdf.json";
import c3045 from "./matches/8a698c76-27d6-43b2-bcc6-6ed2af391bfb.json";
import c3050 from "./matches/af7e7ac5-8a55-4eac-b820-acaa4fa6be0a.json";
import c3054 from "./matches/4c0efe60-6b96-439c-8738-e1a935463eac.json";
import c3057 from "./matches/90b280c1-157c-4c78-b64b-c58d32de675d.json";
import c3059 from "./matches/304e0da1-3603-4a89-9fd4-5e6c593b5415.json";
import g006a from "./matches/c5817e1b-e646-482a-bab3-00bf62cb8cec.json";
import g006b from "./matches/0e2f642e-2d12-492e-a05b-3161bbbd071e.json";
import g016a from "./matches/07b0fd61-deff-4d9c-be6c-02ce94f2d96c.json";
import g016b from "./matches/349d67ff-4c5a-4b6f-b538-b2323220086d.json";
import g024a from "./matches/1f65f3b7-195b-4c39-91c2-5c96d029a9c4.json";
import type { OfficialReview } from "./official-match";

export const officialReviews = [
  c3012,
  c3022,
  c3045,
  c3050,
  c3054,
  c3057,
  c3059,
  g006a,
  g006b,
  g016a,
  g016b,
  g024a,
] as OfficialReview[];
export const officialMatches = officialReviews
  .map((review) => review.match)
  .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
export const getOfficialReview = (id: string) =>
  officialReviews.find((review) => review.match.id === id);
