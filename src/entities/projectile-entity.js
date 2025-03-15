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
exports.ProjectileEntity = void 0;
var hytopia_1 = require("hytopia");
var moving_block_entity_1 = require("../moving_blocks/moving-block-entity");
var block_particle_effects_1 = require("../effects/block-particle-effects");
var score_manager_1 = require("../managers/score-manager");
var ProjectileEntity = /** @class */ (function (_super) {
    __extends(ProjectileEntity, _super);
    function ProjectileEntity(options) {
        var _a, _b, _c, _d;
        var _this = _super.call(this, __assign(__assign({}, options), { name: options.name || 'Projectile', modelUri: options.modelUri || ProjectileEntity.PREVIEW.MARKER_URI, modelScale: options.modelScale || 0.5 })) || this;
        _this.trajectoryMarkers = [];
        _this.onTick = function (entity, deltaTimeMs) {
            if (Date.now() - _this.spawnTime > _this.lifetime) {
                _this.explode();
                _this.despawn();
            }
        };
        _this.speed = (_a = options.speed) !== null && _a !== void 0 ? _a : ProjectileEntity.PHYSICS.DEFAULT_SPEED;
        _this.lifetime = (_b = options.lifetime) !== null && _b !== void 0 ? _b : ProjectileEntity.PHYSICS.DEFAULT_LIFETIME;
        _this.damage = (_c = options.damage) !== null && _c !== void 0 ? _c : ProjectileEntity.PHYSICS.DEFAULT_DAMAGE;
        _this.spawnTime = Date.now();
        _this.raycastHandler = options.raycastHandler;
        _this.enablePreview = (_d = options.enablePreview) !== null && _d !== void 0 ? _d : true;
        _this.playerId = options.playerId;
        return _this;
    }
    ProjectileEntity.prototype.validateTrajectory = function (direction) {
        if (!this.raycastHandler || !this.isSpawned)
            return true;
        // Normalize direction for accurate distance checking
        var magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0)
            return false;
        var normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude,
            z: direction.z / magnitude
        };
        // Check if there's any immediate obstruction in the trajectory
        var raycastResult = this.raycastHandler.raycast(this.position, normalizedDir, ProjectileEntity.PHYSICS.TRAJECTORY_CHECK_DISTANCE, {
            filterExcludeRigidBody: this.rawRigidBody
        });
        // If we hit something very close, the trajectory is not valid
        if (raycastResult && raycastResult.hitDistance < ProjectileEntity.PHYSICS.MIN_SPAWN_DISTANCE) {
            return false;
        }
        return true;
    };
    ProjectileEntity.prototype.spawn = function (world, position) {
        var _this = this;
        // Store spawn origin before any position adjustments
        this.spawnOrigin = __assign({}, position);
        // Get the player's look direction (assuming it's passed in the options)
        var lookDir = this.rotation || { x: 0, y: 0, z: 1 };
        // Adjust spawn position to be lower and slightly forward
        var adjustedPosition = {
            x: position.x + (lookDir.x * ProjectileEntity.PHYSICS.SPAWN_FORWARD_OFFSET),
            y: position.y + ProjectileEntity.PHYSICS.SPAWN_HEIGHT_OFFSET,
            z: position.z + (lookDir.z * ProjectileEntity.PHYSICS.SPAWN_FORWARD_OFFSET)
        };
        // Only adjust if world has raycast capability
        if ('raycast' in world) {
            // Check in all directions for nearby blocks
            for (var _i = 0, _a = ProjectileEntity.SPAWN_CHECK_DIRECTIONS; _i < _a.length; _i++) {
                var direction = _a[_i];
                var raycastResult = world.raycast(adjustedPosition, direction, 1.5);
                if (raycastResult && raycastResult.distance < ProjectileEntity.PHYSICS.MIN_SPAWN_DISTANCE) {
                    // Move away from the block in the opposite direction
                    adjustedPosition.x += -direction.x * (ProjectileEntity.PHYSICS.MIN_SPAWN_DISTANCE - raycastResult.distance);
                    adjustedPosition.y += -direction.y * (ProjectileEntity.PHYSICS.MIN_SPAWN_DISTANCE - raycastResult.distance);
                    adjustedPosition.z += -direction.z * (ProjectileEntity.PHYSICS.MIN_SPAWN_DISTANCE - raycastResult.distance);
                }
            }
        }
        _super.prototype.spawn.call(this, world, adjustedPosition);
        if (!this.isSpawned) {
            throw new Error('ProjectileEntity.spawn(): Entity failed to spawn!');
        }
        // Configure collider for solid physics interaction
        this.createAndAddChildCollider({
            shape: hytopia_1.ColliderShape.BALL,
            radius: ProjectileEntity.PHYSICS.COLLIDER_RADIUS,
            isSensor: false,
            mass: ProjectileEntity.PHYSICS.MASS,
            collisionGroups: {
                belongsTo: [hytopia_1.CollisionGroup.ENTITY],
                collidesWith: [hytopia_1.CollisionGroup.BLOCK, hytopia_1.CollisionGroup.ENTITY]
            },
            bounciness: ProjectileEntity.PHYSICS.BOUNCINESS,
            friction: ProjectileEntity.PHYSICS.FRICTION,
            onCollision: function (other, started) {
                if (!started)
                    return;
                // Prevent multiple collision handling for the same projectile
                if (!_this.isSpawned)
                    return;
                if (other instanceof moving_block_entity_1.MovingBlockEntity) {
                    // Moving block collision - despawn immediately
                    _this.despawn();
                }
                else if (typeof other === 'number') {
                    // Block collision
                    var hitPosition = _this.position;
                    _this.despawn();
                }
                else if (other instanceof ProjectileEntity) {
                    // Projectile-projectile collision - let physics handle the bouncing
                    // No need to despawn, just let them bounce naturally
                    if (_this.rawRigidBody && other.rawRigidBody) {
                        // Apply a small damping on collision to prevent endless bouncing
                        _this.rawRigidBody.setLinearDamping(0.3);
                        other.rawRigidBody.setLinearDamping(0.3);
                    }
                }
                else if (other instanceof hytopia_1.PlayerEntity) {
                    // Player collision - just despawn without applying physics
                    _this.despawn();
                }
            }
        });
        if (this.rawRigidBody) {
            this.rawRigidBody.enableCcd(true);
            this.rawRigidBody.setLinearDamping(ProjectileEntity.PHYSICS.LINEAR_DAMPING);
            this.rawRigidBody.setAngularDamping(0.3);
            // Add initial rotation to make sides face the player
            // Rotate 90 degrees around the Z axis
            var initialRotation = {
                x: 0,
                y: 0,
                z: 0.7071068, // Changed from Y to Z axis rotation
                w: 0.7071068
            };
            this.rawRigidBody.setRotation(initialRotation);
        }
    };
    ProjectileEntity.prototype.throw = function (direction) {
        if (!this.rawRigidBody)
            return;
        // Normalize direction properly
        var magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0)
            return;
        var normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude,
            z: direction.z / magnitude
        };
        // Prevent throwing if looking too far down
        if (normalizedDir.y < ProjectileEntity.PHYSICS.MAX_DOWN_ANGLE) {
            this.despawn();
            return;
        }
        // Validate trajectory before throwing
        if (!this.validateTrajectory(normalizedDir)) {
            this.despawn();
            return;
        }
        var impulse = {
            x: normalizedDir.x * this.speed,
            y: normalizedDir.y * this.speed + ProjectileEntity.PHYSICS.UPWARD_ARC,
            z: normalizedDir.z * this.speed
        };
        this.rawRigidBody.applyImpulse(impulse);
        // Calculate the perpendicular axis for forward rolling motion
        var crossProduct = {
            x: -normalizedDir.z,
            y: 0,
            z: normalizedDir.x
        };
        // Reduced torque multiplier by 66%
        var torque = {
            x: crossProduct.x * 0.14, // Reduced from 1.0 to 0.33
            y: 0,
            z: crossProduct.z * 0.14 // Reduced from 1.0 to 0.33
        };
        this.rawRigidBody.applyTorqueImpulse(torque);
    };
    /**
     * Predicts the trajectory of the projectile and returns an array of points
     * along with collision information.
     */
    ProjectileEntity.prototype.predictTrajectory = function (direction) {
        if (!this.raycastHandler || !this.isSpawned)
            return [];
        var points = [];
        var currentPos = __assign({}, this.position);
        // Calculate initial velocity based on direction and speed
        var magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0)
            return points;
        var normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude,
            z: direction.z / magnitude
        };
        // Initial velocity including the upward arc
        var velocity = {
            x: normalizedDir.x * this.speed,
            y: normalizedDir.y * this.speed + 1.0, // Same upward arc as in throw()
            z: normalizedDir.z * this.speed
        };
        // Predict trajectory points
        for (var i = 0; i < ProjectileEntity.PREVIEW.TRAJECTORY_STEPS; i++) {
            // Calculate next position based on current velocity
            var nextPos = {
                x: currentPos.x + velocity.x * ProjectileEntity.PREVIEW.TIME_STEP,
                y: currentPos.y + velocity.y * ProjectileEntity.PREVIEW.TIME_STEP,
                z: currentPos.z + velocity.z * ProjectileEntity.PREVIEW.TIME_STEP
            };
            // Calculate direction to next point
            var dirToNext = {
                x: nextPos.x - currentPos.x,
                y: nextPos.y - currentPos.y,
                z: nextPos.z - currentPos.z
            };
            // Get the distance to the next point
            var distance = Math.sqrt(dirToNext.x * dirToNext.x +
                dirToNext.y * dirToNext.y +
                dirToNext.z * dirToNext.z);
            // Normalize direction
            if (distance > 0) {
                dirToNext.x /= distance;
                dirToNext.y /= distance;
                dirToNext.z /= distance;
            }
            // Check for collisions along the path
            var raycastResult = this.raycastHandler.raycast(currentPos, dirToNext, distance, { filterExcludeRigidBody: this.rawRigidBody });
            if (raycastResult) {
                // Collision detected
                points.push({
                    position: raycastResult.hitPoint,
                    isCollision: true,
                    hitDistance: raycastResult.hitDistance
                });
                break;
            }
            else {
                // No collision, add the point
                points.push({
                    position: __assign({}, currentPos),
                    isCollision: false
                });
            }
            // Update position and velocity for next iteration
            currentPos = nextPos;
            // Apply gravity to Y velocity
            velocity.y -= ProjectileEntity.PHYSICS.GRAVITY * ProjectileEntity.PREVIEW.TIME_STEP;
        }
        return points;
    };
    /**
     * Cleans up all trajectory markers
     */
    ProjectileEntity.prototype.clearTrajectoryMarkers = function () {
        this.trajectoryMarkers.forEach(function (marker) {
            if (marker.isSpawned) {
                marker.despawn();
            }
        });
        this.trajectoryMarkers = [];
    };
    /**
     * Shows visual preview of the predicted trajectory if enabled
     */
    ProjectileEntity.prototype.showTrajectoryPreview = function (direction) {
        if (!this.enablePreview || !this.world || !this.raycastHandler)
            return;
        // Clear any existing trajectory markers
        this.clearTrajectoryMarkers();
        var points = this.predictTrajectory(direction);
        // Find the collision point
        var collisionPoint = points.find(function (point) { return point.isCollision; });
        if (collisionPoint) {
            // Only create/update a single marker at the predicted impact point
            if (this.trajectoryMarkers.length === 0) {
                var marker = new hytopia_1.Entity({
                    name: 'ImpactMarker',
                    modelUri: ProjectileEntity.PREVIEW.MARKER_URI,
                    modelScale: ProjectileEntity.PREVIEW.MARKER_SCALE,
                    opacity: ProjectileEntity.PREVIEW.MARKER_OPACITY
                });
                this.trajectoryMarkers.push(marker);
                marker.spawn(this.world, collisionPoint.position);
            }
            else {
                // Update existing marker position
                var marker = this.trajectoryMarkers[0];
                if (marker.isSpawned) {
                    marker.setPosition(collisionPoint.position);
                }
            }
        }
        else {
            // No collision point found, clear any existing markers
            this.clearTrajectoryMarkers();
        }
    };
    // Override despawn to ensure we clean up trajectory markers
    ProjectileEntity.prototype.despawn = function () {
        this.clearTrajectoryMarkers();
        _super.prototype.despawn.call(this);
    };
    ProjectileEntity.prototype.explode = function () {
        if (!this.isSpawned)
            return;
        // Reset combo when projectile expires without hitting anything
        if (this.playerId && this.world) {
            var scoreManager = this.world.entityManager.getAllEntities()
                .find(function (entity) { return entity instanceof score_manager_1.ScoreManager; });
            if (scoreManager) {
                scoreManager.resetCombo(this.playerId);
            }
        }
    };
    ProjectileEntity.prototype.onImpact = function () {
        if (!this.world)
            return;
        var particleSystem = block_particle_effects_1.BlockParticleEffects.getInstance(this.world);
        if (this.position && this.blockTextureUri) {
            particleSystem.createDestructionEffect(this.world, this.position, this.blockTextureUri);
        }
    };
    ProjectileEntity.prototype.handleCollision = function (other) {
        // ... existing collision code ...
        if (this.onCollision && this.position && this.blockTextureUri) {
            this.onCollision(this.position, this.blockTextureUri);
        }
        this.onImpact(); // Call onImpact when collision occurs
        // ... rest of collision handling
    };
    // Add getter for spawn origin
    ProjectileEntity.prototype.getSpawnOrigin = function () {
        return this.spawnOrigin ? __assign({}, this.spawnOrigin) : undefined;
    };
    // Physics constants adjusted to match TF2 grenade launcher
    ProjectileEntity.PHYSICS = {
        GRAVITY: 15.24, // TF2's 800 HU/s² converted to m/s²
        DEFAULT_SPEED: 20.00, // TF2's 1216 HU/s converted to m/s
        DEFAULT_LIFETIME: 2300, // 2.3 seconds fuse timer
        DEFAULT_DAMAGE: 10, // Typical TF2 grenade damage
        UPWARD_ARC: 1.0, // Reduced to match TF2's arc
        COLLIDER_RADIUS: 0.2, // Smaller radius for grenades
        MASS: 0.5, // Increased mass for better physics
        BOUNCINESS: 0.65, // TF2's grenade bounce factor
        FRICTION: 0.3, // Lower friction for better rolling
        LINEAR_DAMPING: 0.05, // Reduced damping for longer rolls
        MIN_SPAWN_DISTANCE: 1.0,
        TRAJECTORY_CHECK_DISTANCE: 2.0,
        MAX_DOWN_ANGLE: -0.85,
        SPEED_LOSS_PER_BOUNCE: 0.35, // 35% speed loss per bounce
        SPAWN_HEIGHT_OFFSET: -1.0, // Meters below eye level (adjust as needed)
        SPAWN_FORWARD_OFFSET: -0.5, // Meters forward from player (adjust as needed)
    };
    // Trajectory preview constants
    ProjectileEntity.PREVIEW = {
        TRAJECTORY_STEPS: 10,
        TIME_STEP: 0.1,
        MARKER_URI: 'models/projectiles/energy-orb-projectile.gltf',
        MARKER_SCALE: 0.3,
        MARKER_OPACITY: 0.7
    };
    ProjectileEntity.SPAWN_CHECK_DIRECTIONS = [
        { x: 0, y: -1, z: 0 }, // Down
        { x: 0, y: 1, z: 0 }, // Up
        { x: 1, y: 0, z: 0 }, // Right
        { x: -1, y: 0, z: 0 }, // Left
        { x: 0, y: 0, z: 1 }, // Forward
        { x: 0, y: 0, z: -1 }, // Back
    ];
    return ProjectileEntity;
}(hytopia_1.Entity));
exports.ProjectileEntity = ProjectileEntity;
