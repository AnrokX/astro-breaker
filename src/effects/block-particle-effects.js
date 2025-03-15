"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockParticleEffects = void 0;
var hytopia_1 = require("hytopia");
var particle_config_1 = require("../config/particle-config");
var BlockParticleEffects = /** @class */ (function () {
    // Add world parameter to constructor
    function BlockParticleEffects(world) {
        var _this = this;
        this.activeParticles = new Set(); // Use Set for faster lookups/removal
        this.particlePool = [];
        this.spatialGrid = new Map();
        this.pendingEffects = [];
        this.cleanupInterval = null;
        this.particleSpawnTimes = new Map();
        // Use TypedArrays for particle properties
        this.particlePositions = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
        this.particleVelocities = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
        this.particleLifetimes = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE);
        this.performanceMetrics = {
            lastFrameTime: 0,
            frameCount: 0,
            averageFrameTime: 16,
            particleReductionFactor: 1.0
        };
        this.world = world;
        // Start the cleanup interval
        this.cleanupInterval = setInterval(function () { return _this.forceCleanupParticles(); }, 5000); // Check every 5 seconds
    }
    BlockParticleEffects.prototype.forceCleanupParticles = function () {
        var _this = this;
        var now = Date.now();
        this.activeParticles.forEach(function (particle) {
            if (!particle.isSpawned) {
                _this.activeParticles.delete(particle);
                _this.particleSpawnTimes.delete(particle);
                return;
            }
            // Force despawn particles that are:
            // 1. Below a certain height (on the ground)
            // 2. Haven't moved in a while
            // 3. Have been alive for too long
            var spawnTime = _this.particleSpawnTimes.get(particle) || now;
            if (particle.position.y < 0.2 || // On ground
                (particle.rawRigidBody && particle.rawRigidBody.isAsleep()) || // Not moving
                (now - spawnTime > 2000)) { // Alive too long (2 seconds)
                _this.returnParticleToPool(particle);
            }
        });
    };
    // Update getInstance to accept world parameter
    BlockParticleEffects.getInstance = function (world) {
        if (!BlockParticleEffects.instance && world) {
            BlockParticleEffects.instance = new BlockParticleEffects(world);
        }
        return BlockParticleEffects.instance;
    };
    BlockParticleEffects.prototype.getParticleFromPool = function (world, blockTextureUri) {
        var _a, _b, _c, _d;
        var particle = this.particlePool.pop();
        if (!particle) {
            // Create new particle if pool is empty
            particle = new hytopia_1.Entity({
                name: 'DestroyedBlockPiece',
                blockTextureUri: blockTextureUri,
                blockHalfExtents: {
                    x: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE,
                    y: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE,
                    z: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE
                },
                rigidBodyOptions: {
                    type: hytopia_1.RigidBodyType.DYNAMIC,
                    colliders: [{
                            shape: hytopia_1.ColliderShape.BLOCK,
                            halfExtents: {
                                x: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE,
                                y: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE,
                                z: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SCALE
                            },
                            mass: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.PHYSICS.MASS,
                            friction: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.PHYSICS.FRICTION,
                            bounciness: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.PHYSICS.BOUNCINESS
                        }]
                }
            });
            // If the engine supports setting sleep thresholds through the raw rigid body
            if (particle.rawRigidBody) {
                try {
                    // Attempt to set sleep thresholds if the underlying physics engine supports it
                    (_b = (_a = particle.rawRigidBody).setSleepThreshold) === null || _b === void 0 ? void 0 : _b.call(_a, particle_config_1.DESTRUCTION_PARTICLE_CONFIG.PHYSICS.SLEEP_THRESHOLD);
                    (_d = (_c = particle.rawRigidBody).setAngularSleepThreshold) === null || _d === void 0 ? void 0 : _d.call(_c, particle_config_1.DESTRUCTION_PARTICLE_CONFIG.PHYSICS.ANGULAR_SLEEP_THRESHOLD);
                }
                catch (e) {
                    // Silently fail if these methods aren't available
                }
            }
        }
        // Track spawn time
        this.particleSpawnTimes.set(particle, Date.now());
        return particle;
    };
    BlockParticleEffects.prototype.returnParticleToPool = function (particle) {
        if (particle.isSpawned) {
            particle.despawn(); // Make sure to despawn first
        }
        this.activeParticles.delete(particle);
        this.particleSpawnTimes.delete(particle);
        if (this.particlePool.length < particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE) {
            this.particlePool.push(particle);
        }
    };
    BlockParticleEffects.prototype.getParticleCount = function (playerPosition, explosionPosition) {
        var distance = Math.sqrt(Math.pow(playerPosition.x - explosionPosition.x, 2) +
            Math.pow(playerPosition.y - explosionPosition.y, 2) +
            Math.pow(playerPosition.z - explosionPosition.z, 2));
        // Reduce particles based on distance
        if (distance > 30)
            return Math.floor(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.COUNT * 0.2); // 20% at far distance
        if (distance > 20)
            return Math.floor(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.COUNT * 0.5); // 50% at medium distance
        return particle_config_1.DESTRUCTION_PARTICLE_CONFIG.COUNT; // 100% when close
    };
    BlockParticleEffects.prototype.getGridKey = function (position) {
        // 5x5x5 grid cells
        var gridX = Math.floor(position.x / 5);
        var gridY = Math.floor(position.y / 5);
        var gridZ = Math.floor(position.z / 5);
        return "".concat(gridX, ",").concat(gridY, ",").concat(gridZ);
    };
    BlockParticleEffects.prototype.updateParticleGrid = function (particle) {
        var gridKey = this.getGridKey(particle.position);
        if (!this.spatialGrid.has(gridKey)) {
            this.spatialGrid.set(gridKey, new Set());
        }
        this.spatialGrid.get(gridKey).add(particle);
    };
    BlockParticleEffects.prototype.createDestructionEffect = function (world, position, blockTextureUri) {
        var _this = this;
        if (!world)
            return;
        // Pre-calculate some values to avoid repeated calculations
        var angleIncrement = (Math.PI * 2) / particle_config_1.DESTRUCTION_PARTICLE_CONFIG.COUNT;
        var speed = particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SPEED * particle_config_1.DESTRUCTION_PARTICLE_CONFIG.FORCES.EXPLOSION_MULTIPLIER;
        var spinForce = particle_config_1.DESTRUCTION_PARTICLE_CONFIG.FORCES.SPIN_STRENGTH;
        var _loop_1 = function (i) {
            var particle = this_1.getParticleFromPool(world, blockTextureUri);
            var angle = angleIncrement * i;
            // Calculate position with less random calls
            var offsetX = (Math.random() - 0.5) * particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SPAWN.RADIUS;
            var offsetY = (Math.random() - 0.5) * particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SPAWN.HEIGHT_VARIATION;
            var offsetZ = (Math.random() - 0.5) * particle_config_1.DESTRUCTION_PARTICLE_CONFIG.SPAWN.RADIUS;
            particle.spawn(world, {
                x: position.x + offsetX,
                y: position.y + offsetY,
                z: position.z + offsetZ
            });
            this_1.activeParticles.add(particle);
            if (particle.rawRigidBody) {
                // Apply forces with fewer calculations
                var speedVariation = 0.8 + Math.random() * 0.4;
                particle.rawRigidBody.applyImpulse({
                    x: Math.cos(angle) * speed * speedVariation,
                    y: particle_config_1.DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MIN +
                        Math.random() * (particle_config_1.DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MAX - particle_config_1.DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MIN),
                    z: Math.sin(angle) * speed * speedVariation
                });
                // Simplified spin calculation
                var spin = (Math.random() - 0.5) * spinForce;
                particle.rawRigidBody.applyTorqueImpulse({
                    x: spin,
                    y: spin,
                    z: spin
                });
            }
            // Force cleanup after lifetime
            setTimeout(function () {
                if (_this.activeParticles.has(particle)) {
                    _this.returnParticleToPool(particle);
                }
            }, particle_config_1.DESTRUCTION_PARTICLE_CONFIG.LIFETIME);
        };
        var this_1 = this;
        // Batch creation to reduce overhead
        for (var i = 0; i < particle_config_1.DESTRUCTION_PARTICLE_CONFIG.COUNT; i++) {
            _loop_1(i);
        }
    };
    BlockParticleEffects.prototype.processEffectQueue = function (deltaTime) {
        var startTime = performance.now();
        while (this.pendingEffects.length > 0) {
            if (performance.now() - startTime > BlockParticleEffects.FRAME_BUDGET_MS) {
                // Defer remaining effects to next frame
                break;
            }
            var effect = this.pendingEffects.shift();
            if (effect) {
                this.createImmediateEffect(effect.position, effect.texture);
            }
        }
    };
    BlockParticleEffects.prototype.updatePerformanceMetrics = function (currentTime) {
        var frameTime = currentTime - this.performanceMetrics.lastFrameTime;
        this.performanceMetrics.frameCount++;
        // Update rolling average
        this.performanceMetrics.averageFrameTime =
            (this.performanceMetrics.averageFrameTime * 0.95) + (frameTime * 0.05);
        // Adjust particle count based on performance
        if (this.performanceMetrics.averageFrameTime > 16.6) { // Below 60fps
            this.performanceMetrics.particleReductionFactor *= 0.95;
        }
        else if (this.performanceMetrics.averageFrameTime < 14) { // Above 70fps
            this.performanceMetrics.particleReductionFactor =
                Math.min(1.0, this.performanceMetrics.particleReductionFactor * 1.05);
        }
        this.performanceMetrics.lastFrameTime = currentTime;
    };
    BlockParticleEffects.prototype.cleanup = function () {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        // Force cleanup all particles
        this.activeParticles.forEach(function (particle) {
            if (particle.isSpawned) {
                particle.despawn();
            }
        });
        this.activeParticles.clear();
        this.particlePool = [];
        this.spatialGrid.clear();
        this.particleSpawnTimes.clear();
        // Clear typed arrays
        this.particlePositions = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
        this.particleVelocities = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
        this.particleLifetimes = new Float32Array(particle_config_1.DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE);
    };
    BlockParticleEffects.prototype.createImmediateEffect = function (position, texture) {
        if (this.world) {
            this.createDestructionEffect(this.world, position, texture);
        }
    };
    BlockParticleEffects.FRAME_BUDGET_MS = 16; // 60fps target
    return BlockParticleEffects;
}());
exports.BlockParticleEffects = BlockParticleEffects;
