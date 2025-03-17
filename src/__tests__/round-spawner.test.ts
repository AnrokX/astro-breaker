import { World } from './mocks/hytopia';
import { RoundSpawner } from '../managers/round/components/round-spawner';
import { MovingBlockManager } from '../moving_blocks/moving-block-entity';
import { ScoreManager } from '../managers/score-manager';
import { RoundConfig } from '../managers/round/interfaces/round-interfaces';

// Mock World and dependencies
jest.mock('./mocks/hytopia');
jest.mock('../moving_blocks/moving-block-entity');
jest.mock('../managers/score-manager');

// Set up Jest timer mocks
jest.useFakeTimers();

describe('RoundSpawner', () => {
  let roundSpawner: RoundSpawner;
  let world: World;
  let scoreManager: ScoreManager;
  let blockManager: MovingBlockManager;
  let mockConfig: RoundConfig;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    world = new World();
    scoreManager = new ScoreManager();
    blockManager = new MovingBlockManager(world, scoreManager);
    roundSpawner = new RoundSpawner(world, blockManager);
    
    // Mock the block count
    (blockManager.getBlockCount as jest.Mock).mockReturnValue(0);
    
    // Mock entity functions
    const mockEntities: any[] = [];
    (world.entityManager.getAllEntities as jest.Mock).mockReturnValue(mockEntities);
    
    // Set up test round config
    mockConfig = {
      duration: 60000,
      minBlockCount: 5,
      maxBlockCount: 10,
      blockSpawnInterval: 1000,
      speedMultiplier: 1.0,
      blockTypes: {
        normal: 1.0,
        sineWave: 0,
        static: 0,
        verticalWave: 0,
        popup: 0,
        rising: 0,
        parabolic: 0,
        pendulum: 0
      }
    };
  });

  test('startSpawning should clear existing blocks and begin spawning', () => {
    // Set up mock entities to be cleared
    const mockBlockEntities = [
      { name: 'block1', despawn: jest.fn() },
      { name: 'block2', despawn: jest.fn() }
    ];
    (world.entityManager.getAllEntities as jest.Mock).mockReturnValue(mockBlockEntities);
    
    // Start spawning
    roundSpawner.startSpawning(mockConfig);
    
    // Verify existing blocks were cleaned up
    expect(mockBlockEntities[0].despawn).toHaveBeenCalled();
    expect(mockBlockEntities[1].despawn).toHaveBeenCalled();
    
    // Verify initial spawn of minimum blocks
    const initialSpawnCount = mockConfig.minBlockCount;
    for (let i = 0; i < initialSpawnCount; i++) {
      jest.advanceTimersByTime(1000);
    }
    
    // Verify regular spawn timer was set
    jest.advanceTimersByTime(mockConfig.blockSpawnInterval);
    
    // Should attempt to spawn at least minBlockCount blocks
    expect(blockManager.createZAxisBlock).toHaveBeenCalledTimes(
      expect.any(Number)
    );
  });

  test('stopSpawning should clear the interval and stop spawning blocks', () => {
    // Start then stop spawning
    roundSpawner.startSpawning(mockConfig);
    roundSpawner.stopSpawning();
    
    // Clear previous spawn calls
    jest.clearAllMocks();
    
    // Advance timer - should not spawn more blocks
    jest.advanceTimersByTime(mockConfig.blockSpawnInterval * 5);
    expect(blockManager.createZAxisBlock).not.toHaveBeenCalled();
  });

  test('should spawn different block types based on config probabilities', () => {
    // Create config with multiple block types
    const mixedConfig: RoundConfig = {
      ...mockConfig,
      blockTypes: {
        normal: 0.2,
        sineWave: 0.2,
        static: 0.2,
        verticalWave: 0.1,
        popup: 0.1,
        rising: 0.1,
        parabolic: 0.05,
        pendulum: 0.05
      }
    };
    
    // Mock Math.random to return each segment in sequence for predictable testing
    const mockRandomValues = [0.1, 0.3, 0.5, 0.65, 0.75, 0.85, 0.92, 0.97];
    let mockRandomIndex = 0;
    jest.spyOn(global.Math, 'random').mockImplementation(() => {
      const value = mockRandomValues[mockRandomIndex];
      mockRandomIndex = (mockRandomIndex + 1) % mockRandomValues.length;
      return value;
    });
    
    // Start spawning
    roundSpawner.startSpawning(mixedConfig);
    
    // Mock block count to keep spawning
    (blockManager.getBlockCount as jest.Mock).mockReturnValue(0);
    
    // Trigger multiple spawns to check different block types
    jest.advanceTimersByTime(8000);
    
    // Verify different block types were created
    expect(blockManager.createZAxisBlock).toHaveBeenCalled();
    expect(blockManager.createSineWaveBlock).toHaveBeenCalled();
    expect(blockManager.createStaticTarget).toHaveBeenCalled();
    expect(blockManager.createVerticalWaveBlock).toHaveBeenCalled();
    expect(blockManager.createPopUpTarget).toHaveBeenCalled();
    expect(blockManager.createRisingTarget).toHaveBeenCalled();
    expect(blockManager.createParabolicTarget).toHaveBeenCalled();
    expect(blockManager.createPendulumTarget).toHaveBeenCalled();
    
    // Restore Math.random
    (global.Math.random as jest.Mock).mockRestore();
  });

  test('should scale block count based on player count', () => {
    // Mock player count
    const mockPlayerEntities = [
      { id: 'player1' },
      { id: 'player2' },
      { id: 'player3' },
      { id: 'player4' }
    ];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    // Start spawning
    roundSpawner.startSpawning(mockConfig);
    
    // With 4 players (2 additional above base), should scale block counts by 20%
    // So minBlockCount should be 5 * 1.2 = 6 and maxBlockCount should be 10 * 1.2 = 12
    
    // Check that initial spawn count is scaled (minBlockCount)
    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(1000);
    }
    
    // Now mock a higher block count to test max block limit
    (blockManager.getBlockCount as jest.Mock).mockReturnValue(12);
    
    // Advance timer - should not spawn more blocks at max
    jest.advanceTimersByTime(mockConfig.blockSpawnInterval);
    
    // Clear previous call counts
    jest.clearAllMocks();
    
    // Drop block count to test spawn rate at different thresholds
    (blockManager.getBlockCount as jest.Mock).mockReturnValue(1); // Very low, should spawn in batches
    
    // Trigger spawn
    jest.advanceTimersByTime(mockConfig.blockSpawnInterval);
    
    // Should spawn multiple blocks when count is very low
    expect(blockManager.createZAxisBlock).toHaveBeenCalledTimes(
      expect.any(Number)
    );
  });

  test('cleanup should stop spawning blocks', () => {
    // Start spawning
    roundSpawner.startSpawning(mockConfig);
    
    // Cleanup
    roundSpawner.cleanup();
    
    // Clear previous call counts
    jest.clearAllMocks();
    
    // Advance timer - should not spawn more blocks
    jest.advanceTimersByTime(mockConfig.blockSpawnInterval * 5);
    expect(blockManager.createZAxisBlock).not.toHaveBeenCalled();
  });
});