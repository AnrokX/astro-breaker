import { World } from 'hytopia';
import { MovingBlockManager } from '../moving_blocks/moving-block-entity';
import { ScoreManager } from './score-manager';

// Define interfaces locally to avoid dependency issues
export interface RoundConfig {
  duration: number;  // Duration in milliseconds
  minBlockCount: number;  // Minimum number of blocks in play
  maxBlockCount: number;  // Maximum number of blocks in play
  blockSpawnInterval: number;  // How often to spawn new blocks (ms)
  speedMultiplier: number;  // Speed multiplier for blocks
  blockTypes: {  // Probability weights for different block types
    normal: number;
    sineWave: number;
    static: number;
    verticalWave: number;
    popup: number;     // Pop-up targets that appear and disappear
    rising: number;    // Rising targets that move upward
    parabolic: number; // Targets that follow parabolic paths
    pendulum: number;  // Targets that swing like pendulums
  };
}

export interface GameConfig {
  maxRounds: number;
}

// Import modular implementation
import { RoundManager as ModularRoundManager } from './round';
import { RoundTransition } from './round/components/round-transition';
import { RoundSpawner } from './round/components/round-spawner';
import { PlayerTracker } from './round/components/player-tracker';
import { RoundUI } from './round/components/round-ui';

/**
 * Compatibility facade for RoundManager that delegates to the new modular implementation.
 * This maintains the same public API while using the new modular architecture internally.
 */
export class RoundManager {
  private modularManager: ModularRoundManager;
  private playerTracker: PlayerTracker;
  
  constructor(
    world: World,
    blockManager: MovingBlockManager,
    scoreManager: ScoreManager, 
    transitionDuration: number = 3000
  ) {
    // Initialize components
    const transition = new RoundTransition(transitionDuration);
    const spawner = new RoundSpawner(world, blockManager);
    this.playerTracker = new PlayerTracker(world, 2); // Default required players = 2
    const ui = new RoundUI(world, scoreManager);
    
    // Create the modular manager with components
    this.modularManager = new ModularRoundManager(
      world, 
      transition, 
      spawner, 
      this.playerTracker, 
      ui, 
      scoreManager,
      {
        maxRounds: 10,
        requiredPlayers: 2,
        transitionDuration
      }
    );
  }

  // Implement all original public methods by delegating to the modular manager
  public startRound(): void {
    return this.modularManager.startRound();
  }
  
  public endRound(): void {
    return this.modularManager.endRound();
  }
  
  public cleanup(): void {
    return this.modularManager.cleanup();
  }
  
  public handlePlayerLeave(): void {
    return this.modularManager.handlePlayerLeave();
  }
  
  public getCurrentRound(): number {
    return this.modularManager.getCurrentRound();
  }
  
  public isActive(): boolean {
    return this.modularManager.isActive();
  }
  
  public isShootingAllowed(): boolean {
    return this.modularManager.isShootingAllowed();
  }
  
  public isWaitingForPlayers(): boolean {
    return this.playerTracker.isWaitingForPlayers();
  }
  
  public getRemainingRounds(): number {
    return this.modularManager.getRemainingRounds();
  }
} 