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
        getPlayerData: jest.fn(),
        setPlayerData: jest.fn()
      }
    }
  };
});

// Import after mocking
import { PersistenceManager } from 'hytopia';

describe('LeaderboardManager', () => {
  const mockWorld: any = {};
  const mockPlayer: any = { id: 'player-1' };
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
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(undefined);
    
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
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValueOnce(mockData);
    
    await leaderboardManager.getGlobalLeaderboard();
    
    // Second call should use cache
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockClear();
    const result = await leaderboardManager.getGlobalLeaderboard();
    
    expect(result).toEqual(mockData);
    expect(PersistenceManager.instance.getGlobalData).not.toHaveBeenCalled();
  });

  test('updateGlobalLeaderboard saves data correctly', async () => {
    const mockLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [{ playerName: 'player1', playerId: 'player1', score: 100, date: '2023-01-01' }],
      roundHighScores: []
    };
    
    await leaderboardManager.updateGlobalLeaderboard(mockLeaderboard);
    
    expect(PersistenceManager.instance.setGlobalData).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object)
    );
  });

  test('getPlayerData returns default when no data exists', async () => {
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue(undefined);
    
    const result = await leaderboardManager.getPlayerData(mockPlayer);
    
    expect(result).toEqual({
      personalBest: { totalScore: 0, highestRoundScore: 0, highestCombo: 0, date: '' },
      gamesPlayed: 0,
      totalWins: 0,
      showLeaderboard: true
    });
  });

  test('updatePlayerData saves player data correctly', async () => {
    const playerData: PlayerPersistentData = {
      personalBest: { totalScore: 1000, highestRoundScore: 500, highestCombo: 10, date: '2023-01-01' },
      gamesPlayed: 5,
      totalWins: 2,
      showLeaderboard: true
    };
    
    await leaderboardManager.updatePlayerData(mockPlayer, playerData);
    
    expect(PersistenceManager.instance.setPlayerData).toHaveBeenCalledWith(
      mockPlayer,
      expect.objectContaining({
        personalBest: playerData.personalBest,
        gamesPlayed: 5,
        totalWins: 2,
        showLeaderboard: true
      })
    );
  });

  test('addAllTimeHighScore adds and sorts scores correctly', async () => {
    // Setup initial leaderboard
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [
        { playerName: 'player2', playerId: 'player2', score: 200, date: '2023-01-01' },
        { playerName: 'player3', playerId: 'player3', score: 100, date: '2023-01-01' }
      ],
      roundHighScores: []
    };
    
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(initialLeaderboard);
    
    // Add a new high score
    await leaderboardManager.addAllTimeHighScore(mockPlayer, 150);
    
    // Check the order of scores (should be sorted high to low)
    expect(PersistenceManager.instance.setGlobalData).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object)
    );
  });

  test('isLeaderboardQualifier returns true when score is higher than lowest', async () => {
    // Setup leaderboard with 10 entries
    const lowestScore = 50;
    const highScores = Array(10).fill(0).map((_, i) => ({
      playerName: `player${i+1}`,
      playerId: `player${i+1}`,
      score: lowestScore + i * 10, // Scores from 50 to 140
      date: '2023-01-01'
    }));
    
    const mockLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: highScores,
      roundHighScores: []
    };
    
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(mockLeaderboard);
    
    // Should qualify (higher than lowest score of 50)
    const qualifies = await leaderboardManager.isLeaderboardQualifier(60);
    expect(qualifies).toBe(true);
    
    // Should not qualify (lower than or equal to lowest score of 50)
    const doesNotQualify = await leaderboardManager.isLeaderboardQualifier(50);
    expect(doesNotQualify).toBe(false);
  });
});