import { World } from 'hytopia';

export class PlayerTracker {
  private waitingForPlayers: boolean = false;
  private readonly requiredPlayers: number;
  private checkPlayersInterval: NodeJS.Timeout | null = null;
  private hasShownModeSelection: boolean = false;
  private previousPlayerCount: number = 0;

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

  // Method to check if the first player has joined and show the mode selection
  private checkForFirstPlayer(): void {
    const currentPlayerCount = this.getPlayerCount();
    
    // If this is the first player joining and we haven't shown the selection yet
    if (currentPlayerCount === 1 && this.previousPlayerCount === 0 && !this.hasShownModeSelection) {
      // Show the waiting for another player UI with solo option
      const player = this.world.entityManager.getAllPlayerEntities()[0]?.player;
      if (player) {
        console.log('First player joined, showing waiting for player UI with solo option');
        
        // Unlock the pointer first to allow interaction with the UI
        player.ui.lockPointer(false);
        
        // Then show the waiting UI with solo option
        player.ui.sendData({
          type: 'showModeSelection'
        });
        
        this.hasShownModeSelection = true;
      }
    }
    
    this.previousPlayerCount = currentPlayerCount;
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
    this.hasShownModeSelection = false;
  }
}