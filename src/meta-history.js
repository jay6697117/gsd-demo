export const STANDARD_HISTORY_VERSION = 1;
export const STANDARD_HISTORY_STORAGE_KEY = "poke-threes-hunter.standard-history.v1";
export const BEST_RUN_LIMIT = 10;
export const RECENT_RUN_LIMIT = 20;

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeInteger(value, fallback = 0) {
  return Math.floor(toFiniteNumber(value, fallback));
}

function normalizeTimestamp({ playedAt, nowMs } = {}) {
  if (typeof playedAt === "string" && playedAt.length > 0) {
    const parsed = Date.parse(playedAt);
    if (Number.isFinite(parsed)) {
      return {
        playedAt: new Date(parsed).toISOString(),
        nowMs: parsed,
      };
    }
  }

  const normalizedNow = Math.max(0, normalizeInteger(nowMs, 0));
  return {
    playedAt: new Date(normalizedNow).toISOString(),
    nowMs: normalizedNow,
  };
}

function buildRecordId(mode, nowMs, seed, score) {
  return `${mode}-${String(nowMs).padStart(13, "0")}-${Math.max(0, seed)}-${Math.max(0, score)}`;
}

function dedupeById(records = []) {
  const seen = new Set();
  const deduped = [];
  for (const record of records) {
    if (!record || typeof record.id !== "string" || seen.has(record.id)) {
      continue;
    }
    seen.add(record.id);
    deduped.push(record);
  }
  return deduped;
}

function compareRecentHistoryRecords(left, right) {
  const leftPlayedAt = Date.parse(left?.playedAt ?? "") || 0;
  const rightPlayedAt = Date.parse(right?.playedAt ?? "") || 0;
  if (leftPlayedAt !== rightPlayedAt) {
    return rightPlayedAt - leftPlayedAt;
  }
  return String(right?.id ?? "").localeCompare(String(left?.id ?? ""));
}

function resolveStorage(storage) {
  if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") {
    return storage;
  }

  try {
    const runtimeStorage = globalThis?.localStorage;
    if (
      runtimeStorage &&
      typeof runtimeStorage.getItem === "function" &&
      typeof runtimeStorage.setItem === "function"
    ) {
      return runtimeStorage;
    }
  } catch {
    return null;
  }

  return null;
}

export function compareHistoryRecords(left, right) {
  const comparators = [
    (record) => normalizeInteger(record?.score, 0),
    (record) => toFiniteNumber(record?.time, 0),
    (record) => normalizeInteger(record?.kills, 0),
    (record) => normalizeInteger(record?.level, 1),
    (record) => Date.parse(record?.playedAt ?? "") || 0,
  ];

  for (const readValue of comparators) {
    const leftValue = readValue(left);
    const rightValue = readValue(right);
    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
  }

  return String(right?.id ?? "").localeCompare(String(left?.id ?? ""));
}

export function buildStandardRunRecord({
  id,
  mode = "standard",
  score = 0,
  time = 0,
  kills = 0,
  level = 1,
  seed = 0,
  playedAt,
  nowMs,
} = {}) {
  const normalizedMode = typeof mode === "string" ? mode : "standard";
  const normalizedScore = Math.max(0, normalizeInteger(score, 0));
  const normalizedTime = Number(Math.max(0, toFiniteNumber(time, 0)).toFixed(3));
  const normalizedKills = Math.max(0, normalizeInteger(kills, 0));
  const normalizedLevel = Math.max(1, normalizeInteger(level, 1));
  const normalizedSeed = Math.max(0, normalizeInteger(seed, 0));
  const normalizedTimestamp = normalizeTimestamp({ playedAt, nowMs });

  return {
    id:
      typeof id === "string" && id.length > 0
        ? id
        : buildRecordId(normalizedMode, normalizedTimestamp.nowMs, normalizedSeed, normalizedScore),
    mode: normalizedMode,
    score: normalizedScore,
    time: normalizedTime,
    kills: normalizedKills,
    level: normalizedLevel,
    seed: normalizedSeed,
    playedAt: normalizedTimestamp.playedAt,
  };
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  return buildStandardRunRecord({
    id: record.id,
    mode: record.mode,
    score: record.score,
    time: record.time,
    kills: record.kills,
    level: record.level,
    seed: record.seed,
    playedAt: record.playedAt,
    nowMs: record.playedAt ? Date.parse(record.playedAt) : 0,
  });
}

function normalizeRecordList(records, limit, sortComparator = null) {
  const normalized = dedupeById((Array.isArray(records) ? records : []).map(normalizeRecord).filter(Boolean));
  if (typeof sortComparator === "function") {
    normalized.sort(sortComparator);
  }
  return normalized.slice(0, limit);
}

export function createStandardHistoryState({
  bestRuns = [],
  recentRuns = [],
  isExpanded = false,
} = {}) {
  return {
    bestRuns: normalizeRecordList(bestRuns, BEST_RUN_LIMIT, compareHistoryRecords),
    recentRuns: normalizeRecordList(recentRuns, RECENT_RUN_LIMIT, compareRecentHistoryRecords),
    isExpanded: Boolean(isExpanded),
  };
}

export function mergeCompletedStandardRun({ historyState, completedRun } = {}) {
  const history = createStandardHistoryState(historyState);
  const record = normalizeRecord(completedRun);

  if (!record || record.mode !== "standard") {
    return history;
  }

  return {
    ...history,
    bestRuns: normalizeRecordList([...history.bestRuns, record], BEST_RUN_LIMIT, compareHistoryRecords),
    recentRuns: normalizeRecordList([record, ...history.recentRuns], RECENT_RUN_LIMIT, compareRecentHistoryRecords),
  };
}

export function loadStandardHistory({
  storage,
  storageKey = STANDARD_HISTORY_STORAGE_KEY,
  fallbackState,
} = {}) {
  const resolvedFallback = createStandardHistoryState(fallbackState);
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return resolvedFallback;
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (typeof raw !== "string" || raw.length === 0) {
      return resolvedFallback;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return resolvedFallback;
    }
    if (parsed.version !== STANDARD_HISTORY_VERSION) {
      return resolvedFallback;
    }

    return createStandardHistoryState({
      bestRuns: Array.isArray(parsed.bestRuns) ? parsed.bestRuns : [],
      recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [],
      isExpanded: resolvedFallback.isExpanded,
    });
  } catch {
    return resolvedFallback;
  }
}

export function saveStandardHistory({
  storage,
  storageKey = STANDARD_HISTORY_STORAGE_KEY,
  historyState,
} = {}) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return false;
  }

  const normalized = createStandardHistoryState(historyState);
  const payload = {
    version: STANDARD_HISTORY_VERSION,
    bestRuns: normalized.bestRuns,
    recentRuns: normalized.recentRuns,
  };

  resolvedStorage.setItem(storageKey, JSON.stringify(payload));
  return true;
}

export function summarizeMetaHistoryForSnapshot(historyState = createStandardHistoryState()) {
  const normalized = createStandardHistoryState(historyState);
  return {
    bestRuns: normalized.bestRuns,
    recentRuns: normalized.recentRuns,
    isExpanded: normalized.isExpanded,
  };
}
