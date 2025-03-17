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

    // Round 5 - 100% Pop-up
    5: {
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
    },

    // Round 6 - 100% Rising
    6: {
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
    },

    // Round 7 - 100% Parabolic
    7: {
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
    },

    // Round 8 - 100% Pendulum
    8: {
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
    },

    // Round 9 - "Up and Down" Mix (Vertical Wave, Rising, and Popup)
    9: {
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
    },

    // Round 10 - "Chaos" Mix (Pendulum, Parabolic, and Sine Wave)
    10: {
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
    }
};