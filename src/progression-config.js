export const XP_VALUES_BY_ENEMY_KIND = {
  leafling: 1,
  sparkowl: 1,
  embercub: 2,
};

export const LEVEL_THRESHOLDS = [0, 4, 10, 18, 28, 40];

export const LEVEL_THRESHOLD_OVERFLOW_DELTA =
  LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 2];
