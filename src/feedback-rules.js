export const COMBO_MILESTONES = [3, 5, 8];
export const CHAIN_WARNING_THRESHOLD = 0.55;
export const DANGER_HP_RATIO = 0.3;

const CYCLE_SECONDS = 8;
const PEAK_WINDOW_SECONDS = 1.2;
const RECOVERY_WINDOW_SECONDS = 2.4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getTempoProfile(elapsedSeconds) {
  const time = Math.max(0, Number(elapsedSeconds) || 0);

  let phase = "warmup";
  let spawnIntervalMin = 0.74;
  let spawnIntervalMax = 1.04;
  let enemySpeedScale = 0.93;

  if (time >= 70 && time < 180) {
    phase = "mid";
    spawnIntervalMin = 0.56;
    spawnIntervalMax = 0.82;
    enemySpeedScale = 1;
  } else if (time >= 180) {
    phase = "climax";
    spawnIntervalMin = 0.45;
    spawnIntervalMax = 0.68;
    enemySpeedScale = 1.08;
  }

  const cyclePosition = time % CYCLE_SECONDS;
  const peakActive = cyclePosition < PEAK_WINDOW_SECONDS;
  const recoveryActive = cyclePosition >= PEAK_WINDOW_SECONDS && cyclePosition < RECOVERY_WINDOW_SECONDS;

  let spawnScale = 1;
  if (peakActive) {
    spawnScale = 0.78;
    enemySpeedScale *= 1.08;
  } else if (recoveryActive) {
    spawnScale = 1.16;
    enemySpeedScale *= 0.96;
  }

  const nextPeakIn = peakActive ? 0 : Number((CYCLE_SECONDS - cyclePosition).toFixed(3));

  return {
    phase,
    spawnIntervalMin,
    spawnIntervalMax,
    spawnScale,
    enemySpeedScale,
    peakActive,
    recoveryActive,
    nextPeakIn,
  };
}

export function getComboMilestone(chain) {
  const normalized = Number(chain) || 0;
  return COMBO_MILESTONES.includes(normalized) ? normalized : null;
}

export function getDangerState(currentHp, maxHp, elapsedSeconds) {
  const safeMaxHp = Math.max(1, Number(maxHp) || 1);
  const hpRatio = clamp((Number(currentHp) || 0) / safeMaxHp, 0, 1);
  const isDanger = hpRatio <= DANGER_HP_RATIO;

  if (!isDanger) {
    return {
      isDanger: false,
      hpRatio,
      flashAlpha: 0,
    };
  }

  const pulse = 0.5 + Math.sin((Number(elapsedSeconds) || 0) * 17) * 0.5;
  const flashAlpha = Number((0.25 + pulse * 0.65).toFixed(3));

  return {
    isDanger: true,
    hpRatio,
    flashAlpha,
  };
}

export function getChainWarningState(chain, chainTimer) {
  const currentChain = Number(chain) || 0;
  const timer = Math.max(0, Number(chainTimer) || 0);

  if (currentChain < 2 || timer <= 0 || timer > CHAIN_WARNING_THRESHOLD) {
    return {
      isWarning: false,
      urgency: 0,
      timeLeft: timer,
    };
  }

  const urgency = Number(clamp(1 - timer / CHAIN_WARNING_THRESHOLD, 0.2, 1).toFixed(3));

  return {
    isWarning: true,
    urgency,
    timeLeft: timer,
  };
}
