import { RoundManager } from '../managers/round-manager';
import { ScoreManager } from '../managers/score-manager';
import { MovingBlockManager } from '../moving_blocks/moving-block-entity';
import { World } from 'hytopia';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock implementations
const mockWorld = {
    entityManager: {
        getAllPlayerEntities: jest.fn(),
        getAllEntities: jest.fn()
    }
} as unknown as World;

const mockBlockManager = {
    getBlockCount: jest.fn(),
    createZAxisBlock: jest.fn(),
    createSineWaveBlock: jest.fn(),
    createStaticTarget: jest.fn(),
    createVerticalWaveBlock: jest.fn()
} as unknown as MovingBlockManager;

// Mock round config for faster tests
const TEST_ROUND_DURATION = 100; // 100ms for tests
const TEST_TRANSITION_DURATION = 50; // 50ms for transition (faster for tests)

// Override getRoundConfig for tests
const createTestRoundManager = (world: World, blockManager: MovingBlockManager, scoreManager: ScoreManager) => {
    const manager = new RoundManager(world, blockManager, scoreManager, TEST_TRANSITION_DURATION);
    
    // Override countdown for faster tests
    (manager as any).startCountdown = function() {
        if (this.roundTransitionPending) return;
        // Immediate start for tests
        setTimeout(() => this.actuallyStartRound(), 10);
    };
    
    (manager as any).getRoundConfig = () => ({
        duration: TEST_ROUND_DURATION,
        minBlockCount: 8,
        maxBlockCount: 12,
        blockSpawnInterval: 50,
        speedMultiplier: 0.5,
        blockTypes: {
            normal: 0,
            sineWave: 0,
            static: 1,
            verticalWave: 0,
            popup: 0,
            rising: 0,
            parabolic: 0,
            pendulum: 0
        }
    });
    return manager;
};

