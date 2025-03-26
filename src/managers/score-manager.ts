// The ScoreManager handles player scoring for block breaks and other game events

import { World, Vector3Like, Entity } from 'hytopia';
import { MovingBlockEntity, MOVING_BLOCK_CONFIG } from '../moving_blocks/moving-block-entity';
import { ProjectileEntity } from '../entities/projectile-entity';
import { SceneUIManager } from '../scene-ui/scene-ui-manager';
import { ComboNotificationManager } from '../scene-ui/combo-notification-manager';
import { AudioManager } from './audio-manager';
import { LeaderboardManager } from './leaderboard-manager';

export interface ScoreOptions {
  score: number;
}

interface PlayerStats {
  totalScore: number;     // Overall game total score
  roundScore: number;     // Current round's accumulated score
  lastScore: number;      // Last individual score received
  placementPoints: number;  // Points from placements at end of rounds
  wins: number;
  playerNumber: number;
  consecutiveHits: number;  
  multiHitCount: number;    
  lastHitTime: number;
  previousRank: number;     // Previous rank in the leaderboard
  currentRank: number;      // Current rank in the leaderboard
}

export class ScoreManager extends Entity {
  private static readonly SCORING_CONFIG = {
    COMBO_TIMEOUT_MS: 4000,         // Increased combo window for early rounds
    TIME_DECAY_FACTOR: 20.0,        // More forgiving time decay
    BASE_SCORE_MULTIPLIER: 1.0,     // Reduced base multiplier to make progression more meaningful
    MIN_SCORE: 5,                   // Increased minimum score for better feedback
    
    // Movement multipliers adjusted for progression
    BASE_MOVEMENT_MULTIPLIER: 1,   // Reduced by 50% (Static blocks in Round 1)
    Z_AXIS_MULTIPLIER: 2.5,         // New multiplier for Z-Axis blocks
    SINE_WAVE_MULTIPLIER: 5.0,      // Reduced from 2.5 for better scaling
    VERTICAL_WAVE_MULTIPLIER: 6.0,  // Increased by 25% (Vertical Wave blocks in Round 4)
    POPUP_MULTIPLIER: 4.0,          // Reduced from 3.5
    RISING_MULTIPLIER: 5.5,         // Reduced from 4.0
    PARABOLIC_MULTIPLIER: 10.0,     // Increased by 150% (Parabolic blocks in Round 5)
    PENDULUM_MULTIPLIER: 5.0,       // Added for pendulum targets
    
    // Combo system adjusted for early game
    MAX_COMBO_BONUS: 0.5,           // Slightly reduced max combo
    MAX_MULTI_HIT_BONUS: 0.3,       // Slightly reduced multi-hit
  };

  // Map to hold scores and stats for each player by their ID
  private playerStats = new Map<string, PlayerStats>();
  private playerCount = 0;
  
  // Track the current round number, initialized to 1
  private _currentRound: number = 1;

