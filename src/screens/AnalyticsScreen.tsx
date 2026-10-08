import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
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
import StreakHistoryModal from '../components/StreakHistoryModal';
import {
  aggregateProgressByRange,
  buildYAxisTicks,
  computeChartMaxValue,
  computeChartWidth,
  computePlotHeight,
  computePointSpacing,
  computeYAxisLaneHeight,
  CHART_EDGE_GUTTER,
  X_AXIS_LABELS_EXTRA_HEIGHT,
  X_AXIS_LABELS_VERTICAL_SHIFT,
  Y_AXIS_LANE_WIDTH,
  Y_AXIS_TICK_LINE_HEIGHT,
  AnalyticsMetric,
  AnalyticsRange,
  SessionProgressPoint,
} from '../utils/analyticsCalculations';

type ProgressPoint = SessionProgressPoint;

const SCREEN_WIDTH = Dimensions.get('window').width;
// Card inner width: screen - screen padding (lg*2) - card padding (md*2) - borders (2)
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2 - 2;
const FULLSCREEN_CHART_WIDTH = SCREEN_WIDTH - 40;

// Chart geometry. The plot pans horizontally once the series outgrows the
// viewport, so each session is always given CHART_POINT_WIDTH px of room and the
// y-axis is drawn in a frozen lane beside the scroll area.
const CARD_CHART_HEIGHT = 220;
const CARD_CHART_SECTIONS = 4;
const FULLSCREEN_CHART_HEIGHT = 300;
const FULLSCREEN_CHART_SECTIONS = 5;

// Filter pills, left to right
const RANGE_TABS: AnalyticsRange[] = ['week', 'session', 'month'];

/** Two-line x-axis label: primary window text over its apostrophe year. */
function StackedAxisLabel({ label, yearLabel }: { label: string; yearLabel: string }) {
  return (
    <View style={styles.axisLabelBox}>
      <Text style={styles.axisLabelPrimary} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.axisLabelSecondary} numberOfLines={1}>
        {yearLabel}
      </Text>
    </View>
  );
}

/** One plotted session, as handed to Gifted Charts. */
interface ChartDatum {
  value: number;
  label: string;
  labelComponent: () => ReactElement;
  color: string;
  dataPointText: string;
}

interface ProgressionChartProps {
  data: ChartDatum[];
  maxValue: number;
  height: number;
  noOfSections: number;
  /** Plot width: the chart width minus the frozen y-axis lane. */
  plotWidth: number;
  backgroundColor: string;
  axisFontSize: number;
  scrollTestID: string;
  scrollRef: RefObject<ScrollView | null>;
}

/**
 * Plotted progression series with a horizontally pannable plot and a frozen
 * y-axis lane: the lane sits outside the ScrollView, so the axis stays
 * readable while the sessions are panned, and the newest session is brought
 * into view as soon as the plot is laid out or its data changes.
 */
