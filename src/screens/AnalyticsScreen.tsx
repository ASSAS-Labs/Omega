import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { Exercise } from '../types';
import * as db from '../services/database';
import { LineChart } from 'react-native-gifted-charts';
import { convertWeight, formatWeight, roundWeight } from '../services/weightUnitPrefs';
import { useWeightUnit } from '../hooks/useWeightUnit';

interface ProgressPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
// Card inner width: screen - screen padding (lg*2) - card padding (md*2) - borders (2)
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2 - 2;
const FULLSCREEN_CHART_WIDTH = SCREEN_WIDTH - 40;

export default function AnalyticsScreen() {
  const weightUnit = useWeightUnit();
  const [trackedExercises, setTrackedExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'session' | 'week' | 'month'>('week');
  const [metric, setMetric] = useState<'maxWeight' | 'totalVolume'>('maxWeight');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bestSet, setBestSet] = useState<{ weight: number; reps: number; e1rm: number } | null>(null);
  const [volumeTrend, setVolumeTrend] = useState({ recentVolume: 0, priorVolume: 0 });
  const [complianceStats, setComplianceStats] = useState({
    totalDays: 30,
    scheduledDays: 0,
    completedDays: 0,
    streak: 0,
  });

  // Refresh the tracked exercise list whenever the tab regains focus
  // (e.g., after a new workout session or routine change)
  useFocusEffect(
    useCallback(() => {
      db.getTrackedExercises()
        .then((list) => {
          setTrackedExercises(list);
          setSelectedExercise((prev) => {
            if (prev && list.some((ex) => ex.id === prev.id)) return prev;
            return list.length > 0 ? list[0] : null;
          });
        })
        .catch((err) => console.error('Error loading tracked exercises:', err));
    }, [])
  );

  useEffect(() => {
    loadAnalytics();
  }, [selectedExercise, timeRange]);

  const loadAnalytics = async () => {
    try {
      const stats = await db.getComplianceStats(30);
      setComplianceStats(stats);

      if (selectedExercise) {
        const [rawData, best, trend] = await Promise.all([
          db.getExerciseProgress(selectedExercise.id),
          db.getExerciseBestSet(selectedExercise.id),
          db.getExerciseVolumeTrend(selectedExercise.id),
        ]);
        setBestSet(best);
        setVolumeTrend(trend);

        // Filter or group based on time range if needed
        let filtered = rawData;
        if (timeRange === 'week') {
          filtered = rawData.slice(-7);
        } else if (timeRange === 'month') {
          filtered = rawData.slice(-30);
        }
        setProgressData(filtered);
      } else {
        setProgressData([]);
        setBestSet(null);
        setVolumeTrend({ recentVolume: 0, priorVolume: 0 });
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const complianceRate =
    complianceStats.scheduledDays > 0
      ? Math.round((complianceStats.completedDays / complianceStats.scheduledDays) * 100)
      : 0;

  // 4-week volume trend percentage (+, -, or 0 when no prior baseline)
  const trendPct =
    volumeTrend.priorVolume > 0
      ? Math.round(((volumeTrend.recentVolume - volumeTrend.priorVolume) / volumeTrend.priorVolume) * 100)
      : volumeTrend.recentVolume > 0
      ? 100
      : 0;

  // Prepare data for Gifted Charts (values converted to the active unit so
  // the y-axis, grid labels, and data point text all reflect it)
  const chartData = progressData.map((d, idx) => {
    const rawValue = metric === 'maxWeight' ? d.maxWeight : d.totalVolume;
    const value = roundWeight(convertWeight(rawValue, weightUnit));
    return {
      value,
      label: d.date,
      color: COLORS.accent,
      dataPointText: metric === 'maxWeight' ? `${value}${weightUnit}` : `${value}`,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Consistency / Split Adherence Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Split Compliance (30 Days)</Text>
          <View style={styles.complianceRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{complianceRate}%</Text>
              <Text style={styles.metricLabel}>Adherence Rate</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{complianceStats.completedDays}</Text>
              <Text style={styles.metricLabel}>Sessions Completed</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{complianceStats.streak}</Text>
              <Text style={styles.metricLabel}>Current Streak</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${complianceRate}%` }]} />
          </View>
        </View>

        {/* Exercise Selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercise Progression</Text>
        </View>

        {trackedExercises.length === 0 ? (
          <View style={styles.noTrackedBox}>
            <Ionicons name="stats-chart-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.noTrackedText}>
              No tracked exercises yet. Log a workout session to start seeing progress charts here.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exPickerScroll}
          >
            {trackedExercises.map((ex) => {
              const isSelected = selectedExercise?.id === ex.id;
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exChip, isSelected && styles.exChipSelected]}
                  onPress={() => setSelectedExercise(ex)}
                >
                  <Text style={[styles.exChipText, isSelected && styles.exChipTextSelected]}>
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Graph Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.selectedExTitle}>
              {selectedExercise?.name || 'Select Exercise'}
            </Text>

            {/* Metric Toggle */}
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, metric === 'maxWeight' && styles.toggleBtnActive]}
                onPress={() => setMetric('maxWeight')}
              >
                <Text style={[styles.toggleText, metric === 'maxWeight' && styles.toggleTextActive]}>
                  Max Weight
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, metric === 'totalVolume' && styles.toggleBtnActive]}
                onPress={() => setMetric('totalVolume')}
              >
                <Text style={[styles.toggleText, metric === 'totalVolume' && styles.toggleTextActive]}>
                  Volume
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Line Chart using Gifted Charts */}
          {progressData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="stats-chart-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyChartText}>No workout logs for this exercise yet</Text>
            </View>
          ) : (
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={CHART_WIDTH}
                height={220}
                spacing={Math.min(
                  70,
                  Math.max(35, (CHART_WIDTH - 40) / Math.max(chartData.length, 1))
                )}
                disableScroll
                color={COLORS.accentBlue}
                thickness={3}
                curved={false}
                backgroundColor={COLORS.bgCard}
                noOfSections={4}
                rulesColor={COLORS.border}
                rulesType="dashed"
                dashWidth={4}
                dashGap={4}
                xAxisColor={COLORS.border}
                yAxisColor={COLORS.border}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                hideDataPoints={false}
                dataPointsRadius={5}
                dataPointsColor={COLORS.accent}
                dataPointsShape="circle"
                showValuesAsDataPointsText
                textColor={COLORS.textSecondary}
                textFontSize={10}
                textShiftY={-10}
              />
            </View>
          )}

          {/* Time range selector + Maximize toggle */}
          <View style={styles.chartFooter}>
            <View style={styles.timeRangeRow}>
              {(['session', 'week', 'month'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeTab, timeRange === r && styles.rangeTabActive]}
                  onPress={() => setTimeRange(r)}
                >
                  <Text style={[styles.rangeText, timeRange === r && styles.rangeTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.maximizeBtn}
              onPress={() => setIsFullscreen(true)}
              accessibilityLabel="Maximize chart"
            >
              <Ionicons name="expand-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Chart Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <View style={styles.fullscreenHeaderText}>
              <Text style={styles.fullscreenTitle} numberOfLines={1}>
                {selectedExercise?.name || 'Exercise Progress'}
              </Text>
              <Text style={styles.fullscreenSubtitle}>
                {metric === 'maxWeight'
                  ? `Max Weight (${weightUnit.toUpperCase()})`
                  : 'Total Volume'}{' '}
                · {timeRange.toUpperCase()} VIEW
              </Text>
            </View>
          </View>

          {/* All-Time Peak insight card */}
          <View style={styles.insightRow}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>BEST PERFORMANCE</Text>
              <Text style={styles.insightValue}>
                {bestSet ? formatWeight(bestSet.weight, weightUnit) : '—'}
              </Text>
              <Text style={styles.insightSub}>
                {bestSet
                  ? `Est. 1RM: ${formatWeight(bestSet.e1rm, weightUnit)} (${bestSet.reps} reps)`
                  : 'No logged sets yet'}
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>4-WEEK TREND</Text>
              <Text
                style={[
                  styles.insightValue,
                  trendPct > 0 ? styles.insightPositive : trendPct < 0 ? styles.insightNegative : null,
                ]}
              >
                {trendPct === 0 ? '—' : `${trendPct > 0 ? '+' : ''}${trendPct}%`}
              </Text>
              <Text style={styles.insightSub}>
                Volume: {roundWeight(convertWeight(volumeTrend.recentVolume, weightUnit))} vs{' '}
                {roundWeight(convertWeight(volumeTrend.priorVolume, weightUnit))} {weightUnit}
              </Text>
            </View>
          </View>

          {progressData.length === 0 ? (
            <View style={styles.emptyChartFull}>
              <Ionicons name="stats-chart-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyChartText}>No workout logs for this exercise yet</Text>
            </View>
          ) : (
            <View style={styles.fullscreenChartWrap}>
              <LineChart
                data={chartData}
                width={FULLSCREEN_CHART_WIDTH}
                height={300}
                spacing={Math.min(
                  100,
                  Math.max(50, (FULLSCREEN_CHART_WIDTH - 60) / Math.max(chartData.length, 1))
                )}
                disableScroll
                color={COLORS.accentBlue}
                thickness={3}
                curved={false}
                backgroundColor={COLORS.bgPrimary}
                noOfSections={5}
                rulesColor={COLORS.border}
                rulesType="dashed"
                dashWidth={4}
                dashGap={4}
                xAxisColor={COLORS.border}
                yAxisColor={COLORS.border}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 11 }}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 11 }}
                hideDataPoints={false}
                dataPointsRadius={5}
                dataPointsColor={COLORS.accent}
                dataPointsShape="circle"
                showValuesAsDataPointsText
                textColor={COLORS.textSecondary}
                textFontSize={10}
                textShiftY={-10}
              />
            </View>
          )}

          <View style={styles.fullscreenFooter}>
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={() => setIsFullscreen(false)}
              accessibilityLabel="Minimize chart"
            >
              <Ionicons name="contract-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.minimizeText}>Minimize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 40,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  metricBlock: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accentGreen,
    borderRadius: 3,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  exPickerScroll: {
    marginBottom: 20,
  },
  noTrackedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: 20,
  },
  noTrackedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  exChip: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  exChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  exChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  exChipTextSelected: {
    color: COLORS.bgPrimary,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  selectedExTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.bgElevated,
  },
  toggleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: COLORS.textPrimary,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
  },
  emptyChart: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: SPACING.sm,
  },
  timeRangeRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  maximizeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 8,
  },
  rangeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  rangeTabActive: {
    backgroundColor: COLORS.bgElevated,
  },
  rangeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: COLORS.accentBlue,
    fontWeight: '700',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    paddingTop: 16,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  fullscreenHeaderText: {
    flex: 1,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fullscreenSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  insightPositive: {
    color: COLORS.accentGreen,
  },
  insightNegative: {
    color: COLORS.accentRed,
  },
  insightSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fullscreenChartWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyChartFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullscreenFooter: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 48,
  },
  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  minimizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});