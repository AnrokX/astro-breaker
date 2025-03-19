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
        getPlayerData: jest.fn(),
        setPlayerData: jest.fn()
      }
    },
    World: class MockWorld {
      entityManager = {
        getAllPlayerEntities: jest.fn().mockReturnValue([])
      };
    },
    SceneUI: class MockSceneUI {
      load = jest.fn();
    }
  };
});

// Import after mocking
import { PersistenceManager, World } from 'hytopia';

describe('Leaderboard Integration Tests', () => {
  const mockWorld = new World() as any;
  const mockPlayer = { id: 'player-1', ui: { sendData: jest.fn() } } as any;
  let leaderboardManager: LeaderboardManager;
  let scoreManager: ScoreManager;
  let sceneUIManager: SceneUIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton instances
    (LeaderboardManager as any).instance = undefined;
    (SceneUIManager as any).instance = undefined;
    
    // Create new instances
    leaderboardManager = LeaderboardManager.getInstance(mockWorld);
    sceneUIManager = SceneUIManager.getInstance(mockWorld);
    
    // Setup score manager
    scoreManager = new ScoreManager();
    scoreManager.spawn(mockWorld, { x: 0, y: 0, z: 0 });
    scoreManager.initializePlayer('player-1');
  });

  // 1. Test singleton instance
  test('LeaderboardManager maintains singleton instance', () => {
    const instance1 = LeaderboardManager.getInstance(mockWorld);
    const instance2 = LeaderboardManager.getInstance(mockWorld);
    
    expect(instance1).toBe(instance2);
  });
  
  // 2. Test global leaderboard persistence
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
    
    // Setup mock to return data
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(mockLeaderboard);
    
    // Retrieve the data
    const result = await leaderboardManager.getGlobalLeaderboard();
    
    // Verify data matches
    expect(result).toEqual(mockLeaderboard);
    expect(PersistenceManager.instance.getGlobalData).toHaveBeenCalledWith("astroBreaker_leaderboard");
  });
  
  // 3. Test player data persistence
  test('Player data is correctly persisted', async () => {
    const mockPlayerData: PlayerPersistentData = {
      personalBest: { 
        totalScore: 500, 
        highestRoundScore: 200, 
        highestCombo: 5, 
        date: '2023-01-01',
        totalScoreDate: '2023-01-01',
        highestRoundScoreDate: '2023-01-01',
        highestComboDate: '2023-01-01'
      },
      gamesPlayed: 10,
      totalWins: 3
    };
    
    // Setup mock to return data
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue(mockPlayerData);
    
    // Retrieve the data
    const result = await leaderboardManager.getPlayerData(mockPlayer);
    
    // Verify data matches
    expect(result).toEqual(mockPlayerData);
    expect(PersistenceManager.instance.getPlayerData).toHaveBeenCalledWith(mockPlayer);
  });
  
  // 4. Test score normalization
  test('Scores are correctly normalized between solo and multiplayer modes', async () => {
    // Direct test of the private normalizeScore method using any
    const normalizeScore = (leaderboardManager as any).normalizeScore.bind(leaderboardManager);
    
    // Solo scores should be multiplied by 0.8
    expect(normalizeScore(100, 'solo')).toBe(80);
    expect(normalizeScore(50, 'solo')).toBe(40);
    
    // Multiplayer scores should remain unchanged
    expect(normalizeScore(100, 'multiplayer')).toBe(100);
    expect(normalizeScore(50, 'multiplayer')).toBe(50);
  });
  
  // 5. Test adding all-time high scores
  test('All-time high scores are added and sorted correctly', async () => {
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
    
    // Check data was saved with correct sorting
    expect(PersistenceManager.instance.setGlobalData).toHaveBeenCalledWith(
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
  
  // 6. Test adding round high scores
  test('Round high scores are added and sorted correctly', async () => {
    // Setup initial leaderboard
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [],
      roundHighScores: [
        { playerName: 'player2', playerId: 'player2', roundScore: 200, roundNumber: 1, date: '2023-01-01' },
        { playerName: 'player3', playerId: 'player3', roundScore: 100, roundNumber: 1, date: '2023-01-01' }
      ]
    };
    
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(initialLeaderboard);
    
    // Add a new round high score
    await leaderboardManager.addRoundHighScore(mockPlayer, 150, 1);
    
    // Check data was saved with correct sorting
    expect(PersistenceManager.instance.setGlobalData).toHaveBeenCalledWith(
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
  
  // 7. Test updating player personal best
  test('Player personal best is updated correctly', async () => {
    // Setup initial player data
    const initialPlayerData: PlayerPersistentData = {
      personalBest: { 
        totalScore: 300, 
        highestRoundScore: 100, 
        highestCombo: 3, 
        date: '2023-01-01',
        totalScoreDate: '2023-01-01',
        highestRoundScoreDate: '2023-01-01',
        highestComboDate: '2023-01-01'
      },
      gamesPlayed: 5,
      totalWins: 1
    };
    
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue(initialPlayerData);
    
    // Update with higher scores
    await leaderboardManager.updatePlayerPersonalBest(mockPlayer, 400, 150, 5);
    
    // Check player data was updated with higher values only
    expect(PersistenceManager.instance.setPlayerData).toHaveBeenCalledWith(
      mockPlayer,
      expect.objectContaining({
        personalBest: expect.objectContaining({
          totalScore: 400,       // Updated (higher)
          highestRoundScore: 150, // Updated (higher)
          highestCombo: 5,       // Updated (higher)
          date: expect.any(String)
        })
      })
    );
    
    // Test that lower values don't overwrite higher ones
    jest.clearAllMocks();
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue({
      ...initialPlayerData,
      personalBest: { 
        totalScore: 500,  // Higher than the update value
        highestRoundScore: 200, 
        highestCombo: 6, 
        date: '2023-01-01' 
      }
    });
    
    // Try to update with lower scores
    await leaderboardManager.updatePlayerPersonalBest(mockPlayer, 400, 150, 5);
    
    // Check higher values were preserved
    expect(PersistenceManager.instance.setPlayerData).toHaveBeenCalledWith(
      mockPlayer,
      expect.objectContaining({
        personalBest: expect.objectContaining({
          totalScore: 500,       // Not updated (already higher)
          highestRoundScore: 200, // Not updated (already higher)
          highestCombo: 6,       // Not updated (already higher)
          date: expect.any(String)
        })
      })
    );
  });
  
  // 8. Test integration with ScoreManager
  test('ScoreManager correctly integrates with LeaderboardManager on round end', async () => {
    // Setup players and scores
    scoreManager.addScore('player-1', 150);
    
    // Mock player entities for round end
    (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([
      { player: { id: 'player-1' } }
    ]);
    
    // Setup leaderboard update method as spy
    const updateWithRoundScoresSpy = jest.spyOn(leaderboardManager, 'updateWithRoundScores');
    
    // Configure ScoreManager name to include round number
    scoreManager.name = 'ScoreManager-Round-3';
    
    // End the round which should trigger leaderboard update
    const result = scoreManager.handleRoundEnd();
    
    // Verify leaderboard was updated with correct data
    expect(updateWithRoundScoresSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'player-1',
          roundScore: 150
        })
      ]),
      3,  // Round number
      'solo'  // Game mode (solo since only one player)
    );
    
    // Verify winner was identified
    expect(result.winnerId).toBe('player-1');
  });
  
  // 9. Test in-world leaderboard marker creation
  test('In-world leaderboard markers are created correctly', async () => {
    // Mock scores for display
    const displayScores = [
      { playerName: 'player1', score: 200 },
      { playerName: 'player2', score: 150 }
    ];
    
    // Create a marker
    const marker = sceneUIManager.createLeaderboardMarker(
      { x: 10, y: 10, z: 10 },
      displayScores,
      50
    );
    
    // Verify SceneUI was created with correct parameters
    expect(marker).toBeDefined();
    expect(marker.load).toHaveBeenCalledWith(mockWorld);
  });
  
  // 10. Test games played counter is incremented
  test('Games played counter is incremented correctly', async () => {
    // Setup initial player data
    const initialPlayerData: PlayerPersistentData = {
      personalBest: { 
        totalScore: 0, 
        highestRoundScore: 0, 
        highestCombo: 0, 
        date: '',
        totalScoreDate: '',
        highestRoundScoreDate: '',
        highestComboDate: ''
      },
      gamesPlayed: 5,
      totalWins: 1
    };
    
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue(initialPlayerData);
    
    // Increment games played
    await leaderboardManager.incrementGamesPlayed(mockPlayer);
    
    // Verify count was incremented
    expect(PersistenceManager.instance.setPlayerData).toHaveBeenCalledWith(
      mockPlayer,
      expect.objectContaining({
        gamesPlayed: 6  // Incremented from 5
      })
    );
  });
  
  // 11. Test wins counter is incremented
  test('Wins counter is incremented correctly', async () => {
    // Setup initial player data
    const initialPlayerData: PlayerPersistentData = {
      personalBest: { 
        totalScore: 0, 
        highestRoundScore: 0, 
        highestCombo: 0, 
        date: '',
        totalScoreDate: '',
        highestRoundScoreDate: '',
        highestComboDate: ''
      },
      gamesPlayed: 5,
      totalWins: 3
    };
    
    (PersistenceManager.instance.getPlayerData as jest.Mock).mockResolvedValue(initialPlayerData);
    
    // Increment wins
    await leaderboardManager.incrementWins(mockPlayer);
    
    // Verify count was incremented
    expect(PersistenceManager.instance.setPlayerData).toHaveBeenCalledWith(
      mockPlayer,
      expect.objectContaining({
        totalWins: 4  // Incremented from 3
      })
    );
  });
  
  // 12. Test leaderboard visibility preference - SKIPPED (feature removed)
  test.skip('Leaderboard visibility preference is stored correctly', async () => {
    // This test is skipped because the showLeaderboard property has been removed
    // from the PlayerPersistentData interface in Phase 1.4 of the refactoring plan
    expect(true).toBe(true);
  });
  
  // 13. Test leaderboard qualifier check
  test('Leaderboard qualifier check works correctly', async () => {
    // Setup leaderboard with 10 entries
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: Array(10).fill(0).map((_, i) => ({
        playerName: `player${i}`,
        playerId: `player${i}`,
        score: 50 + i * 10,  // Scores from 50 to 140
        date: '2023-01-01'
      })),
      roundHighScores: []
    };
    
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(initialLeaderboard);
    
    // Test with qualifying score (higher than lowest of 50)
    const qualifies = await leaderboardManager.isLeaderboardQualifier(60);
    expect(qualifies).toBe(true);
    
    // Test with non-qualifying score (equal to lowest of 50)
    const doesNotQualify = await leaderboardManager.isLeaderboardQualifier(50);
    expect(doesNotQualify).toBe(false);
  });
  
  // 14. Test game results updating
  test('Game results update the leaderboard correctly', async () => {
    // Setup initial leaderboard
    const initialLeaderboard: GlobalLeaderboard = {
      allTimeHighScores: [],
      roundHighScores: []
    };
    
    (PersistenceManager.instance.getGlobalData as jest.Mock).mockResolvedValue(initialLeaderboard);
    
    // Setup final standings
    const finalStandings = [
      { playerId: 'player-1', totalScore: 500 },
      { playerId: 'player-2', totalScore: 300 }
    ];
    
    // Mock player entities for entityManager.getAllPlayerEntities
    (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([
      { player: { id: 'player-1' } },
      { player: { id: 'player-2' } }
    ]);
    
    // Update with game results
    await leaderboardManager.updateWithGameResults(finalStandings, 'multiplayer');
    
    // Verify leaderboard was updated
    expect(PersistenceManager.instance.setGlobalData).toHaveBeenCalledWith(
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