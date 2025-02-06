// The ScoreManager handles player scoring for block breaks and other game events

import { World, Vector3Like, Entity } from 'hytopia';
import { MovingBlockEntity } from '../moving_blocks/moving-block-entity';
import { ProjectileEntity } from '../entities/projectile-entity';
import { SceneUIManager } from '../scene-ui/scene-ui-manager';
import { AudioManager } from './audio-manager';

export interface ScoreOptions {
  score: number;
}

interface PlayerStats {
  totalScore: number;
  roundScore: number;
  placementPoints: number;  // Add new field to track points from placements
  wins: number;
  playerNumber: number;
  consecutiveHits: number;  
  multiHitCount: number;    
  lastHitTime: number;      
}

export class ScoreManager extends Entity {
  private static readonly SCORING_CONFIG = {
    COMBO_TIMEOUT_MS: 4000,         // Increased combo window for early rounds
    TIME_DECAY_FACTOR: 20.0,        // More forgiving time decay
    BASE_SCORE_MULTIPLIER: 1.0,     // Reduced base multiplier to make progression more meaningful
    MIN_SCORE: 5,                   // Increased minimum score for better feedback
    
    // Movement multipliers adjusted for progression
    BASE_MOVEMENT_MULTIPLIER: 1.0,   // Base for static targets
    Z_AXIS_MULTIPLIER: 1.5,         // New multiplier for Z-Axis blocks
    SINE_WAVE_MULTIPLIER: 3.0,      // Reduced from 2.5 for better scaling
    VERTICAL_WAVE_MULTIPLIER: 3.0,   // Reduced from 3.0
    POPUP_MULTIPLIER: 4.0,          // Reduced from 3.5
    RISING_MULTIPLIER: 5.5,         // Reduced from 4.0
    PARABOLIC_MULTIPLIER: 6.0,      // Reduced from 4.5
    
    // Combo system adjusted for early game
    MAX_COMBO_BONUS: 0.5,           // Slightly reduced max combo
    MAX_MULTI_HIT_BONUS: 0.3,       // Slightly reduced multi-hit
  };

  // Map to hold scores and stats for each player by their ID
  private playerStats = new Map<string, PlayerStats>();
  private playerCount = 0;

