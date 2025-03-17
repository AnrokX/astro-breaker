import { World } from 'hytopia';
import { MovingBlockManager } from '../../moving_blocks/moving-block-entity';
import { ScoreManager } from '../score-manager';
import { AudioManager } from '../audio-manager';
import { RoundTransition } from './components/round-transition';
import { RoundSpawner } from './components/round-spawner';
import { PlayerTracker } from './components/player-tracker';
import { RoundUI } from './components/round-ui';
import { GameConfig, GameEndStanding, RoundConfig } from './interfaces/round-interfaces';
import { DEFAULT_GAME_CONFIG } from './configs/game-configs';
import { ROUND_CONFIGS } from './configs/round-configs';

export class RoundManager {
  private currentRound: number = 0;
  private roundTimer: NodeJS.Timeout | null = null;
  private isRoundActive: boolean = false;
  private roundStartTime: number = 0;
  private gameInProgress: boolean = false;
  private readonly gameConfig: GameConfig;

  constructor(
    private world: World,
    private transition: RoundTransition,
    private spawner: RoundSpawner,
    private playerTracker: PlayerTracker,
    private ui: RoundUI,
    private scoreManager: ScoreManager,
    gameConfig?: Partial<GameConfig>
  ) {
    // Merge provided config with defaults
    this.gameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...gameConfig
    };
  }

  // Public API
  public startRound(): void {
    // Don't start if round is active or we're in transition
    if (this.isRoundActive || this.transition.isInTransition()) return;

    // Add this check to prevent starting new rounds if we've hit the max
    if (this.currentRound >= this.gameConfig.maxRounds) {
      this.endGame();
      return;
    }

    // Only check for minimum players when starting a new game (not in progress)
    if (!this.gameInProgress && !this.playerTracker.hasEnoughPlayers()) {
      // Start waiting for players
      if (!this.playerTracker.isWaitingForPlayers()) {
        this.ui.displayWaitingForPlayers(
          this.playerTracker.getPlayerCount(),
          this.playerTracker.getRequiredPlayers()
        );
        
        // Start waiting for players with a callback for when we have enough
        this.playerTracker.startWaitingForPlayers(() => {
          this.startCountdown();
        });
      }
      return;
    }
    
    // Start countdown to begin round
    this.startCountdown();
  }

  public endRound(): void {
    // Don't end if no round is active
    if (!this.isRoundActive) return;

    // Clear any existing timers first
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    
    // Stop spawning blocks
    this.spawner.stopSpawning();

    // Set round as inactive immediately to prevent double-ending
    this.isRoundActive = false;

    // Get round results with placements
    const { winnerId, placements } = this.scoreManager.handleRoundEnd();
    
    // Play victory sound if there's a winner
    if (winnerId && this.world) {
      const audioManager = AudioManager.getInstance(this.world);
      audioManager.playSoundEffect('audio/sfx/damage/blop1.mp3', 0.6);
    }
    
    // Update scores and leaderboard
    this.ui.updateLeaderboard();

    // Broadcast round end results with placement info
    this.ui.displayRoundEnd(
      this.currentRound,
      this.gameConfig.maxRounds,
      winnerId,
      placements,
      this.gameConfig.transitionDuration
    );

    // Check if this was the final round
    if (this.currentRound >= this.gameConfig.maxRounds) {
      this.endGame();
      return;
    }

    // Start transition to next round
    this.transition.startTransition(() => {
      this.startRound();
    });
  }

  public cleanup(): void {
    // Clean up all components
    this.transition.cleanup();
    this.spawner.cleanup();
    this.playerTracker.cleanup();
    
    // Clean up own timers
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    
    this.isRoundActive = false;
  }

  public handlePlayerLeave(): void {
    const playerCount = this.playerTracker.getPlayerCount();
    
    // Only reset game if we're waiting for players to start and don't have enough
    if (!this.gameInProgress && playerCount < this.playerTracker.getRequiredPlayers()) {
      this.ui.displaySystemMessage('Not enough players to start game...', 'FF0000');
      this.resetGame();
    }
    // If game is in progress, continue with remaining players
  }
  
  // Game state getters
  public getCurrentRound(): number {
    return this.currentRound;
  }

  public isActive(): boolean {
    return this.isRoundActive;
  }

  public isShootingAllowed(): boolean {
    // Should return true when round is active and not waiting for players
    return this.isRoundActive && !this.playerTracker.isWaitingForPlayers();
  }

  public getRemainingRounds(): number {
    return this.gameConfig.maxRounds - this.currentRound;
  }

  // Private implementation methods
  private startCountdown(): void {
    // Don't start countdown if in transition or a round is active
    if (this.transition.isInTransition() || this.isRoundActive) return;
    
    // Simplified transition - just wait a short time then start
    setTimeout(() => {
      // Double-check that we still want to start the round
      if (!this.isRoundActive) {
        this.actuallyStartRound();
      }
    }, 1000);
  }

  private actuallyStartRound(): void {
    // Don't start if a round is already active
    if (this.isRoundActive) {
      console.log('Attempted to start round while another is active');
      return;
    }

    this.currentRound++;
    
    // Make sure to set this flag first to allow shooting
    this.isRoundActive = true;
    this.gameInProgress = true;
    this.roundStartTime = Date.now();

    const config = this.getRoundConfig(this.currentRound);
    console.log('Starting round with config:', config);

    // Reset scores for the new round
    this.scoreManager.startNewRound();
    
    // Broadcast round start with full duration
    this.ui.displayRoundInfo(
      this.currentRound,
      this.gameConfig.maxRounds,
      this.getRemainingRounds(),
      config.duration
    );

    // Start block spawning
    this.spawner.startSpawning(config);

    // Set round timer
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    
    this.roundTimer = setTimeout(() => {
      console.log('Round timer completed');
      this.endRound();
    }, config.duration);
  }

  private getRoundConfig(round: number): RoundConfig {
    // Get config from round configs, or fallback to last round config
    return ROUND_CONFIGS[round] || ROUND_CONFIGS[Object.keys(ROUND_CONFIGS).length];
  }

  private resetGame(): void {
    this.currentRound = 0;
    this.gameInProgress = false;
    this.scoreManager.resetAllStats();
    this.ui.updateLeaderboard();
    
    // Check if we have enough players to start new game
    if (this.playerTracker.hasEnoughPlayers()) {
      this.ui.displaySystemMessage('New game starting...', 'FFFFFF');
      
      setTimeout(() => {
        this.startRound();
      }, 5000);
    } else {
      // Wait for enough players
      this.ui.displayWaitingForPlayers(
        this.playerTracker.getPlayerCount(),
        this.playerTracker.getRequiredPlayers()
      );
      
      // Start waiting for players with a callback
      this.playerTracker.startWaitingForPlayers(() => {
        this.startCountdown();
      });
    }
  }

  private endGame(): void {
    this.gameInProgress = false;
    const finalStandings: GameEndStanding[] = [];
    
    this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
      const playerId = playerEntity.player.id;
      const playerStats = (this.scoreManager as any).playerStats.get(playerId);
      const playerNumber = playerStats?.playerNumber || 0;
      
      // Get color from player colors array
      const playerColors = (this.scoreManager as any).constructor.PLAYER_COLORS || [];
      const playerColor = playerColors[playerNumber - 1] || '#FFFFFF';
      
      finalStandings.push({
        playerId,
        playerNumber,
        playerColor,
        placementPoints: this.scoreManager.getLeaderboardPoints(playerId),
        wins: this.scoreManager.getWins(playerId),
        totalScore: this.scoreManager.getScore(playerId)
      });
    });

    // Sort by placement points
    finalStandings.sort((a, b) => b.placementPoints - a.placementPoints);
    const gameWinner = finalStandings[0];
    
    // Clear any remaining blocks
    this.world.entityManager.getAllEntities()
      .filter(entity => entity.name.toLowerCase().includes('block'))
      .forEach(entity => entity.despawn());

    if (gameWinner) {
      // Ensure gameWinner has all required properties
      if (!gameWinner.playerNumber) {
        const playerStats = (this.scoreManager as any).playerStats.get(gameWinner.playerId);
        gameWinner.playerNumber = playerStats?.playerNumber || 1;
        
        const playerColors = (this.scoreManager as any).constructor.PLAYER_COLORS || [];
        gameWinner.playerColor = playerColors[(gameWinner.playerNumber - 1) % playerColors.length] || '#FFFFFF';
      }
      
      this.ui.displayGameEnd(
        gameWinner,
        finalStandings,
        this.gameConfig.maxRounds,
        this.currentRound,
        10000 // 10 seconds until next game
      );
    }

    // Reset game after delay
    setTimeout(() => {
      this.resetGame();
    }, 10000);
  }
}