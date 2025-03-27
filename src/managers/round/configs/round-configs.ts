import { RoundConfig } from '../interfaces/round-interfaces';

export const ROUND_CONFIGS: Record<number, RoundConfig> = {
    // Tutorial round (Round 1) - Static targets only
    1: {
        duration: 35000,  // 45 seconds - longer tutorial round for learning
        minBlockCount: 8,  // Increased by 30% from 6 to 8
        maxBlockCount: 22,  // Increased by 30% from 17 to 22
        blockSpawnInterval: 800,  // Decreased for faster spawning
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
        duration: 35000,  // 35 seconds - comfortable intro to moving blocks
        minBlockCount: 3,  // Increased from 2 to 3 (30% more)
        maxBlockCount: 10,  // Increased from 4 to 5 (30% more)
        blockSpawnInterval: 700,  // Adjusted for smoother spawning
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
        duration: 30000,  // 30 seconds - standard duration
        minBlockCount: 2,  // Base value maintained
        maxBlockCount: 10,  // Increased from 3 to 4 (30% more)
        blockSpawnInterval: 1400,  // Maintained for sine wave control
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
        duration: 25000,  // 25 seconds - slightly more intense
        minBlockCount: 3,  // Increased from 1 to 2 (100% more)
        maxBlockCount: 7,  // Increased from 3 to 6 (100% more)
        blockSpawnInterval: 1200,  // Maintained for vertical wave control
        speedMultiplier: 0.5,
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
        duration: 30000,  // 30 seconds - short and intense final round
        minBlockCount: 2,  // Base value maintained
        maxBlockCount: 7,  // Increased from 3 to 4 (40% more)
        blockSpawnInterval: 1200,  // Adjusted for better control
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