  constructor() {
    super({
      name: 'ScoreManager',
      blockTextureUri: 'blocks/stone.png',  // Use a basic block texture that definitely exists
      blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 }  // Normal scale, will be positioned out of view anyway
    });
  }

  override spawn(world: World, position: Vector3Like): void {
    // Position it far away where it won't be visible
    super.spawn(world, { x: 0, y: -1000, z: 0 });
  }

  // Initialize a score entry for a player
  public initializePlayer(playerId: string): void {
    if (!this.playerStats.has(playerId)) {
      this.playerCount++;
      this.playerStats.set(playerId, {
        totalScore: 0,
        roundScore: 0,
        lastScore: 0,      // Initialize last score
        placementPoints: 0,  // Initialize placement points
        wins: 0,
        playerNumber: this.playerCount,
        consecutiveHits: 0,
        multiHitCount: 0,
        lastHitTime: 0,
        previousRank: 0,     // Initialize previous rank (0 means new player)
        currentRank: this.playerCount // Default to last place initially
      });
    }
  }

  // Remove a player's score when they leave the game
  public removePlayer(playerId: string): void {
    if (this.playerStats.has(playerId)) {
      this.playerCount--;
      this.playerStats.delete(playerId);
    }
  }

  // Start a new round - reset round scores and total scores, but keep placement points and ranking
  public startNewRound(): void {
    for (const [playerId, stats] of this.playerStats.entries()) {
      stats.totalScore = 0;  // Reset total score at start of round
      stats.roundScore = 0;  // Reset round score
      stats.lastScore = 0;   // Reset last score
      stats.consecutiveHits = 0;
      stats.multiHitCount = 0;
      stats.lastHitTime = 0;
      // Keep previousRank and currentRank values
      this.playerStats.set(playerId, stats);
    }
  }

  // Add a win for the player with the highest score in the round
  public handleRoundEnd(currentRoundNumber?: number): { winnerId: string | null, placements: Array<{ playerId: string, points: number }> } {
    // Store the provided round number for leaderboard updates
    this._currentRound = currentRoundNumber || 1;
    // Update previous ranks before calculating new ones
    // Store current ranks as previous ranks
    for (const [playerId, stats] of this.playerStats.entries()) {
        stats.previousRank = stats.currentRank;
        this.playerStats.set(playerId, stats);
    }

    // Sort players by round score in descending order
    const sortedPlayers = Array.from(this.playerStats.entries())
        .sort((a, b) => b[1].roundScore - a[1].roundScore);

    const playerCount = sortedPlayers.length;
    const placements: Array<{ playerId: string, points: number }> = [];
    
    // Handle ties by giving same points to players with equal scores
    let currentPoints = playerCount;
    let currentScore = -1;
    let sameScoreCount = 0;

    sortedPlayers.forEach((entry, index) => {
        const [playerId, stats] = entry;
        
        // If this is a new score, update the points
        if (stats.roundScore !== currentScore) {
            currentPoints = playerCount - index;
            currentScore = stats.roundScore;
            sameScoreCount = 0;
        } else {
            sameScoreCount++;
        }
        
        stats.placementPoints += currentPoints; // Add to placement points
        this.playerStats.set(playerId, stats);
        
        placements.push({ playerId, points: currentPoints });
    });

    // Update current ranks based on updated placement points
    // Sort players by total placement points for the final leaderboard
    const leaderboardRanking = Array.from(this.playerStats.entries())
        .sort((a, b) => b[1].placementPoints - a[1].placementPoints);

    // Assign new ranks, handling ties
    let currentRank = 1;
    let lastPointsValue = -1;
    leaderboardRanking.forEach((entry, index) => {
        const [playerId, stats] = entry;
        
        // If this is a new score, update the rank
        if (stats.placementPoints !== lastPointsValue) {
            currentRank = index + 1;
            lastPointsValue = stats.placementPoints;
        }
        
        stats.currentRank = currentRank;
        this.playerStats.set(playerId, stats);
    });

    const winnerId = sortedPlayers.length > 0 ? sortedPlayers[0][0] : null;
    if (winnerId) {
        const stats = this.playerStats.get(winnerId)!;
        stats.wins++;
        this.playerStats.set(winnerId, stats);
    }

    // Update leaderboard asynchronously with round scores
    if (this.world) {
        const leaderboardManager = LeaderboardManager.getInstance(this.world);
        
        // Create round scores array for the leaderboard
        const roundScores = Array.from(this.playerStats.entries())
            .map(([playerId, stats]) => ({
                playerId,
                roundScore: stats.roundScore
            }));
            
        // Use the current round number that was passed to handleRoundEnd
        const currentRound = this._currentRound || 1;
        
        console.log(`Updating leaderboard with round scores for round ${currentRound} (from ScoreManager)`);
        
        // Cannot update entity name since it's read-only, just log the current round
        console.log(`ScoreManager processing round ${currentRound}`);
        
        // Store the current round number in a debug property that can be accessed for troubleshooting
        (this as any)._debugRoundNumber = currentRound;
            
        // Determine game mode
        // Check the actual player count to infer game mode
        const gameMode = this.playerStats.size <= 1 ? 'solo' : 'multiplayer';
            
        // Get the total number of rounds from the round manager if possible
        let totalRounds = 3; // Default if we can't determine
        try {
            // Try to get the total number of rounds from the round manager
            const roundManager = (this.world as any).roundManager;
            if (roundManager && roundManager.config && roundManager.config.totalRounds) {
                totalRounds = roundManager.config.totalRounds;
            }
        } catch (e) {
            console.warn("Could not determine total rounds:", e);
        }
            
        // Update the leaderboard (this is async and won't block)
        leaderboardManager.updateWithRoundScores(roundScores, currentRound, totalRounds, gameMode)
            .catch(error => console.error("Error updating leaderboard:", error));
    }

    return { winnerId, placements };
  }

  // Increment (or decrement) player's score
  public addScore(playerId: string, score: number): void {
    const stats = this.playerStats.get(playerId);
    if (stats) {
      stats.totalScore += score;
      stats.roundScore += score;
      stats.lastScore = score; // Store the last individual score separately
      this.playerStats.set(playerId, stats);

      // Play the score sound effect
      if (this.world && score > 0) {
        const audioManager = AudioManager.getInstance(this.world);
        audioManager.playSoundEffect('audio/sfx/damage/blop1.mp3', 0.4);  // 0.4 volume for less intrusive feedback
      }
    }
  }

  // Get the current total score for a player
  public getScore(playerId: string): number {
    return this.playerStats.get(playerId)?.totalScore ?? 0;
  }

  // Get the current round score for a player
  public getRoundScore(playerId: string): number {
    return this.playerStats.get(playerId)?.roundScore ?? 0;
  }
  
  // Get the last individual score received for a player
  public getLastScore(playerId: string): number {
    return this.playerStats.get(playerId)?.lastScore ?? 0;
  }

  // Get wins for a player
  public getWins(playerId: string): number {
    return this.playerStats.get(playerId)?.wins ?? 0;
  }

  // Reset score for a player
  public resetScore(playerId: string): void {
    const stats = this.playerStats.get(playerId);
    if (stats) {
      stats.totalScore = 0;
      stats.roundScore = 0;
      stats.lastScore = 0;
      this.playerStats.set(playerId, stats);
    }
  }

  // Reset all players' scores
  public resetAllScores(): void {
    for (const playerId of this.playerStats.keys()) {
      this.resetScore(playerId);
    }
  }

  // Reset all stats including wins and placement points
  public resetAllStats(): void {
    for (const [playerId, stats] of this.playerStats.entries()) {
      stats.totalScore = 0;
      stats.roundScore = 0;
      stats.lastScore = 0;
      stats.placementPoints = 0;  // Reset placement points
      stats.wins = 0;
      stats.consecutiveHits = 0;
      stats.multiHitCount = 0;
      stats.lastHitTime = 0;
      stats.previousRank = 0;  // Reset to "new player" state
      stats.currentRank = stats.playerNumber;  // Default to player number order
      this.playerStats.set(playerId, stats);
    }
  }

  // Colors for player identification
  private static readonly PLAYER_COLORS = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FFC107', // Amber
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#FF5722', // Deep Orange
    '#00BCD4', // Cyan
    '#FFEB3B'  // Yellow
  ];

  // Add this method to broadcast scores and leaderboard
  public broadcastScores(world: World) {
    const playerEntities = Array.from(world.entityManager.getAllPlayerEntities());
    
    // Build scores with player details
    const scores = playerEntities.map(playerEntity => ({
        playerId: playerEntity.player.id,
        playerNumber: this.playerStats.get(playerEntity.player.id)?.playerNumber || 0,
        playerColor: ScoreManager.PLAYER_COLORS[(this.playerStats.get(playerEntity.player.id)?.playerNumber || 1) - 1],
        totalPoints: this.getScore(playerEntity.player.id),
        roundScore: this.getRoundScore(playerEntity.player.id),
        lastScore: this.getLastScore(playerEntity.player.id)
    }));

    // Create leaderboard data sorted by placement points
    const leaderboard = Array.from(this.playerStats.entries())
        .map(([playerId, stats]) => {
            // Calculate the ranking change
            let rankChange = 'same';
            if (stats.previousRank === 0) {
                rankChange = 'new'; // New player
            } else if (stats.currentRank < stats.previousRank) {
                rankChange = 'up'; // Moved up in rankings
            } else if (stats.currentRank > stats.previousRank) {
                rankChange = 'down'; // Moved down in rankings
            }
            
            return {
                playerId,
                playerNumber: stats.playerNumber,
                playerColor: ScoreManager.PLAYER_COLORS[stats.playerNumber - 1],
                points: stats.placementPoints, // Use placement points for leaderboard
                isLeading: this.isLeadingByPlacements(playerId), // For highlighting the leading player
                currentRank: stats.currentRank,
                previousRank: stats.previousRank,
                rankChange: rankChange
            };
        })
        .sort((a, b) => a.currentRank - b.currentRank); // Sort by rank now instead of points

    world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
        // Get player's own ID to highlight their scores in UI
        const currentPlayerId = playerEntity.player.id;

        playerEntity.player.ui.sendData({
            type: 'updateScores',
            scores,
            currentPlayerId
        });
        
        playerEntity.player.ui.sendData({
            type: 'updateLeaderboard',
            leaderboard,
            currentPlayerId,
            timestamp: Date.now() // Add timestamp to force refresh
        });
    });
  }

  // New method to check who's leading by placement points
  private isLeadingByPlacements(playerId: string): boolean {
    const playerPoints = this.playerStats.get(playerId)?.placementPoints ?? 0;
    return Array.from(this.playerStats.values())
        .every(stats => stats.placementPoints <= playerPoints);
  }

  // Calculate Euclidean distance between two points
  private calculateDistance(point1: Vector3Like, point2: Vector3Like): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Calculate average of target's half-extents (S)
  private calculateAverageSize(halfExtents: Vector3Like): number {
    // Get the full dimensions by multiplying by 2 (since these are half-extents)
    const fullWidth = Math.max(halfExtents.x * 2, 2); // Minimum size of 2 for standard blocks
    const fullHeight = Math.max(halfExtents.y * 2, 2);
    const fullDepth = Math.max(halfExtents.z * 2, 2);
    
    // Calculate the average dimension, considering the actual block formation
    return (fullWidth + fullHeight + fullDepth) / 3;
  }

  // Get movement multiplier based on block type
  private getMovementMultiplier(block: MovingBlockEntity): number {
    const behaviorType = block.getMovementBehaviorType();
    
    switch (behaviorType) {
      case 'ZAxisMovement':
      case 'DefaultBlockMovement': // Add support for DefaultBlockMovement which is used for Z-axis blocks
        return ScoreManager.SCORING_CONFIG.Z_AXIS_MULTIPLIER;
      case 'SineWaveMovement':
        return ScoreManager.SCORING_CONFIG.SINE_WAVE_MULTIPLIER;
      case 'VerticalWaveMovement':
        return ScoreManager.SCORING_CONFIG.VERTICAL_WAVE_MULTIPLIER;
      case 'PopUpMovement':
        return ScoreManager.SCORING_CONFIG.POPUP_MULTIPLIER;
      case 'RisingMovement':
        return ScoreManager.SCORING_CONFIG.RISING_MULTIPLIER;
      case 'ParabolicMovement':
        return ScoreManager.SCORING_CONFIG.PARABOLIC_MULTIPLIER;
      case 'PendulumMovement':
        return ScoreManager.SCORING_CONFIG.PENDULUM_MULTIPLIER;
      default:
        return ScoreManager.SCORING_CONFIG.BASE_MOVEMENT_MULTIPLIER;
    }
  }

  // Update combo and multi-hit counters
  private updateHitCounters(playerId: string, hitPosition: Vector3Like): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const currentTime = Date.now();
    
    // Check if within combo window
    if (currentTime - stats.lastHitTime <= ScoreManager.SCORING_CONFIG.COMBO_TIMEOUT_MS) {
      stats.consecutiveHits++;
      stats.multiHitCount++;
    } else {
      stats.consecutiveHits = 1;
      stats.multiHitCount = 1;
    }
    
    stats.lastHitTime = currentTime;
    this.playerStats.set(playerId, stats);
    
    const comboBonus = Math.min(
      (stats.consecutiveHits - 1) * 0.15,
      ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS
    );
    
    const multiHitBonus = Math.min(
      (stats.multiHitCount - 1) * 0.1,
      ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS
    );

    // Show combo notification for 3+ hits
    if (stats.consecutiveHits >= 3 && this.world) {
      const totalBonus = Math.round((comboBonus + multiHitBonus) * 100);
      const player = this.world.entityManager.getAllPlayerEntities()
        .find(entity => entity.player.id === playerId)?.player;
      
      if (player) {
        ComboNotificationManager.getInstance().showComboNotification(
          stats.consecutiveHits,
          totalBonus,
          player
        );
      }
    }

  }

  // Calculate the dynamic score for a grenade hit
  public calculateGrenadeTargetScore(
    projectile: ProjectileEntity,
    block: MovingBlockEntity,
    impactPoint: Vector3Like,
    playerId: string
  ): number {
    const spawnOrigin = projectile.getSpawnOrigin();
    if (!spawnOrigin) {
      console.warn('No spawn origin found for projectile, using default score');
      return ScoreManager.SCORING_CONFIG.MIN_SCORE;
    }

    // Calculate distance (D)
    const distance = this.calculateDistance(spawnOrigin, impactPoint);

    // Calculate size factor (S)
    const averageSize = this.calculateAverageSize(block.getBlockDimensions());

    // Get movement multiplier (M)
    const movementMultiplier = this.getMovementMultiplier(block);

    // Calculate time factor (T)
    const elapsedTime = (Date.now() - block.getSpawnTime()) / 1000; // Convert to seconds
    const timeFactor = ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR / (elapsedTime + ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR);

    // Get combo (C) and multi-hit (H) bonuses
    const stats = this.playerStats.get(playerId);
    if (!stats) {
      this.initializePlayer(playerId);
    }
    
    this.updateHitCounters(playerId, impactPoint);
    const updatedStats = this.playerStats.get(playerId)!;
    
    const comboBonus = Math.min(
      (updatedStats.consecutiveHits - 1) * 0.15,
      ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS
    );
    
    const multiHitBonus = Math.min(
      (updatedStats.multiHitCount - 1) * 0.1,
      ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS
    );



    // Calculate base score components
    const distanceSizeFactor = distance / averageSize;
    const baseScore = distanceSizeFactor * 
                     movementMultiplier * 
                     timeFactor * 
                     ScoreManager.SCORING_CONFIG.BASE_SCORE_MULTIPLIER;
                     
    const bonusMultiplier = 1 + comboBonus + multiHitBonus;
    const finalScore = Math.max(
      ScoreManager.SCORING_CONFIG.MIN_SCORE,
      Math.round(baseScore * bonusMultiplier)
    );


    return finalScore;
  }

  // Add new method to reset combo
  public resetCombo(playerId: string): void {
    const stats = this.playerStats.get(playerId);
    if (stats) {
      const hadCombo = stats.consecutiveHits >= 3;
      stats.consecutiveHits = 0;
      stats.multiHitCount = 0;
      this.playerStats.set(playerId, stats);

      // Only notify UI if there was an active combo
      if (hadCombo && this.world) {
        this.world.entityManager.getAllPlayerEntities()
          .filter(entity => entity.player.id === playerId)
          .forEach(entity => {
            entity.player.ui.sendData({
              type: 'resetCombo'
            });
          });
      }
    }
  }

  // Add this new method to get placement points
  public getLeaderboardPoints(playerId: string): number {
    return this.playerStats.get(playerId)?.placementPoints ?? 0;
  }
  
  // Get the current round number
  public getCurrentRound(): number {
    return this._currentRound || 1;
  }
} 