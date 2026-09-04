import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';

const STORAGE_KEY = '@has_completed_walkthrough';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WalkthroughStep {
  /** Tab to navigate to before showing this step */
  tab: 'Dashboard' | 'Settings' | 'Exercises';
  /** Icon displayed in the tooltip header */
  icon: keyof typeof Ionicons.glyphMap;
  /** Feature title */
  title: string;
  /** Explanation text */
  text: string;
}

const STEPS: WalkthroughStep[] = [
  {
    tab: 'Dashboard',
    icon: 'barbell-outline',
    title: 'Start Workout',
    text: 'Start your scheduled session for today and log your live sets.',
  },
  {
    tab: 'Settings',
    icon: 'calendar-outline',
    title: 'Routine Split',
    text: 'Set up your weekly split from scratch. Choose your target muscle groups for each day.',
  },
  {
    tab: 'Settings',
    icon: 'timer-outline',
    title: 'Default Rest Timer',
    text: 'Set your custom rest countdown duration between sets.',
  },
  {
    tab: 'Settings',
    icon: 'scale-outline',
    title: 'Weight Unit',
    text: 'Choose your preferred weight measurement unit.',
  },
  {
    tab: 'Settings',
    icon: 'share-outline',
    title: 'Data Portability (Backup & Restore)',
    text: 'Export or restore your full workout history anytime via JSON.',
  },
  {
    tab: 'Exercises',
    icon: 'search',
    title: 'Build Your Exercise Library',
    text: 'Search through the built-in library of common exercises to add to your routine. If an exercise isn\'t in the pool, you can create and save a custom one anytime.',
  },
];

interface WalkthroughOverlayProps {
  /** Called to switch the active bottom tab */
  onNavigateTab: (tab: 'Dashboard' | 'Settings' | 'Exercises') => void;
}

export default function WalkthroughOverlay({ onNavigateTab }: WalkthroughOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value !== 'true') {
          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      } catch {
        // If storage read fails, skip walkthrough silently
      }
    })();
  }, []);

  const currentStep = STEPS[stepIndex];

  const navigateToStep = useCallback(
    (idx: number) => {
      const step = STEPS[idx];
      if (step) {
        onNavigateTab(step.tab);
      }
    },
    [onNavigateTab]
  );

  // Navigate to the correct tab when stepIndex changes
  useEffect(() => {
    if (visible) {
      navigateToStep(stepIndex);
    }
  }, [stepIndex, visible, navigateToStep]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      completeWalkthrough();
    }
  };

  const completeWalkthrough = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Swallow storage errors
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Skip button */}
        <TouchableOpacity style={styles.skipBtn} onPress={completeWalkthrough}>
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="close" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Spotlight / Feature Card */}
        <View style={styles.spotlightContainer}>
          {/* Glowing highlight ring */}
          <View style={styles.spotlightRing}>
            <View style={styles.spotlightIconCircle}>
              <Ionicons
                name={currentStep.icon}
                size={36}
                color={COLORS.accent}
              />
            </View>
          </View>

          {/* Tooltip Card */}
          <View style={styles.tooltipCard}>
            {/* Step Counter */}
            <View style={styles.stepCounterRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  Step {stepIndex + 1} of {STEPS.length}
                </Text>
              </View>
              <View style={styles.stepDots}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === stepIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </View>

            {/* Feature Title */}
            <Text style={styles.tooltipTitle}>{currentStep.title}</Text>

            {/* Tab indicator */}
            <View style={styles.tabIndicator}>
              <Ionicons name="navigate-outline" size={12} color={COLORS.accentBlue} />
              <Text style={styles.tabIndicatorText}>{currentStep.tab} Tab</Text>
            </View>

            {/* Explanation Text */}
            <Text style={styles.tooltipText}>{currentStep.text}</Text>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.nextBtn, isLastStep && styles.finishBtn]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextBtnText, isLastStep && styles.finishBtnText]}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons
                name={isLastStep ? 'checkmark' : 'arrow-forward'}
                size={18}
                color={isLastStep ? '#09090b' : '#09090b'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  spotlightContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  spotlightRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(228, 228, 231, 0.35)',
    backgroundColor: 'rgba(228, 228, 231, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -20,
    zIndex: 2,
    // Glow effect
    shadowColor: '#e4e4e7',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  spotlightIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 36,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  stepCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  stepBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
    letterSpacing: 0.3,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bgElevated,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 18,
    borderRadius: 3,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  tabIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.md,
  },
  tabIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accentBlue,
  },
  tooltipText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
  },
  finishBtn: {
    backgroundColor: COLORS.accentGreen,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090b',
  },
  finishBtnText: {
    color: '#09090b',
  },
});
