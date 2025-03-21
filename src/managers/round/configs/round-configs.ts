import { RoundConfig } from '../interfaces/round-interfaces';

export const ROUND_CONFIGS: Record<number, RoundConfig> = {
    // Tutorial round (Round 1) - Static targets only
    1: {
        duration: 10000,  // 10 seconds (was 60000)
        minBlockCount: 4,  // Reduced from 8 to 4 (50% reduction)
        maxBlockCount: 6,  // Reduced from 12 to 6 (50% reduction)
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
        minBlockCount: 1,  // Reduced from 3 to 1 (50% reduction)
        maxBlockCount: 3,  // Reduced from 6 to 3 (50% reduction)
        blockSpawnInterval: 1500,  // Increased from 500ms to 1500ms for more balanced spawning
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
        minBlockCount: 1,  // Reduced from 2 to 1 (50% reduction)
        maxBlockCount: 3,  // Reduced from 6 to 3 (50% reduction)
        blockSpawnInterval: 1800,  // Increased from 500ms to 1800ms for more balanced spawning
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
        minBlockCount: 1,  // Reduced from 2 to 1 (50% reduction)
        maxBlockCount: 2,  // Reduced from 4 to 2 (50% reduction)
        blockSpawnInterval: 2000,  // Increased from 500ms to 2000ms for more balanced spawning
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