import test from "node:test";
import assert from "node:assert/strict";

import {
  consumeEdge,
  resolveFocusLossMode,
  resolvePauseMode,
  shouldClearInputForVisibility,
  sortedKeys,
} from "../src/control-rules.js";

test("consumeEdge consumes one-shot key exactly once", () => {
  const edges = new Set(["KeyP"]);

  assert.equal(consumeEdge(edges, "KeyP"), true);
  assert.equal(consumeEdge(edges, "KeyP"), false);
  assert.equal(edges.has("KeyP"), false);
});

test("resolvePauseMode toggles only between playing and paused", () => {
  assert.equal(resolvePauseMode("playing"), "paused");
  assert.equal(resolvePauseMode("paused"), "playing");
  assert.equal(resolvePauseMode("start"), "start");
  assert.equal(resolvePauseMode("gameover"), "gameover");
});

test("resolveFocusLossMode auto-pauses only during active play", () => {
  assert.equal(resolveFocusLossMode("playing"), "paused");
  assert.equal(resolveFocusLossMode("paused"), "paused");
  assert.equal(resolveFocusLossMode("start"), "start");
});

test("shouldClearInputForVisibility enforces hidden-tab input reset", () => {
  assert.equal(shouldClearInputForVisibility("visible"), false);
  assert.equal(shouldClearInputForVisibility("hidden"), true);
  assert.equal(shouldClearInputForVisibility("prerender"), true);
});

test("sortedKeys returns stable alphabetical key listing", () => {
  const keys = new Set(["KeyP", "ArrowLeft", "KeyF"]);
  assert.deepEqual(sortedKeys(keys), ["ArrowLeft", "KeyF", "KeyP"]);
  assert.deepEqual(sortedKeys(null), []);
});
