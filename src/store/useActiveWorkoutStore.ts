import { create } from 'zustand';
import { DayOfWeek } from '../types';

/**
 * Bookkeeping for the one ephemeral workout session that may be running.
 *
 * This is deliberately in-memory only: the crash-recovery payload lives in
 * `workoutDraftService`, while this store answers "is a session live right
 * now?" for teardown. Discarding a session or finalizing it must leave this
 * store in exactly its initial state (`session: null`), so the next session
 * starts from a blank slate instead of inheriting a previous session's identity
 * or timing.
 */
export interface ActiveWorkoutSession {
  /** Session token / primary key allocated for idempotent saves. */
  logId: string;
  date: string;
  day: DayOfWeek;
  startedAt: number;
}

interface ActiveWorkoutState {
  /** The live session, or `null` when no workout is in progress. */
  session: ActiveWorkoutSession | null;
  /**
   * Bumped on every session start and teardown. Async work that captured an
   * epoch can tell that the session it belongs to is over.
   */
  epoch: number;
  beginActiveWorkoutSession: (session: ActiveWorkoutSession) => void;
  /**
   * Returns the store to its freshly-installed state. Idempotent: calling it
   * when no session is live is a no-op apart from the epoch bump.
   */
  resetActiveWorkoutSession: () => void;
}

const INITIAL_STATE = {
  session: null,
  epoch: 0,
} as const;

export const useActiveWorkoutStore = create<ActiveWorkoutState>((set) => ({
  ...INITIAL_STATE,

  beginActiveWorkoutSession: (session) =>
    set((state) => ({ session, epoch: state.epoch + 1 })),

  resetActiveWorkoutSession: () =>
    set((state) => ({ session: null, epoch: state.epoch + 1 })),
}));
