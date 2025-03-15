import { World, Vector3Like } from 'hytopia';
import { MovingBlockManager, MOVING_BLOCK_CONFIG } from '../moving_blocks/moving-block-entity';
import { ScoreManager } from './score-manager';
import { AudioManager } from './audio-manager';

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

interface SpawnPosition extends Vector3Like {
    moveSpeed?: number;
}

export interface GameConfig {
    maxRounds: number;
}

interface GameEndStanding {
    playerId: string;
    placementPoints: number;
    wins: number;
    totalScore: number;
}

export class RoundManager {
    private currentRound: number = 0;
    private roundTimer: NodeJS.Timeout | null = null;
    private blockSpawnTimer: NodeJS.Timeout | null = null;
    private isRoundActive: boolean = false;
    private roundStartTime: number = 0;
    private lastUpdateTime: number = 0;
    private waitingForPlayers: boolean = false;
    private readonly REQUIRED_PLAYERS = 2;
    private checkPlayersInterval: NodeJS.Timeout | null = null;
    private readonly GAME_CONFIG: GameConfig = {
        maxRounds: 10
    };
    private gameInProgress: boolean = false;
    private roundTransitionPending: boolean = false;
    private readonly TRANSITION_DURATION: number = 1000; // Reduced to 1 second

    // Helper function to get a random Y position within a range
    private getRandomY(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    constructor(
        private world: World,
        private blockManager: MovingBlockManager,
        private scoreManager: ScoreManager,
        transitionDuration?: number
    ) {
        if (transitionDuration !== undefined) {
            this.TRANSITION_DURATION = transitionDuration;
        }
    }

    private getPlayerCount(): number {
        return this.world.entityManager.getAllPlayerEntities().length;
    }

    private getRoundConfig(round: number): RoundConfig {
        // Tutorial round (Round 1) - Static targets only
        if (round === 1) {
            return {
                duration: 10000,  // 10 seconds (was 60000)
                minBlockCount: 8,
                maxBlockCount: 12,
                blockSpawnInterval: 500,
                speedMultiplier: 0.5,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 1.0,    // 100% static targets for learning
                    verticalWave: 0,
                    popup: 0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }
        
        // Round 2 - 100% Normal Blocks
        if (round === 2) {
            return {
                duration: 10000,  // 10 seconds (was 30000)
                minBlockCount: 2,
                maxBlockCount: 4,
                blockSpawnInterval: 500,
                speedMultiplier: 0.6,
                blockTypes: {
                    normal: 1.0,    // 100% normal blocks
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0,
                    popup: 0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }
        
        // Round 3 - 100% Sine Wave
        if (round === 3) {
            return {
                duration: 10000,  // 10 seconds (was 30000)
                minBlockCount: 3,
                maxBlockCount: 6,
                blockSpawnInterval: 500,
                speedMultiplier: 0.65,
                blockTypes: {
                    normal: 0,
                    sineWave: 1.0,
                    static: 0,
                    verticalWave: 0,
                    popup: 0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }

        // Round 4 - 100% Vertical Wave
        if (round === 4) {
            return {
                duration: 10000,  // 10 seconds (was 25000)
                minBlockCount: 2,
                maxBlockCount: 6,
                blockSpawnInterval: 500,
                speedMultiplier: 0.7,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 1.0,
                    popup: 0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }

        // Round 5 - 100% Pop-up
        if (round === 5) {
            return {
                duration: 10000,  // 10 seconds (was 25000)
                minBlockCount: 2,
                maxBlockCount: 4,
                blockSpawnInterval: 500,
                speedMultiplier: 0.75,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0,
                    popup: 1.0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }

        // Round 6 - 100% Rising
        if (round === 6) {
            return {
                duration: 10000,  // 10 seconds (was 25000)
                minBlockCount: 2,
                maxBlockCount: 4,
                blockSpawnInterval: 500,
                speedMultiplier: 0.8,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0,
                    popup: 0,
                    rising: 1.0,
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }

        // Round 7 - 100% Parabolic
        if (round === 7) {
            return {
                duration: 10000,  // 10 seconds (was 30000)
                minBlockCount: 2,
                maxBlockCount: 4,
                blockSpawnInterval: 500,
                speedMultiplier: 0.85,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0,
                    popup: 0,
                    rising: 0,
                    parabolic: 1.0,
                    pendulum: 0
                }
            };
        }

        // Round 8 - 100% Pendulum
        if (round === 8) {
            return {
                duration: 10000,  // 10 seconds (was 30000)
                minBlockCount: 2,
                maxBlockCount: 4,
                blockSpawnInterval: 500,
                speedMultiplier: 0.9,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0,
                    popup: 0,
                    rising: 0,
                    parabolic: 0,
                    pendulum: 1.0
                }
            };
        }

        // Round 9 - "Up and Down" Mix (Vertical Wave, Rising, and Popup)
        if (round === 9) {
            return {
                duration: 10000,  // 10 seconds (was 30000)
                minBlockCount: 2,
                maxBlockCount: 6,
                blockSpawnInterval: 500,
                speedMultiplier: 0.95,
                blockTypes: {
                    normal: 0,
                    sineWave: 0,
                    static: 0,
                    verticalWave: 0.4,  // 40% vertical wave
                    popup: 0.3,         // 30% popup
                    rising: 0.3,        // 30% rising
                    parabolic: 0,
                    pendulum: 0
                }
            };
        }

        // Round 10 - "Chaos" Mix (Pendulum, Parabolic, and Sine Wave)
        return {
            duration: 10000,  // 10 seconds (was 30000)
            minBlockCount: 4,
            maxBlockCount: 6,
            blockSpawnInterval: 500,
            speedMultiplier: 1.0,
            blockTypes: {
                normal: 0,
                sineWave: 0.3,     // 30% sine wave
                static: 0,
                verticalWave: 0,
                popup: 0,
                rising: 0,
                parabolic: 0.4,    // 40% parabolic
                pendulum: 0.3      // 30% pendulum
            }
        };
    }

    private startCountdown(): void {
        // Don't start countdown if in transition or a round is active
        if (this.roundTransitionPending || this.isRoundActive) return;
        
        // IMPORTANT: Don't set roundTransitionPending flag until countdown is complete
        // This allows shooting to continue during countdown
        
        // Simplified transition - just wait a short time then start
        setTimeout(() => {
            // Double-check that we still want to start the round
            if (!this.isRoundActive) {
                this.actuallyStartRound();
            }
        }, 1000);
    }

    private actuallyStartRound(): void {
        // Don't start if a round is already active
        if (this.isRoundActive) {
            console.log('Attempted to start round while another is active');
            return;
        }

        this.currentRound++;
        
        // Make sure to set this flag first to allow shooting
        this.isRoundActive = true;
        this.gameInProgress = true;
        this.roundStartTime = Date.now();
        this.lastUpdateTime = this.roundStartTime;

        const config = this.getRoundConfig(this.currentRound);
        console.log('Starting round with config:', config);

        // Clear any existing blocks before starting new round
        this.world.entityManager.getAllEntities()
            .filter(entity => entity.name.toLowerCase().includes('block'))
            .forEach(entity => entity.despawn());

        // Reset scores for the new round
        this.scoreManager.startNewRound();
        
        // Broadcast round start with full duration
        this.broadcastRoundInfo();

        // Start block spawning
        this.startBlockSpawning(config);

        // Set round timer
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
        }
        
        this.roundTimer = setTimeout(() => {
            console.log('Round timer completed');
            this.endRound();
        }, config.duration);
    }

    public startRound(): void {
        // Don't start if round is active or we're in transition
        if (this.isRoundActive || this.roundTransitionPending) return;

        // Add this check to prevent starting new rounds if we've hit the max
        if (this.currentRound >= this.GAME_CONFIG.maxRounds) {
            this.endGame();
            return;
        }

        const playerCount = this.getPlayerCount();
        
        // Only check for minimum players when starting a new game (not in progress)
        if (!this.gameInProgress && playerCount < this.REQUIRED_PLAYERS) {
            // If we're already waiting for players, don't reset the state
            if (!this.waitingForPlayers) {
                this.waitingForPlayers = true;
                this.broadcastWaitingForPlayers(playerCount);
                
                // Clear any existing interval before setting a new one
                if (this.checkPlayersInterval) {
                    clearInterval(this.checkPlayersInterval);
                    this.checkPlayersInterval = null;
                }
                
                this.checkPlayersInterval = setInterval(() => {
                    const currentPlayers = this.getPlayerCount();
                    
                    if (currentPlayers >= this.REQUIRED_PLAYERS) {
                        // Only proceed if we haven't already started the round/countdown
                        if (this.waitingForPlayers && !this.isRoundActive && !this.roundTransitionPending) {
                            this.waitingForPlayers = false;
                            clearInterval(this.checkPlayersInterval!);
                            this.checkPlayersInterval = null;
                            this.startCountdown();
                        } else {
                            // We already started or are transitioning, just clear the interval
                            clearInterval(this.checkPlayersInterval!);
                            this.checkPlayersInterval = null;
                        }
                    } else {
                        this.broadcastWaitingForPlayers(currentPlayers);
                    }
                }, 1000);
            }
            return;
        }
        
        // Start countdown to begin round
        this.startCountdown();
    }

    private startBlockSpawning(config: RoundConfig): void {
        // Calculate player scaling factor
        const playerCount = this.world.entityManager.getAllPlayerEntities().length;
        const additionalPlayers = Math.max(0, playerCount - 2); // Count players above 2
        const playerScaling = Math.min(0.3, additionalPlayers * 0.1); // 10% per player, max 30%
        
        // Scale block counts
        const scaledMaxBlocks = Math.floor(config.maxBlockCount * (1 + playerScaling));
        const scaledMinBlocks = Math.floor(config.minBlockCount * (1 + playerScaling));

        const spawnBlock = () => {
            if (!this.isRoundActive) return;

            const currentBlocks = this.blockManager.getBlockCount();
            
            // Determine how many blocks to spawn using scaled values
            const blocksNeeded = Math.min(
                scaledMaxBlocks - currentBlocks,
                // If 0-1 blocks left, spawn up to 4 at once
                // If below minimum, spawn up to 2 at once
                // If below 25% of max, spawn up to 3 at once
                currentBlocks <= 1 ? 4 :
                currentBlocks < scaledMinBlocks ? 2 : 
                currentBlocks < (scaledMaxBlocks * 0.25) ? 3 : 1
            );

            // Try to spawn multiple blocks if needed
            for(let i = 0; i < blocksNeeded; i++) {
                // Choose block type first
                const rand = Math.random();
                const total = Object.values(config.blockTypes).reduce((a, b) => a + b, 0);
                let sum = 0;
                let chosenType: keyof typeof config.blockTypes | null = null;

                for (const [type, weight] of Object.entries(config.blockTypes)) {
                    sum += weight / total;
                    if (rand <= sum && !chosenType) {
                        chosenType = type as keyof typeof config.blockTypes;
                    }
                }

                // Add spacing between spawns
                const existingBlocks = this.world.entityManager.getAllEntities()
                    .filter(entity => entity.name.toLowerCase().includes('block'));
                
                let attempts = 0;
                let spawnPosition: Vector3Like;
                const minSpacing = 2;
                const safetyMargin = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN;

                do {
                    // Adjust spawn ranges based on block type
                    const isStaticBlock = chosenType === 'static';
                    const isVerticalWave = chosenType === 'verticalWave';

                    spawnPosition = {
                        x: (() => {
                            if (isStaticBlock) return Math.random() * 16 - 8; // Static: -8 to 8
                            // Moving blocks: Use movement bounds with safety margin
                            const movementBounds = MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
                            return movementBounds.min.x + safetyMargin + 
                                   Math.random() * (movementBounds.max.x - movementBounds.min.x - 2 * safetyMargin);
                        })(),
                        y: (() => {
                            switch(chosenType) {
                                case 'static':
                                    return this.getRandomY(0, 12);  // Static: Wide range for variety
                                case 'normal':
                                    return this.getRandomY(-1, 10);  // Normal: Good spread above and below
                                case 'sineWave':
                                    return this.getRandomY(0, 10);  // Sine wave: Slight bias towards higher
                                case 'verticalWave':
                                    // Calculate random height parameters for more variance
                                    const waveBaseHeight = this.getRandomY(-3, 3);  // Varied base height
                                    const waveAmplitude = this.getRandomY(6, 12);   // Higher amplitude for more dramatic peaks
                                    const waveFrequency = this.getRandomY(0.2, 0.4); // Varied frequency for different speeds
                                    
                                    return waveBaseHeight;  // Start at varied base height
                                case 'popup':
                                    // Start much lower and pop up much higher with less hang time
                                    const popupHeight = this.getRandomY(10, 18); // Much higher pop-up range
                                    const popupStartY = this.getRandomY(-12, -6); // Start even lower with more variance
                                    
                                    return popupStartY;  // Use lower start position
                                case 'rising':
                                    // Start below ground level
                                    return this.getRandomY(-5, 4);  // Start deep to rise up dramatically
                                case 'parabolic':
                                    // Start at varied heights
                                    return this.getRandomY(-4, 8);  // Equal spread for parabolic arcs
                                case 'pendulum':
                                    // Start higher for swinging
                                    return this.getRandomY(-2,8);  // Keep high for swinging down
                                default:
                                    return this.getRandomY(0, 10);
                            }
                        })(),
                        z: (() => {
                            if (isStaticBlock) return Math.random() * 24 - 12; // Static: -12 to 12
                            // Moving blocks: Use movement bounds with safety margin
                            const movementBounds = MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
                            return movementBounds.min.z + safetyMargin + 
                                   Math.random() * (movementBounds.max.z - movementBounds.min.z - 2 * safetyMargin);
                        })()
                    };

                    // Check distance from platforms
                    const rightPlatformDistance = Math.abs(spawnPosition.x - MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.X);
                    const isInRightPlatformZRange = spawnPosition.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MIN - safetyMargin && 
                                                  spawnPosition.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MAX + safetyMargin;
                    
                    const leftPlatformDistance = Math.abs(spawnPosition.x - MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.X);
                    const isInLeftPlatformZRange = spawnPosition.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MIN - safetyMargin && 
                                                 spawnPosition.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MAX + safetyMargin;
                    
                    const isSafeFromRightPlatform = rightPlatformDistance >= safetyMargin || !isInRightPlatformZRange;
                    const isSafeFromLeftPlatform = leftPlatformDistance >= safetyMargin || !isInLeftPlatformZRange;
                    
                    // Check distance from all existing blocks
                    const isTooCloseToBlocks = existingBlocks.some(block => {
                        const dx = block.position.x - spawnPosition.x;
                        const dy = block.position.y - spawnPosition.y;
                        const dz = block.position.z - spawnPosition.z;
                        return Math.sqrt(dx * dx + dy * dy + dz * dz) < minSpacing;
                    });

                    // Break if position is safe from both platforms and other blocks
                    if (!isTooCloseToBlocks && isSafeFromRightPlatform && isSafeFromLeftPlatform) break;
                    
                    attempts++;
                } while (attempts < 10);

                // If we couldn't find a safe position after max attempts, use a default safe position
                if (attempts >= 10) {
                    spawnPosition = {
                        x: 0,
                        y: 3,
                        z: 0
                    };
                }

                // Calculate the base speed for this block
                const baseSpeed = 8 * config.speedMultiplier;

                // Spawn the chosen block type with appropriate spacing
                switch(chosenType) {
                    case 'static':
                        this.blockManager.createStaticTarget({
                            x: spawnPosition.x,
                            y: spawnPosition.y,
                            z: spawnPosition.z
                        });
                        break;
                    case 'normal':
                        this.blockManager.createZAxisBlock(spawnPosition);
                        break;
                    case 'sineWave':
                        // For sine wave blocks, we need to account for the amplitude in spawn position
                        const sineWaveAmplitude = this.getRandomY(6, 10); // Random amplitude between 6-10 units
                        const sineWaveFrequency = this.getRandomY(0.15, 0.25); // Varied frequency for different wave patterns
                        
                        // Create variety by spawning at different points in the wave cycle
                        const initialOffset = this.getRandomY(-sineWaveAmplitude, sineWaveAmplitude);
                        
                        const sineWaveSpawnPosition = {
                            ...spawnPosition,
                            // Restrict X spawn position to account for sine wave amplitude
                            x: Math.max(
                                Math.min(
                                    spawnPosition.x,
                                    MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x - sineWaveAmplitude - safetyMargin
                                ),
                                MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x + sineWaveAmplitude + safetyMargin
                            ),
                            // Vary the Y position for initial offset
                            y: spawnPosition.y + initialOffset
                        };
                        
                        this.blockManager.createSineWaveBlock({
                            spawnPosition: sineWaveSpawnPosition,
                            moveSpeed: baseSpeed * 0.6,
                            amplitude: sineWaveAmplitude,
                            frequency: sineWaveFrequency,
                            blockTextureUri: 'blocks/nuit.png' // Changed to nuit texture for sine wave (mystical flowing pattern)
                        });
                        break;
                    case 'static':
                        this.blockManager.createStaticTarget({
                            x: spawnPosition.x,
                            y: spawnPosition.y,
                            z: spawnPosition.z
                        });
                        break;
                    case 'verticalWave':
                        // Calculate random height parameters for more variance
                        const waveBaseHeight = this.getRandomY(-3, 3);  // Varied base height
                        const waveAmplitude = this.getRandomY(6, 12);   // Higher amplitude for more dramatic peaks
                        const waveFrequency = this.getRandomY(0.2, 0.4); // Varied frequency for different speeds
                        
                        this.blockManager.createVerticalWaveBlock({
                            spawnPosition: {
                                ...spawnPosition,
                                y: waveBaseHeight  // Start at varied base height
                            },
                            moveSpeed: baseSpeed * 0.75,
                            amplitude: waveAmplitude,    // Add amplitude for higher peaks
                            frequency: waveFrequency     // Add frequency for varied wave speeds
                        });
                        break;
                    case 'popup':
                        // Start much lower and pop up much higher with less hang time
                        const popupHeight = this.getRandomY(10, 18); // Much higher pop-up range
                        const popupStartY = this.getRandomY(-12, -6); // Start even lower with more variance
                        
                        this.blockManager.createPopUpTarget({
                            spawnPosition: {
                                ...spawnPosition,
                                y: popupStartY  // Use lower start position
                            },
                            startY: popupStartY,
                            topY: popupStartY + popupHeight,  // Pop up much higher from lower start
                            moveSpeed: baseSpeed * 1.6  // 60% faster for less hang time
                        });
                        break;
                    case 'rising':
                        const riseHeight = this.getRandomY(5, 8); // Random rise height between 5-8 units
                        this.blockManager.createRisingTarget({
                            startY: spawnPosition.y,
                            firstStopY: spawnPosition.y + (riseHeight * 0.6), // Stop at 60% of total height
                            finalY: spawnPosition.y + riseHeight,
                            moveSpeed: baseSpeed * 0.7,
                            pauseDuration: 500
                        });
                        break;
                    case 'parabolic':
                        // Calculate a natural throwing arc
                        const throwDistance = this.getRandomY(15, 25); // Random throw distance
                        const throwAngle = this.getRandomY(45, 75);    // Steeper angle between 45-75 degrees for more upward arc
                        const throwHeight = this.getRandomY(10, 15);   // Higher maximum height
                        
                        // Start much lower and throw upward
                        const throwStartY = this.getRandomY(-8, -4);   // Start well below ground level
                        
                        // Calculate random direction angle for more varied trajectories
                        const directionAngle = Math.random() * Math.PI * 2; // Random angle 0-360 degrees
                        
                        this.blockManager.createParabolicTarget({
                            startPoint: {
                                x: spawnPosition.x,
                                y: throwStartY,
                                z: spawnPosition.z
                            },
                            endPoint: {
                                // Use direction angle to create random horizontal movement direction
                                x: spawnPosition.x + throwDistance * Math.cos(directionAngle),
                                y: throwStartY - 2,  // End slightly lower than start for more dramatic fall
                                z: spawnPosition.z + throwDistance * Math.sin(directionAngle)
                            },
                            maxHeight: throwHeight,
                            duration: 4500,  // Much slower for more hang time
                            moveSpeed: baseSpeed * 0.5  // Slower speed for more hang time
                        });
                        break;
                    case 'pendulum':
                        const pendulumHeight = this.getRandomY(6, 12); // Increased height range
                        const pendulumLength = pendulumHeight * this.getRandomY(0.6, 1.0); // Varied rope length
                        const swingAmplitude = this.getRandomY(0.8, 1.4); // Random swing amplitude
                        const swingFrequency = this.getRandomY(0.15, 0.35); // Slower frequency (was 0.3-0.7)
                        
                        this.blockManager.createPendulumTarget({
                            pivotPoint: {
                                x: spawnPosition.x,
                                y: spawnPosition.y + pendulumHeight,  // Higher pivot point
                                z: spawnPosition.z
                            },
                            length: pendulumLength,  // Varied rope length
                            amplitude: swingAmplitude,  // More varied swing width
                            frequency: swingFrequency,  // Slower swing speed
                            moveSpeed: baseSpeed * this.getRandomY(0.25, 0.4)  // Much slower speed (was 0.4-0.6)
                        });
                        break;
                }
            }
        }

        // Initial spawn - spawn minimum blocks more quickly
        for (let i = 0; i < scaledMinBlocks; i++) {
            setTimeout(() => spawnBlock(), i * 1000);
        }

        // Regular spawn interval
        this.blockSpawnTimer = setInterval(spawnBlock, config.blockSpawnInterval);
    }

    public endRound(): void {
        // Don't end if no round is active
        if (!this.isRoundActive) return;

        // Clear any existing timers first
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
        if (this.blockSpawnTimer) {
            clearInterval(this.blockSpawnTimer);
            this.blockSpawnTimer = null;
        }

        // Set round as inactive immediately to prevent double-ending
        this.isRoundActive = false;

        // Get round results with placements
        const { winnerId, placements } = this.scoreManager.handleRoundEnd();
        
        // Play victory sound if there's a winner
        if (winnerId && this.world) {
            const audioManager = AudioManager.getInstance(this.world);
            audioManager.playSoundEffect('audio/sfx/damage/blop1.mp3', 0.6);
        }
        
        // Broadcast updated scores and leaderboard
        this.scoreManager.broadcastScores(this.world);

        // Broadcast round end results with placement info
        this.broadcastRoundEnd(winnerId, placements);

        // Check if this was the final round
        if (this.currentRound >= this.GAME_CONFIG.maxRounds) {
            this.endGame();
            return;
        }

        // Prevent multiple transitions
        if (this.roundTransitionPending) return;

        // Set transition flag and schedule next round
        this.roundTransitionPending = true;
        
        // Clear any existing transition timer
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
        }
        
        // Schedule next round after transition
        this.roundTimer = setTimeout(() => {
            // Set transitioning to false first BEFORE starting the next round
            this.roundTransitionPending = false;
            this.startRound();
        }, this.TRANSITION_DURATION);
    }

    public handlePlayerLeave(): void {
        const playerCount = this.getPlayerCount();
        
        // Only reset game if we're waiting for players to start and don't have enough
        if (!this.gameInProgress && playerCount < this.REQUIRED_PLAYERS) {
            this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
                playerEntity.player.ui.sendData({
                    type: 'systemMessage',
                    message: 'Not enough players to start game...',
                    color: 'FF0000'
                });
            });
            this.resetGame();
        }
        // If game is in progress, continue with remaining players
    }

    private resetGame(): void {
        this.currentRound = 0;
        this.gameInProgress = false;
        this.scoreManager.resetAllStats();
        this.scoreManager.broadcastScores(this.world);
        
        // Check if we have enough players to start new game
        if (this.getPlayerCount() >= this.REQUIRED_PLAYERS) {
            this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
                playerEntity.player.ui.sendData({
                    type: 'newGame',
                    message: 'New game starting...'
                });
            });
            
            setTimeout(() => {
                this.startRound();
            }, 5000);
        } else {
            this.waitingForPlayers = true;
            this.broadcastWaitingForPlayers(this.getPlayerCount());
        }
    }

    private broadcastRoundInfo(): void {
        const config = this.getRoundConfig(this.currentRound);
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.roundStartTime;
        const remainingTime = Math.max(0, config.duration - elapsedTime);
        
        const message = {
            type: 'roundUpdate',
            data: {
                round: this.currentRound,
                totalRounds: this.GAME_CONFIG.maxRounds,
                remainingRounds: this.getRemainingRounds(),
                duration: config.duration,
                timeRemaining: remainingTime
            }
        };

        for (const player of this.world.entityManager.getAllPlayerEntities()) {
            player.player.ui.sendData(message);
        }
    }

    private broadcastRoundEnd(winnerId: string | null, placements: Array<{ playerId: string, points: number }>): void {
        const message = {
            type: 'roundEnd',
            data: {
                round: this.currentRound,
                nextRoundIn: this.TRANSITION_DURATION,
                winnerId: winnerId,
                placements: placements
            }
        };

        for (const player of this.world.entityManager.getAllPlayerEntities()) {
            player.player.ui.sendData(message);
        }
    }

    private broadcastWaitingForPlayers(currentCount: number): void {
        const message = {
            type: 'waitingForPlayers',
            data: {
                current: currentCount,
                required: this.REQUIRED_PLAYERS,
                remaining: this.REQUIRED_PLAYERS - currentCount
            }
        };

        for (const player of this.world.entityManager.getAllPlayerEntities()) {
            player.player.ui.sendData(message);
        }
    }

    public getCurrentRound(): number {
        return this.currentRound;
    }

    public isActive(): boolean {
        return this.isRoundActive;
    }

    public isShootingAllowed(): boolean {
        // Should return true when round is active and not waiting for players
        return this.isRoundActive && !this.waitingForPlayers;
    }

    public isWaitingForPlayers(): boolean {
        return this.waitingForPlayers;
    }

    public cleanup(): void {
        if (this.checkPlayersInterval) {
            clearInterval(this.checkPlayersInterval);
            this.checkPlayersInterval = null;
        }
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
        if (this.blockSpawnTimer) {
            clearInterval(this.blockSpawnTimer);
            this.blockSpawnTimer = null;
        }
        this.roundTransitionPending = false;
    }

    private endGame(): void {
        this.gameInProgress = false;
        const finalStandings: GameEndStanding[] = [];
        
        this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
            const playerId = playerEntity.player.id;
            finalStandings.push({
                playerId,
                placementPoints: this.scoreManager.getLeaderboardPoints(playerId),
                wins: this.scoreManager.getWins(playerId),
                totalScore: this.scoreManager.getScore(playerId)
            });
        });

