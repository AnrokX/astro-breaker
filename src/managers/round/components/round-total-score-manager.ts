import { World } from 'hytopia';
import { ScoreManager } from '../../score-manager';

/**
 * Manages cumulative scores across rounds without interfering with existing score mechanisms.
 * This component specifically tracks the total score across all rounds for the game-over screen.
 */
export class RoundTotalScoreManager {
  // Map to track cumulative round scores for each player
  private cumulativeScores = new Map<string, number>();
  // Map to track per-round scores for each player
  private roundScores = new Map<string, number[]>();
  // The current round we're tracking
  private currentRound: number = 0;

  constructor(
    private world: World,
    private scoreManager: ScoreManager
  ) {}

  /**
   * Start a new round tracking. Captures current scores as baseline.
   */
  public startRound(roundNumber: number): void {
    this.currentRound = roundNumber;
    
    // Get all player entities
    const playerEntities = this.world.entityManager.getAllPlayerEntities();
    
    // Store current round score baseline for all players
    playerEntities.forEach(playerEntity => {
      const playerId = playerEntity.player.id;
      
      // Initialize array for round scores if this player doesn't have one yet
      if (!this.roundScores.has(playerId)) {
        this.roundScores.set(playerId, []);
      }
      
      // Initialize cumulative score if needed
      if (!this.cumulativeScores.has(playerId)) {
        this.cumulativeScores.set(playerId, 0);
      }
    });
  }

  /**
   * End a round and record the scores.
   */
  public endRound(): void {
    const playerEntities = this.world.entityManager.getAllPlayerEntities();
    
    // Capture scores for all players
    playerEntities.forEach(playerEntity => {
      const playerId = playerEntity.player.id;
      const roundScore = this.scoreManager.getRoundScore(playerId);
      
      // Get the player's round scores array
      const playerRoundScores = this.roundScores.get(playerId) || [];
      
      // Add this round's score to the array
      // Make sure array has the correct length
      while (playerRoundScores.length < this.currentRound - 1) {
        playerRoundScores.push(0); // Fill any missing rounds with 0
      }
      playerRoundScores.push(roundScore);
      
      // Update the round scores map
      this.roundScores.set(playerId, playerRoundScores);
      
      // Update cumulative score
      const currentCumulative = this.cumulativeScores.get(playerId) || 0;
      this.cumulativeScores.set(playerId, currentCumulative + roundScore);
      
      // Record player score for this round
    });
  }

  /**
   * Reset all tracking.
   */
  public reset(): void {
    this.cumulativeScores.clear();
    this.roundScores.clear();
    this.currentRound = 0;
  }

  /**
   * Get the cumulative score for a player.
   */
  public getCumulativeScore(playerId: string): number {
    return this.cumulativeScores.get(playerId) || 0;
  }

  /**
   * Get all round scores for a player.
   */
  public getRoundScores(playerId: string): number[] {
    return this.roundScores.get(playerId) || [];
  }

  /**
   * Get cumulative scores data structure for all players.
   */
  public getAllCumulativeScores(): Map<string, number> {
    return new Map(this.cumulativeScores);
  }
}