describe('RoundManager - Game Lifecycle', () => {
    let roundManager: RoundManager;
    let scoreManager: ScoreManager;
    let mockPlayers: any[];

    // Helper function to add mock players
    const addMockPlayer = (playerId: string) => {
        const mockPlayer = { 
            player: { 
                id: playerId,
                ui: { sendData: jest.fn() }
            }
        };
        mockPlayers.push(mockPlayer);
        (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create fresh instances
        scoreManager = new ScoreManager();
        roundManager = createTestRoundManager(mockWorld, mockBlockManager, scoreManager);
        
        // Setup default mock players
        mockPlayers = [
            { 
                player: { 
                    id: 'player1',
                    ui: { sendData: jest.fn() }
                }
            },
            { 
                player: { 
                    id: 'player2',
                    ui: { sendData: jest.fn() }
                }
            }
        ];
        
        // Default mock implementation
        (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
        (mockWorld.entityManager.getAllEntities as jest.Mock).mockReturnValue([]);
    });

    describe('Game Start Conditions', () => {
        test('should not start game with insufficient players', () => {
            // Mock no players
            (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([]);
            
            roundManager.startRound();
            
            // Should be in waiting state
            expect(roundManager.isWaitingForPlayers()).toBe(true);
            expect(roundManager.isActive()).toBe(false);
        });

        test('should start game when minimum players join', () => {
            // Mock minimum required players
            (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
            
            roundManager.startRound();
            
            // Should start countdown and not be in waiting state
            expect(roundManager.isWaitingForPlayers()).toBe(false);
            // Note: Round won't be active immediately due to countdown
            expect(roundManager.getCurrentRound()).toBe(0);
        });

        test('should broadcast waiting for players message', () => {
            // Setup a mock player first, then remove them
            (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
            
            // Then mock no players for the actual check
            (mockWorld.entityManager.getAllPlayerEntities as jest.Mock)
                .mockReturnValueOnce([])  // First call returns empty
                .mockReturnValue(mockPlayers);  // Subsequent calls return players
            
            roundManager.startRound();
            
            expect(roundManager.isWaitingForPlayers()).toBe(true);
            // Verify waiting message was broadcast to the mock player
            expect(mockPlayers[0].player.ui.sendData).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'waitingForPlayers',
                    data: expect.objectContaining({
                        current: 0,
                        required: 2
                    })
                })
            );
        });
    });

    describe('Round Progression', () => {
        test('should increment round counter when round starts', async () => {
            // Mock private method to bypass countdown
            (roundManager as any).actuallyStartRound();
            
            // Round should be incremented immediately
            expect(roundManager.getCurrentRound()).toBe(1);
            expect(roundManager.isActive()).toBe(true);
        });

        test('should end round after duration', async () => {
            (roundManager as any).actuallyStartRound();
            
            // Fast forward round duration
            await new Promise(resolve => setTimeout(resolve, TEST_ROUND_DURATION + 50));
            roundManager.endRound();
            
            expect(roundManager.isActive()).toBe(false);
        });

        test('should broadcast round updates', async () => {
            (roundManager as any).actuallyStartRound();
            
            // Wait for round to start
            await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION));
            
            // Verify round info was broadcast
            expect(mockPlayers[0].player.ui.sendData).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'roundUpdate'
                })
            );
        });
    });

    describe('Game End and Restart', () => {
        test('should end game after max rounds', async () => {
            // Get max rounds from the manager's config
            const maxRounds = (roundManager as any).GAME_CONFIG.maxRounds;
            
            // Run through all rounds
            for (let i = 0; i < maxRounds; i++) {
                (roundManager as any).actuallyStartRound();
                await new Promise(resolve => setTimeout(resolve, TEST_ROUND_DURATION / 2));
                roundManager.endRound();
                if (i < maxRounds - 1) {
                    await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
                }
            }

            // Short wait for final events to process
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify game end broadcast
            const calls = mockPlayers[0].player.ui.sendData.mock.calls;
            const gameEndCall = calls.find((call: any) => call[0]?.type === 'gameEnd');
            expect(gameEndCall).toBeTruthy();
        });

        test('should reset game state for new game', async () => {
            // Start and end a game
            (roundManager as any).actuallyStartRound();
            await new Promise(resolve => setTimeout(resolve, TEST_ROUND_DURATION / 2));
            roundManager.endRound();
            await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
            (roundManager as any).resetGame();
            
            expect(roundManager.getCurrentRound()).toBe(0);
            expect(roundManager.isActive()).toBe(false);
        });

        test('should handle player leaving mid-game', async () => {
            (roundManager as any).actuallyStartRound();
            await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 50));
            
            // Mock player leaving
            (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue([]);
            roundManager.handlePlayerLeave();
            
            // Game should continue with fewer players
            expect(roundManager.isActive()).toBe(true);
        });
    });

    describe('Leaderboard and Scoring', () => {
        test('should track round winners', () => {
            (roundManager as any).actuallyStartRound();
            
            // Simulate some scoring
            scoreManager.addScore('player1', 100);
            
            roundManager.endRound();
            
            // Verify winner announcement
            expect(mockPlayers[0].player.ui.sendData).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'roundEnd'
                })
            );
        });

        test('should calculate final standings at game end', async () => {
            const maxRounds = (roundManager as any).GAME_CONFIG.maxRounds;
            
            // Run through all rounds with scoring
            for (let i = 0; i < maxRounds; i++) {
                (roundManager as any).actuallyStartRound();
                scoreManager.addScore('player1', 100);
                roundManager.endRound();
                
                // Wait for round transition
                await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 50));
                
                // Wait for any pending round start
                while ((roundManager as any).roundTransitionPending) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Wait for final game end calculations
            await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 100));

            // Get the last call arguments to sendData
            const calls = mockPlayers[0].player.ui.sendData.mock.calls;
            const gameEndCall = calls.find((call: any) => call[0]?.type === 'gameEnd');

            // Verify game end data was sent
            expect(gameEndCall).toBeTruthy();
            expect(gameEndCall[0]).toEqual({
                type: 'gameEnd',
                data: expect.objectContaining({
                    nextGameIn: expect.any(Number),
                    standings: expect.arrayContaining([
                        expect.objectContaining({
                            playerId: expect.any(String),
                            totalScore: expect.any(Number),
                            placementPoints: expect.any(Number),
                            wins: expect.any(Number)
                        })
                    ]),
                    stats: expect.objectContaining({
                        completedRounds: expect.any(Number),
                        totalRounds: expect.any(Number)
                    }),
                    winner: expect.objectContaining({
                        playerId: expect.any(String),
                        totalScore: expect.any(Number),
                        placementPoints: expect.any(Number),
                        wins: expect.any(Number)
                    })
                })
            });
        });
    });

    describe('Cleanup', () => {
        test('should properly cleanup resources', () => {
            (roundManager as any).actuallyStartRound();
            
            // Force round to be active
            expect(roundManager.isActive()).toBe(true);
            
            // Cleanup should clear all timers and state
            roundManager.cleanup();
            roundManager.endRound(); // Ensure round is properly ended
            
            expect(roundManager.isActive()).toBe(false);
            expect((roundManager as any).roundTimer).toBeNull();
            expect((roundManager as any).blockSpawnTimer).toBeNull();
            expect((roundManager as any).checkPlayersInterval).toBeNull();
        });
    });
});

