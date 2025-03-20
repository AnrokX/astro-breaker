import { World } from 'hytopia';
import { MovingBlockManager } from '../../moving_blocks/moving-block-entity';
import { ScoreManager } from '../score-manager';
import { AudioManager } from '../audio-manager';
import { LeaderboardManager } from '../leaderboard-manager';
import { RoundTransition } from './components/round-transition';
import { RoundSpawner } from './components/round-spawner';
import { PlayerTracker } from './components/player-tracker';
import { RoundUI } from './components/round-ui';
import { GameConfig, GameEndStanding, RoundConfig } from './interfaces/round-interfaces';
import { DEFAULT_GAME_CONFIG, SOLO_GAME_CONFIG } from './configs/game-configs';
import { ROUND_CONFIGS } from './configs/round-configs';

/**
 * Manages the game rounds in a modular, component-based architecture.
 * 
 * This class coordinates the following aspects of round management:
 * - Round lifecycle (start, end, transitions)
 * - Game state tracking (active, waiting, transitions)
 * - Player management through PlayerTracker
 * - Block spawning through RoundSpawner
 * - UI communication through RoundUI
 * - Scoring through ScoreManager integration
 * 
 * It delegates specific responsibilities to specialized components.
 */
export class RoundManager {
  /** Current round number (0 = no round started yet) */
  private currentRound: number = 0;
  
  /** Timer for the current round */
  private roundTimer: NodeJS.Timeout | null = null;
  
  /** Whether a round is currently active */
  private isRoundActive: boolean = false;
  
  /** Timestamp when the current round started */
  private roundStartTime: number = 0;
  
  /** Whether a game is in progress across multiple rounds */
  private gameInProgress: boolean = false;
  
  /** Configuration for the game */
  private readonly gameConfig: GameConfig;

  /**
   * Creates a new RoundManager with the specified components and configuration.
   * 
   * @param world The game world
   * @param transition Component that manages transitions between rounds
   * @param spawner Component that handles block spawning
   * @param playerTracker Component that tracks player presence
   * @param ui Component that handles UI communication
   * @param scoreManager Manager for tracking scores
   * @param gameConfig Optional configuration overrides for the game
   */
  constructor(
    private world: World,
    private transition: RoundTransition,
    private spawner: RoundSpawner,
    private playerTracker: PlayerTracker,
    private ui: RoundUI,
    private scoreManager: ScoreManager,
    gameConfig?: Partial<GameConfig>
  ) {
    // Determine if we're using solo mode
    const isSoloMode = gameConfig?.gameMode === 'solo';
    
    // Select the appropriate default config
    const defaultConfig = isSoloMode ? SOLO_GAME_CONFIG : DEFAULT_GAME_CONFIG;
    
    // Merge provided config with defaults
    this.gameConfig = {
      ...defaultConfig,
      ...gameConfig
    };
    
    // If we're in solo mode, recreate the playerTracker with solo settings
    if (this.gameConfig.gameMode === 'solo') {
      this.playerTracker = new PlayerTracker(
        world,
        1, // Required players is 1
        true // isSoloMode = true
      );
      
      // Recreate the UI with solo mode config
      this.ui = new RoundUI(
        world,
        scoreManager,
        { gameMode: 'solo' }
      );
    }
    
    // Subscribe to UI events for mode selection
    this.subscribeToUIEvents();
  }
  
  /**
   * Subscribe to UI events to handle mode selection and other player inputs
   */
  private subscribeToUIEvents(): void {
    // Set up a world event listener for UI messages
    // Since we can't directly access the player UI event API, we'll add a handler
    // to the main game entry point that will call this method when UI events are received.
    // 
    // In the main game, this should be set up like:
    // world.on('playerUIData', (player, data) => {
    //   if (data.type === 'modeSelection' && data.mode) {
    //     roundManager.handleModeSelection(data.mode, player.id);
    //   }
    // });
    
    console.log('UI event subscription ready. Main game must implement event forwarding.');
  }
  
