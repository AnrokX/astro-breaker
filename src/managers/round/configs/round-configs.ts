import { RoundConfig } from '../interfaces/round-interfaces';

export const ROUND_CONFIGS: Record<number, RoundConfig> = {
    // Tutorial round (Round 1) - Static targets only
    1: {
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
    },
    
    // Round 2 - 100% Normal Blocks
    2: {
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
    },
    
    // Round 3 - 100% Sine Wave
    3: {
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
    },

    // Round 4 - 100% Vertical Wave
    4: {
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
    },

    // Round 5 - 100% Parabolic
    5: {
        duration: 10000,  // 10 seconds (was 25000)
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
    }
};