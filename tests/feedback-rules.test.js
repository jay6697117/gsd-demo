import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMBO_MILESTONES,
  CHAIN_WARNING_THRESHOLD,
  DANGER_HP_RATIO,
  getComboMilestone,
  getChainWarningState,
  getDangerState,
  getTempoProfile,
} from '../src/feedback-rules.js';

test('tempo profile has three clear phases', () => {
  assert.equal(getTempoProfile(10).phase, 'warmup');
  assert.equal(getTempoProfile(90).phase, 'mid');
  assert.equal(getTempoProfile(220).phase, 'climax');
});

test('tempo profile exposes medium-frequency peak and recovery windows', () => {
  const peakState = getTempoProfile(64);
  const recoveryState = getTempoProfile(65.6);

  assert.equal(peakState.peakActive, true);
  assert.equal(peakState.recoveryActive, false);
  assert.equal(recoveryState.peakActive, false);
  assert.equal(recoveryState.recoveryActive, true);
});

test('combo milestones trigger only at x3/x5/x8', () => {
  assert.deepEqual(COMBO_MILESTONES, [3, 5, 8]);
  assert.equal(getComboMilestone(2), null);
  assert.equal(getComboMilestone(3), 3);
  assert.equal(getComboMilestone(5), 5);
  assert.equal(getComboMilestone(8), 8);
  assert.equal(getComboMilestone(9), null);
});

test('danger state turns on at low hp and provides flash alpha', () => {
  assert.equal(DANGER_HP_RATIO, 0.3);

  const safe = getDangerState(80, 100, 12.4);
  const danger = getDangerState(25, 100, 12.4);

  assert.equal(safe.isDanger, false);
  assert.equal(safe.flashAlpha, 0);
  assert.equal(danger.isDanger, true);
  assert.ok(danger.flashAlpha >= 0.25 && danger.flashAlpha <= 0.9);
});

test('chain warning only triggers near break threshold with active chain', () => {
  assert.equal(CHAIN_WARNING_THRESHOLD, 0.55);

  const notReady = getChainWarningState(1, 0.3);
  const notNearBreak = getChainWarningState(4, 1.2);
  const nearBreak = getChainWarningState(4, 0.4);

  assert.equal(notReady.isWarning, false);
  assert.equal(notNearBreak.isWarning, false);
  assert.equal(nearBreak.isWarning, true);
  assert.ok(nearBreak.urgency >= 0.2 && nearBreak.urgency <= 1);
});
