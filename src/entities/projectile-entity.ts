import { Entity, EntityOptions, Vector3Like, ColliderShape, CollisionGroup, BlockType, World, PlayerEntity, EntityEvent } from 'hytopia';
import { MovingBlockEntity } from '../moving_blocks/moving-block-entity';
import { BlockParticleEffects } from '../effects/block-particle-effects';
import { ScoreManager } from '../managers/score-manager';

export interface ProjectileOptions extends EntityOptions {
    speed?: number;
    lifetime?: number;
    damage?: number;
    enablePreview?: boolean;
    playerId?: string;
}

export class ProjectileEntity extends Entity {
    // Physics constants
    private static readonly PHYSICS = {
        GRAVITY: 15.24,
        DEFAULT_SPEED: 22.00,
        DEFAULT_LIFETIME: 2300,
        DEFAULT_DAMAGE: 10,
        UPWARD_ARC: 0.3,
        COLLIDER_RADIUS: 0.2,
        MASS: 0.46,
        BOUNCINESS: 0.65,
        FRICTION: 0.3,
        LINEAR_DAMPING: 0.05,
        MIN_SPAWN_DISTANCE: 1.0,
        MAX_DOWN_ANGLE: -0.85,
        SPEED_LOSS_PER_BOUNCE: 0.35,
        SPAWN_HEIGHT_OFFSET: -1.2,
        SPAWN_FORWARD_OFFSET: -0.5,
    } as const;

    // Trajectory preview constants
    private static readonly PREVIEW = {
        MARKER_URI: 'models/projectiles/energy-orb-projectile.gltf',
        MARKER_SCALE: 0.3,
        MARKER_OPACITY: 0.7
    } as const;

    private speed: number;
    private lifetime: number;
    private damage: number;
    private spawnTime: number;
    private enablePreview: boolean;
    private static readonly SPAWN_CHECK_DIRECTIONS = [
        { x: 0, y: -1, z: 0 },  // Down
        { x: 0, y: 1, z: 0 },   // Up
        { x: 1, y: 0, z: 0 },   // Right
        { x: -1, y: 0, z: 0 },  // Left
        { x: 0, y: 0, z: 1 },   // Forward
        { x: 0, y: 0, z: -1 },  // Back
    ];
    private trajectoryMarkers: Entity[] = [];
    public readonly playerId?: string;
    public onCollision?: (position: Vector3Like, blockTextureUri: string) => void;
    private spawnOrigin?: Vector3Like;

