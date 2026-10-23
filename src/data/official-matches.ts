import liga from "./matches/fc92e080-4f8e-4ed6-a345-a593796d8755.json";
import macklogic from "./matches/d8282745-93b7-4a7c-b5e7-873e4779e2d3.json";
import brutal from "./matches/d89e1826-76a4-4fbb-91f1-a971127ba4a2.json";
import ceub from "./matches/ca8290e9-82e4-43f0-b0dc-6139ca6219a9.json";
import type { officialReview } from "./official-match";

export const officialReviews = [
  liga,
  macklogic,
  brutal,
  ceub,
] as (typeof officialReview)[];
export const officialMatches = officialReviews
  .map((review) => review.match)
  .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
export const getOfficialReview = (id: string) =>
  officialReviews.find((review) => review.match.id === id);
