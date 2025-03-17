export class RoundTransition {
  private inTransition: boolean = false;
  private transitionTimer: NodeJS.Timeout | null = null;
  private readonly transitionDuration: number;
  private transitionStartTime: number = 0;

  constructor(transitionDuration: number = 3000) {
    this.transitionDuration = transitionDuration;
  }

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

  public cancelTransition(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.inTransition = false;
  }

  public isInTransition(): boolean {
    return this.inTransition;
  }

  public getRemainingTransitionTime(): number {
    if (!this.inTransition) return 0;
    
    const elapsed = Date.now() - this.transitionStartTime;
    return Math.max(0, this.transitionDuration - elapsed);
  }

  public cleanup(): void {
    this.cancelTransition();
  }
}