    constructor(options: ProjectileOptions) {
        super({
            ...options,
            name: options.name || 'Projectile',
            modelUri: options.modelUri || ProjectileEntity.PREVIEW.MARKER_URI,
            modelScale: options.modelScale || 0.5
        });

        this.speed = options.speed ?? ProjectileEntity.PHYSICS.DEFAULT_SPEED;
        this.lifetime = options.lifetime ?? ProjectileEntity.PHYSICS.DEFAULT_LIFETIME;
        this.damage = options.damage ?? ProjectileEntity.PHYSICS.DEFAULT_DAMAGE;
        this.spawnTime = Date.now();
        this.enablePreview = options.enablePreview ?? true;
        this.playerId = options.playerId;
        
        // Register for tick events using the event system
        this.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
            if (Date.now() - this.spawnTime > this.lifetime) {
                this.explode();
                this.despawn();
            }
        });
    }

    spawn(world: World, position: Vector3Like): void {
        // Store spawn origin before any position adjustments
        this.spawnOrigin = { ...position };

        // Get the player's look direction (assuming it's passed in the options)
        const lookDir = this.rotation || { x: 0, y: 0, z: 1 };
        
        // Adjust spawn position to be lower and slightly forward
        const adjustedPosition = { 
            x: position.x + (lookDir.x * ProjectileEntity.PHYSICS.SPAWN_FORWARD_OFFSET),
            y: position.y + ProjectileEntity.PHYSICS.SPAWN_HEIGHT_OFFSET,
            z: position.z + (lookDir.z * ProjectileEntity.PHYSICS.SPAWN_FORWARD_OFFSET)
        };

        super.spawn(world, adjustedPosition);

        if (!this.isSpawned) {
            throw new Error('ProjectileEntity.spawn(): Entity failed to spawn!');
        }

        // Configure collider for solid physics interaction
        this.createAndAddChildCollider({
            shape: ColliderShape.BALL,
            radius: ProjectileEntity.PHYSICS.COLLIDER_RADIUS,
            isSensor: false,
            mass: ProjectileEntity.PHYSICS.MASS,
            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY],
                collidesWith: [CollisionGroup.BLOCK, CollisionGroup.ENTITY]
            },
            bounciness: ProjectileEntity.PHYSICS.BOUNCINESS,
            friction: ProjectileEntity.PHYSICS.FRICTION,
            onCollision: (other: Entity | BlockType, started: boolean) => {
                if (!started) return;
                
                // Prevent multiple collision handling for the same projectile
                if (!this.isSpawned) return;
                
                if (other instanceof MovingBlockEntity) {
                    // Moving block collision - despawn immediately
                    this.despawn();
                } else if (typeof other === 'number') {
                    // Block collision
                    const hitPosition = this.position;
                    this.despawn();
                } else if (other instanceof ProjectileEntity) {
                    // Projectile-projectile collision - let physics handle the bouncing
                    // No need to despawn, just let them bounce naturally
                    if (this.rawRigidBody && other.rawRigidBody) {
                        // Apply a small damping on collision to prevent endless bouncing
                        this.rawRigidBody.setLinearDamping(0.3);
                        other.rawRigidBody.setLinearDamping(0.3);
                    }
                } else if (other instanceof PlayerEntity) {
                    // Player collision - just despawn without applying physics
                    this.despawn();
                }
            }
        });

        if (this.rawRigidBody) {
            this.rawRigidBody.enableCcd(true);
            this.rawRigidBody.setLinearDamping(ProjectileEntity.PHYSICS.LINEAR_DAMPING);
            this.rawRigidBody.setAngularDamping(0.3);
            
            // Add initial rotation to make sides face the player
            // Rotate 90 degrees around the Z axis
            const initialRotation = {
                x: 0,
                y: 0,
                z: 0.7071068,  // Changed from Y to Z axis rotation
                w: 0.7071068
            };
            this.rawRigidBody.setRotation(initialRotation);
        }
    }

    throw(direction: Vector3Like): void {
        if (!this.rawRigidBody) return;

        // Normalize direction properly
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0) return;

        const normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude,
            z: direction.z / magnitude
        };

        // Prevent throwing if looking too far down
        if (normalizedDir.y < ProjectileEntity.PHYSICS.MAX_DOWN_ANGLE) {
            this.despawn();
            return;
        }

        const impulse = {
            x: normalizedDir.x * this.speed,
            y: normalizedDir.y * this.speed + ProjectileEntity.PHYSICS.UPWARD_ARC,
            z: normalizedDir.z * this.speed
        };
        
        this.rawRigidBody.applyImpulse(impulse);
        
        // Calculate the perpendicular axis for forward rolling motion
        const crossProduct = {
            x: -normalizedDir.z,
            y: 0,
            z: normalizedDir.x
        };
        
        // Reduced torque multiplier by 66%
        const torque = {
            x: crossProduct.x * 0.14,  // Reduced from 1.0 to 0.33
            y: 0,
            z: crossProduct.z * 0.14   // Reduced from 1.0 to 0.33
        };
        this.rawRigidBody.applyTorqueImpulse(torque);
    }

    /**
     * Cleans up all trajectory markers
     */
    public clearTrajectoryMarkers(): void {
        this.trajectoryMarkers.forEach(marker => {
            if (marker.isSpawned) {
                marker.despawn();
            }
        });
        this.trajectoryMarkers = [];
    }

    /**
     * Shows visual preview of the predicted trajectory if enabled
     */
    showTrajectoryPreview(direction: Vector3Like): void {
        // Simplified to remove raycast-based preview
        this.clearTrajectoryMarkers();
    }

    // Override despawn to ensure we clean up trajectory markers
    override despawn(): void {
        this.clearTrajectoryMarkers();
        super.despawn();
    }

    private explode(): void {
        if (!this.isSpawned) return;
        
        // Reset combo when projectile expires without hitting anything
        if (this.playerId && this.world) {
            const scoreManager = this.world.entityManager.getAllEntities()
                .find(entity => entity instanceof ScoreManager) as ScoreManager;
            if (scoreManager) {
                scoreManager.resetCombo(this.playerId);
            }
        }
    }

    private onImpact(): void {
        if (!this.world) return;
        
        const particleSystem = BlockParticleEffects.getInstance(this.world);
        
        if (this.position && this.blockTextureUri) {
            particleSystem.createDestructionEffect(
                this.world,
                this.position,
                this.blockTextureUri
            );
        }
    }

    protected handleCollision(other: Entity): void {
        // ... existing collision code ...
        
        if (this.onCollision && this.position && this.blockTextureUri) {
            this.onCollision(this.position, this.blockTextureUri);
        }
        
        this.onImpact(); // Call onImpact when collision occurs
        
        // ... rest of collision handling
    }

    // Add getter for spawn origin
    public getSpawnOrigin(): Vector3Like | undefined {
        return this.spawnOrigin ? { ...this.spawnOrigin } : undefined;
    }
} 
