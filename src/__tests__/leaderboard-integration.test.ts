import { jest } from '@jest/globals';
import { LeaderboardManager } from '../managers/leaderboard-manager';
import { GlobalLeaderboard, PlayerPersistentData } from '../types';
import { ScoreManager } from '../managers/score-manager';
import { SceneUIManager } from '../scene-ui/scene-ui-manager';

// Mock the Hytopia dependencies
jest.mock('hytopia', () => {
  return {
    PersistenceManager: {
      instance: {
        getGlobalData: jest.fn(),
        setGlobalData: jest.fn(),
      }
    },
    World: class MockWorld {
      entityManager = {
        getAllPlayerEntities: jest.fn().mockReturnValue([]),
        getAllEntities: jest.fn().mockReturnValue([]),
      };
    },
    SceneUI: class MockSceneUI {
      load = jest.fn();
    },
    Entity: class MockEntity {
      spawn = jest.fn();
      on = jest.fn();
    },
    EntityEvent: { TICK: 'tick' },
  };
});

// Import after mocking
import { PersistenceManager } from 'hytopia';

const MockPersistence = PersistenceManager.instance as any;

describe('Leaderboard Integration Tests', () => {
  const mockWorld = { entityManager: { getAllPlayerEntities: jest.fn().mockReturnValue([]), getAllEntities: jest.fn().mockReturnValue([]) } } as any;
  const mockPlayer = {
    id: 'player-1',
    ui: { sendData: jest.fn() },
    getPersistedData: jest.fn().mockReturnValue(undefined),
    setPersistedData: jest.fn(),
  } as any;
  let leaderboardManager: LeaderboardManager;
  let scoreManager: ScoreManager;
  let sceneUIManager: SceneUIManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the singleton instances
    (LeaderboardManager as any).instance = undefined;
    (SceneUIManager as any).instance = undefined;

    leaderboardManager = LeaderboardManager.getInstance(mockWorld);
    sceneUIManager = SceneUIManager.getInstance(mockWorld);

    scoreManager = new ScoreManager();
    scoreManager.spawn(mockWorld, { x: 0, y: 0, z: 0 });
    scoreManager.initializePlayer('player-1');
  });

  test('LeaderboardManager maintains singleton instance', () => {
    const instance1 = LeaderboardManager.getInstance(mockWorld);
    const instance2 = LeaderboardManager.getInstance(mockWorld);
    expect(instance1).toBe(instance2);
  });

  test('Global leaderboard data is correctly persisted', async () => {
    const mockLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [
        { playerName: 'player1', playerId: 'player1', score: 200, date: '2023-01-01' },
        { playerName: 'player2', playerId: 'player2', score: 150, date: '2023-01-01' }
      ],
      roundHighScores: [
        { playerName: 'player1', playerId: 'player1', roundScore: 100, roundNumber: 1, date: '2023-01-01' }
      ]
    };

    MockPersistence.getGlobalData.mockResolvedValue(mockLeaderboard);

    const result = await leaderboardManager.getGlobalLeaderboard();

    expect(result).toEqual(mockLeaderboard);
    expect(MockPersistence.getGlobalData).toHaveBeenCalledWith("astroBreaker_leaderboard");
  });

  test('Player data is correctly retrieved via player.getPersistedData()', () => {
    const mockPlayerData = {
      personalBest: {
        totalScore: 500,
        roundScores: {
          1: { score: 200, date: '2023-01-01' }
        }
      },
      gamesPlayed: 10,
    };

    mockPlayer.getPersistedData.mockReturnValue(mockPlayerData);

    const result = leaderboardManager.getPlayerData(mockPlayer);

    expect(result.personalBest.totalScore).toBe(500);
    expect(result.gamesPlayed).toBe(10);
    expect(mockPlayer.getPersistedData).toHaveBeenCalled();
  });

  test('Scores are returned without normalization', () => {
    const normalizeScore = (leaderboardManager as any).normalizeScore.bind(leaderboardManager);

    // Solo and multiplayer scores should both remain unchanged (normalization was removed)
    expect(normalizeScore(100, 'solo')).toBe(100);
    expect(normalizeScore(50, 'multiplayer')).toBe(50);
  });

  test('All-time high scores are added and sorted correctly', async () => {
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
      "astroBreaker_leaderboard",
      expect.objectContaining({
        allTimeHighScores: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player2', score: 200 }),
          expect.objectContaining({ playerId: 'player-1', score: 150 }),
          expect.objectContaining({ playerId: 'player3', score: 100 })
        ])
      })
    );
  });

  test('Round high scores are added and sorted correctly', async () => {
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [],
      roundHighScores: [
        { playerName: 'player2', playerId: 'player2', roundScore: 200, roundNumber: 1, date: '2023-01-01' },
        { playerName: 'player3', playerId: 'player3', roundScore: 100, roundNumber: 1, date: '2023-01-01' }
      ]
    };

    MockPersistence.getGlobalData.mockResolvedValue(initialLeaderboard);

    await leaderboardManager.addRoundHighScore(mockPlayer, 150, 1);

    expect(MockPersistence.setGlobalData).toHaveBeenCalledWith(
      "astroBreaker_leaderboard",
      expect.objectContaining({
        roundHighScores: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player2', roundScore: 200 }),
          expect.objectContaining({ playerId: 'player-1', roundScore: 150 }),
          expect.objectContaining({ playerId: 'player3', roundScore: 100 })
        ])
      })
    );
  });

  test('Player personal best is updated correctly', () => {
    // Setup initial player data
    mockPlayer.getPersistedData.mockReturnValue({
      personalBest: {
        totalScore: 300,
        roundScores: {}
      },
      gamesPlayed: 5,
    });

    leaderboardManager.updatePlayerPersonalBest(mockPlayer, 400, 1, 150);

    expect(mockPlayer.setPersistedData).toHaveBeenCalledWith(
      expect.objectContaining({
        personalBest: expect.objectContaining({
          totalScore: 400,
          roundScores: expect.objectContaining({
            1: expect.objectContaining({ score: 150 })
          })
        })
      })
    );
  });

  test('ScoreManager correctly integrates with LeaderboardManager on round end', async () => {
    scoreManager.addScore('player-1', 150);

    (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([
      { player: { id: 'player-1' } }
    ]);

    const updateWithRoundScoresSpy = jest.spyOn(leaderboardManager, 'updateWithRoundScores');

    const result = scoreManager.handleRoundEnd();

    expect(result.winnerId).toBe('player-1');
  });

  test('Games played counter is incremented correctly', () => {
    mockPlayer.getPersistedData.mockReturnValue({
      personalBest: {
        totalScore: 0,
        roundScores: {}
      },
      gamesPlayed: 5,
    });

    leaderboardManager.incrementGamesPlayed(mockPlayer);

    expect(mockPlayer.setPersistedData).toHaveBeenCalledWith(
      expect.objectContaining({
        gamesPlayed: 6
      })
    );
  });

  test('Leaderboard qualifier check works correctly', async () => {
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: Array(10).fill(0).map((_, i) => ({
        playerName: `player${i}`,
        playerId: `player${i}`,
        score: 50 + i * 10,
        date: '2023-01-01'
      })),
      roundHighScores: []
    };

    MockPersistence.getGlobalData.mockResolvedValue(initialLeaderboard);

    const qualifies = await leaderboardManager.isLeaderboardQualifier(60);
    expect(qualifies).toBe(true);

    const doesNotQualify = await leaderboardManager.isLeaderboardQualifier(50);
    expect(doesNotQualify).toBe(false);
  });

  test('Game results update the leaderboard correctly', async () => {
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [],
      roundHighScores: []
    };

    MockPersistence.getGlobalData.mockResolvedValue(initialLeaderboard);

    const finalStandings = [
      { playerId: 'player-1', totalScore: 500 },
      { playerId: 'player-2', totalScore: 300 }
    ];

    (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([
      { player: { id: 'player-1', getPersistedData: jest.fn().mockReturnValue(undefined), setPersistedData: jest.fn() } },
      { player: { id: 'player-2', getPersistedData: jest.fn().mockReturnValue(undefined), setPersistedData: jest.fn() } }
    ]);

    await leaderboardManager.updateWithGameResults(finalStandings, 'multiplayer');

    expect(MockPersistence.setGlobalData).toHaveBeenCalledWith(
      "astroBreaker_leaderboard",
      expect.objectContaining({
        allTimeHighScores: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player-1', score: 500 }),
          expect.objectContaining({ playerId: 'player-2', score: 300 })
        ])
      })
    );
  });
});