  /**
   * Handle mode selection from a player
   */
  public handleModeSelection(mode: 'solo' | 'multiplayer', playerId?: string): void {
    console.log(`Mode selected: ${mode}`);
    
    // Don't allow mode changes during active gameplay
    if (this.isRoundActive || this.gameInProgress) {
      return;
    }
    
    // Get player entity to re-lock pointer
    if (playerId) {
      const playerEntities = this.world.entityManager.getAllPlayerEntities();
      const playerEntity = playerEntities.find(entity => entity.player.id === playerId);
      
      if (playerEntity) {
        // Lock the pointer again after mode selection
        playerEntity.player.ui.lockPointer(true);
      }
    }
    
    // Update game config mode
    this.gameConfig.gameMode = mode;
    
    // Re-initialize player tracker for the selected mode
    this.playerTracker = new PlayerTracker(
      this.world,
      mode === 'solo' ? 1 : 2,  // required players
      mode === 'solo'           // isSoloMode
    );
    
    // Re-initialize UI for the selected mode
    this.ui = new RoundUI(
      this.world,
      this.scoreManager,
      { gameMode: mode }
    );
    
    // For solo mode, start immediately
    if (mode === 'solo' && this.playerTracker.getPlayerCount() >= 1) {
      setTimeout(() => {
        this.actuallyStartRound();
      }, 500);
    } else if (mode === 'multiplayer') {
      // Just start round process, which will wait for players if needed
      this.startRound();
    }
  }
  
