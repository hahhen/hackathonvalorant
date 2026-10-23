import catalog from "./agents.json";
import type { AbilityReference } from "@/types/match";

export type AbilitySlot =
  "ability1" | "ability2" | "grenade" | "ultimate" | "passive";
export interface AgentAbility {
  name: string;
  namePtBr: string;
  catalogLabel: string;
  sprite: string | null;
  weaponIds: string[];
}
export interface AgentDefinition {
  name: string;
  portrait: string;
  abilities: Partial<Record<AbilitySlot, AgentAbility>>;
}
export const agentCatalog: Record<string, AgentDefinition> = catalog.agents;
const slotAliases = catalog.slotAliases as Record<string, AbilitySlot>;

/** Resolve by killer's agent + recorded slot, never by equipped weapon or time proximity. */
export function resolveAgentAbility(
  agent: string,
  damageItem: string,
): AbilityReference | undefined {
  const entry = Object.entries(agentCatalog).find(
    ([id, definition]) =>
      id === agent.toLowerCase() ||
      definition.name.toLowerCase() === agent.toLowerCase(),
  );
  const slot =
    slotAliases[damageItem] ??
    (Object.values(slotAliases).includes(damageItem as AbilitySlot)
      ? (damageItem as AbilitySlot)
      : undefined);
  if (!entry || !slot) return undefined;
  const [agentId, definition] = entry;
  const ability = definition.abilities[slot];
  return ability
    ? {
        agentId,
        slot,
        name: ability.name,
        namePtBr: ability.namePtBr,
        sprite: ability.sprite,
      }
    : undefined;
}
