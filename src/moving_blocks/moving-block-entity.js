"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovingBlockManager = exports.MovingBlockEntity = exports.MOVING_BLOCK_CONFIG = void 0;
var hytopia_1 = require("hytopia");
var score_manager_1 = require("../managers/score-manager");
var block_movement_1 = require("./block-movement");
var block_particle_effects_1 = require("../effects/block-particle-effects");
var scene_ui_manager_1 = require("../scene-ui/scene-ui-manager");
var projectile_entity_1 = require("../entities/projectile-entity");
// Configuration for our Z-axis moving block
exports.MOVING_BLOCK_CONFIG = {
    DEFAULT_SPEED: 6,
    DEFAULT_HEALTH: 5,
    DEFAULT_TEXTURE: 'blocks/creep.png',
    DEFAULT_HALF_EXTENTS: { x: 0.5, y: 2, z: 2 },
    MOVEMENT_BOUNDS: {
        min: { x: -15, y: 2, z: -15 }, // Wider X range, higher minimum Y
        max: { x: 15, y: 12, z: 16 } // Wider X range, higher maximum Y
    },
    SPAWN_POSITION: { x: 0, y: 4, z: 0 }, // Higher default spawn
    BREAK_SCORE: 5, // Points awarded for breaking a block
    STATIC_TARGET: {
        TEXTURE: 'blocks/gold-ore.png',
        HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 }, // Balanced size for visibility and challenge
        HEIGHT_RANGE: { min: 3, max: 8 }, // Higher range for better visibility
        SCORE: 10, // More points for hitting target
        HEALTH: 1 // One-shot kill
    },
    PLATFORM_SAFETY: {
        RIGHT_PLATFORM_EDGE: {
            X: 19,
            Z_MIN: -9,
            Z_MAX: 9
        },
        LEFT_PLATFORM_EDGE: {
            X: -18,
            Z_MIN: -9,
            Z_MAX: -8
        },
        PLATFORM_SAFETY_MARGIN: 8, // Increased margin for better spacing
        MIN_DISTANCE_BETWEEN_TARGETS: 7 // Increased minimum distance between targets
    },
    PENDULUM_TARGET: {
        TEXTURE: 'blocks/nuit-leaves.png',
        HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
        PIVOT_HEIGHT: 15,
        LENGTH: 10,
        AMPLITUDE: Math.PI / 3,
        FREQUENCY: 0.4,
        SCORE_MULTIPLIER: 3,
        HEALTH: 1,
        SPAWN_BOUNDS: {
            LATERAL: {
                MIN: -12, // Reduced to keep further from left platform
                MAX: 13 // Reduced to keep further from right platform
            },
            FORWARD: {
                MIN: -5, // Reduced to keep further from platform depths
                MAX: 5 // Reduced to keep further from platform depths
            }
        },
        MIN_DISTANCE_FROM_PLATFORMS: 8, // Increased minimum distance from platforms
        SPAWN_SPACING: {
            MIN_X_DISTANCE: 2, // Increased minimum X distance between pendulums
            MIN_Z_DISTANCE: 8 // Increased minimum Z distance between pendulums
        }
    },
    VERTICAL_WAVE: {
        TEXTURE: 'blocks/infected-shadowrock.png',
        HALF_EXTENTS: { x: 1, y: 1, z: 1 },
        DEFAULT_AMPLITUDE: 4, // Reduced amplitude to prevent floor collision
        DEFAULT_FREQUENCY: 0.5, // Slightly faster than horizontal sine wave
        HEIGHT_OFFSET: 10, // Significantly increased base height
        SAFETY_MARGIN: 2, // Extra space to prevent any collision
        SCORE_MULTIPLIER: 2, // Double points for hitting this challenging target
        SPEED_MULTIPLIER: 0.7, // Slightly slower forward movement for better visibility
        HEALTH: 1 // One-shot kill, like static targets
    },
    POPUP_TARGET: {
        TEXTURE: 'blocks/diamond-ore.png',
        HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
        START_Y: -20,
        TOP_Y: 8,
        SPEED_MULTIPLIER: 1.5, // Faster than normal blocks
        SCORE_MULTIPLIER: 2, // Double points for hitting this challenging target
        HEALTH: 1 // One-shot kill
    },
    RISING_TARGET: {
        TEXTURE: 'blocks/emerald-ore.png',
        HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
        START_Y: -20,
        FIRST_STOP_Y: 8, // Same height as pop-up target
        FINAL_Y: 30, // Much higher final position
        SPEED_MULTIPLIER: 2.0, // Faster than pop-up target
        SCORE_MULTIPLIER: 3, // Triple points for hitting this challenging target
        HEALTH: 1, // One-shot kill
        PAUSE_DURATION: 2000 // 2 seconds at first stop
    },
    PARABOLIC_TARGET: {
        TEXTURE: 'blocks/swirl-rune.png',
        HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
        START_Y: -20,
        MAX_HEIGHT: 20, // Increased height for more dramatic arc
        END_Y: -20,
        SPEED_MULTIPLIER: 1.0, // Not used in new physics-based system
        SCORE_MULTIPLIER: 4, // Highest points due to difficulty
        HEALTH: 1, // One-shot kill
        DURATION: 5000, // 5 seconds total
        SPAWN_BOUNDS: {
            FORWARD: {
                MIN: -25, // How far back it can start
                MAX: 25 // How far forward it can go
            },
            LATERAL: {
                MIN: -15, // How far left it can go
                MAX: 15 // How far right it can go
            }
        },
        MIN_TRAVEL_DISTANCE: 30, // Minimum distance the block must travel
        MAX_TRAVEL_DISTANCE: 50 // Maximum distance the block can travel
    },
    PARTICLE_CONFIG: {
        COUNT: 50,
        SCALE: 0.15,
        LIFETIME: 800,
        SPREAD_RADIUS: 0.3,
        SPEED: 0.15
    }
};
var MovingBlockEntity = /** @class */ (function (_super) {
    __extends(MovingBlockEntity, _super);
    function MovingBlockEntity(options) {
        var _a, _b, _c, _d;
        var _this = _super.call(this, __assign(__assign({}, options), { name: options.name || 'MovingBlock', blockTextureUri: options.blockTextureUri || exports.MOVING_BLOCK_CONFIG.DEFAULT_TEXTURE, blockHalfExtents: options.blockHalfExtents || exports.MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS, rigidBodyOptions: {
                type: hytopia_1.RigidBodyType.KINEMATIC_POSITION,
                colliders: [{
                        shape: hytopia_1.ColliderShape.BLOCK,
                        halfExtents: options.blockHalfExtents || exports.MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS,
                        collisionGroups: {
                            belongsTo: [hytopia_1.CollisionGroup.BLOCK],
                            collidesWith: [hytopia_1.CollisionGroup.PLAYER, hytopia_1.CollisionGroup.BLOCK, hytopia_1.CollisionGroup.ENTITY]
                        },
                        onCollision: function (other, started) {
                            if (started && _this.isBreakable && other instanceof hytopia_1.Entity) {
                                _this.handleCollision(other);
                            }
                        }
                    }]
            } })) || this;
        _this.isReversed = false;
        _this.particles = [];
        _this.despawnTimer = null; // Add despawn timer
        _this.onTick = function (entity, deltaTimeMs) {
            // Delegate movement update to injected behavior
            _this.movementBehavior.update(_this, deltaTimeMs);
        };
        // Initialize other properties
        _this.moveSpeed = (_a = options.moveSpeed) !== null && _a !== void 0 ? _a : exports.MOVING_BLOCK_CONFIG.DEFAULT_SPEED;
        _this.direction = _this.normalizeDirection(options.direction || { x: 0, y: 0, z: 1 });
        _this.movementBounds = options.movementBounds || exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
        _this.oscillate = (_b = options.oscillate) !== null && _b !== void 0 ? _b : true;
        _this.initialPosition = { x: 0, y: 0, z: 0 };
        _this.health = (_c = options.health) !== null && _c !== void 0 ? _c : exports.MOVING_BLOCK_CONFIG.DEFAULT_HEALTH;
        _this.isBreakable = (_d = options.isBreakable) !== null && _d !== void 0 ? _d : true;
        _this.onBlockBroken = options.onBlockBroken;
        _this.movementBehavior = options.movementBehavior || new block_movement_1.DefaultBlockMovement();
        _this.particleEffects = null;
        _this.spawnTime = Date.now();
        // Set up despawn timer if specified
        if (options.despawnTime) {
            _this.despawnTimer = setTimeout(function () {
                if (_this.isSpawned) {
                    _this.despawn();
                }
            }, options.despawnTime);
        }
        return _this;
    }
    MovingBlockEntity.prototype.normalizeDirection = function (dir) {
        var magnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        if (magnitude === 0)
            return { x: 0, y: 0, z: 1 }; // Default to moving along Z-axis
        return {
            x: dir.x / magnitude,
            y: dir.y / magnitude,
            z: dir.z / magnitude
        };
    };
    MovingBlockEntity.prototype.spawn = function (world, position) {
        _super.prototype.spawn.call(this, world, position);
        this.initialPosition = __assign({}, position);
        this.particleEffects = block_particle_effects_1.BlockParticleEffects.getInstance(world);
    };
    MovingBlockEntity.prototype.isWithinBounds = function (position) {
        if (!this.movementBounds)
            return true;
        // Use a larger epsilon for boundary checks to prevent jittering
        var epsilon = 0.05;
        // Check each axis independently and apply epsilon consistently
        var withinX = position.x >= (this.movementBounds.min.x + epsilon) &&
            position.x <= (this.movementBounds.max.x - epsilon);
        var withinY = position.y >= (this.movementBounds.min.y + epsilon) &&
            position.y <= (this.movementBounds.max.y - epsilon);
        var withinZ = position.z >= (this.movementBounds.min.z + epsilon) &&
            position.z <= (this.movementBounds.max.z - epsilon);
        // Only enforce bounds on axes that have different min/max values
        var needsXCheck = Math.abs(this.movementBounds.max.x - this.movementBounds.min.x) > epsilon;
        var needsYCheck = Math.abs(this.movementBounds.max.y - this.movementBounds.min.y) > epsilon;
        var needsZCheck = Math.abs(this.movementBounds.max.z - this.movementBounds.min.z) > epsilon;
        return (!needsXCheck || withinX) &&
            (!needsYCheck || withinY) &&
            (!needsZCheck || withinZ);
    };
    MovingBlockEntity.prototype.reverseDirection = function () {
        this.direction.x *= -1;
        this.direction.y *= -1;
        this.direction.z *= -1;
        this.isReversed = !this.isReversed;
    };
    MovingBlockEntity.prototype.handleCollision = function (other) {
        var _this = this;
        var _a;
        // Check if the colliding entity is a projectile
        if (other.name.toLowerCase().includes('projectile') && other instanceof projectile_entity_1.ProjectileEntity) {
            // Store the player ID from the projectile if available
            this.playerId = other.playerId;
            // Calculate score using the new dynamic scoring system
            if (this.world && this.playerId) {
                var scoreManager = this.world.entityManager.getAllEntities()
                    .find(function (entity) { return entity instanceof score_manager_1.ScoreManager; });
                if (scoreManager) {
                    var score = scoreManager.calculateGrenadeTargetScore(other, this, this.position, this.playerId);
                    scoreManager.addScore(this.playerId, score);
                    // Get the player who hit the block
                    var player = (_a = this.world.entityManager.getAllPlayerEntities()
                        .find(function (p) { return p.player.id === _this.playerId; })) === null || _a === void 0 ? void 0 : _a.player;
                    if (player) {
                        // Show block destroyed notification with the score
                        var sceneUIManager = scene_ui_manager_1.SceneUIManager.getInstance(this.world);
                        sceneUIManager.showBlockDestroyedNotification(this.position, score, player);
                    }
                    // Create destruction effect before despawning
                    if (this.blockTextureUri) {
                        var particleEffects = block_particle_effects_1.BlockParticleEffects.getInstance(this.world);
                        particleEffects.createDestructionEffect(this.world, this.position, this.blockTextureUri);
                    }
                    // Broadcast updated scores
                    scoreManager.broadcastScores(this.world);
                    // Destroy the block after scoring
                    if (this.isSpawned) {
                        this.despawn();
                    }
                }
                else {
                    this.takeDamage(1); // Fallback to simple damage
                }
            }
            else {
                this.takeDamage(1); // Fallback to simple damage
            }
            // Despawn the projectile that hit us
            if (other.isSpawned) {
                other.despawn();
            }
        }
    };
    MovingBlockEntity.prototype.takeDamage = function (amount) {
        var _this = this;
        var _a, _b;
        if (!this.isBreakable)
            return;
        this.health -= amount;
        // Get the player who hit the block
        var player = (_b = (_a = this.world) === null || _a === void 0 ? void 0 : _a.entityManager.getAllPlayerEntities().find(function (p) { return p.player.id === _this.playerId; })) === null || _b === void 0 ? void 0 : _b.player;
        if (!player || !this.world)
            return;
        // Get the SceneUIManager instance
        var sceneUIManager = scene_ui_manager_1.SceneUIManager.getInstance(this.world);
        if (this.health <= 0) {
            // Calculate score before showing notification
            var score = this.calculateScore();
            // Show block destroyed notification with appropriate score
            sceneUIManager.showBlockDestroyedNotification(this.position, score, player);
            // Create destruction effect before despawning
            this.createDestructionEffect();
            if (this.onBlockBroken) {
                this.onBlockBroken();
            }
            this.despawn();
            return;
        }
        else {
            // Show hit notification for non-destroying hits
            sceneUIManager.showHitNotification(this.position, 1, player); // Show +1 for each hit
        }
        // Instead of changing opacity, change the block type based on health
        var blockTypes = [
            'blocks/void-sand.png',
            'blocks/infected-shadowrock.png',
            'blocks/dragons-stone.png',
            'blocks/diamond-ore.png',
            'blocks/clay.png'
        ];
        // Calculate which block type to use based on health
        var blockIndex = Math.floor((this.health / exports.MOVING_BLOCK_CONFIG.DEFAULT_HEALTH) * (blockTypes.length - 1));
        var newBlockType = blockTypes[Math.max(0, Math.min(blockIndex, blockTypes.length - 1))];
        // Create a new block with the same properties but different texture
        var newBlock = new MovingBlockEntity({
            blockTextureUri: newBlockType,
            moveSpeed: this.moveSpeed,
            direction: this.direction,
            movementBounds: this.movementBounds,
            oscillate: this.oscillate,
            health: this.health,
            isBreakable: this.isBreakable,
            onBlockBroken: this.onBlockBroken, // Transfer the callback
            movementBehavior: this.movementBehavior // Transfer the movement behavior
        });
        // Transfer the player ID to the new block
        newBlock.playerId = this.playerId;
        // Spawn the new block at the current position
        if (this.world) {
            newBlock.spawn(this.world, this.position);
        }
        // Despawn the old block
        this.despawn();
    };
    MovingBlockEntity.prototype.calculateScore = function () {
        // Base score calculation based on block type and difficulty
        var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE;
        // Multiply score based on movement behavior
        if (this.movementBehavior instanceof block_movement_1.SineWaveMovement) {
            score *= 1.5; // Sine wave blocks are harder to hit
        }
        else if (this.movementBehavior instanceof block_movement_1.PopUpMovement) {
            score *= exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.SCORE_MULTIPLIER;
        }
        else if (this.movementBehavior instanceof block_movement_1.RisingMovement) {
            score *= exports.MOVING_BLOCK_CONFIG.RISING_TARGET.SCORE_MULTIPLIER;
        }
        else if (this.movementBehavior instanceof block_movement_1.ParabolicMovement) {
            score *= exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SCORE_MULTIPLIER;
        }
        else if (this.movementBehavior instanceof block_movement_1.StaticMovement) {
            score = exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.SCORE; // Static targets have their own base score
        }
        return Math.round(score);
    };
    // --- Added getter and helper methods for movement behavior use ---
    MovingBlockEntity.prototype.getDirection = function () {
        return __assign({}, this.direction); // Return a copy to prevent direct modification
    };
    MovingBlockEntity.prototype.getMoveSpeed = function () {
        return this.moveSpeed;
    };
    MovingBlockEntity.prototype.isWithinMovementBounds = function (position) {
        return this.isWithinBounds(position);
    };
    MovingBlockEntity.prototype.shouldOscillate = function () {
        return this.oscillate;
    };
    MovingBlockEntity.prototype.reverseMovementDirection = function () {
        this.reverseDirection();
    };
    MovingBlockEntity.prototype.resetToInitialPosition = function () {
        this.setPosition(this.initialPosition);
    };
    MovingBlockEntity.prototype.getDebugInfo = function () {
        var halfExtents = this.blockHalfExtents || { x: 0, y: 0, z: 0 };
        return "MovingBlock Debug Info:\n      ID: ".concat(this.id, "\n      Position: x=").concat(this.position.x.toFixed(2), ", y=").concat(this.position.y.toFixed(2), ", z=").concat(this.position.z.toFixed(2), "\n      Direction: x=").concat(this.direction.x.toFixed(2), ", y=").concat(this.direction.y.toFixed(2), ", z=").concat(this.direction.z.toFixed(2), "\n      Speed: ").concat(this.moveSpeed, "\n      Health: ").concat(this.health, "\n      Is Breakable: ").concat(this.isBreakable, "\n      Oscillating: ").concat(this.oscillate, "\n      Is Reversed: ").concat(this.isReversed, "\n      Movement Bounds: ").concat(this.movementBounds ?
            "\n        Min: x=".concat(this.movementBounds.min.x, ", y=").concat(this.movementBounds.min.y, ", z=").concat(this.movementBounds.min.z, "\n        Max: x=").concat(this.movementBounds.max.x, ", y=").concat(this.movementBounds.max.y, ", z=").concat(this.movementBounds.max.z)
            : 'None', "\n      Last Hit By Player: ").concat(this.playerId || 'None', "\n      Texture: ").concat(this.blockTextureUri || 'None', "\n      Half Extents: x=").concat(halfExtents.x, ", y=").concat(halfExtents.y, ", z=").concat(halfExtents.z, "\n      Is Spawned: ").concat(this.isSpawned);
    };
    MovingBlockEntity.prototype.createDestructionEffect = function () {
        var _a;
        if (!this.world || !this.blockTextureUri)
            return;
        (_a = this.particleEffects) === null || _a === void 0 ? void 0 : _a.createDestructionEffect(this.world, this.position, this.blockTextureUri);
    };
    Object.defineProperty(MovingBlockEntity, "DefaultTargetTexture", {
        // Static getters for default target configuration
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultTargetHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultTargetHeightRange", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.HEIGHT_RANGE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultTargetScore", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.SCORE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultTargetHealth", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.STATIC_TARGET.HEALTH;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultBlockSpeed", {
        // Z-Axis Moving Block (Default Block) Getters
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.DEFAULT_SPEED;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultBlockHealth", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.DEFAULT_HEALTH;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultBlockTexture", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.DEFAULT_TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultBlockHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultBlockScore", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.BREAK_SCORE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultMovementBounds", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultSpawnPosition", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.SPAWN_POSITION;
        },
        enumerable: false,
        configurable: true
    });
    // Helper methods for Z-Axis Moving Block
    MovingBlockEntity.createDefaultBlockConfiguration = function (customConfig) {
        return __assign({ moveSpeed: this.DefaultBlockSpeed, blockTextureUri: this.DefaultBlockTexture, blockHalfExtents: this.DefaultBlockHalfExtents, health: this.DefaultBlockHealth, movementBehavior: new block_movement_1.DefaultBlockMovement(), movementBounds: this.DefaultMovementBounds, oscillate: true }, customConfig);
    };
    MovingBlockEntity.isValidDefaultBlockPosition = function (position) {
        var bounds = this.DefaultMovementBounds;
        return (position.x >= bounds.min.x && position.x <= bounds.max.x &&
            position.y >= bounds.min.y && position.y <= bounds.max.y &&
            position.z >= bounds.min.z && position.z <= bounds.max.z);
    };
    MovingBlockEntity.generateDefaultSpawnPosition = function (customBounds) {
        var bounds = customBounds || this.DefaultMovementBounds;
        return {
            x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
            y: bounds.min.y, // Usually fixed height for Z-axis moving blocks
            z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
        };
    };
    // Helper method to calculate movement step
    MovingBlockEntity.calculateMovementStep = function (currentPosition, direction, speed, deltaSeconds) {
        return {
            x: currentPosition.x + direction.x * speed * deltaSeconds,
            y: currentPosition.y + direction.y * speed * deltaSeconds,
            z: currentPosition.z + direction.z * speed * deltaSeconds
        };
    };
    // Helper methods for target positioning
    MovingBlockEntity.generateRandomTargetPosition = function (bounds) {
        var heightRange = this.DefaultTargetHeightRange;
        var randomHeight = heightRange.min + Math.random() * (heightRange.max - heightRange.min);
        var defaultBounds = exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
        var targetBounds = bounds || defaultBounds;
        return {
            x: targetBounds.min.x + Math.random() * (targetBounds.max.x - targetBounds.min.x),
            y: randomHeight,
            z: targetBounds.min.z + Math.random() * (targetBounds.max.z - targetBounds.min.z)
        };
    };
    MovingBlockEntity.isValidTargetPosition = function (position, bounds) {
        var targetBounds = bounds || exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
        var heightRange = this.DefaultTargetHeightRange;
        return (position.x >= targetBounds.min.x && position.x <= targetBounds.max.x &&
            position.y >= heightRange.min && position.y <= heightRange.max &&
            position.z >= targetBounds.min.z && position.z <= targetBounds.max.z);
    };
    // Helper method to create target configuration
    MovingBlockEntity.createTargetConfiguration = function (customConfig) {
        return __assign({ blockTextureUri: this.DefaultTargetTexture, blockHalfExtents: this.DefaultTargetHalfExtents, health: this.DefaultTargetHealth, movementBehavior: new block_movement_1.StaticMovement(), movementBounds: {
                min: {
                    x: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x,
                    y: this.DefaultTargetHeightRange.min,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
                },
                max: {
                    x: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x,
                    y: this.DefaultTargetHeightRange.max,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
                }
            } }, customConfig);
    };
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpTexture", {
        // Static getters for pop-up target configuration
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpStartY", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.START_Y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpTopY", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.TOP_Y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpSpeedMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.SPEED_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpScoreMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.SCORE_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPopUpHealth", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.POPUP_TARGET.HEALTH;
        },
        enumerable: false,
        configurable: true
    });
    // Helper method to create pop-up target configuration
    MovingBlockEntity.createPopUpConfiguration = function (customConfig) {
        return __assign({ blockTextureUri: this.DefaultPopUpTexture, blockHalfExtents: this.DefaultPopUpHalfExtents, health: this.DefaultPopUpHealth, moveSpeed: this.DefaultBlockSpeed * this.DefaultPopUpSpeedMultiplier, movementBehavior: new block_movement_1.PopUpMovement({
                startY: this.DefaultPopUpStartY,
                topY: this.DefaultPopUpTopY
            }), movementBounds: undefined, oscillate: false }, customConfig);
    };
    // Helper method to validate pop-up target position
    MovingBlockEntity.isValidPopUpPosition = function (position) {
        // Pop-up targets only need to validate X and Z coordinates since Y is controlled by the movement
        return (position.x >= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x &&
            position.x <= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x &&
            position.z >= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z &&
            position.z <= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z);
    };
    // Helper method to generate a random pop-up target position
    MovingBlockEntity.generatePopUpSpawnPosition = function () {
        return {
            x: Math.random() * 10 - 5, // Random X between -5 and 5
            y: this.DefaultPopUpStartY,
            z: Math.random() * 20 - 10 // Random Z between -10 and 10
        };
    };
    Object.defineProperty(MovingBlockEntity, "DefaultRisingTexture", {
        // Static getters for rising target configuration
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingStartY", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.START_Y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingFirstStopY", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.FIRST_STOP_Y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingFinalY", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.FINAL_Y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingSpeedMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.SPEED_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingScoreMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.SCORE_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingHealth", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.HEALTH;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultRisingPauseDuration", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.RISING_TARGET.PAUSE_DURATION;
        },
        enumerable: false,
        configurable: true
    });
    // Helper method to create rising target configuration
    MovingBlockEntity.createRisingConfiguration = function (customConfig) {
        return __assign({ blockTextureUri: this.DefaultRisingTexture, blockHalfExtents: this.DefaultRisingHalfExtents, health: this.DefaultRisingHealth, moveSpeed: this.DefaultBlockSpeed * this.DefaultRisingSpeedMultiplier, movementBehavior: new block_movement_1.RisingMovement({
                startY: this.DefaultRisingStartY,
                firstStopY: this.DefaultRisingFirstStopY,
                finalY: this.DefaultRisingFinalY,
                pauseDuration: this.DefaultRisingPauseDuration
            }), movementBounds: undefined, oscillate: false }, customConfig);
    };
    // Helper method to validate rising target position
    MovingBlockEntity.isValidRisingPosition = function (position) {
        // Rising targets only need to validate X and Z coordinates since Y is controlled by the movement
        return (position.x >= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x &&
            position.x <= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x &&
            position.z >= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z &&
            position.z <= exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z);
    };
    // Helper method to generate a random rising target position
    MovingBlockEntity.generateRisingSpawnPosition = function () {
        return {
            x: Math.random() * 10 - 5, // Random X between -5 and 5
            y: this.DefaultRisingStartY,
            z: Math.random() * 20 - 10 // Random Z between -10 and 10
        };
    };
    Object.defineProperty(MovingBlockEntity, "DefaultParabolicTexture", {
        // Static getters for parabolic target configuration
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultParabolicHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultParabolicScoreMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SCORE_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumTexture", {
        // Static getters for pendulum target configuration
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.TEXTURE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumHalfExtents", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.HALF_EXTENTS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumPivotHeight", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.PIVOT_HEIGHT;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumLength", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.LENGTH;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumAmplitude", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.AMPLITUDE;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumFrequency", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.FREQUENCY;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MovingBlockEntity, "DefaultPendulumScoreMultiplier", {
        get: function () {
            return exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.SCORE_MULTIPLIER;
        },
        enumerable: false,
        configurable: true
    });
    // Helper method to create pendulum target configuration
    MovingBlockEntity.createPendulumConfiguration = function (customConfig) {
        return __assign({ blockTextureUri: this.DefaultPendulumTexture, blockHalfExtents: this.DefaultPendulumHalfExtents, health: exports.MOVING_BLOCK_CONFIG.PENDULUM_TARGET.HEALTH, movementBehavior: new block_movement_1.PendulumMovement({
                pivotPoint: {
                    x: 0,
                    y: this.DefaultPendulumPivotHeight,
                    z: 0
                },
                length: this.DefaultPendulumLength,
                amplitude: this.DefaultPendulumAmplitude,
                frequency: this.DefaultPendulumFrequency
            }) }, customConfig);
    };
    // Helper method to create parabolic target configuration
    MovingBlockEntity.createParabolicConfiguration = function (customConfig) {
        // Calculate random start and end X positions using LATERAL bounds
        var randomStartX = Math.random() *
            (exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MAX -
                exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN) +
            exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN;
        var randomEndX = Math.random() *
            (exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MAX -
                exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN) +
            exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN;
        // Calculate random distance within the new min/max range
        var distance = exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MIN_TRAVEL_DISTANCE +
            Math.random() * (exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MAX_TRAVEL_DISTANCE -
                exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MIN_TRAVEL_DISTANCE);
        // Use FORWARD bounds for Z coordinates
        var startZ = exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.FORWARD.MIN;
        var endZ = Math.min(startZ + distance, exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.FORWARD.MAX);
        return __assign({ blockTextureUri: this.DefaultParabolicTexture, blockHalfExtents: this.DefaultParabolicHalfExtents, health: exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.HEALTH, movementBehavior: new block_movement_1.ParabolicMovement({
                startPoint: { x: randomStartX, y: exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.START_Y, z: startZ },
                endPoint: { x: randomEndX, y: exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.END_Y, z: endZ },
                maxHeight: exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MAX_HEIGHT,
                duration: exports.MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.DURATION
            }) }, customConfig);
    };
    // Add getters for scoring calculations
    MovingBlockEntity.prototype.getSpawnTime = function () {
        return this.spawnTime;
    };
    // Use the base class's blockHalfExtents property
    MovingBlockEntity.prototype.getBlockDimensions = function () {
        return this.blockHalfExtents || exports.MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS;
    };
    MovingBlockEntity.prototype.getMovementBehaviorType = function () {
        return this.movementBehavior.constructor.name;
    };
    MovingBlockEntity.prototype.despawn = function () {
        // Clear despawn timer if it exists
        if (this.despawnTimer) {
            clearTimeout(this.despawnTimer);
            this.despawnTimer = null;
        }
        _super.prototype.despawn.call(this);
    };
    return MovingBlockEntity;
}(hytopia_1.Entity));
exports.MovingBlockEntity = MovingBlockEntity;
var MovingBlockManager = /** @class */ (function () {
    function MovingBlockManager(world, scoreManager) {
        this.world = world;
        this.scoreManager = scoreManager;
        this.blocks = [];
    }
    MovingBlockManager.prototype.getBlockCount = function () {
        var MAX_BLOCK_AGE_MS = 300000; // 5 minutes
        var now = Date.now();
        // Filter out despawned blocks AND old blocks
        this.blocks = this.blocks.filter(function (block) {
            var isValid = block.isSpawned &&
                (now - block.getSpawnTime()) < MAX_BLOCK_AGE_MS;
            // If not valid, make sure it's properly despawned
            if (!isValid && block.isSpawned) {
                block.despawn();
            }
            return isValid;
        });
        return this.blocks.length;
    };
    MovingBlockManager.prototype.createZAxisBlock = function (spawnPosition) {
        var _this = this;
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        // Get default half extents and reduce by 40%
        var defaultHalfExtents = MovingBlockEntity.DefaultBlockHalfExtents;
        var scaledHalfExtents = {
            x: defaultHalfExtents.x * 0.6, // 40% smaller
            y: defaultHalfExtents.y * 0.6, // 40% smaller
            z: defaultHalfExtents.z * 0.6 // 40% smaller
        };
        // Generate random direction with X component
        var randomAngle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45 to 45 degrees
        var direction = {
            x: Math.sin(randomAngle) * 0.5, // X component limited to 0.5 magnitude
            y: 0, // Y handled by movement behavior
            z: Math.cos(randomAngle) // Z component
        };
        var block = new MovingBlockEntity(MovingBlockEntity.createDefaultBlockConfiguration({
            blockHalfExtents: scaledHalfExtents,
            direction: direction,
            onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = MovingBlockEntity.DefaultBlockScore;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            }
        }));
        // Generate spawn position respecting platform safety
        var finalSpawnPosition = spawnPosition || this.generateSafeSpawnPosition();
        block.spawn(this.world, finalSpawnPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.generateSafeSpawnPosition = function () {
        var bounds = MovingBlockEntity.DefaultMovementBounds;
        var safetyMargin = exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN;
        var rightPlatformX = exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.X;
        var leftPlatformX = exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.X;
        var attempts = 0;
        var position;
        do {
            position = {
                x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
                y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
                z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
            };
            // Check if position is safe from platforms
            var isNearRightPlatform = Math.abs(position.x - rightPlatformX) < safetyMargin &&
                position.z >= exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MIN - safetyMargin &&
                position.z <= exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MAX + safetyMargin;
            var isNearLeftPlatform = Math.abs(position.x - leftPlatformX) < safetyMargin &&
                position.z >= exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MIN - safetyMargin &&
                position.z <= exports.MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MAX + safetyMargin;
            if (!isNearRightPlatform && !isNearLeftPlatform) {
                break;
            }
            attempts++;
        } while (attempts < 10);
        // If we couldn't find a safe position, use a guaranteed safe default
        if (attempts >= 10) {
            position = __assign({}, MovingBlockEntity.DefaultSpawnPosition);
        }
        return position;
    };
    MovingBlockManager.prototype.createSineWaveBlock = function (options) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var block = new MovingBlockEntity({
            moveSpeed: (_a = options.moveSpeed) !== null && _a !== void 0 ? _a : exports.MOVING_BLOCK_CONFIG.DEFAULT_SPEED * 0.8,
            blockTextureUri: (_b = options.blockTextureUri) !== null && _b !== void 0 ? _b : 'blocks/diamond-ore.png',
            blockHalfExtents: { x: 1, y: 1, z: 1 },
            movementBehavior: new block_movement_1.SineWaveMovement({
                amplitude: (_c = options.amplitude) !== null && _c !== void 0 ? _c : 8, // Increased from 4 to 8 for wider X movement
                frequency: (_d = options.frequency) !== null && _d !== void 0 ? _d : 0.2, // Reduced from 0.5 to 0.2 for slower oscillation
                baseAxis: (_e = options.baseAxis) !== null && _e !== void 0 ? _e : 'z',
                waveAxis: (_f = options.waveAxis) !== null && _f !== void 0 ? _f : 'x'
            }),
            // Wider movement bounds for sine wave pattern
            movementBounds: {
                min: {
                    x: -12, // Increased from -5 to -12 for wider X range
                    y: 1,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
                },
                max: {
                    x: 12, // Increased from 5 to 12 for wider X range
                    y: 1,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
                }
            },
            onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    // Give more points for hitting this more challenging target
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE * 1.5;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            }
        });
        // Ensure we have a valid spawn position
        var spawnPosition = options.spawnPosition || __assign(__assign({}, exports.MOVING_BLOCK_CONFIG.SPAWN_POSITION), { z: -5 });
        block.spawn(this.world, spawnPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createStaticTarget = function (options) {
        var _this = this;
        var _a, _b, _c;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var spawnPosition = {
            x: (_a = options.x) !== null && _a !== void 0 ? _a : (Math.random() * 16 - 8),
            y: (_b = options.y) !== null && _b !== void 0 ? _b : (2 + Math.random() * 4),
            z: (_c = options.z) !== null && _c !== void 0 ? _c : (Math.random() * 24 - 12)
        };
        // Create block with default target configuration
        var block = new MovingBlockEntity(MovingBlockEntity.createTargetConfiguration({
            despawnTime: options.despawnTime,
            onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = MovingBlockEntity.DefaultTargetScore;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            }
        }));
        block.spawn(this.world, spawnPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createVerticalWaveBlock = function (options) {
        var _this = this;
        var _a, _b, _c, _d;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var amplitude = (_a = options.amplitude) !== null && _a !== void 0 ? _a : exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.DEFAULT_AMPLITUDE;
        var heightOffset = exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HEIGHT_OFFSET;
        var safetyMargin = exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SAFETY_MARGIN;
        // Set a fixed Y value for spawning so that the Y movement is not restricted in the bounds.
        var fixedY = heightOffset + safetyMargin;
        var block = new MovingBlockEntity({
            moveSpeed: (_b = options.moveSpeed) !== null && _b !== void 0 ? _b : exports.MOVING_BLOCK_CONFIG.DEFAULT_SPEED * exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SPEED_MULTIPLIER,
            blockTextureUri: (_c = options.blockTextureUri) !== null && _c !== void 0 ? _c : exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.TEXTURE,
            blockHalfExtents: exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HALF_EXTENTS,
            health: exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HEALTH, // Set health to 1
            movementBehavior: new block_movement_1.SineWaveMovement({
                amplitude: amplitude,
                frequency: (_d = options.frequency) !== null && _d !== void 0 ? _d : exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.DEFAULT_FREQUENCY,
                baseAxis: 'z', // Move forward along Z axis
                waveAxis: 'y' // Oscillate on Y axis
            }),
            // Modified movement bounds: we fix Y to let the sine function determine vertical movement.
            movementBounds: {
                min: {
                    x: -5,
                    y: fixedY,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
                },
                max: {
                    x: 5,
                    y: fixedY,
                    z: exports.MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
                }
            },
            onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE * exports.MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SCORE_MULTIPLIER;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            }
        });
        // Calculate spawn position with appropriate height offset and safety margin
        var spawnPosition = options.spawnPosition || __assign(__assign({}, exports.MOVING_BLOCK_CONFIG.SPAWN_POSITION), { y: fixedY, z: -5 });
        block.spawn(this.world, spawnPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createPopUpTarget = function (options) {
        var _this = this;
        var _a, _b;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var config = MovingBlockEntity.createPopUpConfiguration({
            moveSpeed: options.moveSpeed,
            blockTextureUri: options.blockTextureUri,
            movementBehavior: new block_movement_1.PopUpMovement({
                startY: (_a = options.startY) !== null && _a !== void 0 ? _a : MovingBlockEntity.DefaultPopUpStartY,
                topY: (_b = options.topY) !== null && _b !== void 0 ? _b : MovingBlockEntity.DefaultPopUpTopY
            })
        });
        var block = new MovingBlockEntity(__assign(__assign({}, config), { onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultPopUpScoreMultiplier;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            } }));
        // Calculate spawn position
        var spawnPosition = options.spawnPosition || MovingBlockEntity.generatePopUpSpawnPosition();
        if (!MovingBlockEntity.isValidPopUpPosition(spawnPosition)) {
            block.spawn(this.world, MovingBlockEntity.generatePopUpSpawnPosition());
        }
        else {
            block.spawn(this.world, spawnPosition);
        }
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createRisingTarget = function (options) {
        var _this = this;
        var _a, _b, _c, _d;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var config = MovingBlockEntity.createRisingConfiguration({
            moveSpeed: options.moveSpeed,
            blockTextureUri: options.blockTextureUri,
            movementBehavior: new block_movement_1.RisingMovement({
                startY: (_a = options.startY) !== null && _a !== void 0 ? _a : MovingBlockEntity.DefaultRisingStartY,
                firstStopY: (_b = options.firstStopY) !== null && _b !== void 0 ? _b : MovingBlockEntity.DefaultRisingFirstStopY,
                finalY: (_c = options.finalY) !== null && _c !== void 0 ? _c : MovingBlockEntity.DefaultRisingFinalY,
                pauseDuration: (_d = options.pauseDuration) !== null && _d !== void 0 ? _d : MovingBlockEntity.DefaultRisingPauseDuration
            })
        });
        var block = new MovingBlockEntity(__assign(__assign({}, config), { onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultRisingScoreMultiplier;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            } }));
        // Calculate spawn position
        var spawnPosition = options.spawnPosition || MovingBlockEntity.generateRisingSpawnPosition();
        if (!MovingBlockEntity.isValidRisingPosition(spawnPosition)) {
            block.spawn(this.world, MovingBlockEntity.generateRisingSpawnPosition());
        }
        else {
            block.spawn(this.world, spawnPosition);
        }
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createParabolicTarget = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var config = MovingBlockEntity.createParabolicConfiguration({
            moveSpeed: options.moveSpeed,
            blockTextureUri: options.blockTextureUri,
            movementBehavior: new block_movement_1.ParabolicMovement({
                startPoint: options.startPoint,
                endPoint: options.endPoint,
                maxHeight: options.maxHeight,
                duration: options.duration
            })
        });
        var block = new MovingBlockEntity(__assign(__assign({}, config), { onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultParabolicScoreMultiplier;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            } }));
        // Use the start point from the movement behavior
        var startPosition = config.movementBehavior['startPoint'];
        block.spawn(this.world, startPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.createPendulumTarget = function (options) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (options === void 0) { options = {}; }
        // Clean up any despawned blocks first
        this.blocks = this.blocks.filter(function (block) { return block.isSpawned; });
        var config = MovingBlockEntity.createPendulumConfiguration({
            moveSpeed: options.moveSpeed,
            blockTextureUri: options.blockTextureUri,
            movementBehavior: new block_movement_1.PendulumMovement({
                pivotPoint: options.pivotPoint,
                length: options.length,
                amplitude: options.amplitude,
                frequency: options.frequency
            })
        });
        var block = new MovingBlockEntity(__assign(__assign({}, config), { onBlockBroken: function () {
                if (_this.scoreManager && block.playerId) {
                    var playerId = block.playerId;
                    // Let ScoreManager handle the scoring calculation
                    var score = exports.MOVING_BLOCK_CONFIG.BREAK_SCORE;
                    _this.scoreManager.addScore(playerId, score);
                    _this.scoreManager.broadcastScores(_this.world);
                    _this.removeBlock(block);
                }
            } }));
        // Calculate spawn position based on pivot point and length
        var spawnPosition = {
            x: (_b = (_a = options.pivotPoint) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0,
            y: ((_d = (_c = options.pivotPoint) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : MovingBlockEntity.DefaultPendulumPivotHeight) -
                ((_e = options.length) !== null && _e !== void 0 ? _e : MovingBlockEntity.DefaultPendulumLength),
            z: ((_g = (_f = options.pivotPoint) === null || _f === void 0 ? void 0 : _f.z) !== null && _g !== void 0 ? _g : 0) + ((_h = options.length) !== null && _h !== void 0 ? _h : MovingBlockEntity.DefaultPendulumLength)
        };
        block.spawn(this.world, spawnPosition);
        this.blocks.push(block);
        return block;
    };
    MovingBlockManager.prototype.removeBlock = function (block) {
        var index = this.blocks.indexOf(block);
        if (index !== -1) {
            this.blocks.splice(index, 1);
        }
    };
    return MovingBlockManager;
}());
exports.MovingBlockManager = MovingBlockManager;
