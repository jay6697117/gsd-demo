function freezeDeep(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      freezeDeep(entry);
    }
    return Object.freeze(value);
  }

  for (const entry of Object.values(value)) {
    freezeDeep(entry);
  }
  return Object.freeze(value);
}

export const DROP_RARITY_IDS = Object.freeze(["common", "rare", "epic"]);
export const EQUIPMENT_SLOT_IDS = Object.freeze(["weapon", "core", "charm"]);

export const BREAKABLE_DROP_TABLES = freezeDeep({
  "starter-weapon": [
    {
      weight: 1,
      slot: "weapon",
      rarity: "common",
      statKey: "attackDamage",
      statValue: 4,
    },
  ],
  "upgrade-weapon": [
    {
      weight: 0.75,
      slot: "weapon",
      rarity: "rare",
      statKey: "attackDamage",
      statValue: 7,
    },
    {
      weight: 0.25,
      slot: "weapon",
      rarity: "epic",
      statKey: "attackDamage",
      statValue: 10,
    },
  ],
  "defense-core": [
    {
      weight: 0.7,
      slot: "core",
      rarity: "rare",
      statKey: "maxHp",
      statValue: 18,
    },
    {
      weight: 0.3,
      slot: "core",
      rarity: "epic",
      statKey: "maxHp",
      statValue: 28,
    },
  ],
  "mobility-charm": [
    {
      weight: 0.68,
      slot: "charm",
      rarity: "rare",
      statKey: "moveSpeed",
      statValue: 1.4,
    },
    {
      weight: 0.32,
      slot: "charm",
      rarity: "epic",
      statKey: "moveSpeed",
      statValue: 2,
    },
  ],
});
