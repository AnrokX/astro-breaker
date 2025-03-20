import { Vector3Like } from 'hytopia';

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

export interface GameConfig {
    maxRounds: number;
    requiredPlayers: number;
    transitionDuration: number;
    gameMode: 'solo' | 'multiplayer';
}

export interface GameEndStanding {
    playerId: string;
    playerNumber?: number;
    playerColor?: string;
    placementPoints: number;
    totalScore: number;
}

export interface RoundEndPlacement {
    playerId: string;
    points: number;
    playerNumber?: number;
    playerColor?: string;
}