export function consumeEdge(edgeSet, code) {
  if (!edgeSet || !edgeSet.has(code)) {
    return false;
  }
  edgeSet.delete(code);
  return true;
}

export function resolvePauseMode(currentMode) {
  if (currentMode === "playing") {
    return "paused";
  }
  if (currentMode === "paused") {
    return "playing";
  }
  return currentMode;
}

export function resolveFocusLossMode(currentMode) {
  return currentMode === "playing" ? "paused" : currentMode;
}

export function shouldClearInputForVisibility(visibilityState) {
  return visibilityState !== "visible";
}

export function sortedKeys(setLike) {
  if (!setLike) {
    return [];
  }
  return Array.from(setLike).sort((a, b) => a.localeCompare(b));
}
