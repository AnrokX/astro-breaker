import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { World } from './mocks/hytopia';
import { PlayerTracker } from '../managers/round/components/player-tracker';

// Mock World
jest.mock('./mocks/hytopia');

// Set up Jest timer mocks
jest.useFakeTimers();

describe('PlayerTracker', () => {
  let playerTracker: PlayerTracker;
  let world: World;
  const requiredPlayers = 2;

  beforeEach(() => {
    jest.clearAllMocks();
    world = new World();
    // Ensure the entityManager mock methods exist
    world.entityManager = {
      getAllPlayerEntities: jest.fn().mockReturnValue([]),
      getAllEntities: jest.fn().mockReturnValue([]),
      getPlayerEntitiesByPlayer: jest.fn().mockReturnValue([]),
      spawnEntity: jest.fn(),
      getEntityById: jest.fn(),
      loadPrefab: jest.fn(),
      despawnEntity: jest.fn(),
      getEntityByName: jest.fn()
    };
    playerTracker = new PlayerTracker(world, requiredPlayers);
  });

  test('should initialize with correct default state', () => {
    expect(playerTracker.isWaitingForPlayers()).toBe(false);
    expect(playerTracker.getRequiredPlayers()).toBe(requiredPlayers);
  });

  test('should get player count from world', () => {
    // Mock the player count
    const mockPlayerEntities = [{ id: '1' }, { id: '2' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    expect(playerTracker.getPlayerCount()).toBe(2);
    expect(world.entityManager.getAllPlayerEntities).toHaveBeenCalled();
  });

  test('should report if enough players are present', () => {
    // Mock player count less than required
    const mockPlayerEntities = [{ id: '1' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    expect(playerTracker.hasEnoughPlayers()).toBe(false);
    
    // Mock player count equal to required
    const mockPlayerEntitiesEnough = [{ id: '1' }, { id: '2' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntitiesEnough);
    
    expect(playerTracker.hasEnoughPlayers()).toBe(true);
  });

  test('should start waiting for players and call callback when enough join', () => {
    // Set up mock callback
    const callback = jest.fn();
    
    // Mock initial player count less than required
    const mockPlayerEntities = [{ id: '1' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    // Start waiting
    playerTracker.startWaitingForPlayers(callback);
    expect(playerTracker.isWaitingForPlayers()).toBe(true);
    expect(callback).not.toHaveBeenCalled();
    
    // Mock player count increased to enough
    const mockPlayerEntitiesEnough = [{ id: '1' }, { id: '2' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntitiesEnough);
    
    // Advance timer to trigger player check
    jest.advanceTimersByTime(1000);
    
    // Verify callback called and not waiting anymore
    expect(callback).toHaveBeenCalledTimes(1);
    expect(playerTracker.isWaitingForPlayers()).toBe(false);
  });

  test('should not call callback if still not enough players', () => {
    // Set up mock callback
    const callback = jest.fn();
    
    // Mock player count less than required
    const mockPlayerEntities = [{ id: '1' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    // Start waiting
    playerTracker.startWaitingForPlayers(callback);
    
    // Advance timer several times
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(1000);
    }
    
    // Verify callback not called and still waiting
    expect(callback).not.toHaveBeenCalled();
    expect(playerTracker.isWaitingForPlayers()).toBe(true);
  });

  test('should stop waiting for players when requested', () => {
    // Set up mock callback
    const callback = jest.fn();
    
    // Mock player count less than required
    const mockPlayerEntities = [{ id: '1' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
    
    // Start waiting
    playerTracker.startWaitingForPlayers(callback);
    expect(playerTracker.isWaitingForPlayers()).toBe(true);
    
    // Stop waiting
    playerTracker.stopWaitingForPlayers();
    expect(playerTracker.isWaitingForPlayers()).toBe(false);
    
    // Mock player count increased to enough
    const mockPlayerEntitiesEnough = [{ id: '1' }, { id: '2' }];
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntitiesEnough);
    
    // Advance timer to trigger player check (if it still existed)
    jest.advanceTimersByTime(1000);
    
    // Verify callback not called
    expect(callback).not.toHaveBeenCalled();
  });

  test('cleanup should stop waiting for players', () => {
    // Set up mock callback
    const callback = jest.fn();
    
    // Start waiting
    playerTracker.startWaitingForPlayers(callback);
    expect(playerTracker.isWaitingForPlayers()).toBe(true);
    
    // Call cleanup
    playerTracker.cleanup();
    expect(playerTracker.isWaitingForPlayers()).toBe(false);
    
    // Advance timer
    jest.advanceTimersByTime(1000);
    
    // Verify callback not called
    expect(callback).not.toHaveBeenCalled();
  });
});