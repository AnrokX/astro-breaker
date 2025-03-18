import { World } from './mocks/hytopia';
import { RoundUI } from '../managers/round/components/round-ui';
import { ScoreManager } from '../managers/score-manager';
import { GameEndStanding, RoundEndPlacement } from '../managers/round/interfaces/round-interfaces';

// Mock World and ScoreManager
jest.mock('./mocks/hytopia');
jest.mock('../managers/score-manager');

describe('RoundUI', () => {
  let roundUI: RoundUI;
  let world: World;
  let scoreManager: ScoreManager;
  let mockPlayerEntities: any[];
  let mockPlayerId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    world = new World();
    scoreManager = new ScoreManager();
    roundUI = new RoundUI(world, scoreManager, { gameMode: 'multiplayer' });
    
    // Create mock player entities
    mockPlayerId = 'player1';
    mockPlayerEntities = [
      {
        player: {
          id: mockPlayerId,
          ui: {
            sendData: jest.fn()
          }
        }
      },
      {
        player: {
          id: 'player2',
          ui: {
            sendData: jest.fn()
          }
        }
      }
    ];
    
    // Setup world mock
    (world.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayerEntities);
  });

  test('displayRoundInfo should send round update to all players', () => {
    // Set up test data
    const round = 1;
    const totalRounds = 10;
    const remainingRounds = 9;
    const remainingTime = 60000;
    
    // Call method
    roundUI.displayRoundInfo(round, totalRounds, remainingRounds, remainingTime);
    
    // Verify all players received the message
    for (const entity of mockPlayerEntities) {
      expect(entity.player.ui.sendData).toHaveBeenCalledWith({
        type: 'roundUpdate',
        data: {
          round,
          totalRounds,
          remainingRounds,
          duration: expect.any(Number),
          timeRemaining: remainingTime
        }
      });
    }
  });

  test('displayRoundEnd should send round end information to all players', () => {
    // Set up test data
    const round = 1;
    const totalRounds = 10;
    const winnerId = 'player1';
    const placements: RoundEndPlacement[] = [
      { playerId: 'player1', points: 100, playerNumber: 1, playerColor: '#FF0000' },
      { playerId: 'player2', points: 50, playerNumber: 2, playerColor: '#0000FF' }
    ];
    const transitionDuration = 3000;
    
    // Call method
    roundUI.displayRoundEnd(round, totalRounds, winnerId, placements, transitionDuration);
    
    // Verify each player received message with their ID for highlighting
    expect(mockPlayerEntities[0].player.ui.sendData).toHaveBeenCalledWith({
      type: 'roundEnd',
      data: {
        round,
        totalRounds,
        nextRoundIn: transitionDuration,
        winnerId,
        placements,
        currentPlayerId: 'player1'
      }
    });
    
    expect(mockPlayerEntities[1].player.ui.sendData).toHaveBeenCalledWith({
      type: 'roundEnd',
      data: {
        round,
        totalRounds,
        nextRoundIn: transitionDuration,
        winnerId,
        placements,
        currentPlayerId: 'player2'
      }
    });
  });

  test('displayWaitingForPlayers should send waiting info to all players', () => {
    // Set up test data
    const currentCount = 1;
    const requiredCount = 2;
    
    // Call method
    roundUI.displayWaitingForPlayers(currentCount, requiredCount);
    
    // Verify message sent to all players
    for (const entity of mockPlayerEntities) {
      expect(entity.player.ui.sendData).toHaveBeenCalledWith({
        type: 'waitingForPlayers',
        data: {
          current: currentCount,
          required: requiredCount,
          remaining: requiredCount - currentCount
        }
      });
    }
  });
  
  test('displayWaitingForPlayers should send solo start message when in solo mode', () => {
    // Create a RoundUI instance with solo mode
    const soloRoundUI = new RoundUI(world, scoreManager, { gameMode: 'solo' });
    
    // Call method with solo mode flag
    soloRoundUI.displayWaitingForPlayers(1, 1, true);
    
    // Verify solo message sent to all players
    for (const entity of mockPlayerEntities) {
      expect(entity.player.ui.sendData).toHaveBeenCalledWith({
        type: 'waitingForSoloStart',
        data: {
          message: 'Press SPACE to start solo game'
        }
      });
    }
  });

  test('displayGameEnd should send appropriate messages to players in multiplayer mode', () => {
    // Set up test data
    const winner: GameEndStanding = {
      playerId: 'player1',
      playerNumber: 1,
      playerColor: '#FF0000',
      placementPoints: 150,
      wins: 3,
      totalScore: 300
    };
    
    const standings: GameEndStanding[] = [
      winner,
      {
        playerId: 'player2',
        playerNumber: 2,
        playerColor: '#0000FF',
        placementPoints: 100,
        wins: 2,
        totalScore: 200
      }
    ];
    
    // Call method
    roundUI.displayGameEnd(winner, standings, 10, 8, 10000);
    
    // Verify all players got the game end message with their ID
    expect(mockPlayerEntities[0].player.ui.sendData).toHaveBeenCalledWith({
      type: 'gameEnd',
      data: {
        winner,
        standings,
        currentPlayerId: 'player1',
        nextGameIn: 10000,
        stats: {
          totalRounds: 10,
          completedRounds: 8
        },
        isSoloMode: false
      }
    });
    
    // Winner should get congratulatory message
    expect(mockPlayerEntities[0].player.ui.sendData).toHaveBeenCalledWith({
      type: 'systemMessage',
      message: expect.stringContaining('Congratulations'),
      color: 'FFD700'
    });
    
    // All players should get winner announcement
    for (const entity of mockPlayerEntities) {
      expect(entity.player.ui.sendData).toHaveBeenCalledWith({
        type: 'systemMessage',
        message: expect.stringContaining('Player 1 wins'),
        color: 'FFD700'
      });
    }
  });
  
  test('displayGameEnd should send solo-specific messages in solo mode', () => {
    // Create a RoundUI instance with solo mode
    const soloRoundUI = new RoundUI(world, scoreManager, { gameMode: 'solo' });
    
    // Set up test data
    const winner: GameEndStanding = {
      playerId: 'player1',
      playerNumber: 1,
      playerColor: '#FF0000',
      placementPoints: 0,
      wins: 0,
      totalScore: 300
    };
    
    const standings: GameEndStanding[] = [winner];
    
    // Call method
    soloRoundUI.displayGameEnd(winner, standings, 10, 8, 5000);
    
    // Verify game end message includes solo mode flag
    expect(mockPlayerEntities[0].player.ui.sendData).toHaveBeenCalledWith({
      type: 'gameEnd',
      data: {
        winner,
        standings,
        currentPlayerId: 'player1',
        nextGameIn: 5000,
        stats: {
          totalRounds: 10,
          completedRounds: 8
        },
        isSoloMode: true
      }
    });
    
    // Solo player should get solo completion message
    expect(mockPlayerEntities[0].player.ui.sendData).toHaveBeenCalledWith({
      type: 'systemMessage',
      message: expect.stringContaining('Game complete'),
      color: 'FFD700'
    });
    
    // Should NOT get multiplayer winner announcement
    for (const entity of mockPlayerEntities) {
      const calls = (entity.player.ui.sendData as jest.Mock).mock.calls;
      const hasWinnerAnnouncement = calls.some(call => 
        call[0].type === 'systemMessage' && 
        call[0].message.includes('Player 1 wins')
      );
      expect(hasWinnerAnnouncement).toBe(false);
    }
  });

  test('displaySystemMessage should send message to all players', () => {
    // Set up test data
    const message = 'Test system message';
    const color = 'FF0000';
    
    // Call method
    roundUI.displaySystemMessage(message, color);
    
    // Verify all players received the message
    for (const entity of mockPlayerEntities) {
      expect(entity.player.ui.sendData).toHaveBeenCalledWith({
        type: 'systemMessage',
        message,
        color
      });
    }
  });

  test('updateLeaderboard should call scoreManager broadcastScores', () => {
    // Call method
    roundUI.updateLeaderboard();
    
    // Verify scoreManager method called
    expect(scoreManager.broadcastScores).toHaveBeenCalledWith(world);
  });
});