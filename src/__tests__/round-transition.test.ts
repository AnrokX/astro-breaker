import { RoundTransition } from '../managers/round/components/round-transition';

// Set up Jest timer mocks
jest.useFakeTimers();

describe('RoundTransition', () => {
  let transition: RoundTransition;
  const defaultDuration = 3000;

  beforeEach(() => {
    transition = new RoundTransition(defaultDuration);
  });

  test('should initialize with default state', () => {
    expect(transition.isInTransition()).toBe(false);
    expect(transition.getRemainingTransitionTime()).toBe(0);
  });

  test('should start a transition', () => {
    // Set up a mock callback
    const callback = jest.fn();

    // Start the transition
    transition.startTransition(callback);

    // Verify transition started
    expect(transition.isInTransition()).toBe(true);
    expect(transition.getRemainingTransitionTime()).toBeGreaterThan(0);
    expect(callback).not.toHaveBeenCalled();

    // Advance halfway through transition
    jest.advanceTimersByTime(defaultDuration / 2);
    expect(transition.isInTransition()).toBe(true);
    expect(transition.getRemainingTransitionTime()).toBeLessThan(defaultDuration);
    expect(transition.getRemainingTransitionTime()).toBeGreaterThan(0);
    expect(callback).not.toHaveBeenCalled();

    // Complete the transition
    jest.advanceTimersByTime(defaultDuration / 2);
    expect(transition.isInTransition()).toBe(false);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('should cancel an active transition', () => {
    // Set up a mock callback
    const callback = jest.fn();

    // Start the transition
    transition.startTransition(callback);
    expect(transition.isInTransition()).toBe(true);

    // Cancel the transition
    transition.cancelTransition();
    expect(transition.isInTransition()).toBe(false);

    // Verify callback was not called even after transition would have completed
    jest.advanceTimersByTime(defaultDuration);
    expect(callback).not.toHaveBeenCalled();
  });

  test('should not allow starting multiple transitions simultaneously', () => {
    // Set up mock callbacks
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    // Start first transition
    transition.startTransition(callback1);
    expect(transition.isInTransition()).toBe(true);

    // Try to start second transition
    transition.startTransition(callback2);

    // Complete the transition
    jest.advanceTimersByTime(defaultDuration);

    // Verify only first callback was called
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();
  });

  test('should provide accurate remaining time', () => {
    // Start a transition
    transition.startTransition(jest.fn());

    // Mock the current time to simulate elapsed time since transition start
    const now = Date.now();
    Date.now = jest.fn().mockReturnValue(now + 1000);

    // Check remaining time (~2000ms)
    const remaining = transition.getRemainingTransitionTime();
    expect(remaining).toBeGreaterThanOrEqual(1900);
    expect(remaining).toBeLessThanOrEqual(2100);

    // Advance to end
    Date.now = jest.fn().mockReturnValue(now + 3100);
    expect(transition.getRemainingTransitionTime()).toBe(0);
  });

  test('cleanup should cancel any active transition', () => {
    // Start a transition
    const callback = jest.fn();
    transition.startTransition(callback);
    expect(transition.isInTransition()).toBe(true);

    // Call cleanup
    transition.cleanup();
    expect(transition.isInTransition()).toBe(false);

    // Verify callback was not called
    jest.advanceTimersByTime(defaultDuration);
    expect(callback).not.toHaveBeenCalled();
  });
});