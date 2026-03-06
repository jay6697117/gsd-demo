import { WORLD_SECTOR_IDS } from "./world-sectors.js";

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

const RAW_BREAKABLE_ARCHETYPES = {
  crate: {
    id: "crate",
    blocksMovement: false,
    maxHp: 21,
    hitRadius: 0.9,
    size: { width: 1.2, height: 1.1 },
    visual: {
      fill: "#9f6d44",
      edge: "#f7d6a7",
      accent: "#f5b971",
    },
  },
  cache: {
    id: "cache",
    blocksMovement: false,
    maxHp: 34,
    hitRadius: 1.05,
    size: { width: 1.45, height: 1.25 },
    visual: {
      fill: "#4b6f86",
      edge: "#d9f0ff",
      accent: "#86d8ff",
    },
  },
};

export const BREAKABLE_ARCHETYPES = freezeDeep(RAW_BREAKABLE_ARCHETYPES);
export const BREAKABLE_ARCHETYPE_IDS = Object.freeze(Object.keys(BREAKABLE_ARCHETYPES));

export const BREAKABLE_LAYOUT_PRESETS = freezeDeep({
  hub: [
    {
      id: "hub-crate-01",
      archetypeId: "crate",
      x: 2.8,
      y: -0.6,
      rotationQuarterTurns: 0,
    },
    {
      id: "hub-cache-01",
      archetypeId: "cache",
      x: 5.1,
      y: 1.2,
      rotationQuarterTurns: 0,
    },
  ],
  north: [
    {
      id: "north-cache-01",
      archetypeId: "cache",
      x: -1.8,
      y: -11.9,
      rotationQuarterTurns: 0,
    },
  ],
  east: [
    {
      id: "east-crate-01",
      archetypeId: "crate",
      x: 13.6,
      y: -2.1,
      rotationQuarterTurns: 0,
    },
  ],
  south: [
    {
      id: "south-cache-01",
      archetypeId: "cache",
      x: -2.4,
      y: 12.5,
      rotationQuarterTurns: 0,
    },
  ],
});

export const BREAKABLE_SECTOR_IDS = Object.freeze([...WORLD_SECTOR_IDS]);
