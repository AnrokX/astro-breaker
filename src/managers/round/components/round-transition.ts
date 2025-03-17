/**
 * Manages transitions between game rounds.
 * 
 * Responsibilities:
 * - Tracking transition state (whether a transition is in progress)
 * - Managing transition duration and timing
 * - Handling callbacks when transitions complete
 * - Providing methods to control transitions (start, cancel)
 */
export class RoundTransition {
  /** Whether a transition is currently in progress */
  private inTransition: boolean = false;
  
  /** Timer for the current transition */
  private transitionTimer: NodeJS.Timeout | null = null;
  
  /** Duration of transitions in milliseconds */
  private readonly transitionDuration: number;
  
  /** Timestamp when the current transition started */
  private transitionStartTime: number = 0;

  /**
   * Creates a new RoundTransition component.
   * 
   * @param transitionDuration Duration of transitions in milliseconds (default: 3000ms)
   */
  constructor(transitionDuration: number = 3000) {
    this.transitionDuration = transitionDuration;
  }

  /**
   * Starts a transition period with a callback to execute when complete.
   * If a transition is already in progress, the new one will be ignored.
   *
   * @param callback Function to call when the transition completes
   */
  public startTransition(callback: () => void): void {
    // Don't start if already in transition
    if (this.inTransition) return;

    // Clear any existing timer
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Set transition state and start time
    this.inTransition = true;
    this.transitionStartTime = Date.now();

    // Schedule callback at end of transition
    this.transitionTimer = setTimeout(() => {
      this.inTransition = false;
      this.transitionTimer = null;
      callback();
    }, this.transitionDuration);
  }

  /**
   * Cancels the current transition if one is in progress.
   * This will prevent the transition's callback from being called.
   */
  public cancelTransition(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.inTransition = false;
  }

  /**
   * Checks if a transition is currently in progress.
   * 
   * @returns True if a transition is in progress, false otherwise
   */
  public isInTransition(): boolean {
    return this.inTransition;
  }

  /**
   * Gets the remaining time in milliseconds for the current transition.
   * 
   * @returns Time in milliseconds remaining in the transition, or 0 if no transition is active
   */
  public getRemainingTransitionTime(): number {
    if (!this.inTransition) return 0;
    
    const elapsed = Date.now() - this.transitionStartTime;
    return Math.max(0, this.transitionDuration - elapsed);
  }

  /**
   * Cleans up any resources used by this component.
   * This should be called when the component is no longer needed.
   */
  public cleanup(): void {
    this.cancelTransition();
  }
}