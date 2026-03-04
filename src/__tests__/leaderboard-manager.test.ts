import { jest } from '@jest/globals';
import { LeaderboardManager } from '../managers/leaderboard-manager';
import { GlobalLeaderboard, PlayerPersistentData } from '../types';

// Mock the Hytopia dependencies
jest.mock('hytopia', () => {
  return {
    PersistenceManager: {
      instance: {
        getGlobalData: jest.fn(),
        setGlobalData: jest.fn(),
      }
    }
  };
});

// Import after mocking
import { PersistenceManager } from 'hytopia';

const MockPersistence = PersistenceManager.instance as any;

describe('LeaderboardManager', () => {
  const mockWorld: any = {};
  const mockPlayer: any = {
    id: 'player-1',
    getPersistedData: jest.fn().mockReturnValue(undefined),
    setPersistedData: jest.fn(),
  };
  let leaderboardManager: LeaderboardManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (LeaderboardManager as any).instance = undefined;
    leaderboardManager = LeaderboardManager.getInstance(mockWorld);
  });

  test('getInstance returns singleton instance', () => {
    const instance1 = LeaderboardManager.getInstance(mockWorld);
    const instance2 = LeaderboardManager.getInstance(mockWorld);
    expect(instance1).toBe(instance2);
  });

  test('getGlobalLeaderboard returns default when no data exists', async () => {
    MockPersistence.getGlobalData.mockResolvedValue(null);

    const result = await leaderboardManager.getGlobalLeaderboard();

    expect(result).toEqual({
      allTimeHighScores: [],
      roundHighScores: []
    });
  });

  test('getGlobalLeaderboard returns cached data when available', async () => {
    const mockData = {
      allTimeHighScores: [{ playerName: 'player1', playerId: 'player1', score: 100, date: '2023-01-01' }],
      roundHighScores: []
    };

    // Set up cache with first call
    MockPersistence.getGlobalData.mockResolvedValueOnce({
      allTimeHighScores: mockData.allTimeHighScores,
      roundHighScores: mockData.roundHighScores
    });

    await leaderboardManager.getGlobalLeaderboard();

    // Second call should use cache
    MockPersistence.getGlobalData.mockClear();
    const result = await leaderboardManager.getGlobalLeaderboard();

    expect(result).toEqual(mockData);
    expect(MockPersistence.getGlobalData).not.toHaveBeenCalled();
  });

  test('updateGlobalLeaderboard saves data correctly', async () => {
    const mockLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [{ playerName: 'player1', playerId: 'player1', score: 100, date: '2023-01-01' }],
      roundHighScores: []
    };

    await leaderboardManager.updateGlobalLeaderboard(mockLeaderboard);

    expect(MockPersistence.setGlobalData).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        allTimeHighScores: mockLeaderboard.allTimeHighScores,
        roundHighScores: mockLeaderboard.roundHighScores
      })
    );
  });

  test('getPlayerData returns default when no data exists', () => {
    mockPlayer.getPersistedData.mockReturnValue(undefined);

    const result = leaderboardManager.getPlayerData(mockPlayer);

    expect(result).toEqual({
      personalBest: {
        totalScore: 0,
        roundScores: {}
      },
      gamesPlayed: 0
    });
  });

  test('updatePlayerData saves player data correctly', () => {
    const playerData: PlayerPersistentData = {
      personalBest: {
        totalScore: 1000,
        roundScores: {
          1: { score: 500, date: '2023-01-01' },
          2: { score: 300, date: '2023-01-01' },
          3: { score: 200, date: '2023-01-01' }
        }
      },
      gamesPlayed: 5
    };

    leaderboardManager.updatePlayerData(mockPlayer, playerData);

    expect(mockPlayer.setPersistedData).toHaveBeenCalledWith(
      expect.objectContaining({
        personalBest: playerData.personalBest,
        gamesPlayed: 5
      })
    );
  });

  test('addAllTimeHighScore adds and sorts scores correctly', async () => {
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [
        { playerName: 'player2', playerId: 'player2', score: 200, date: '2023-01-01' },
        { playerName: 'player3', playerId: 'player3', score: 100, date: '2023-01-01' }
      ],
      roundHighScores: []
    };

    MockPersistence.getGlobalData.mockResolvedValue(initialLeaderboard);

    await leaderboardManager.addAllTimeHighScore(mockPlayer, 150);

    expect(MockPersistence.setGlobalData).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        allTimeHighScores: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player2', score: 200 }),
          expect.objectContaining({ playerId: 'player-1', score: 150 }),
          expect.objectContaining({ playerId: 'player3', score: 100 })
        ])
      })
    );
  });

  test('isLeaderboardQualifier returns true when score is higher than lowest', async () => {
    const lowestScore = 50;
    const highScores = Array(10).fill(0).map((_, i) => ({
      playerName: `player${i+1}`,
      playerId: `player${i+1}`,
      score: lowestScore + i * 10,
      date: '2023-01-01'
    }));

    const mockLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: highScores,
      roundHighScores: []
    };

    MockPersistence.getGlobalData.mockResolvedValue(mockLeaderboard);

    const qualifies = await leaderboardManager.isLeaderboardQualifier(60);
    expect(qualifies).toBe(true);

    const doesNotQualify = await leaderboardManager.isLeaderboardQualifier(50);
    expect(doesNotQualify).toBe(false);
  });
});
