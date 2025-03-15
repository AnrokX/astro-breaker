"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESTRUCTION_PARTICLE_CONFIG = void 0;
exports.DESTRUCTION_PARTICLE_CONFIG = {
    COUNT: 16,
    SCALE: 0.1, // Size of each particle
    LIFETIME: 750, // How long particles exist (ms) - increased and rounded for consistency
    SPREAD_RADIUS: 0.3, // Initial spread distance
    SPEED: 0.1, // Reduced base movement speed for more stability
    PHYSICS: {
        MASS: 0.5, // Increased mass for more stability
        FRICTION: 0.3, // Increased friction to prevent excessive sliding
        BOUNCINESS: 0.3, // Reduced bounciness for more predictable behavior
        SLEEP_THRESHOLD: 0.02, // Increased sleep threshold
        ANGULAR_SLEEP_THRESHOLD: 0.02
    },
    FORCES: {
        UPWARD_MIN: 0.1, // Reduced minimum upward force
        UPWARD_MAX: 0.3, // Reduced maximum upward force
        SPIN_STRENGTH: 0.15, // Reduced spin for more stability
        EXPLOSION_MULTIPLIER: 0.5 // Reduced explosion force
    },
    SPAWN: {
        RADIUS: 0.2, // Random spawn radius
        HEIGHT_VARIATION: 0.2 // Random height variation
    },
    POOLING: {
        POOL_SIZE: 300,
        MIN_POOL_SIZE: 100
    },
    INSTANCING: {
        BATCH_SIZE: 50, // Number of particles to batch render
        ENABLE_MERGING: true, // Merge nearby particle meshes
        MERGE_DISTANCE: 2.0, // Distance threshold for merging
        GPU_INSTANCING: true // Use GPU instancing when available
    },
    DISTANCE_SCALING: {
        ENABLED: true,
        FAR_DISTANCE: 30,
        FAR_SCALE: 0.2,
        MEDIUM_DISTANCE: 20,
        MEDIUM_SCALE: 0.5
    }
};
