import test from "node:test";
import assert from "node:assert/strict";

import {
  BEST_RUN_LIMIT,
  RECENT_RUN_LIMIT,
  STANDARD_HISTORY_STORAGE_KEY,
  STANDARD_HISTORY_VERSION,
  buildStandardRunRecord,
  compareHistoryRecords,
  createStandardHistoryState,
  loadStandardHistory,
  mergeCompletedStandardRun,
  saveStandardHistory,
} from "../src/meta-history.js";

function createMemoryStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItemCalls: 0,
    setItemCalls: 0,
    removeItemCalls: 0,
    getItem(key) {
      this.getItemCalls += 1;
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      this.setItemCalls += 1;
      store.set(key, String(value));
    },
    removeItem(key) {
      this.removeItemCalls += 1;
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

test("buildStandardRunRecord normalizes a completed standard run into the locked summary shape", () => {
  const record = buildStandardRunRecord({
    mode: "standard",
    score: 412.9,
    time: 18.246,
    kills: 7,
    level: 3,
    seed: 0x57b1c4,
    playedAt: "2026-03-07T18:58:12.000Z",
    nowMs: 1772861892000,
  });

  assert.equal(record.mode, "standard");
  assert.equal(record.score, 412);
  assert.equal(record.time, 18.246);
  assert.equal(record.kills, 7);
  assert.equal(record.level, 3);
  assert.equal(record.seed, 0x57b1c4);
  assert.equal(record.playedAt, "2026-03-07T18:58:12.000Z");
  assert.match(record.id, /^standard-\d{13}-\d+-\d+$/);
});

test("compareHistoryRecords follows Score -> Time -> Kills -> Level with stable fallbacks", () => {
  const base = {
    mode: "standard",
    score: 300,
    time: 20,
    kills: 10,
    level: 4,
    seed: 1,
  };

  const betterScore = { ...base, id: "a", score: 310, playedAt: "2026-03-07T10:00:00.000Z" };
  const betterTime = { ...base, id: "b", playedAt: "2026-03-07T10:00:00.000Z", time: 22 };
  const betterKills = { ...base, id: "c", playedAt: "2026-03-07T10:00:00.000Z", kills: 11 };
  const betterLevel = { ...base, id: "d", playedAt: "2026-03-07T10:00:00.000Z", level: 5 };
  const betterPlayedAt = { ...base, id: "e", playedAt: "2026-03-07T10:01:00.000Z" };
  const betterId = { ...base, id: "z", playedAt: "2026-03-07T10:00:00.000Z" };
  const worseId = { ...base, id: "a", playedAt: "2026-03-07T10:00:00.000Z" };

  assert.equal(compareHistoryRecords(betterScore, base) < 0, true);
  assert.equal(compareHistoryRecords(betterTime, base) < 0, true);
  assert.equal(compareHistoryRecords(betterKills, base) < 0, true);
  assert.equal(compareHistoryRecords(betterLevel, base) < 0, true);
  assert.equal(compareHistoryRecords(betterPlayedAt, base) < 0, true);
  assert.equal(compareHistoryRecords(betterId, worseId) < 0, true);
});

test("mergeCompletedStandardRun keeps Top 10 best and Recent 20 while ignoring non-standard records", () => {
  let history = createStandardHistoryState();

  for (let index = 0; index < 24; index += 1) {
    history = mergeCompletedStandardRun({
      historyState: history,
      completedRun: buildStandardRunRecord({
        mode: "standard",
        score: 100 + index,
        time: 10 + index,
        kills: index,
        level: 1 + (index % 5),
        seed: 1000 + index,
        playedAt: new Date(Date.UTC(2026, 2, 7, 10, index, 0)).toISOString(),
        nowMs: Date.UTC(2026, 2, 7, 10, index, 0),
      }),
    });
  }

  history = mergeCompletedStandardRun({
    historyState: history,
    completedRun: buildStandardRunRecord({
      mode: "daily",
      score: 999,
      time: 99,
      kills: 99,
      level: 9,
      seed: 9999,
      playedAt: "2026-03-08T00:00:00.000Z",
      nowMs: Date.UTC(2026, 2, 8, 0, 0, 0),
    }),
  });

  assert.equal(history.bestRuns.length, BEST_RUN_LIMIT);
  assert.equal(history.recentRuns.length, RECENT_RUN_LIMIT);
  assert.equal(history.bestRuns[0].score, 123);
  assert.equal(history.bestRuns.at(-1).score, 114);
  assert.equal(history.recentRuns[0].score, 123);
  assert.equal(history.recentRuns.at(-1).score, 104);
  assert.equal(history.bestRuns.every((record) => record.mode === "standard"), true);
  assert.equal(history.recentRuns.every((record) => record.mode === "standard"), true);
});

test("saveStandardHistory writes only the versioned persisted shape and loadStandardHistory hydrates it", () => {
  const storage = createMemoryStorage();
  const history = mergeCompletedStandardRun({
    historyState: createStandardHistoryState({ isExpanded: true }),
    completedRun: buildStandardRunRecord({
      mode: "standard",
      score: 321,
      time: 44.5,
      kills: 12,
      level: 4,
      seed: 77,
      playedAt: "2026-03-07T11:00:00.000Z",
      nowMs: Date.UTC(2026, 2, 7, 11, 0, 0),
    }),
  });

  saveStandardHistory({ storage, historyState: history });

  assert.equal(storage.setItemCalls, 1);
  const persisted = JSON.parse(storage.dump()[STANDARD_HISTORY_STORAGE_KEY]);
  assert.deepEqual(Object.keys(persisted).sort(), ["bestRuns", "recentRuns", "version"]);
  assert.equal(persisted.version, STANDARD_HISTORY_VERSION);
  assert.equal(Array.isArray(persisted.bestRuns), true);
  assert.equal(Array.isArray(persisted.recentRuns), true);
  assert.equal("isExpanded" in persisted, false);

  const hydrated = loadStandardHistory({ storage, fallbackState: createStandardHistoryState({ isExpanded: true }) });
  assert.equal(storage.getItemCalls, 1);
  assert.equal(hydrated.bestRuns.length, 1);
  assert.equal(hydrated.recentRuns.length, 1);
  assert.equal(hydrated.bestRuns[0].score, 321);
  assert.equal(hydrated.isExpanded, true);
});

test("loadStandardHistory tolerates bad payloads and never writes during hydration", () => {
  const fallback = createStandardHistoryState({
    bestRuns: [
      buildStandardRunRecord({
        mode: "standard",
        score: 88,
        time: 12,
        kills: 5,
        level: 2,
        seed: 9,
        playedAt: "2026-03-07T09:00:00.000Z",
        nowMs: Date.UTC(2026, 2, 7, 9, 0, 0),
      }),
    ],
    isExpanded: true,
  });

  const invalidJsonStorage = createMemoryStorage({
    [STANDARD_HISTORY_STORAGE_KEY]: "{not-json",
  });
  const invalidVersionStorage = createMemoryStorage({
    [STANDARD_HISTORY_STORAGE_KEY]: JSON.stringify({ version: STANDARD_HISTORY_VERSION + 1, bestRuns: [], recentRuns: [] }),
  });
  const malformedShapeStorage = createMemoryStorage({
    [STANDARD_HISTORY_STORAGE_KEY]: JSON.stringify({ version: STANDARD_HISTORY_VERSION, bestRuns: { nope: true }, recentRuns: null }),
  });

  const fromInvalidJson = loadStandardHistory({ storage: invalidJsonStorage, fallbackState: fallback });
  const fromInvalidVersion = loadStandardHistory({ storage: invalidVersionStorage, fallbackState: fallback });
  const fromMalformedShape = loadStandardHistory({ storage: malformedShapeStorage, fallbackState: fallback });

  assert.deepEqual(fromInvalidJson, fallback);
  assert.deepEqual(fromInvalidVersion, fallback);
  assert.deepEqual(fromMalformedShape, createStandardHistoryState({ bestRuns: [], recentRuns: [], isExpanded: true }));
  assert.equal(invalidJsonStorage.setItemCalls, 0);
  assert.equal(invalidVersionStorage.setItemCalls, 0);
  assert.equal(malformedShapeStorage.setItemCalls, 0);
});