  constructor() {
    super({
      name: 'ScoreManager',
      blockTextureUri: 'blocks/air.png',  // Use an invisible block texture
      blockHalfExtents: { x: 0.001, y: 0.001, z: 0.001 }  // Make it tiny
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
        placementPoints: 0,  // Initialize placement points
        wins: 0,
        playerNumber: this.playerCount,
        consecutiveHits: 0,
        multiHitCount: 0,
        lastHitTime: 0
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

  // Start a new round - reset round scores and total scores, but keep placement points
  public startNewRound(): void {
    for (const [playerId, stats] of this.playerStats.entries()) {
      stats.totalScore = 0;  // Reset total score at start of round
      stats.roundScore = 0;  // Reset round score
      stats.consecutiveHits = 0;
      stats.multiHitCount = 0;
      stats.lastHitTime = 0;
      this.playerStats.set(playerId, stats);
    }
  }

  // Add a win for the player with the highest score in the round
  public handleRoundEnd(): { winnerId: string | null, placements: Array<{ playerId: string, points: number }> } {
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

    const winnerId = sortedPlayers.length > 0 ? sortedPlayers[0][0] : null;
    if (winnerId) {
        const stats = this.playerStats.get(winnerId)!;
        stats.wins++;
        this.playerStats.set(winnerId, stats);
    }

    return { winnerId, placements };
  }

  // Increment (or decrement) player's score
  public addScore(playerId: string, score: number): void {
    const stats = this.playerStats.get(playerId);
    if (stats) {
      stats.totalScore += score;
      stats.roundScore += score;
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
      stats.placementPoints = 0;  // Reset placement points
      stats.wins = 0;
      stats.consecutiveHits = 0;
      stats.multiHitCount = 0;
      stats.lastHitTime = 0;
      this.playerStats.set(playerId, stats);
    }
  }

  // Add this method to broadcast scores and leaderboard
  public broadcastScores(world: World) {
    const scores = Array.from(world.entityManager.getAllPlayerEntities()).map(playerEntity => ({
        playerId: playerEntity.player.id,
        totalPoints: this.getScore(playerEntity.player.id),
        roundScore: this.getRoundScore(playerEntity.player.id)
    }));

    // Create leaderboard data sorted by placement points
    const leaderboard = Array.from(this.playerStats.entries())
        .map(([playerId, stats]) => ({
            playerNumber: stats.playerNumber,
            points: stats.placementPoints, // Use placement points for leaderboard
            isLeading: this.isLeadingByPlacements(playerId) // New method for placement-based leading
        }))
        .sort((a, b) => b.points - a.points);

    world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
        playerEntity.player.ui.sendData({
            type: 'updateScores',
            scores
        });
        
        playerEntity.player.ui.sendData({
            type: 'updateLeaderboard',
            leaderboard
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
    console.log(`Determining multiplier for behavior type: ${behaviorType}`);
    
    switch (behaviorType) {
      case 'ZAxisMovement':
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
      SceneUIManager.getInstance(this.world).showComboNotification(
        stats.consecutiveHits,
        totalBonus,
        hitPosition
      );
    }

    console.log(`Player ${playerId} hit counters updated:`, {
      consecutiveHits: stats.consecutiveHits,
      multiHitCount: stats.multiHitCount,
      comboTimeRemaining: ScoreManager.SCORING_CONFIG.COMBO_TIMEOUT_MS - (currentTime - stats.lastHitTime),
      currentComboBonus: comboBonus.toFixed(2),
      currentMultiHitBonus: multiHitBonus.toFixed(2)
    });
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
    console.log('🎯 Distance Analysis:', {
      spawnPoint: spawnOrigin,
      impactPoint,
      distance: distance.toFixed(2),
      explanation: 'Higher distance should increase score'
    });

    // Calculate size factor (S)
    const averageSize = this.calculateAverageSize(block.getBlockDimensions());
    console.log('📏 Size Analysis:', {
      blockDimensions: block.getBlockDimensions(),
      averageSize: averageSize.toFixed(2),
      distanceToSizeRatio: (distance / averageSize).toFixed(2),
      explanation: 'Smaller targets should give higher scores'
    });

    // Get movement multiplier (M)
    const movementMultiplier = this.getMovementMultiplier(block);
    console.log('🔄 Movement Analysis:', {
      behaviorType: block.getMovementBehaviorType(),
      multiplier: movementMultiplier,
      explanation: `Using ${movementMultiplier}x multiplier based on movement pattern`
    });

    // Calculate time factor (T)
    const elapsedTime = (Date.now() - block.getSpawnTime()) / 1000; // Convert to seconds
    const timeFactor = ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR / (elapsedTime + ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR);
    console.log('⏱️ Time Analysis:', {
      elapsedSeconds: elapsedTime.toFixed(2),
      decayFactor: ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR,
      timeFactor: timeFactor.toFixed(4),
      explanation: 'Time factor decreases score for older targets'
    });

    // Get combo (C) and multi-hit (H) bonuses
    const stats = this.playerStats.get(playerId);
    if (!stats) {
      console.warn('No stats found for player, initializing new stats');
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

    console.log('🔄 Combo Analysis:', {
      consecutiveHits: updatedStats.consecutiveHits,
      maxComboBonus: ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS,
      actualComboBonus: comboBonus.toFixed(2),
      explanation: `${updatedStats.consecutiveHits} consecutive hits = ${comboBonus.toFixed(2)}x bonus`
    });

    console.log('🎯 Multi-Hit Analysis:', {
      multiHitCount: updatedStats.multiHitCount,
      maxMultiHitBonus: ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS,
      actualMultiHitBonus: multiHitBonus.toFixed(2),
      explanation: `${updatedStats.multiHitCount} hits on target = ${multiHitBonus.toFixed(2)}x bonus`
    });

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

    console.log('💯 Final Score Breakdown:', {
      components: {
        distanceSizeFactor: distanceSizeFactor.toFixed(2),
        movementMultiplier: movementMultiplier.toFixed(2),
        timeFactor: timeFactor.toFixed(2),
        baseMultiplier: ScoreManager.SCORING_CONFIG.BASE_SCORE_MULTIPLIER,
        bonusMultiplier: bonusMultiplier.toFixed(2)
      },
      calculations: {
        baseScore: baseScore.toFixed(2),
        afterBonuses: (baseScore * bonusMultiplier).toFixed(2),
        finalScore: finalScore
      },
      formula: 'Score = ((D/S * M * timeFactor * BASE_MULTIPLIER) * (1 + C + H))'
    });

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
} 