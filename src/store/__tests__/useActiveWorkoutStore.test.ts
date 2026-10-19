/**
 * Lifecycle of the ephemeral active-workout session record.
 *
 * The record exists only in memory: it identifies the live session so teardown
 * can prove the store is back to a freshly-installed state. Discarding must be
 * idempotent — calling it twice may never leave a session behind.
 */
import { useActiveWorkoutStore } from '../useActiveWorkoutStore';

const session = {
  logId: 'wl_session_1',
  date: '2026-10-19',
  day: 'Monday' as const,
  startedAt: 1_780_000_000_000,
};

describe('useActiveWorkoutStore', () => {
  beforeEach(() => {
    useActiveWorkoutStore.getState().resetActiveWorkoutSession();
  });

  it('starts empty', () => {
    useActiveWorkoutStore.setState({ session: null, epoch: 0 });

    expect(useActiveWorkoutStore.getState().session).toBeNull();
  });

  it('records the live session', () => {
    useActiveWorkoutStore.getState().beginActiveWorkoutSession(session);

    expect(useActiveWorkoutStore.getState().session).toEqual(session);
  });

  it('returns to the initial state on reset, even when called twice', () => {
    const before = useActiveWorkoutStore.getState().epoch;
    useActiveWorkoutStore.getState().beginActiveWorkoutSession(session);

    useActiveWorkoutStore.getState().resetActiveWorkoutSession();
    const afterFirstReset = useActiveWorkoutStore.getState();

    useActiveWorkoutStore.getState().resetActiveWorkoutSession();
    const afterSecondReset = useActiveWorkoutStore.getState();

    expect(afterFirstReset.session).toBeNull();
    expect(afterSecondReset.session).toBeNull();
    expect(afterFirstReset.epoch).toBeGreaterThan(before);
    expect(afterSecondReset.epoch).toBeGreaterThan(afterFirstReset.epoch);
  });
});
