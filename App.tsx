import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './src/theme/colors';
import { useAppStore } from './src/store/useAppStore';
import DashboardScreen from './src/screens/DashboardScreen';
import ActiveWorkoutScreen from './src/screens/ActiveWorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SplitSetupScreen from './src/screens/SplitSetupScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WorkoutDaysScreen from './src/screens/WorkoutDaysScreen';
import { initNotifee } from './src/services/notifeeTimerService';
import {
  hasStoredWeightUnit,
  loadWeightUnit,
  saveWeightUnit,
  WeightUnit,
} from './src/services/weightUnitPrefs';
import WeightUnitPromptModal from './src/components/WeightUnitPromptModal';
import {
  DayOfWeek,
  RootStackParamList,
  RootTabParamList,
  WorkoutStackParamList,
} from './src/types';
import WalkthroughOverlay from './src/components/WalkthroughOverlay';

const Tab = createBottomTabNavigator<RootTabParamList>();
const WorkoutStack = createStackNavigator<WorkoutStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Minimalist dark theme applied to the whole navigation tree
const AppTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.accent,
    background: COLORS.bgPrimary,
    card: COLORS.bgSecondary,
    text: COLORS.textPrimary,
    border: COLORS.borderSubtle,
    notification: COLORS.accentBlue,
  },
};

// ---------------- Workout Tab (Stack: Days Overview -> Active Workout) ----------------

function WorkoutStackNavigator() {
  return (
    <WorkoutStack.Navigator
      initialRouteName="WorkoutDays"
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: COLORS.bgPrimary },
      }}
    >
      <WorkoutStack.Screen
        name="WorkoutDays"
        component={WorkoutDaysScreen}
        options={{ title: 'Select Day' }}
      />
      <WorkoutStack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={({ route }) => ({
          title: route.params?.dayName || 'Workout',
        })}
      />
    </WorkoutStack.Navigator>
  );
}

// ---------------- Dashboard Tab ----------------

function DashboardTab({ navigation }: BottomTabScreenProps<RootTabParamList, 'Dashboard'>) {
  return (
    <DashboardScreen
      onStartWorkout={(dateStr: string, dayOfWeek: DayOfWeek) => {
        // Resolve the day's routine name for the workout screen title
        const state = useAppStore.getState();
        const mgIds = state.weeklySplit[dayOfWeek] || [];
        const dayName =
          state.muscleGroups
            .filter((mg) => mgIds.includes(mg.id))
            .map((mg) => mg.name)
            .join(' & ') || undefined;

        // Nested navigation: switch to the Workout tab and push ActiveWorkout
        // in live logging mode (weight/reps entry from the Dashboard)
        navigation.navigate('Workout', {
          screen: 'ActiveWorkout',
          params: { date: dateStr, day: dayOfWeek, dayName, mode: 'logging' },
        });
      }}
      onResumeWorkout={(dateStr: string, dayOfWeek: DayOfWeek) => {
        // Resume an unfinalized draft with its exact state
        navigation.navigate('Workout', {
          screen: 'ActiveWorkout',
          params: { date: dateStr, day: dayOfWeek, mode: 'logging', resume: '1' },
        });
      }}
      onNavigateSplitSetup={() => {
        // Push the Split Configuration screen on the root stack (from Settings hub)
        navigation
          .getParent<NativeStackNavigationProp<RootStackParamList>>()
          ?.navigate('SplitSetup');
      }}
    />
  );
}

// ---------------- Root Tab Navigator ----------------

function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bgSecondary,
          borderTopColor: COLORS.borderSubtle,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardTab}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutStackNavigator}
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'barbell' : 'barbell-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'list-circle' : 'list-circle-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------- Root Stack (Tabs + pushed screens) ----------------

function RootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bgPrimary },
      }}
    >
      <RootStack.Screen name="Tabs" component={AppNavigator} options={{ headerShown: false }} />
      <RootStack.Screen
        name="SplitSetup"
        component={SplitSetupScreen}
        options={{ title: 'Routine Split' }}
      />
    </RootStack.Navigator>
  );
}

export default function App() {
  const { initStore, isLoading } = useAppStore();
  const [unitPromptVisible, setUnitPromptVisible] = useState(false);

  // Initialize the local SQLite database on startup. Wrapped in a guarded
  // lifecycle check so the native work never runs after the component has
  // unmounted (which can happen on Fast Refresh / reload and invokes native
  // modules before the React context is attached).
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (isMounted) {
          await initStore();
        }
      } catch (err) {
        console.warn('Failed to initialize store:', err);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize the notifee rest-timer permission and notification channel
  // on every full app mount (independent of store loading). All notifee calls
  // live inside this effect (and inside functions it calls) — never at module
  // scope — so the native bridge is only touched while the JS context is
  // attached. The isMounted guard prevents any post-unmount re-run during a
  // Fast Refresh callback.
  useEffect(() => {
    let isMounted = true;
    const initChannel = async () => {
      try {
        if (isMounted) {
          await initNotifee();
        }
      } catch (err) {
        console.warn('Failed to initialize notification channel:', err);
      }
    };
    initChannel();
    return () => {
      isMounted = false;
    };
  }, []);

  // First-launch onboarding: if the user has never chosen a weight unit,
  // ask them to pick KG or LBS before they start logging.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      await loadWeightUnit();
      const stored = await hasStoredWeightUnit();
      if (!stored && isMounted) setUnitPromptVisible(true);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectWeightUnit = (unit: WeightUnit) => {
    saveWeightUnit(unit);
    setUnitPromptVisible(false);
  };

  const handleWalkthroughNavigate = useCallback(
    (tab: 'Dashboard' | 'Settings' | 'Exercises') => {
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('Tabs', {
          screen: tab,
        });
      }
    },
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>OMEGA GYM</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer theme={AppTheme} ref={navigationRef}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
      <WeightUnitPromptModal
        visible={unitPromptVisible}
        onSelect={handleSelectWeightUnit}
      />
      <WalkthroughOverlay onNavigateTab={handleWalkthroughNavigate} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
});