describe('RoundManager - Round Continuity', () => {
    let roundManager: RoundManager;
    let scoreManager: ScoreManager;
    let mockPlayers: any[];
    let mockWorld: jest.Mocked<World>;
    let mockBlockManager: jest.Mocked<MovingBlockManager>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup mock players
        mockPlayers = [];
        
        // Setup mock world
        mockWorld = {
            entityManager: {
                getAllPlayerEntities: jest.fn(() => mockPlayers),
                getAllEntities: jest.fn(() => [])
            }
        } as unknown as jest.Mocked<World>;

        // Setup mock block manager
        mockBlockManager = {
            getBlockCount: jest.fn(),
            createZAxisBlock: jest.fn(),
            createSineWaveBlock: jest.fn(),
            createStaticTarget: jest.fn(),
            createVerticalWaveBlock: jest.fn()
        } as unknown as jest.Mocked<MovingBlockManager>;

        // Create fresh instances with test config
        scoreManager = new ScoreManager();
        roundManager = createTestRoundManager(mockWorld, mockBlockManager, scoreManager);
    });

    const addMockPlayer = (id: string) => {
        const player = {
            id,
            ui: { sendData: jest.fn() }
        };
        const playerEntity = { player };
        mockPlayers.push(playerEntity);
        return playerEntity;
    };

    test('should maintain round count when player leaves and new player joins mid-game', async () => {
        // Add initial players and start game
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Start first round
        roundManager.startRound();
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(1);
        expect((roundManager as any).gameInProgress).toBe(true);

        // End round 1
        roundManager.endRound();
        expect(roundManager.getCurrentRound()).toBe(1);

        // Remove player1, add player2
        mockPlayers = [];
        addMockPlayer('player2');

        // Start round 2 - should continue from previous round
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(2);
        expect((roundManager as any).gameInProgress).toBe(true);

        // Add back player1
        addMockPlayer('player1');
        expect(roundManager.getCurrentRound()).toBe(2);

        // Verify game is still in progress
        expect((roundManager as any).gameInProgress).toBe(true);
    });

    test('should only reset game when waiting for initial players', () => {
        // Start with no players
        expect(mockPlayers.length).toBe(0);
        roundManager.startRound();
        expect(roundManager.isWaitingForPlayers()).toBe(true);
        expect((roundManager as any).gameInProgress).toBe(false);

        // Add first player
        addMockPlayer('player1');
        roundManager.startRound();
        expect(roundManager.isWaitingForPlayers()).toBe(true);
        
        // Add second player and start game
        addMockPlayer('player2');
        roundManager.startRound();
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(1);
        expect((roundManager as any).gameInProgress).toBe(true);
    });

    test('should complete full game cycle with player changes', async () => {
        // Start with two players
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Play through all rounds with player changes
        for (let i = 0; i < (roundManager as any).GAME_CONFIG.maxRounds; i++) {
            roundManager.startRound();
            (roundManager as any).actuallyStartRound();
            
            // Simulate player switch in middle rounds
            if (i === 1) {
                mockPlayers = [];
                addMockPlayer('player2');
            }
            if (i === 2) {
                addMockPlayer('player1');
            }
            
            expect(roundManager.getCurrentRound()).toBe(i + 1);
            expect((roundManager as any).gameInProgress).toBe(true);
            
            roundManager.endRound();
        }
        
        // Verify game ended properly
        expect(roundManager.getCurrentRound()).toBe((roundManager as any).GAME_CONFIG.maxRounds);
        expect((roundManager as any).gameInProgress).toBe(false);
    });

    test('should not start new round if one is pending', async () => {
        // Add initial players and start game
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Start and end round 1
        roundManager.startRound();
        await new Promise(resolve => setTimeout(resolve, 20));
        (roundManager as any).actuallyStartRound();
        roundManager.endRound();
        
        // Verify transition state
        expect((roundManager as any).roundTransitionPending).toBe(true);
        
        // Simulate new player joining during the wait
        addMockPlayer('player3');
        roundManager.startRound(); // Should not trigger new round
        
        expect(roundManager.getCurrentRound()).toBe(1);
        
        // Wait for transition to complete
        await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
        (roundManager as any).actuallyStartRound();
        
        // Now round should have incremented
        expect(roundManager.getCurrentRound()).toBe(2);
    });

    test('should handle player reload during round transition', async () => {
        // Start with two players
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Start and end round 1
        roundManager.startRound();
        (roundManager as any).actuallyStartRound();
        roundManager.endRound();
        
        // Simulate player "reload" - same player rejoining
        mockPlayers = [];
        const player1Rejoined = addMockPlayer('player1');
        
        // Try to start round (as would happen on player join)
        roundManager.startRound();
        
        // Should still be in round 1, waiting for scheduled next round
        expect(roundManager.getCurrentRound()).toBe(1);
        
        // Let the scheduled round start happen
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(2);
    });

    test('should prevent double round starts during transition period', async () => {
        // Add initial players and start game
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Start first round
        roundManager.startRound();
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(1);
        
        // End round which schedules next round start
        roundManager.endRound();
        
        // Verify we're in transition state
        expect((roundManager as any).isRoundActive).toBe(false);
        expect((roundManager as any).roundTransitionPending).toBe(true);
        
        // Simulate player reload/rejoin during transition
        mockPlayers = [];
        addMockPlayer('player1');
        roundManager.startRound(); // This should not trigger a new round
        
        // Wait for the transition time
        await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 50));
        
        // Add another player during transition
        addMockPlayer('player2');
        
        // Let the scheduled round start happen
        (roundManager as any).actuallyStartRound();
        
        // Verify round incremented
        expect(roundManager.getCurrentRound()).toBe(2);
    });

    test('should properly handle rapid player joins/leaves', async () => {
        // Reset game state first
        (roundManager as any).resetGame();
        expect(roundManager.getCurrentRound()).toBe(0);

        // Add initial players and start first round
        addMockPlayer('player1');
        addMockPlayer('player2');
        roundManager.startRound();
        await new Promise(resolve => setTimeout(resolve, 20));
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(1);

        // End round which triggers transition
        roundManager.endRound();
        expect((roundManager as any).roundTransitionPending).toBe(true);

        // Simulate rapid player changes during transition
        for(let i = 0; i < 5; i++) {
            mockPlayers = [];
            addMockPlayer(`player${i}`);
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        // Wait for the transition time
        await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
        
        // Let the scheduled round start happen
        (roundManager as any).actuallyStartRound();
        
        // Verify round incremented
        expect(roundManager.getCurrentRound()).toBe(2);
    });

    test('should maintain roundTransitionPending state during player changes', async () => {
        // Start game with two players
        addMockPlayer('player1');
        addMockPlayer('player2');
        roundManager.startRound();
        (roundManager as any).actuallyStartRound();
        
        // End round 1 which sets roundTransitionPending
        roundManager.endRound();
        expect((roundManager as any).roundTransitionPending).toBe(true);
        
        // Simulate player leaving during transition
        mockPlayers = [];
        roundManager.handlePlayerLeave();
        expect((roundManager as any).roundTransitionPending).toBe(true);
        
        // Simulate new player joining during transition
        addMockPlayer('player3');
        roundManager.startRound();
        expect((roundManager as any).roundTransitionPending).toBe(true);
        
        // Wait for transition
        await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 50));
        
        // Let scheduled round start happen
        (roundManager as any).actuallyStartRound();
        
        // Verify transition completed
        expect((roundManager as any).roundTransitionPending).toBe(false);
        expect(roundManager.getCurrentRound()).toBe(2);
    });

    test('should properly transition game states from active to end', async () => {
        // Reset game state first
        (roundManager as any).resetGame();
        expect(roundManager.getCurrentRound()).toBe(0);

        // Add players and start game
        addMockPlayer('player1');
        addMockPlayer('player2');
        roundManager.startRound();
        
        // Wait for initial round to start
        await new Promise(resolve => setTimeout(resolve, 20));
        (roundManager as any).actuallyStartRound();
        expect(roundManager.getCurrentRound()).toBe(1);

        // Configure a shorter game for test speed
        (roundManager as any).GAME_CONFIG.maxRounds = 3;

        // Simulate rounds until game end
        for (let i = 0; i < (roundManager as any).GAME_CONFIG.maxRounds - 1; i++) {
            // Update player score
            scoreManager.addScore('player1', 100);
            
            // End current round
            roundManager.endRound();
            
            if (i < (roundManager as any).GAME_CONFIG.maxRounds - 2) {
                // Wait for transition
                await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
                
                // Start next round
                (roundManager as any).actuallyStartRound();
                
                // Verify game is still in progress and round incremented
                expect((roundManager as any).gameInProgress).toBe(true);
                expect(roundManager.getCurrentRound()).toBe(i + 2);
            }
        }
        
        // Wait for final game end processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify final game state
        expect((roundManager as any).gameInProgress).toBe(false);
        
        // Verify game end message was sent
        const calls = mockPlayers[0].player.ui.sendData.mock.calls;
        const gameEndCall = calls.find((call: any) => call[0]?.type === 'gameEnd');
        expect(gameEndCall).toBeTruthy();
    });
});

