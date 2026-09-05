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

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
        setDurationMs(ms);
        setRemainingMs(ms);
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
    const end = Date.now() + remainingMs;
    endRef.current = end;
    setRunning(true);
    scheduleAlert(Math.max(1, Math.round(remainingMs / 1000)));
  };

  const handlePause = () => {
    setRunning(false);
    cancelRestTimerNotification(pendingNotificationIdRef.current);
    pendingNotificationIdRef.current = null;
  };

  const handleResume = () => {
    const end = Date.now() + remainingMs;
    endRef.current = end;
    setRunning(true);
    scheduleAlert(Math.max(1, Math.round(remainingMs / 1000)));
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

          {/* Controls */}
          <View style={styles.controlsRow}>
            {running ? (
              <TouchableOpacity style={styles.controlBtn} onPress={handlePause}>
                <Ionicons name="pause" size={18} color={COLORS.textPrimary} />
                <Text style={styles.controlText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.controlBtn, styles.controlPrimary]} onPress={handleStart}>
                <Ionicons name="play" size={18} color="#09090b" />
                <Text style={[styles.controlText, styles.controlTextPrimary]}>Start</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.controlBtn} onPress={handleRestart}>
              <Ionicons name="refresh" size={18} color={COLORS.textPrimary} />
              <Text style={styles.controlText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.controlDanger]} onPress={handleEnd}>
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
    marginBottom: SPACING.lg,
  },
  countdownDone: {
    color: COLORS.accentGreen,
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
  controlTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentRed,
  },
});