        // Sort by placement points
        finalStandings.sort((a, b) => b.placementPoints - a.placementPoints);
        const gameWinner = finalStandings[0];
        
        // Clear any remaining blocks
        this.world.entityManager.getAllEntities()
            .filter(entity => entity.name.toLowerCase().includes('block'))
            .forEach(entity => entity.despawn());

        if (gameWinner) {
            // Broadcast game end to all players
            const message = {
                type: 'gameEnd',
                data: {
                    winner: gameWinner,
                    standings: finalStandings,
                    nextGameIn: 10000, // 10 seconds until next game
                    stats: {
                        totalRounds: this.GAME_CONFIG.maxRounds,
                        completedRounds: this.currentRound
                    }
                }
            };

            // Send game end message to all players
            this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
                // Send game end data
                playerEntity.player.ui.sendData(message);
                
                // Send congratulatory message to winner
                if (playerEntity.player.id === gameWinner.playerId) {
                    playerEntity.player.ui.sendData({
                        type: 'systemMessage',
                        message: `🏆 Congratulations! You won the game with ${gameWinner.placementPoints} placement points!`,
                        color: 'FFD700' // Gold color
                    });
                }
            });

            // Send game end message to all players
            this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
                playerEntity.player.ui.sendData({
                    type: 'systemMessage',
                    message: `Game Over! Player ${gameWinner.playerId} wins!`,
                    color: 'FFD700'
                });
            });
        }

        // Reset game after delay
        setTimeout(() => {
            this.resetGame();
        }, 10000);
    }

    // Add method to get remaining rounds
    public getRemainingRounds(): number {
        return this.GAME_CONFIG.maxRounds - this.currentRound;
    }
} 