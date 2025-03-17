import { World } from './mocks/hytopia';
import { RoundManager } from '../managers/round';
import { RoundTransition } from '../managers/round/components/round-transition';
import { PlayerTracker } from '../managers/round/components/player-tracker';
import { RoundUI } from '../managers/round/components/round-ui';
import { RoundSpawner } from '../managers/round/components/round-spawner';
import { ScoreManager } from '../managers/score-manager';
import { MovingBlockManager } from '../moving_blocks/moving-block-entity';

// Mock implementations
jest.mock('./mocks/hytopia');
jest.mock('../managers/score-manager');
jest.mock('../moving_blocks/moving-block-entity');
jest.mock('../managers/round/components/round-transition');
jest.mock('../managers/round/components/player-tracker');
jest.mock('../managers/round/components/round-ui');
jest.mock('../managers/round/components/round-spawner');

describe('Modular RoundManager Integration', () => {
  let world: World;
  let roundManager: RoundManager;
  let transition: RoundTransition;
  let spawner: RoundSpawner;
  let playerTracker: PlayerTracker;
  let ui: RoundUI;
  let scoreManager: ScoreManager;
  let blockManager: MovingBlockManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    world = new World();
    scoreManager = new ScoreManager();
    blockManager = new MovingBlockManager(world, scoreManager);
    transition = new RoundTransition();
    spawner = new RoundSpawner(world, blockManager);
    playerTracker = new PlayerTracker(world);
    ui = new RoundUI(world, scoreManager);
    
    // Setup mock implementations
    (playerTracker.hasEnoughPlayers as jest.Mock).mockReturnValue(true);
    (transition.isInTransition as jest.Mock).mockReturnValue(false);
    
    // Create round manager with components
    roundManager = new RoundManager(
      world,
      transition,
      spawner,
      playerTracker,
      ui,
      scoreManager
    );
  });

  test('startRound should start the round sequence when conditions are met', () => {
    // Act
    roundManager.startRound();
    
    // We can't directly test private methods, but we can verify behavior
    expect(transition.isInTransition).toHaveBeenCalled();
    expect(playerTracker.hasEnoughPlayers).toHaveBeenCalled();
    
    // Force the countdown timeout to complete immediately
    jest.runAllTimers();
    
    // Verify that components are called as expected
    expect(scoreManager.startNewRound).toHaveBeenCalled();
    expect(spawner.startSpawning).toHaveBeenCalled();
    expect(ui.displayRoundInfo).toHaveBeenCalled();
  });

  test('endRound should properly clean up and transition', () => {
    // Setup the round manager with active round
    (roundManager as any).isRoundActive = true;
    
    // Act
    roundManager.endRound();
    
    // Verify behavior
    expect(spawner.stopSpawning).toHaveBeenCalled();
    expect(scoreManager.handleRoundEnd).toHaveBeenCalled();
    expect(ui.updateLeaderboard).toHaveBeenCalled();
    expect(ui.displayRoundEnd).toHaveBeenCalled();
    expect(transition.startTransition).toHaveBeenCalled();
  });

  test('should handle player leaving during waiting phase', () => {
    // Setup - not in active game but waiting for players
    (roundManager as any).gameInProgress = false;
    (playerTracker.getPlayerCount as jest.Mock).mockReturnValue(1);
    (playerTracker.getRequiredPlayers as jest.Mock).mockReturnValue(2);
    
    // Act
    roundManager.handlePlayerLeave();
    
    // Verify
    expect(ui.displaySystemMessage).toHaveBeenCalled();
    expect(scoreManager.resetAllStats).toHaveBeenCalled();
  });

  test('cleanup should clean up all components', () => {
    // Act
    roundManager.cleanup();
    
    // Verify all component cleanups are called
    expect(transition.cleanup).toHaveBeenCalled();
    expect(spawner.cleanup).toHaveBeenCalled();
    expect(playerTracker.cleanup).toHaveBeenCalled();
  });

  test('should not start round if already in transition', () => {
    // Setup - in transition
    (transition.isInTransition as jest.Mock).mockReturnValue(true);
    
    // Act
    roundManager.startRound();
    
    // Verify - no round start sequence occurs
    expect(playerTracker.hasEnoughPlayers).not.toHaveBeenCalled();
  });

  test('should wait for players when not enough players are present', () => {
    // Setup - not enough players
    (playerTracker.hasEnoughPlayers as jest.Mock).mockReturnValue(false);
    (playerTracker.isWaitingForPlayers as jest.Mock).mockReturnValue(false);
    
    // Act
    roundManager.startRound();
    
    // Verify waiting sequence
    expect(ui.displayWaitingForPlayers).toHaveBeenCalled();
    expect(playerTracker.startWaitingForPlayers).toHaveBeenCalled();
  });
});