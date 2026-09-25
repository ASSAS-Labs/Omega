import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { getDefaultRestDurationMs } from '../services/restTimerPrefs';
import {
  cancelRestTimerNotification,
  scheduleRestTimerNotification,
} from '../services/notifeeTimerService';
import { triggerRestTimerFinishedAlert } from '../services/timerAlertService';
import { useTimeSync } from '../hooks/useTimeSync';

interface RestTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

// Interactive picker bounds: 0-60 minutes, 0-59 seconds
const MAX_PICKER_MINUTES = 60;
const MAX_PICKER_SECONDS = 59;

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function splitMs(ms: number): { minutes: number; seconds: number } {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.min(MAX_PICKER_MINUTES, Math.floor(totalSec / 60)),
    seconds: totalSec % 60,
  };
}

interface StepperColumnProps {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
  accessibilityLabel: string;
}

/** Vertical stepper column: ▲ increments, ▼ decrements, clamped to [0, max]. */
function StepperColumn({
  label,
  value,
  max,
  disabled,
  onChange,
  accessibilityLabel,
}: StepperColumnProps) {
  const step = (delta: number) => {
    if (disabled) return;
    onChange(Math.min(max, Math.max(0, value + delta)));
  };

  return (
    <View style={[styles.stepper, disabled && styles.stepperDisabled]}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => step(1)}
        disabled={disabled || value >= max}
        hitSlop={8}
        accessibilityLabel={`Increase ${accessibilityLabel}`}
      >
        <Ionicons
          name="chevron-up"
          size={22}
          color={disabled || value >= max ? COLORS.textDisabled : COLORS.textPrimary}
        />
      </TouchableOpacity>

      <Text style={styles.stepperValue}>
        {value.toString().padStart(2, '0')}
      </Text>

      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => step(-1)}
        disabled={disabled || value <= 0}
        hitSlop={8}
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
      >
        <Ionicons
          name="chevron-down"
          size={22}
          color={disabled || value <= 0 ? COLORS.textDisabled : COLORS.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function RestTimerModal({ visible, onClose }: RestTimerModalProps) {
  const [durationMs, setDurationMs] = useState(60000);
  const [remainingMs, setRemainingMs] = useState(60000);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);
  // Id of the notification we most recently scheduled for the current run, so
  // pausing/stopping cancels exactly that pending alert.
  const pendingNotificationIdRef = useRef<string | null>(null);

  // Load the user's preferred default duration when the modal opens
  useEffect(() => {
    if (visible) {
      getDefaultRestDurationMs().then((ms) => {
        // Keep the picker, countdown, and scheduled alert in agreement even if
        // a preference was stored outside the picker's range
        const clamped = Math.min(ms, (MAX_PICKER_MINUTES * 60 + MAX_PICKER_SECONDS) * 1000);
        setDurationMs(clamped);
        setRemainingMs(clamped);
        setRunning(false);
      });
    }
  }, [visible]);

  // Foreground re-sync: update UI when returning from background
  useTimeSync(() => {
    if (!running || endRef.current === 0) return;
    const left = endRef.current - Date.now();
    if (left <= 0) {
      setRemainingMs(0);
      setRunning(false);
    } else {
      setRemainingMs(left);
    }
  });

  // Countdown ticker for the UI.
  // The actual background alert is an OS-level notifee timestamp trigger
  // scheduled to fire at the same moment the countdown reaches zero.
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const left = endRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        clearInterval(interval);
        cancelRestTimerNotification();
        // Countdown finished — buzz/vibrate so the user notices without
        // looking at the screen (local Vibration/Haptics only).
        triggerRestTimerFinishedAlert();
      } else {
        setRemainingMs(left);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [running]);

  // Shared helper: schedule the OS-level background alert for the given
  // seconds and remember its unique id so it can be cancelled precisely.
  const scheduleAlert = async (seconds: number) => {
    pendingNotificationIdRef.current = await scheduleRestTimerNotification(seconds);
  };

  const handleStart = () => {
    // The picker defines the exact target duration for this set
    const target = Math.max(1, Math.round(remainingMs / 1000));
    const end = Date.now() + target * 1000;
    endRef.current = end;
    setRunning(true);
    scheduleAlert(target);
  };

  const handlePause = () => {
    setRunning(false);
    cancelRestTimerNotification(pendingNotificationIdRef.current);
    pendingNotificationIdRef.current = null;
  };

  const handleResume = () => {
    const target = Math.max(1, Math.round(remainingMs / 1000));
    const end = Date.now() + target * 1000;
    endRef.current = end;
    setRunning(true);
    scheduleAlert(target);
  };

  const handleRestart = () => {
    setRemainingMs(durationMs);
    setRunning(true);
    const end = Date.now() + durationMs;
    endRef.current = end;
    scheduleAlert(Math.max(1, Math.round(durationMs / 1000)));
  };

  const handleEnd = useCallback(() => {
    setRunning(false);
    cancelRestTimerNotification(pendingNotificationIdRef.current);
    pendingNotificationIdRef.current = null;
    onClose();
  }, [onClose]);

  const { minutes, seconds } = splitMs(remainingMs);

  // Changing the picker retargets the duration for this set. The countdown is
  // locked while it runs, so a mid-rest change can never desync the alert.
  const handlePickMinutes = (nextMinutes: number) => {
    const next = (nextMinutes * 60 + seconds) * 1000;
    setDurationMs(next);
    setRemainingMs(next);
  };

  const handlePickSeconds = (nextSeconds: number) => {
    const next = (minutes * 60 + nextSeconds) * 1000;
    setDurationMs(next);
    setRemainingMs(next);
  };

  const canStart = remainingMs > 0;

  // Clean up if modal dismissed externally
  useEffect(() => {
    if (!visible) {
      setRunning(false);
      cancelRestTimerNotification(pendingNotificationIdRef.current);
      pendingNotificationIdRef.current = null;
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleEnd}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Rest Timer</Text>

          {/* Countdown */}
          <Text style={[styles.countdown, remainingMs <= 0 && !running && styles.countdownDone]}>
            {formatMs(remainingMs)}
          </Text>

          {/* Target duration picker (minutes 0-60 / seconds 0-59) */}
          <View style={styles.stepperRow}>
            <StepperColumn
              label="MIN"
              value={minutes}
              max={MAX_PICKER_MINUTES}
              disabled={running}
              onChange={handlePickMinutes}
              accessibilityLabel="rest minutes"
            />
            <StepperColumn
              label="SEC"
              value={seconds}
              max={MAX_PICKER_SECONDS}
              disabled={running}
              onChange={handlePickSeconds}
              accessibilityLabel="rest seconds"
            />
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            {running ? (
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handlePause}
                accessibilityLabel="Pause rest timer"
              >
                <Ionicons name="pause" size={18} color={COLORS.textPrimary} />
                <Text style={styles.controlText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlBtn, styles.controlPrimary, !canStart && styles.controlDisabled]}
                onPress={handleStart}
                disabled={!canStart}
                accessibilityLabel="Start rest timer"
              >
                <Ionicons name="play" size={18} color={canStart ? '#09090b' : COLORS.textMuted} />
                <Text style={[styles.controlText, styles.controlTextPrimary, !canStart && styles.controlTextDisabled]}>
                  Start
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleRestart}
              accessibilityLabel="Restart rest timer"
            >
              <Ionicons name="refresh" size={18} color={COLORS.textPrimary} />
              <Text style={styles.controlText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlDanger]}
              onPress={handleEnd}
              accessibilityLabel="End rest timer"
            >
              <Ionicons name="stop" size={18} color={COLORS.accentRed} />
              <Text style={styles.controlTextDanger}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: SPACING.md,
  },
  countdownDone: {
    color: COLORS.accentGreen,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  stepper: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  stepperDisabled: {
    opacity: 0.6,
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  stepperButton: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  controlPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  controlDisabled: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.border,
  },
  controlDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  controlTextPrimary: {
    color: '#09090b',
    fontWeight: '700',
  },
  controlTextDisabled: {
    color: COLORS.textMuted,
  },
  controlTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentRed,
  },
});