  /**
   * Starts a new round or waits for players if necessary.
   * If conditions are met, begins the countdown to start the round.
   * If a round is already active or in transition, does nothing.
   */
  public startRound(): void {
    // Don't start if round is active or we're in transition
    if (this.isRoundActive || this.transition.isInTransition()) return;

    // Add this check to prevent starting new rounds if we've hit the max
    if (this.currentRound >= this.gameConfig.maxRounds) {
      this.endGame();
      return;
    }

    // Check if we're in solo mode
    const isSoloMode = this.gameConfig.gameMode === 'solo';

    // Only check for minimum players when starting a new game (not in progress) and not in solo mode
    if (!this.gameInProgress && !this.playerTracker.hasEnoughPlayers()) {
      // Start waiting for players
      if (!this.playerTracker.isWaitingForPlayers()) {
        // Display waiting UI without additional messages
        this.ui.displayWaitingForPlayers(
          this.playerTracker.getPlayerCount(),
          this.playerTracker.getRequiredPlayers(),
          isSoloMode
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

  /**
   * Ends the current round and handles post-round activities.
   * This includes:
   * - Stopping block spawning
   * - Getting round results and updating scores
   * - Playing sound effects
   * - Displaying round end UI
   * - Checking if the game is over
   * - Starting the transition to the next round
   * 
   * If no round is active, does nothing.
   */
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

    // Set the current round in the score manager for better tracking
    try {
      // Instead of updating the entity name (which is read-only), 
      // directly tell the score manager about our current round
      console.log(`Round manager passing current round ${this.currentRound} to score manager`);
    } catch (error) {
      console.error("Error updating score manager:", error);
    }
    
    // Get round results with placements and pass current round number
    const { winnerId, placements } = this.scoreManager.handleRoundEnd(this.currentRound);
    
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
    // For solo mode, we should allow shooting as soon as the round is active
    if (this.gameConfig.gameMode === 'solo') {
      return this.isRoundActive;
    } else {
      return this.isRoundActive && !this.playerTracker.isWaitingForPlayers();
    }
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

  // Made public for testing purposes
  public actuallyStartRound(): void {
    // Prevent starting a round if one is already active
    if (this.isRoundActive) {
      console.warn('Attempted to start a round while one was already active');
      return;
    }
    
    // If we're beyond the maximum rounds, end the game
    if (this.currentRound >= this.gameConfig.maxRounds) {
      this.endGame();
      return;
    }
    
    // Get the next round number
    this.currentRound += 1;
    console.log(`Starting round ${this.currentRound}`);
    
    // Mark round as active
    this.isRoundActive = true;
    this.gameInProgress = true;
    this.roundStartTime = Date.now();
    
    // Get the configuration for this round
    const roundConfig = this.getRoundConfig(this.currentRound);
    
    // Reset scores for the round
    this.scoreManager.startNewRound();
    
    // Display round start UI
    this.ui.displayRoundInfo(
      this.currentRound,
      this.gameConfig.maxRounds,
      this.getRemainingRounds(),
      roundConfig.duration
    );
    
    // Play round start sound if available
    const audioManager = AudioManager.getInstance(this.world);
    
    // Start the spawning of blocks for this round
    this.spawner.startSpawning(roundConfig);
    
    // Set a timer to end the round after the specified duration
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    
    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, roundConfig.duration);
    
    // In-world leaderboard markers have been disabled
    // this.createInWorldLeaderboardMarker();
  }

  /**
   * Placeholder for the removed in-world leaderboard marker functionality
   */
  private async createInWorldLeaderboardMarker(): Promise<void> {
    // Functionality removed as per user request
    console.log("In-world leaderboard markers disabled");
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
    
    // Check if we're in solo mode
    const isSoloMode = this.gameConfig.gameMode === 'solo';
    
    if (isSoloMode) {
      // In solo mode, we can start immediately without messages
      setTimeout(() => {
        this.startRound();
      }, 3000);
    } else {
      // Check if we have enough players to start new game
      if (this.playerTracker.hasEnoughPlayers()) {
        // Start new game without messages
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
  }

  private endGame(): void {
    this.gameInProgress = false;
    const finalStandings: GameEndStanding[] = [];
    const isSoloMode = this.gameConfig.gameMode === 'solo';
    
    this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
      const playerId = playerEntity.player.id;
      const playerStats = (this.scoreManager as any).playerStats.get(playerId);
      const playerNumber = playerStats?.playerNumber || 0;
      
      // Get color from player colors array
      const playerColors = (this.scoreManager as any).constructor.PLAYER_COLORS || [];
      const playerColor = playerColors.length > 0 
        ? playerColors[(playerNumber - 1) % playerColors.length] 
        : '#FFFFFF';
      
      finalStandings.push({
        playerId,
        playerNumber,
        playerColor,
        placementPoints: this.scoreManager.getLeaderboardPoints(playerId),
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
        // Use a non-null assertion or provide a default value for playerNumber to avoid TypeScript error
        const playerIndex = ((gameWinner.playerNumber || 1) - 1) % (playerColors.length || 1);
        gameWinner.playerColor = playerColors.length > 0 
          ? playerColors[playerIndex] 
          : '#FFFFFF';
      }
      
      // Send game end UI
      this.ui.displayGameEnd(
        gameWinner,
        finalStandings,
        this.gameConfig.maxRounds,
        this.currentRound,
        10000 // 10 seconds until next game
      );
      
      // For solo mode, add a specific message about the score
      if (isSoloMode) {
        this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
          playerEntity.player.ui.sendData({
            type: 'systemMessage',
            message: `Solo game complete! Your final score: ${gameWinner.totalScore}`,
            color: 'FFD700' // Gold color
          });
        });
      }
      
      // Update leaderboard with final game results
      const leaderboardManager = LeaderboardManager.getInstance(this.world);
      
      // Convert final standings to format expected by leaderboard manager
      const leaderboardEntries = finalStandings.map(standing => ({
        playerId: standing.playerId,
        playerName: standing.playerId, // Use playerId as playerName since we don't have separate names
        totalScore: standing.totalScore
      }));
      
      // Log the entries being sent to the leaderboard for debugging
      console.log(`Updating game results with entries:`, JSON.stringify(leaderboardEntries));
      
      // Save game results to persistent leaderboard (async, won't block)
      leaderboardManager.updateWithGameResults(leaderboardEntries, this.gameConfig.gameMode)
        .catch(error => console.error("Error updating final leaderboard:", error));
      
      // Display leaderboard to all players after a short delay
      setTimeout(() => {
        this.displayLeaderboardToAllPlayers();
      }, 3000); // Show leaderboard 3 seconds after game end
    }

    // Reset game after delay (shorter for solo mode)
    const resetDelay = isSoloMode ? 5000 : 10000;
    setTimeout(() => {
      this.resetGame();
    }, resetDelay);
  }

  /**
   * Displays the leaderboard UI to all players in the game
   */
  private displayLeaderboardToAllPlayers(): void {
    // Get all player entities and display leaderboard to each player
    this.world.entityManager.getAllPlayerEntities().forEach(async (playerEntity) => {
      try {
        const player = playerEntity.player;
        const leaderboardManager = LeaderboardManager.getInstance(this.world);
        const leaderboardData = await leaderboardManager.getGlobalLeaderboard();
        const playerData = await leaderboardManager.getPlayerData(player);
        
        // Always display leaderboard (preference setting has been removed)
        // Send global leaderboard data with total rounds information
        player.ui.sendData({
          type: 'displayLeaderboard',
          data: {
            ...leaderboardData,
            totalRounds: this.gameConfig.maxRounds // Add total rounds information for round selector
          }
        });
        
        // Send personal stats data
        player.ui.sendData({
          type: 'personalStats',
          data: playerData
        });
      } catch (error) {
        console.error(`Error displaying leaderboard to player: ${error}`);
      }
    });
  }
}