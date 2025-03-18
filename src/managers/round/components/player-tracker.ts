import { World } from 'hytopia';

export class PlayerTracker {
  private waitingForPlayers: boolean = false;
  private readonly requiredPlayers: number;
  private checkPlayersInterval: NodeJS.Timeout | null = null;

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
}