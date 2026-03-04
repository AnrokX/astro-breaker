import { World } from 'hytopia';

export class PlayerTracker {
  private waitingForPlayers: boolean = false;
  private readonly requiredPlayers: number;
  private checkPlayersInterval: NodeJS.Timeout | null = null;
  private hasShownModeSelection: boolean = false;
  private previousPlayerCount: number = 0;
  private onAutoSoloStart?: () => void;

  constructor(
    private world: World,
    requiredPlayers: number = 2,
    private isSoloMode: boolean = false
  ) {
    this.requiredPlayers = requiredPlayers;
  }
  
  public isSolo(): boolean {
    return this.isSoloMode;
  }

  public startWaitingForPlayers(onEnoughPlayers: () => void): void {
    // If already waiting, don't restart
    if (this.waitingForPlayers) return;
    
    this.waitingForPlayers = true;
    
    // Clear any existing interval
    if (this.checkPlayersInterval) {
      clearInterval(this.checkPlayersInterval);
      this.checkPlayersInterval = null;
    }
    
    // Set up player checking interval
    this.checkPlayersInterval = setInterval(() => {
      // Check for first player joining to show mode selection
      this.checkForFirstPlayer();
      
      if (this.hasEnoughPlayers()) {
        this.waitingForPlayers = false;
        
        // Clear the interval
        if (this.checkPlayersInterval) {
          clearInterval(this.checkPlayersInterval);
          this.checkPlayersInterval = null;
        }
        
        // Call the callback if we've reached enough players
        onEnoughPlayers();
      }
    }, 1000);
  }

  // Auto-start solo mode when first player joins
  private checkForFirstPlayer(): void {
    const currentPlayerCount = this.getPlayerCount();

    // If this is the first player joining, auto-start solo mode
    if (currentPlayerCount === 1 && this.previousPlayerCount === 0 && !this.hasShownModeSelection) {
      const player = this.world.entityManager.getAllPlayerEntities()[0]?.player;
      if (player) {
        // Lock pointer immediately for gameplay
        player.ui.lockPointer(true);

        this.hasShownModeSelection = true;

        // Notify round manager to handle solo auto-start
        if (this.onAutoSoloStart) {
          this.onAutoSoloStart();
        }
      }
    }

    this.previousPlayerCount = currentPlayerCount;
  }

  public setAutoSoloCallback(callback: () => void): void {
    this.onAutoSoloStart = callback;
  }

  // Allow setting the game mode based on player selection
  public setGameMode(mode: 'solo' | 'multiplayer'): void {
    this.isSoloMode = mode === 'solo';
    
    // We can't modify the readonly property directly, so we won't change requiredPlayers here
    // The constructor will set this value properly when the RoundManager is recreated
    // with the correct game mode
    
    // Reset the shown mode selection flag to avoid further prompts for any mode
    this.hasShownModeSelection = true;
    
    // Also make sure to stop waiting for players if we were before
    this.stopWaitingForPlayers();
  }

  public stopWaitingForPlayers(): void {
    this.waitingForPlayers = false;
    
    if (this.checkPlayersInterval) {
      clearInterval(this.checkPlayersInterval);
      this.checkPlayersInterval = null;
    }
  }

  public getPlayerCount(): number {
    return this.world.entityManager.getAllPlayerEntities().length;
  }

  public hasEnoughPlayers(): boolean {
    return this.getPlayerCount() >= this.requiredPlayers;
  }

  public isWaitingForPlayers(): boolean {
    return this.waitingForPlayers;
  }

  public getRequiredPlayers(): number {
    return this.requiredPlayers;
  }

  public cleanup(): void {
    if (this.checkPlayersInterval) {
      clearInterval(this.checkPlayersInterval);
      this.checkPlayersInterval = null;
    }
    this.waitingForPlayers = false;
  }
  
  // Reset the mode selection shown flag for a new game
  public resetModeSelection(): void {
    // Only reset if there's exactly one player, otherwise keep it dismissed
    if (this.getPlayerCount() === 1) {
      this.hasShownModeSelection = false;
    }
  }
}