function ProgressionChartBase({
  data,
  maxValue,
  height,
  noOfSections,
  plotWidth,
  backgroundColor,
  axisFontSize,
  scrollTestID,
  scrollRef,
}: ProgressionChartProps) {
  const ticks = buildYAxisTicks(maxValue, noOfSections, height);

  return (
    <View style={styles.plotRow}>
      <View
        style={[styles.yAxisLane, { height: computeYAxisLaneHeight(height) }]}
        pointerEvents="none"
      >
        {/* The axis line stops at the baseline; the lane itself is taller so
            the bottom tick is not clipped. */}
        <View style={[styles.yAxisLine, { height: computePlotHeight(height) }]} />

        {ticks.map((tick) => (
          <Text
            key={tick.centerY}
            style={[
              styles.yAxisTick,
              {
                fontSize: axisFontSize,
                top: tick.centerY - Y_AXIS_TICK_LINE_HEIGHT / 2,
              },
            ]}
          >
            {tick.label}
          </Text>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        testID={scrollTestID}
        style={styles.chartScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        overScrollMode="never"
        // Re-anchor on the newest session whenever the plot is (re)laid out
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <LineChart
          data={data}
          width={plotWidth}
          height={height}
          // Spread the points across the full (pannable) plot, keeping both end
          // labels inside the frame
          spacing={computePointSpacing(plotWidth, data.length)}
          initialSpacing={CHART_EDGE_GUTTER}
          endSpacing={CHART_EDGE_GUTTER}
          disableScroll
          color={COLORS.accentBlue}
          thickness={3}
          curved={false}
          backgroundColor={backgroundColor}
          noOfSections={noOfSections}
          rulesColor={COLORS.border}
          rulesType="dashed"
          dashWidth={4}
          dashGap={4}
          xAxisColor={COLORS.border}
          yAxisColor={COLORS.border}
          xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
          // Y-axis text is drawn by the frozen lane instead
          hideYAxisText
          yAxisLabelWidth={0}
          // Reserve room for the two-line stacked date labels, and keep them
          // clear of the baseline so they cannot collide with the "0" tick
          xAxisTextNumberOfLines={2}
          xAxisLabelsHeight={40}
          xAxisLabelsVerticalShift={X_AXIS_LABELS_VERTICAL_SHIFT}
          labelsExtraHeight={X_AXIS_LABELS_EXTRA_HEIGHT}
          maxValue={maxValue}
          overflowTop={30}
          hideDataPoints={false}
          dataPointsRadius={5}
          dataPointsColor={COLORS.accent}
          dataPointsShape="circle"
          showValuesAsDataPointsText
          textColor={COLORS.textSecondary}
          textFontSize={10}
          textShiftY={-10}
        />
      </ScrollView>
    </View>
  );
}

/**
 * Memoized: the pan/zoom geometry only changes when the plotted window does, so
 * toggling a metric, opening the modal or any unrelated re-render can never
 * re-render the chart (and with it every gifted-charts point) on the JS thread.
 */
const ProgressionChart = memo(ProgressionChartBase);

export default function AnalyticsScreen() {
  const weightUnit = useWeightUnit();
  const [trackedExercises, setTrackedExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [timeRange, setTimeRange] = useState<AnalyticsRange>('session');
  const [metric, setMetric] = useState<AnalyticsMetric>('maxWeight');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streakHistoryVisible, setStreakHistoryVisible] = useState(false);
  const [bestSet, setBestSet] = useState<{ weight: number; reps: number; e1rm: number } | null>(null);
  const [volumeTrend, setVolumeTrend] = useState({ recentVolume: 0, priorVolume: 0 });
  const [complianceStats, setComplianceStats] = useState({
    totalDays: 30,
    scheduledDays: 0,
    completedDays: 0,
    streak: 0,
  });

  // Horizontal pan state: one ref per chart instance (card + maximized modal)
  const cardScrollRef = useRef<ScrollView | null>(null);
  const fullscreenScrollRef = useRef<ScrollView | null>(null);

  // Stable handlers for the exercise chips (a real list) and the metric toggles
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
  }, []);
  const handleSelectMetric = useCallback((next: AnalyticsMetric) => {
    setMetric(next);
  }, []);
  const handleSelectTimeRange = useCallback((next: AnalyticsRange) => {
    setTimeRange(next);
  }, []);
  const handleOpenStreakHistory = useCallback(() => setStreakHistoryVisible(true), []);
  const handleCloseStreakHistory = useCallback(() => setStreakHistoryVisible(false), []);
  const handleOpenFullscreen = useCallback(() => setIsFullscreen(true), []);
  const handleCloseFullscreen = useCallback(() => setIsFullscreen(false), []);

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
  }, [selectedExercise]);

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
        // Raw per-session rows are stored verbatim; the selected filter pill
        // aggregates them into chart buckets at render time.
        setProgressData(rawData);
      } else {
        setProgressData([]);
        setBestSet(null);
        setVolumeTrend({ recentVolume: 0, priorVolume: 0 });
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const complianceRate = useMemo(
    () =>
      complianceStats.scheduledDays > 0
        ? Math.round((complianceStats.completedDays / complianceStats.scheduledDays) * 100)
        : 0,
    [complianceStats]
  );

  // 4-week volume trend percentage (+, -, or 0 when no prior baseline)
  const trendPct = useMemo(() => {
    if (volumeTrend.priorVolume > 0) {
      return Math.round(
        ((volumeTrend.recentVolume - volumeTrend.priorVolume) / volumeTrend.priorVolume) * 100
      );
    }
    return volumeTrend.recentVolume > 0 ? 100 : 0;
  }, [volumeTrend]);

  // Aggregate the raw sessions into chart buckets for the selected filter pill
  // (SESSION = one point per log, WEEK = Monday-Sunday peak, MONTH = monthly peak).
  // Memoized: this walks every logged session of the exercise, so it must not
  // run again just because some unrelated state (modal, scroll ref) changed.
  const buckets = useMemo(
    () => aggregateProgressByRange(progressData, timeRange, metric),
    [metric, progressData, timeRange]
  );

  // Prepare data for Gifted Charts (values converted to the active unit so
  // the y-axis, grid labels, and data point text all reflect it)
  const chartData: ChartDatum[] = useMemo(
    () =>
      buckets.map((bucket) => {
        const value = roundWeight(convertWeight(bucket.value, weightUnit));
        return {
          value,
          // Kept as the measured label width source; the rendered label is the
          // two-line component below.
          label: bucket.label,
          labelComponent: () => (
            <StackedAxisLabel label={bucket.label} yearLabel={bucket.yearLabel} />
          ),
          color: COLORS.accent,
          dataPointText: metric === 'maxWeight' ? `${value}${weightUnit}` : `${value}`,
        };
      }),
    [buckets, metric, weightUnit]
  );

  // 30% headroom above the tallest point so floating value labels never clip
  const chartMaxValue = useMemo(
    () => computeChartMaxValue(chartData.map((d) => d.value)),
    [chartData]
  );

  // Chart width grows with the session count; the frozen y-axis lane is carved
  // out of it so the plot itself gets the remainder (never < the viewport).
  const cardPlotWidth = useMemo(
    () => computeChartWidth(CHART_WIDTH, chartData.length) - Y_AXIS_LANE_WIDTH,
    [chartData.length]
  );
  const fullscreenPlotWidth = useMemo(
    () => computeChartWidth(FULLSCREEN_CHART_WIDTH, chartData.length) - Y_AXIS_LANE_WIDTH,
    [chartData.length]
  );

  // Auto-scroll to the end whenever the plotted window changes (first load, new
  // filter, opened/closed modal) so the latest session is immediately visible;
  // the user can then pan left through the older sessions.
  useEffect(() => {
    cardScrollRef.current?.scrollToEnd({ animated: false });
    fullscreenScrollRef.current?.scrollToEnd({ animated: false });
  }, [chartData.length, timeRange, metric, isFullscreen]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        // The content fits on most screens: no rubber-band bounce into blank space
        bounces={false}
        overScrollMode="never"
      >
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
            <TouchableOpacity
              style={styles.metricBlock}
              onPress={handleOpenStreakHistory}
              activeOpacity={0.7}
              accessibilityLabel="View top streaks"
              accessibilityRole="button"
            >
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{complianceStats.streak}</Text>
                <Ionicons name="flame" size={16} color={COLORS.accentAmber} />
              </View>
              <Text style={styles.metricLabel}>Current Streak</Text>
            </TouchableOpacity>
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
                  onPress={() => handleSelectExercise(ex)}
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
            {/* Flexible title column: long exercise names wrap to a 2nd line
                instead of crowding the metric toggle */}
            <View style={styles.chartTitleWrap}>
              <Text style={styles.selectedExTitle} numberOfLines={2} ellipsizeMode="tail">
                {selectedExercise?.name || 'Select Exercise'}
              </Text>
            </View>

            {/* Metric Toggle — pinned top right, never shrinks */}
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, metric === 'maxWeight' && styles.toggleBtnActive]}
                onPress={() => handleSelectMetric('maxWeight')}
              >
                <Text style={[styles.toggleText, metric === 'maxWeight' && styles.toggleTextActive]}>
                  Max Weight
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, metric === 'totalVolume' && styles.toggleBtnActive]}
                onPress={() => handleSelectMetric('totalVolume')}
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
              <ProgressionChart
                data={chartData}
                maxValue={chartMaxValue}
                height={CARD_CHART_HEIGHT}
                noOfSections={CARD_CHART_SECTIONS}
                plotWidth={cardPlotWidth}
                backgroundColor={COLORS.bgCard}
                axisFontSize={10}
                scrollTestID="card-chart-scroll"
                scrollRef={cardScrollRef}
              />
            </View>
          )}

          {/* Time range selector + Maximize toggle */}
          <View style={styles.chartFooter}>
            <View style={styles.timeRangeRow}>
              {RANGE_TABS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeTab, timeRange === r && styles.rangeTabActive]}
                  onPress={() => handleSelectTimeRange(r)}
                >
                  <Text style={[styles.rangeText, timeRange === r && styles.rangeTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.maximizeBtn}
              onPress={handleOpenFullscreen}
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
        onRequestClose={handleCloseFullscreen}
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
              <ProgressionChart
                data={chartData}
                maxValue={chartMaxValue}
                height={FULLSCREEN_CHART_HEIGHT}
                noOfSections={FULLSCREEN_CHART_SECTIONS}
                plotWidth={fullscreenPlotWidth}
                backgroundColor={COLORS.bgPrimary}
                axisFontSize={11}
                scrollTestID="fullscreen-chart-scroll"
                scrollRef={fullscreenScrollRef}
              />
            </View>
          )}

          <View style={styles.fullscreenFooter}>
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={handleCloseFullscreen}
              accessibilityLabel="Minimize chart"
            >
              <Ionicons name="contract-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.minimizeText}>Minimize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Streak history sheet: top 5 streaks of all time */}
      <StreakHistoryModal
        visible={streakHistoryVisible}
        onClose={handleCloseStreakHistory}
      />
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
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  chartTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  selectedExTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexWrap: 'wrap',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    padding: 2,
    flexShrink: 0,
    alignSelf: 'flex-start',
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
    marginVertical: SPACING.sm,
    // Room for the pushed-down date labels, so the card can never clip them
    paddingBottom: 6,
  },
  plotRow: {
    flexDirection: 'row',
  },
  yAxisLane: {
    width: Y_AXIS_LANE_WIDTH,
    overflow: 'hidden',
  },
  yAxisLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 1,
    backgroundColor: COLORS.border,
  },
  yAxisTick: {
    position: 'absolute',
    right: 6,
    height: Y_AXIS_TICK_LINE_HEIGHT,
    lineHeight: Y_AXIS_TICK_LINE_HEIGHT,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  chartScroll: {
    flex: 1,
  },
  axisLabelBox: {
    width: '100%',
    alignItems: 'center',
  },
  axisLabelPrimary: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  axisLabelSecondary: {
    fontSize: 9,
    lineHeight: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
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
    // Clears the system status bar: the modal draws edge-to-edge, so the
    // exercise title and insight cards need their own top inset
    paddingTop: 56,
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
    // Extra bottom margin keeps the button clear of Android's 3-button
    // navigation bar (the modal draws underneath it)
    marginBottom: 32,
  },
  minimizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});