describe('RoundManager - Round Timing', () => {
    let roundManager: RoundManager;
    let scoreManager: ScoreManager;
    let mockPlayers: any[];

    // Helper function to add mock players
    const addMockPlayer = (playerId: string) => {
        const mockPlayer = { 
            player: { 
                id: playerId,
                ui: { sendData: jest.fn() }
            }
        };
        mockPlayers.push(mockPlayer);
        (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        scoreManager = new ScoreManager();
        mockPlayers = [{ 
            player: { 
                id: 'player1',
                ui: { sendData: jest.fn() }
            }
        }];
        
        (mockWorld.entityManager.getAllPlayerEntities as jest.Mock).mockReturnValue(mockPlayers);
        (mockWorld.entityManager.getAllEntities as jest.Mock).mockReturnValue([]);
        
        roundManager = createTestRoundManager(mockWorld, mockBlockManager, scoreManager);
    });

    test('should respect round duration and transition timing', async () => {
        // Add required players
        addMockPlayer('player1');
        addMockPlayer('player2');
        
        // Start first round
        roundManager.startRound();
        await new Promise(resolve => setTimeout(resolve, 50)); // Short wait for test countdown
        
        expect(roundManager.getCurrentRound()).toBe(1);
        expect(roundManager.isActive()).toBe(true);
        
        // End round 1
        roundManager.endRound();
        
        // Verify round is not active and transition is pending
        expect(roundManager.isActive()).toBe(false);
        expect((roundManager as any).roundTransitionPending).toBe(true);
        expect(roundManager.getCurrentRound()).toBe(1); // Should still be round 1
        
        // Try to start next round immediately - should not work
        roundManager.startRound();
        expect(roundManager.getCurrentRound()).toBe(1); // Should still be round 1
        expect(roundManager.isActive()).toBe(false);
        
        // Wait for transition time
        await new Promise(resolve => setTimeout(resolve, TEST_TRANSITION_DURATION + 20));
        
        // Now round 2 should be starting or active
        expect(roundManager.getCurrentRound()).toBeGreaterThan(1);
    });
}); 