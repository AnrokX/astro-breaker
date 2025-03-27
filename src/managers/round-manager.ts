import { World } from 'hytopia';
import { MovingBlockManager } from '../moving_blocks/moving-block-entity';
import { ScoreManager } from './score-manager';

// Define interfaces locally for compatibility
import { RoundConfig as ModularRoundConfig, GameConfig as ModularGameConfig } from './round/interfaces/round-interfaces';

// Re-export the interfaces
export type RoundConfig = ModularRoundConfig;
export type GameConfig = ModularGameConfig;

// Import modular implementation
import { RoundManager as ModularRoundManager } from './round';
import { RoundTransition } from './round/components/round-transition';
import { RoundSpawner } from './round/components/round-spawner';
import { PlayerTracker } from './round/components/player-tracker';
import { RoundUI } from './round/components/round-ui';

/**
 * Compatibility facade for RoundManager that delegates to the new modular implementation.
 * This maintains the same public API while using the modular architecture internally.
 * 
 * This facade exists to provide backward compatibility with existing code.
 * For new code, it's recommended to use the modular implementation directly
 * from the './round' directory.
 */
export class RoundManager {
  /** The modular implementation that handles the actual round management */
  private modularManager: ModularRoundManager;
  
  /** The player tracker component */
  private playerTracker: PlayerTracker;
  
  /** The transition component */
  private transition: RoundTransition;
  
  /** The spawner component */
  private spawner: RoundSpawner;
  
  /** The UI component */
  private ui: RoundUI;
  
  /** The game's world */
  private world: World;
  
  // Properties needed for backward compatibility with tests
  public GAME_CONFIG = { maxRounds: 5 };
  public roundTransitionPending = false;
  public roundTimer: NodeJS.Timeout | null = null;
  public blockSpawnTimer: NodeJS.Timeout | null = null;
  public checkPlayersInterval: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new RoundManager facade that delegates to the modular implementation.
   * 
   * @param world The game world
   * @param blockManager The block manager for creating blocks
   * @param scoreManager The score manager for tracking scores
   * @param config Configuration options (or legacy transitionDuration as number)
   *                Can include gameMode: 'solo' | 'multiplayer'
   */
  constructor(
    world: World,
    blockManager: MovingBlockManager,
    scoreManager: ScoreManager, 
    config?: Partial<ModularGameConfig> | number
  ) {
    this.world = world;
    
    // Handle legacy case where config is just a number (transitionDuration)
    const transitionDuration = typeof config === 'number' ? config : (config?.transitionDuration || 3000);
    const gameMode = typeof config === 'object' ? config.gameMode : 'multiplayer';
    const requiredPlayers = (gameMode === 'solo') ? 1 : 2;
    
    // Initialize components
    this.transition = new RoundTransition(transitionDuration);
    this.spawner = new RoundSpawner(world, blockManager);
    this.playerTracker = new PlayerTracker(
      world, 
      requiredPlayers, 
      gameMode === 'solo'
    );
    this.ui = new RoundUI(
      world, 
      scoreManager, 
      { gameMode }
    );
    
    // Create the modular manager with components
    this.modularManager = new ModularRoundManager(
      world, 
      this.transition, 
      this.spawner, 
      this.playerTracker, 
      this.ui, 
      scoreManager,
      {
        maxRounds: 5,
        requiredPlayers: requiredPlayers,
        transitionDuration,
        gameMode: gameMode || 'multiplayer'
      }
    );
    
    // Set up event listener for mode selection
    this.setupModeSelectionListener();
  }
  
  /**
   * Sets up an event listener for mode selection UI events.
   * This is a simplified initialization since we're not directly 
   * using the World API event system.
   */
  private setupModeSelectionListener(): void {
    // Event listener initialization is handled in the main game file
  }
  
  /**
   * Handles game mode selection events from the UI.
   * This should be called when a player selects a game mode in the UI.
   * 
   * In the main game entry point, set up event forwarding:
   * ```
   * world.on('playerUIData', (player, data) => {
   *   if (data.type === 'modeSelection' && data.mode) {
   *     roundManager.handleModeSelection(data.mode);
   *   }
   * });
   * ```
   * 
   * @param mode The selected game mode ('solo' or 'multiplayer')
   */
  public handleModeSelection(mode: 'solo' | 'multiplayer'): void {
    // Only handle mode selection if no game is in progress
    if (this.isActive()) return;
    
    // Update the PlayerTracker's mode
    this.playerTracker.setGameMode(mode);
    
    // Update the UI component's mode
    this.ui = new RoundUI(
      this.world,
      this.modularManager['scoreManager'],
      { gameMode: mode }
    );
    
    // For solo mode, start the game immediately
    if (mode === 'solo') {
      // Start the round immediately
      this.modularManager.startRound();
      
      // Force the round to actually start (bypass waiting)
      setTimeout(() => {
        this.actuallyStartRound();
      }, 500);
    } else {
      // For multiplayer, just start the round without additional messages
      // The round will automatically wait for players if needed
      this.modularManager.startRound();
    }
  }
  
  /**
   * For testing purposes, exposes access to the actuallyStartRound method
   * of the modular implementation.
   */
  public actuallyStartRound(): void {
    return (this.modularManager as any).actuallyStartRound();
  }
  
  /**
   * Starts a new round or waits for players if there aren't enough.
   */
  public startRound(): void {
    // Check if we need to wait for players
    if (!this.playerTracker.hasEnoughPlayers()) {
      // Display waiting message and start waiting
      this.ui.displayWaitingForPlayers(
        this.playerTracker.getPlayerCount(),
        this.playerTracker.getRequiredPlayers(),
        this.playerTracker.isSolo()
      );
      this.playerTracker.startWaitingForPlayers(() => {
        this.modularManager.startRound();
      });
      return;
    }
    
    return this.modularManager.startRound();
  }
  
  /**
   * Ends the current round.
   */
  public endRound(): void {
    // Set this for test compatibility
    (this as any).roundTransitionPending = true;
    
    return this.modularManager.endRound();
  }
  
  /**
   * Cleans up resources used by the round manager.
   */
  public cleanup(): void {
    return this.modularManager.cleanup();
  }
  
  /**
   * Handles a player leaving the game.
   */
  public handlePlayerLeave(): void {
    return this.modularManager.handlePlayerLeave();
  }
  
  /**
   * Gets the current round number.
   * 
   * @returns The current round number
   */
  public getCurrentRound(): number {
    return this.modularManager.getCurrentRound();
  }
  
  /**
   * Checks if a round is currently active.
   * 
   * @returns True if a round is active, false otherwise
   */
  public isActive(): boolean {
    return this.modularManager.isActive();
  }
  
  /**
   * Checks if shooting is currently allowed.
   * 
   * @returns True if shooting is allowed, false otherwise
   */
  public isShootingAllowed(): boolean {
    return this.modularManager.isShootingAllowed();
  }
  
  /**
   * Checks if the game is waiting for players to join.
   * 
   * @returns True if waiting for players, false otherwise
   */
  public isWaitingForPlayers(): boolean {
    return this.playerTracker.isWaitingForPlayers();
  }
  
  /**
   * Gets the number of rounds remaining in the game.
   * 
   * @returns The number of rounds remaining
   */
  public getRemainingRounds(): number {
    return this.modularManager.getRemainingRounds();
  }
} 