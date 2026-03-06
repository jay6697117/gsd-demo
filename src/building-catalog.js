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

const RAW_BUILDING_ARCHETYPES = {
  blocker: {
    id: "blocker",
    role: "blocker",
    shape: "compound-rect",
    colliders: [
      {
        bounds: { minX: -1.5, maxX: 1.5, minY: -0.9, maxY: 0.9 },
      },
    ],
    visual: {
      fill: "#415a77",
      edge: "#d7e3f4",
      accent: "#90b4ce",
    },
    anchors: {
      lineBreak: { x: 0, y: 0 },
    },
  },
  funnel: {
    id: "funnel",
    role: "funnel",
    shape: "compound-rect",
    colliders: [
      {
        bounds: { minX: -1.8, maxX: -0.6, minY: -1.8, maxY: 1.8 },
      },
      {
        bounds: { minX: 0.6, maxX: 1.8, minY: -1.8, maxY: 1.8 },
      },
    ],
    visual: {
      fill: "#486f5f",
      edge: "#def7d4",
      accent: "#7dd3a7",
    },
    anchors: {
      kitePivot: { x: 0, y: 0 },
      corridorCenter: { x: 0, y: 0 },
    },
  },
  "soft-cover": {
    id: "soft-cover",
    role: "soft-cover",
    shape: "compound-rect",
    colliders: [
      {
        bounds: { minX: -2, maxX: -1.2, minY: -1.8, maxY: 1.4 },
      },
      {
        bounds: { minX: 1.2, maxX: 2, minY: -1.8, maxY: 1.4 },
      },
      {
        bounds: { minX: -2, maxX: 2, minY: 0.8, maxY: 1.6 },
      },
    ],
    visual: {
      fill: "#7a5f43",
      edge: "#f8dfb2",
      accent: "#ffbf69",
    },
    anchors: {
      retreatPocket: { x: 0, y: -0.4 },
      lineBreak: { x: 0, y: 0.4 },
    },
  },
};

export const BUILDING_ARCHETYPES = freezeDeep(RAW_BUILDING_ARCHETYPES);
export const BUILDING_ARCHETYPE_IDS = Object.freeze(Object.keys(BUILDING_ARCHETYPES));

export const BUILDING_LAYOUT_PRESETS = freezeDeep({
  hub: [
    {
      id: "hub-blocker-01",
      archetypeId: "blocker",
      x: -3.2,
      y: 0,
      rotationQuarterTurns: 0,
    },
  ],
  north: [
    {
      id: "north-funnel-01",
      archetypeId: "funnel",
      x: 0,
      y: -10.8,
      rotationQuarterTurns: 0,
    },
  ],
  east: [
    {
      id: "east-blocker-01",
      archetypeId: "blocker",
      x: 13.2,
      y: 0,
      rotationQuarterTurns: 1,
    },
  ],
  south: [
    {
      id: "south-soft-cover-01",
      archetypeId: "soft-cover",
      x: 0,
      y: 11.8,
      rotationQuarterTurns: 0,
    },
  ],
});
