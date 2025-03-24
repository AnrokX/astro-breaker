import { Entity, EntityOptions, Vector3Like, ColliderShape, CollisionGroup, World, RigidBodyType, BlockType, PlayerEntity, EntityEvent } from 'hytopia';
import { ScoreManager } from '../managers/score-manager';
import { BlockMovementBehavior, DefaultBlockMovement, SineWaveMovement, StaticMovement, PopUpMovement, RisingMovement, ParabolicMovement, PendulumMovement } from './block-movement';
import { DESTRUCTION_PARTICLE_CONFIG } from '../config/particle-config';
import { BlockParticleEffects } from '../effects/block-particle-effects';
import { SceneUIManager } from '../scene-ui/scene-ui-manager';
import { ProjectileEntity } from '../entities/projectile-entity';


// Configuration for our Z-axis moving block
export const MOVING_BLOCK_CONFIG = {
  DEFAULT_SPEED: 6,
  DEFAULT_HEALTH: 5,
  DEFAULT_TEXTURE: 'blocks/creep.png',
  DEFAULT_HALF_EXTENTS: { x: 0.5, y: 2, z: 2 },
  MOVEMENT_BOUNDS: {
    min: { x: -15, y: 2, z: -15 },  // Wider X range, higher minimum Y
    max: { x: 15, y: 12, z: 16 }    // Wider X range, higher maximum Y
  },
  SPAWN_POSITION: { x: 0, y: 4, z: 0 },  // Higher default spawn
  BREAK_SCORE: 5,  // Points awarded for breaking a block
  STATIC_TARGET: {
    TEXTURE: 'blocks/gold-ore.png',
    HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 }, // Balanced size for visibility and challenge
    HEIGHT_RANGE: { min: 3, max: 8 },  // Higher range for better visibility
    SCORE: 10, // More points for hitting target
    HEALTH: 1  // One-shot kill
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
    MIN_DISTANCE_BETWEEN_TARGETS: 7  // Increased minimum distance between targets
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
        MIN: -12,  // Reduced to keep further from left platform
        MAX: 13    // Reduced to keep further from right platform
      },
      FORWARD: { 
        MIN: -5,   // Reduced to keep further from platform depths
        MAX: 5     // Reduced to keep further from platform depths
      }
    },
    MIN_DISTANCE_FROM_PLATFORMS: 8, // Increased minimum distance from platforms
    SPAWN_SPACING: {
      MIN_X_DISTANCE: 2,  // Increased minimum X distance between pendulums
      MIN_Z_DISTANCE: 8    // Increased minimum Z distance between pendulums
    }
  },
  VERTICAL_WAVE: {  // New configuration for vertical sine wave blocks
    TEXTURE: 'blocks/infected-shadowrock.png',
    HALF_EXTENTS: { x: 1, y: 1, z: 1 },
    DEFAULT_AMPLITUDE: 5.5,  // Moderate amplitude for stable vertical movement
    DEFAULT_FREQUENCY: 0.25,  // Fixed frequency for smooth movement
    HEIGHT_OFFSET: 0,  // Lowered base height to allow blocks to go lower
    SAFETY_MARGIN: 4.0,   // Increased safety margin for more room to move
    SCORE_MULTIPLIER: 2,  // Double points for hitting this challenging target
    SPEED_MULTIPLIER: 0.5,  // Slower speed for smoother movement
    HEALTH: 1  // One-shot kill, like static targets
  },
  POPUP_TARGET: {
    TEXTURE: 'blocks/diamond-ore.png',
    HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
    START_Y: -20,
    TOP_Y: 8,
    SPEED_MULTIPLIER: 1.5,  // Faster than normal blocks
    SCORE_MULTIPLIER: 2,    // Double points for hitting this challenging target
    HEALTH: 1              // One-shot kill
  },
  RISING_TARGET: {
    TEXTURE: 'blocks/emerald-ore.png',
    HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
    START_Y: -20,
    FIRST_STOP_Y: 8,    // Same height as pop-up target
    FINAL_Y: 30,        // Much higher final position
    SPEED_MULTIPLIER: 2.0,  // Faster than pop-up target
    SCORE_MULTIPLIER: 3,    // Triple points for hitting this challenging target
    HEALTH: 1,             // One-shot kill
    PAUSE_DURATION: 2000   // 2 seconds at first stop
  },
  PARABOLIC_TARGET: {
    TEXTURE: 'blocks/swirl-rune.png',
    HALF_EXTENTS: { x: 0.8, y: 0.8, z: 0.8 },
    START_Y: -20,
    MAX_HEIGHT: 20,        // Increased height for more dramatic arc
    END_Y: -20,
    SPEED_MULTIPLIER: 1.0,  // Not used in new physics-based system
    SCORE_MULTIPLIER: 4,    // Highest points due to difficulty
    HEALTH: 1,             // One-shot kill
    DURATION: 5000,        // 5 seconds total
    SPAWN_BOUNDS: {
      FORWARD: {          // Z-axis (depth) boundaries
        MIN: -25,         // How far back it can start
        MAX: 25          // How far forward it can go
      },
      LATERAL: {          // X-axis (side-to-side) boundaries
        MIN: -15,         // How far left it can go
        MAX: 15          // How far right it can go
      }
    },
    MIN_TRAVEL_DISTANCE: 30,  // Minimum distance the block must travel
    MAX_TRAVEL_DISTANCE: 50   // Maximum distance the block can travel
  },
  PARTICLE_CONFIG: {
    COUNT: 50,               
    SCALE: 0.15,            
    LIFETIME: 800,          
    SPREAD_RADIUS: 0.3,     
    SPEED: 0.15             
  }
};


export interface MovingBlockOptions extends EntityOptions {
  moveSpeed?: number;         // Speed at which the block moves (units per second)
  direction?: Vector3Like;    // Direction vector for movement
  movementBounds?: {         // Optional boundaries for movement
    min: Vector3Like;
    max: Vector3Like;
  };
  oscillate?: boolean;       // Whether the block should reverse direction at boundaries
  blockTextureUri?: string;  // The texture to use for the block
  blockHalfExtents?: Vector3Like; // The size of the block
  health?: number;           // Health of the block before breaking
  isBreakable?: boolean;     // Whether the block can be broken
  onBlockBroken?: () => void; // Optional callback to be triggered when the block is broken
  movementBehavior?: BlockMovementBehavior; // New: inject block-specific movement logic
  despawnTime?: number;      // Optional: Time in milliseconds after which the block should despawn
}

export class MovingBlockEntity extends Entity {
  protected moveSpeed: number;
  protected direction: Vector3Like;
  protected initialPosition: Vector3Like;
  protected movementBounds?: { min: Vector3Like; max: Vector3Like };
  protected oscillate: boolean;
  private isReversed: boolean = false;
  private health: number;
  private isBreakable: boolean;
  private onBlockBroken?: () => void;
  private playerId?: string;  // Store the ID of player who last hit the block
  protected movementBehavior: BlockMovementBehavior;
  private particles: Entity[] = [];
  private particleEffects: BlockParticleEffects | null;
  private spawnTime: number;  // Add spawn time tracking
  private despawnTimer: NodeJS.Timeout | null = null;  // Add despawn timer

  constructor(options: MovingBlockOptions) {
    super({
      ...options,
      name: options.name || 'MovingBlock',
      blockTextureUri: options.blockTextureUri || MOVING_BLOCK_CONFIG.DEFAULT_TEXTURE,
      blockHalfExtents: options.blockHalfExtents || MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS,
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_POSITION,
        colliders: [{
          shape: ColliderShape.BLOCK,
          halfExtents: options.blockHalfExtents || MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS,
          collisionGroups: {
            belongsTo: [CollisionGroup.BLOCK],
            collidesWith: [CollisionGroup.PLAYER, CollisionGroup.BLOCK, CollisionGroup.ENTITY]
          },
          onCollision: (other: Entity | BlockType, started: boolean) => {
            if (started && this.isBreakable && other instanceof Entity) {
              this.handleCollision(other);
            }
          }
        }]
      }
    });
    
    // Initialize other properties
    this.moveSpeed = options.moveSpeed ?? MOVING_BLOCK_CONFIG.DEFAULT_SPEED;
    this.direction = this.normalizeDirection(options.direction || { x: 0, y: 0, z: 1 });
    this.movementBounds = options.movementBounds || MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
    this.oscillate = options.oscillate ?? true;
    this.initialPosition = { x: 0, y: 0, z: 0 };
    this.health = options.health ?? MOVING_BLOCK_CONFIG.DEFAULT_HEALTH;
    this.isBreakable = options.isBreakable ?? true;
    this.onBlockBroken = options.onBlockBroken;
    this.movementBehavior = options.movementBehavior || new DefaultBlockMovement();
    this.particleEffects = null;
    this.spawnTime = Date.now();
    
    // Register for tick events using the event system
    this.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
      // Delegate movement update to injected behavior
      this.movementBehavior.update(this, tickDeltaMs);
    });

    // Set up despawn timer if specified
    if (options.despawnTime) {
      this.despawnTimer = setTimeout(() => {
        if (this.isSpawned) {
          this.despawn();
        }
      }, options.despawnTime);
    }
  }

  private normalizeDirection(dir: Vector3Like): Vector3Like {
    const magnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (magnitude === 0) return { x: 0, y: 0, z: 1 }; // Default to moving along Z-axis
    return {
      x: dir.x / magnitude,
      y: dir.y / magnitude,
      z: dir.z / magnitude
    };
  }

  override spawn(world: World, position: Vector3Like): void {
    super.spawn(world, position);
    this.initialPosition = { ...position };
    this.particleEffects = BlockParticleEffects.getInstance(world);
    
    // Movement is now handled by the onTick event registered in the constructor
  }

  private isWithinBounds(position: Vector3Like): boolean {
    if (!this.movementBounds) return true;

    // Use a larger epsilon for boundary checks to prevent jittering
    const epsilon = 0.1; // Increased from 0.05 to 0.1 for more robust boundary detection
    
    // Check each axis independently and apply epsilon consistently
    const withinX = position.x >= (this.movementBounds.min.x + epsilon) && 
                    position.x <= (this.movementBounds.max.x - epsilon);
    const withinY = position.y >= (this.movementBounds.min.y + epsilon) && 
                    position.y <= (this.movementBounds.max.y - epsilon);
    const withinZ = position.z >= (this.movementBounds.min.z + epsilon) && 
                    position.z <= (this.movementBounds.max.z - epsilon);

    // Only enforce bounds on axes that have different min/max values
    const needsXCheck = Math.abs(this.movementBounds.max.x - this.movementBounds.min.x) > epsilon * 2;
    const needsYCheck = Math.abs(this.movementBounds.max.y - this.movementBounds.min.y) > epsilon * 2;
    const needsZCheck = Math.abs(this.movementBounds.max.z - this.movementBounds.min.z) > epsilon * 2;

    return (!needsXCheck || withinX) && 
           (!needsYCheck || withinY) && 
           (!needsZCheck || withinZ);
  }

  private reverseDirection(): void {
    // Reverse direction with a small randomization to avoid getting stuck in patterns
    this.direction.x *= -1;
    this.direction.y *= -1;
    this.direction.z *= -1;
    
    // Add slight randomization to avoid repetitive patterns
    const jitterAmount = 0.15; // Up to 15% random adjustment
    this.direction.x += (Math.random() * 2 - 1) * jitterAmount;
    this.direction.z += (Math.random() * 2 - 1) * jitterAmount;
    
    // Re-normalize the direction vector after adding jitter
    const magnitude = Math.sqrt(
      this.direction.x * this.direction.x + 
      this.direction.y * this.direction.y + 
      this.direction.z * this.direction.z
    );
    
    if (magnitude > 0) {
      this.direction.x /= magnitude;
      this.direction.y /= magnitude;
      this.direction.z /= magnitude;
    }
    
    this.isReversed = !this.isReversed;
  }


  private handleCollision(other: Entity): void {
    // Check if the colliding entity is a projectile
    if (other.name.toLowerCase().includes('projectile') && other instanceof ProjectileEntity) {
      // Store the player ID from the projectile if available
      this.playerId = other.playerId;
      
      // Calculate score using the new dynamic scoring system
      if (this.world && this.playerId) {
        const scoreManager = this.world.entityManager.getAllEntities()
          .find(entity => entity instanceof ScoreManager) as ScoreManager | undefined;
          
        if (scoreManager) {
          const score = scoreManager.calculateGrenadeTargetScore(
            other,
            this,
            this.position,
            this.playerId
          );
          
          scoreManager.addScore(this.playerId, score);
          
          // Get the player who hit the block
          const player = this.world.entityManager.getAllPlayerEntities()
            .find(p => p.player.id === this.playerId)?.player;

          if (player) {
            // Show block destroyed notification with the score
            const sceneUIManager = SceneUIManager.getInstance(this.world);
            sceneUIManager.showBlockDestroyedNotification(this.position, score, player);
          }
          
          // Create destruction effect before despawning
          if (this.blockTextureUri) {
            const particleEffects = BlockParticleEffects.getInstance(this.world);
            particleEffects.createDestructionEffect(this.world, this.position, this.blockTextureUri);
          }
          
          // Broadcast updated scores
          scoreManager.broadcastScores(this.world);
          
          // Destroy the block after scoring
          if (this.isSpawned) {
            this.despawn();
          }
        } else {
          this.takeDamage(1); // Fallback to simple damage
        }
      } else {
        this.takeDamage(1); // Fallback to simple damage
      }
      
      // Despawn the projectile that hit us
      if (other.isSpawned) {
        other.despawn();
      }
    }
  }

  private takeDamage(amount: number): void {
    if (!this.isBreakable) return;

    this.health -= amount;
    
    // Get the player who hit the block
    const player = this.world?.entityManager.getAllPlayerEntities()
      .find((p: PlayerEntity) => p.player.id === this.playerId)?.player;
    
    if (!player || !this.world) return;
    
    // Get the SceneUIManager instance
    const sceneUIManager = SceneUIManager.getInstance(this.world);
    
    if (this.health <= 0) {
      // Calculate score before showing notification
      const score = this.calculateScore();
      
      // Show block destroyed notification with appropriate score
      sceneUIManager.showBlockDestroyedNotification(this.position, score, player);
      
      // Create destruction effect before despawning
      this.createDestructionEffect();
      
      if (this.onBlockBroken) {
        this.onBlockBroken();
      }
      
      this.despawn();
      return;
    } else {
      // Show hit notification for non-destroying hits
      sceneUIManager.showHitNotification(this.position, 1, player); // Show +1 for each hit
    }
    
    // Instead of changing opacity, change the block type based on health
    const blockTypes = [
      'blocks/void-sand.png',
      'blocks/infected-shadowrock.png',
      'blocks/dragons-stone.png',
      'blocks/diamond-ore.png',
      'blocks/clay.png'
    ];
    
    // Calculate which block type to use based on health
    const blockIndex = Math.floor((this.health / MOVING_BLOCK_CONFIG.DEFAULT_HEALTH) * (blockTypes.length - 1));
    const newBlockType = blockTypes[Math.max(0, Math.min(blockIndex, blockTypes.length - 1))];
    
    // Create a new block with the same properties but different texture
    const newBlock = new MovingBlockEntity({
      blockTextureUri: newBlockType,
      moveSpeed: this.moveSpeed,
      direction: this.direction,
      movementBounds: this.movementBounds,
      oscillate: this.oscillate,
      health: this.health,
      isBreakable: this.isBreakable,
      onBlockBroken: this.onBlockBroken,  // Transfer the callback
      movementBehavior: this.movementBehavior // Transfer the movement behavior
    });

    // Transfer the player ID to the new block
    (newBlock as any).playerId = this.playerId;

    // Spawn the new block at the current position
    if (this.world) {
      newBlock.spawn(this.world, this.position);
    }

    // Despawn the old block
    this.despawn();
  }

  private calculateScore(): number {
    // Base score calculation based on block type and difficulty
    let score = MOVING_BLOCK_CONFIG.BREAK_SCORE;
    
    // Multiply score based on movement behavior
    if (this.movementBehavior instanceof SineWaveMovement) {
      // We need to check if this is a vertical wave based on position
      const isVerticalWave = this.position.y > MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HEIGHT_OFFSET;
      
      if (isVerticalWave) {
        score *= MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SCORE_MULTIPLIER;
      } else {
        score *= 1.5; // Sine wave blocks are harder to hit
      }
    } else if (this.movementBehavior instanceof PopUpMovement) {
      score *= MOVING_BLOCK_CONFIG.POPUP_TARGET.SCORE_MULTIPLIER;
    } else if (this.movementBehavior instanceof RisingMovement) {
      score *= MOVING_BLOCK_CONFIG.RISING_TARGET.SCORE_MULTIPLIER;
    } else if (this.movementBehavior instanceof ParabolicMovement) {
      score *= MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SCORE_MULTIPLIER;
    } else if (this.movementBehavior instanceof PendulumMovement) {
      score *= MOVING_BLOCK_CONFIG.PENDULUM_TARGET.SCORE_MULTIPLIER;
    } else if (this.movementBehavior instanceof StaticMovement) {
      score = MOVING_BLOCK_CONFIG.STATIC_TARGET.SCORE; // Static targets have their own base score
    } else if (this.movementBehavior instanceof DefaultBlockMovement) {
      // Apply Z-axis multiplier to match the ScoreManager
      score *= 1.5; // This should match SCORING_CONFIG.Z_AXIS_MULTIPLIER
    }
    
    return Math.round(score);
  }

  // --- Added getter and helper methods for movement behavior use ---

  public getDirection(): Vector3Like {
    return { ...this.direction }; // Return a copy to prevent direct modification
  }

  public getMoveSpeed(): number {
    return this.moveSpeed;
  }

  public isWithinMovementBounds(position: Vector3Like): boolean {
    return this.isWithinBounds(position);
  }

  public shouldOscillate(): boolean {
    return this.oscillate;
  }

  public reverseMovementDirection(): void {
    this.reverseDirection();
  }

  public resetToInitialPosition(): void {
    this.setPosition(this.initialPosition);
  }

  private getDebugInfo(): string {
    const halfExtents = this.blockHalfExtents || { x: 0, y: 0, z: 0 };
    return `MovingBlock Debug Info:
      ID: ${this.id}
      Position: x=${this.position.x.toFixed(2)}, y=${this.position.y.toFixed(2)}, z=${this.position.z.toFixed(2)}
      Direction: x=${this.direction.x.toFixed(2)}, y=${this.direction.y.toFixed(2)}, z=${this.direction.z.toFixed(2)}
      Speed: ${this.moveSpeed}
      Health: ${this.health}
      Is Breakable: ${this.isBreakable}
      Oscillating: ${this.oscillate}
      Is Reversed: ${this.isReversed}
      Movement Bounds: ${this.movementBounds ? 
        `\n        Min: x=${this.movementBounds.min.x}, y=${this.movementBounds.min.y}, z=${this.movementBounds.min.z}
        Max: x=${this.movementBounds.max.x}, y=${this.movementBounds.max.y}, z=${this.movementBounds.max.z}` 
        : 'None'}
      Last Hit By Player: ${this.playerId || 'None'}
      Texture: ${this.blockTextureUri || 'None'}
      Half Extents: x=${halfExtents.x}, y=${halfExtents.y}, z=${halfExtents.z}
      Is Spawned: ${this.isSpawned}`;
  }

  private createDestructionEffect(): void {
    if (!this.world || !this.blockTextureUri) return;
    this.particleEffects?.createDestructionEffect(this.world, this.position, this.blockTextureUri);
  }

  // Static getters for default target configuration
  static get DefaultTargetTexture(): string {
    return MOVING_BLOCK_CONFIG.STATIC_TARGET.TEXTURE;
  }

  static get DefaultTargetHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.STATIC_TARGET.HALF_EXTENTS;
  }

  static get DefaultTargetHeightRange(): { min: number; max: number } {
    return MOVING_BLOCK_CONFIG.STATIC_TARGET.HEIGHT_RANGE;
  }

  static get DefaultTargetScore(): number {
    return MOVING_BLOCK_CONFIG.STATIC_TARGET.SCORE;
  }

  static get DefaultTargetHealth(): number {
    return MOVING_BLOCK_CONFIG.STATIC_TARGET.HEALTH;
  }

  // Z-Axis Moving Block (Default Block) Getters
  static get DefaultBlockSpeed(): number {
    return MOVING_BLOCK_CONFIG.DEFAULT_SPEED;
  }

  static get DefaultBlockHealth(): number {
    return MOVING_BLOCK_CONFIG.DEFAULT_HEALTH;
  }

  static get DefaultBlockTexture(): string {
    return MOVING_BLOCK_CONFIG.DEFAULT_TEXTURE;
  }

  static get DefaultBlockHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS;
  }

  static get DefaultBlockScore(): number {
    return MOVING_BLOCK_CONFIG.BREAK_SCORE;
  }

  static get DefaultMovementBounds(): { min: Vector3Like; max: Vector3Like } {
    return MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
  }

  static get DefaultSpawnPosition(): Vector3Like {
    return MOVING_BLOCK_CONFIG.SPAWN_POSITION;
  }

  // Helper methods for Z-Axis Moving Block
  static createDefaultBlockConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    return {
      moveSpeed: this.DefaultBlockSpeed,
      blockTextureUri: this.DefaultBlockTexture,
      blockHalfExtents: this.DefaultBlockHalfExtents,
      health: this.DefaultBlockHealth,
      movementBehavior: new DefaultBlockMovement(),
      movementBounds: this.DefaultMovementBounds,
      oscillate: true, // Default behavior is to oscillate
      ...customConfig
    };
  }

  static isValidDefaultBlockPosition(position: Vector3Like): boolean {
    const bounds = this.DefaultMovementBounds;
    return (
      position.x >= bounds.min.x && position.x <= bounds.max.x &&
      position.y >= bounds.min.y && position.y <= bounds.max.y &&
      position.z >= bounds.min.z && position.z <= bounds.max.z
    );
  }

  static generateDefaultSpawnPosition(customBounds?: { min: Vector3Like; max: Vector3Like }): Vector3Like {
    const bounds = customBounds || this.DefaultMovementBounds;
    return {
      x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
      y: bounds.min.y, // Usually fixed height for Z-axis moving blocks
      z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
    };
  }

  // Helper method to calculate movement step
  static calculateMovementStep(currentPosition: Vector3Like, direction: Vector3Like, speed: number, deltaSeconds: number): Vector3Like {
    return {
      x: currentPosition.x + direction.x * speed * deltaSeconds,
      y: currentPosition.y + direction.y * speed * deltaSeconds,
      z: currentPosition.z + direction.z * speed * deltaSeconds
    };
  }

  // Helper methods for target positioning
  static generateRandomTargetPosition(bounds?: { min: Vector3Like; max: Vector3Like }): Vector3Like {
    const heightRange = this.DefaultTargetHeightRange;
    const randomHeight = heightRange.min + Math.random() * (heightRange.max - heightRange.min);

    const defaultBounds = MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
    const targetBounds = bounds || defaultBounds;

    return {
      x: targetBounds.min.x + Math.random() * (targetBounds.max.x - targetBounds.min.x),
      y: randomHeight,
      z: targetBounds.min.z + Math.random() * (targetBounds.max.z - targetBounds.min.z)
    };
  }

  static isValidTargetPosition(position: Vector3Like, bounds?: { min: Vector3Like; max: Vector3Like }): boolean {
    const targetBounds = bounds || MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
    const heightRange = this.DefaultTargetHeightRange;

    return (
      position.x >= targetBounds.min.x && position.x <= targetBounds.max.x &&
      position.y >= heightRange.min && position.y <= heightRange.max &&
      position.z >= targetBounds.min.z && position.z <= targetBounds.max.z
    );
  }

  // Helper method to create target configuration
  static createTargetConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    return {
      blockTextureUri: this.DefaultTargetTexture,
      blockHalfExtents: this.DefaultTargetHalfExtents,
      health: this.DefaultTargetHealth,
      movementBehavior: new StaticMovement(),
      movementBounds: {
        min: { 
          x: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x,
          y: this.DefaultTargetHeightRange.min,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
        },
        max: {
          x: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x,
          y: this.DefaultTargetHeightRange.max,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
        }
      },
      ...customConfig
    };
  }

  // Static getters for pop-up target configuration
  static get DefaultPopUpTexture(): string {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.TEXTURE;
  }

  static get DefaultPopUpHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.HALF_EXTENTS;
  }

  static get DefaultPopUpStartY(): number {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.START_Y;
  }

  static get DefaultPopUpTopY(): number {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.TOP_Y;
  }

  static get DefaultPopUpSpeedMultiplier(): number {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.SPEED_MULTIPLIER;
  }

  static get DefaultPopUpScoreMultiplier(): number {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.SCORE_MULTIPLIER;
  }

  static get DefaultPopUpHealth(): number {
    return MOVING_BLOCK_CONFIG.POPUP_TARGET.HEALTH;
  }

  // Helper method to create pop-up target configuration
  static createPopUpConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    return {
      blockTextureUri: this.DefaultPopUpTexture,
      blockHalfExtents: this.DefaultPopUpHalfExtents,
      health: this.DefaultPopUpHealth,
      moveSpeed: this.DefaultBlockSpeed * this.DefaultPopUpSpeedMultiplier,
      movementBehavior: new PopUpMovement({
        startY: this.DefaultPopUpStartY,
        topY: this.DefaultPopUpTopY
      }),
      movementBounds: undefined, // Pop-up targets handle their own boundaries
      oscillate: false, // Pop-up targets don't oscillate
      ...customConfig
    };
  }

  // Helper method to validate pop-up target position
  static isValidPopUpPosition(position: Vector3Like): boolean {
    // Pop-up targets only need to validate X and Z coordinates since Y is controlled by the movement
    return (
      position.x >= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x &&
      position.x <= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x &&
      position.z >= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z &&
      position.z <= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
    );
  }

  // Helper method to generate a random pop-up target position
  static generatePopUpSpawnPosition(): Vector3Like {
    return {
      x: Math.random() * 10 - 5, // Random X between -5 and 5
      y: this.DefaultPopUpStartY,
      z: Math.random() * 20 - 10 // Random Z between -10 and 10
    };
  }

  // Static getters for rising target configuration
  static get DefaultRisingTexture(): string {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.TEXTURE;
  }

  static get DefaultRisingHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.HALF_EXTENTS;
  }

  static get DefaultRisingStartY(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.START_Y;
  }

  static get DefaultRisingFirstStopY(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.FIRST_STOP_Y;
  }

  static get DefaultRisingFinalY(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.FINAL_Y;
  }

  static get DefaultRisingSpeedMultiplier(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.SPEED_MULTIPLIER;
  }

  static get DefaultRisingScoreMultiplier(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.SCORE_MULTIPLIER;
  }

  static get DefaultRisingHealth(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.HEALTH;
  }

  static get DefaultRisingPauseDuration(): number {
    return MOVING_BLOCK_CONFIG.RISING_TARGET.PAUSE_DURATION;
  }

  // Helper method to create rising target configuration
  static createRisingConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    return {
      blockTextureUri: this.DefaultRisingTexture,
      blockHalfExtents: this.DefaultRisingHalfExtents,
      health: this.DefaultRisingHealth,
      moveSpeed: this.DefaultBlockSpeed * this.DefaultRisingSpeedMultiplier,
      movementBehavior: new RisingMovement({
        startY: this.DefaultRisingStartY,
        firstStopY: this.DefaultRisingFirstStopY,
        finalY: this.DefaultRisingFinalY,
        pauseDuration: this.DefaultRisingPauseDuration
      }),
      movementBounds: undefined,
      oscillate: false,
      ...customConfig
    };
  }

  // Helper method to validate rising target position
  static isValidRisingPosition(position: Vector3Like): boolean {
    // Rising targets only need to validate X and Z coordinates since Y is controlled by the movement
    return (
      position.x >= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x &&
      position.x <= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x &&
      position.z >= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z &&
      position.z <= MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
    );
  }

  // Helper method to generate a random rising target position
  static generateRisingSpawnPosition(): Vector3Like {
    return {
      x: Math.random() * 10 - 5, // Random X between -5 and 5
      y: this.DefaultRisingStartY,
      z: Math.random() * 20 - 10 // Random Z between -10 and 10
    };
  }

  // Static getters for parabolic target configuration
  static get DefaultParabolicTexture(): string {
    return MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.TEXTURE;
  }

  static get DefaultParabolicHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.HALF_EXTENTS;
  }

  static get DefaultParabolicScoreMultiplier(): number {
    return MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SCORE_MULTIPLIER;
  }

  // Static getters for pendulum target configuration
  static get DefaultPendulumTexture(): string {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.TEXTURE;
  }

  static get DefaultPendulumHalfExtents(): Vector3Like {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.HALF_EXTENTS;
  }

  static get DefaultPendulumPivotHeight(): number {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.PIVOT_HEIGHT;
  }

  static get DefaultPendulumLength(): number {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.LENGTH;
  }

  static get DefaultPendulumAmplitude(): number {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.AMPLITUDE;
  }

  static get DefaultPendulumFrequency(): number {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.FREQUENCY;
  }

  static get DefaultPendulumScoreMultiplier(): number {
    return MOVING_BLOCK_CONFIG.PENDULUM_TARGET.SCORE_MULTIPLIER;
  }

  // Helper method to create pendulum target configuration
  static createPendulumConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    return {
      blockTextureUri: this.DefaultPendulumTexture,
      blockHalfExtents: this.DefaultPendulumHalfExtents,
      health: MOVING_BLOCK_CONFIG.PENDULUM_TARGET.HEALTH,
      movementBehavior: new PendulumMovement({
        pivotPoint: { 
          x: 0, 
          y: this.DefaultPendulumPivotHeight, 
          z: 0 
        },
        length: this.DefaultPendulumLength,
        amplitude: this.DefaultPendulumAmplitude,
        frequency: this.DefaultPendulumFrequency
      }),
      ...customConfig
    };
  }

  // Helper method to create parabolic target configuration
  static createParabolicConfiguration(customConfig?: Partial<MovingBlockOptions>): MovingBlockOptions {
    // Calculate random start and end X positions using LATERAL bounds
    const randomStartX = Math.random() * 
                        (MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MAX - 
                         MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN) + 
                         MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN;

    const randomEndX = Math.random() * 
                      (MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MAX - 
                       MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN) + 
                       MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.LATERAL.MIN;

    // Calculate random distance within the new min/max range
    const distance = MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MIN_TRAVEL_DISTANCE + 
                    Math.random() * (MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MAX_TRAVEL_DISTANCE - 
                                   MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MIN_TRAVEL_DISTANCE);

    // Use FORWARD bounds for Z coordinates
    const startZ = MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.FORWARD.MIN;
    const endZ = Math.min(
      startZ + distance,
      MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.SPAWN_BOUNDS.FORWARD.MAX
    );

    return {
      blockTextureUri: this.DefaultParabolicTexture,
      blockHalfExtents: this.DefaultParabolicHalfExtents,
      health: MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.HEALTH,
      movementBehavior: new ParabolicMovement({
        startPoint: { x: randomStartX, y: MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.START_Y, z: startZ },
        endPoint: { x: randomEndX, y: MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.END_Y, z: endZ },
        maxHeight: MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.MAX_HEIGHT,
        duration: MOVING_BLOCK_CONFIG.PARABOLIC_TARGET.DURATION
      }),
      ...customConfig
    };
  }

  // Add getters for scoring calculations
  public getSpawnTime(): number {
    return this.spawnTime;
  }

  // Use the base class's blockHalfExtents property
  public getBlockDimensions(): Vector3Like {
    return this.blockHalfExtents || MOVING_BLOCK_CONFIG.DEFAULT_HALF_EXTENTS;
  }

  public getMovementBehaviorType(): string {
    return this.movementBehavior.constructor.name;
  }

  override despawn(): void {
    // Clear despawn timer if it exists
    if (this.despawnTimer) {
      clearTimeout(this.despawnTimer);
      this.despawnTimer = null;
    }
    super.despawn();
  }
}

export class MovingBlockManager {
  private blocks: MovingBlockEntity[] = [];

  constructor(
    private world: World,
    private scoreManager?: ScoreManager
  ) {}

  public getBlockCount(): number {
    const MAX_BLOCK_AGE_MS = 300000; // 5 minutes
    const now = Date.now();
    
    // Filter out despawned blocks AND old blocks
    this.blocks = this.blocks.filter(block => {
        const isValid = block.isSpawned && 
                       (now - block.getSpawnTime()) < MAX_BLOCK_AGE_MS;
        
        // If not valid, make sure it's properly despawned
        if (!isValid && block.isSpawned) {
            block.despawn();
        }
        return isValid;
    });
    
    return this.blocks.length;
  }

  public createZAxisBlock(spawnPosition?: Vector3Like): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    // Get default half extents and reduce by 40%
    const defaultHalfExtents = MovingBlockEntity.DefaultBlockHalfExtents;
    const scaledHalfExtents = {
        x: defaultHalfExtents.x * 0.6,  // 40% smaller
        y: defaultHalfExtents.y * 0.6,  // 40% smaller
        z: defaultHalfExtents.z * 0.6   // 40% smaller
    };

    // Generate a more balanced direction vector
    // Choose one of 8 primary directions to ensure varied but clear movement patterns
    const directionChoices = [
      { x: 0, y: 0, z: 1 },     // North
      { x: 0.7, y: 0, z: 0.7 }, // Northeast
      { x: 1, y: 0, z: 0 },     // East
      { x: 0.7, y: 0, z: -0.7 },// Southeast
      { x: 0, y: 0, z: -1 },    // South
      { x: -0.7, y: 0, z: -0.7 },// Southwest
      { x: -1, y: 0, z: 0 },    // West
      { x: -0.7, y: 0, z: 0.7 } // Northwest
    ];
    
    // Choose a random direction from the predefined choices
    const directionChoice = Math.floor(Math.random() * directionChoices.length);
    const direction = directionChoices[directionChoice];

    const block = new MovingBlockEntity(MovingBlockEntity.createDefaultBlockConfiguration({
        blockHalfExtents: scaledHalfExtents,
        direction: direction,
        onBlockBroken: () => {
            if (this.scoreManager && (block as any).playerId) {
                const playerId = (block as any).playerId;
                // Apply the Z-axis multiplier (1.5) to the base score to match the ScoreManager
                const score = MovingBlockEntity.DefaultBlockScore * 1.5;
                
                this.scoreManager.addScore(playerId, score);
                this.scoreManager.broadcastScores(this.world);
                this.removeBlock(block);
            }
        }
    }));
    
    // Generate spawn position respecting platform safety
    const finalSpawnPosition = spawnPosition || this.generateSafeSpawnPosition();
    
    block.spawn(this.world, finalSpawnPosition);
    this.blocks.push(block);
    
    // Movement is now handled by the onTick method
    
    return block;
  }

  private generateSafeSpawnPosition(): Vector3Like {
    const bounds = MovingBlockEntity.DefaultMovementBounds;
    const safetyMargin = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN;
    const rightPlatformX = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.X;
    const leftPlatformX = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.X;
    
    let attempts = 0;
    let position: Vector3Like;
    
    do {
        position = {
            x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
            y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
            z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
        };
        
        // Check if position is safe from platforms
        const isNearRightPlatform = Math.abs(position.x - rightPlatformX) < safetyMargin &&
            position.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MIN - safetyMargin &&
            position.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MAX + safetyMargin;
            
        const isNearLeftPlatform = Math.abs(position.x - leftPlatformX) < safetyMargin &&
            position.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MIN - safetyMargin &&
            position.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MAX + safetyMargin;
        
        if (!isNearRightPlatform && !isNearLeftPlatform) {
            break;
        }
        
        attempts++;
    } while (attempts < 10);
    
    // If we couldn't find a safe position, use a guaranteed safe default
    if (attempts >= 10) {
        position = { ...MovingBlockEntity.DefaultSpawnPosition };
    }
    
    return position;
  }

  public createSineWaveBlock(options: {
    spawnPosition?: Vector3Like;
    amplitude?: number;
    frequency?: number;
    baseAxis?: 'x' | 'y' | 'z';
    waveAxis?: 'x' | 'y' | 'z';
    moveSpeed?: number;
    blockTextureUri?: string;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const block = new MovingBlockEntity({
      moveSpeed: options.moveSpeed ?? MOVING_BLOCK_CONFIG.DEFAULT_SPEED * 0.8,
      blockTextureUri: options.blockTextureUri ?? 'blocks/diamond-ore.png',
      blockHalfExtents: { x: 1, y: 1, z: 1 },
      movementBehavior: new SineWaveMovement({
        amplitude: options.amplitude ?? 8,  // Increased from 4 to 8 for wider X movement
        frequency: options.frequency ?? 0.2,  // Reduced from 0.5 to 0.2 for slower oscillation
        baseAxis: options.baseAxis ?? 'z',
        waveAxis: options.waveAxis ?? 'x'
      }),
      // Wider movement bounds for sine wave pattern
      movementBounds: {
        min: { 
          x: -12,  // Increased from -5 to -12 for wider X range
          y: 1,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
        },
        max: {
          x: 12,   // Increased from 5 to 12 for wider X range
          y: 1,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
        }
      },
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          // Give more points for hitting this more challenging target
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * 1.5;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Ensure we have a valid spawn position
    const spawnPosition = options.spawnPosition || { ...MOVING_BLOCK_CONFIG.SPAWN_POSITION, z: -5 };
    
    block.spawn(this.world, spawnPosition);
    this.blocks.push(block);
    
    return block;
  }

  public createStaticTarget(options: {
    x?: number;
    y?: number;
    z?: number;
    despawnTime?: number;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const spawnPosition = {
      x: options.x ?? (Math.random() * 16 - 8),
      y: options.y ?? (2 + Math.random() * 4),
      z: options.z ?? (Math.random() * 24 - 12)
    };

    // Create block with default target configuration
    const block = new MovingBlockEntity(MovingBlockEntity.createTargetConfiguration({
      despawnTime: options.despawnTime,
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          const score = MovingBlockEntity.DefaultTargetScore;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    }));
    
    block.spawn(this.world, spawnPosition);
    this.blocks.push(block);

    return block;
  }

  public createVerticalWaveBlock(options: {
    spawnPosition?: Vector3Like;
    amplitude?: number;
    frequency?: number;
    moveSpeed?: number;
    blockTextureUri?: string;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const amplitude = options.amplitude ?? MOVING_BLOCK_CONFIG.VERTICAL_WAVE.DEFAULT_AMPLITUDE;
    const heightOffset = MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HEIGHT_OFFSET;
    const safetyMargin = MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SAFETY_MARGIN;

    // Set a fixed Y value for spawning so that the Y movement is not restricted in the bounds.
    const fixedY = heightOffset + safetyMargin;

    const block = new MovingBlockEntity({
      moveSpeed: options.moveSpeed ?? MOVING_BLOCK_CONFIG.DEFAULT_SPEED * MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SPEED_MULTIPLIER,
      blockTextureUri: options.blockTextureUri ?? MOVING_BLOCK_CONFIG.VERTICAL_WAVE.TEXTURE,
      blockHalfExtents: MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HALF_EXTENTS,
      health: MOVING_BLOCK_CONFIG.VERTICAL_WAVE.HEALTH,  // Set health to 1
      movementBehavior: new SineWaveMovement({
        amplitude: amplitude,
        frequency: options.frequency ?? MOVING_BLOCK_CONFIG.VERTICAL_WAVE.DEFAULT_FREQUENCY,
        baseAxis: 'z',  // Move forward along Z axis
        waveAxis: 'y'   // Oscillate on Y axis
      }),
      // Modified movement bounds: we fix Y to let the sine function determine vertical movement
      // and provide wider X boundaries for more horizontal space
      movementBounds: {
        min: { 
          x: -8,  // Wider X boundaries (was -5)
          y: fixedY,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.z
        },
        max: {
          x: 8,   // Wider X boundaries (was 5)
          y: fixedY,
          z: MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.z
        }
      },
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * MOVING_BLOCK_CONFIG.VERTICAL_WAVE.SCORE_MULTIPLIER;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Calculate spawn position with appropriate height offset and safety margin
    const spawnPosition = options.spawnPosition || {
      ...MOVING_BLOCK_CONFIG.SPAWN_POSITION,
      y: fixedY,  // Use the fixed Y value for spawn
      z: -5
    };
    
    block.spawn(this.world, spawnPosition);
    this.blocks.push(block);
    
    return block;
  }

  public createPopUpTarget(options: {
    spawnPosition?: Vector3Like;
    startY?: number;
    topY?: number;
    moveSpeed?: number;
    blockTextureUri?: string;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const config = MovingBlockEntity.createPopUpConfiguration({
      moveSpeed: options.moveSpeed,
      blockTextureUri: options.blockTextureUri,
      movementBehavior: new PopUpMovement({
        startY: options.startY ?? MovingBlockEntity.DefaultPopUpStartY,
        topY: options.topY ?? MovingBlockEntity.DefaultPopUpTopY
      })
    });

    const block = new MovingBlockEntity({
      ...config,
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultPopUpScoreMultiplier;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Calculate spawn position
    const spawnPosition = options.spawnPosition || MovingBlockEntity.generatePopUpSpawnPosition();
    
    if (!MovingBlockEntity.isValidPopUpPosition(spawnPosition)) {
      block.spawn(this.world, MovingBlockEntity.generatePopUpSpawnPosition());
    } else {
      block.spawn(this.world, spawnPosition);
    }
    
    this.blocks.push(block);
    return block;
  }

  public createRisingTarget(options: {
    spawnPosition?: Vector3Like;
    startY?: number;
    firstStopY?: number;
    finalY?: number;
    moveSpeed?: number;
    blockTextureUri?: string;
    pauseDuration?: number;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const config = MovingBlockEntity.createRisingConfiguration({
      moveSpeed: options.moveSpeed,
      blockTextureUri: options.blockTextureUri,
      movementBehavior: new RisingMovement({
        startY: options.startY ?? MovingBlockEntity.DefaultRisingStartY,
        firstStopY: options.firstStopY ?? MovingBlockEntity.DefaultRisingFirstStopY,
        finalY: options.finalY ?? MovingBlockEntity.DefaultRisingFinalY,
        pauseDuration: options.pauseDuration ?? MovingBlockEntity.DefaultRisingPauseDuration
      })
    });

    const block = new MovingBlockEntity({
      ...config,
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultRisingScoreMultiplier;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Calculate spawn position
    const spawnPosition = options.spawnPosition || MovingBlockEntity.generateRisingSpawnPosition();
    
    if (!MovingBlockEntity.isValidRisingPosition(spawnPosition)) {
      block.spawn(this.world, MovingBlockEntity.generateRisingSpawnPosition());
    } else {
      block.spawn(this.world, spawnPosition);
    }
    
    this.blocks.push(block);
    return block;
  }

  public createParabolicTarget(options: {
    startPoint?: Vector3Like;
    endPoint?: Vector3Like;
    maxHeight?: number;
    duration?: number;
    moveSpeed?: number;
    blockTextureUri?: string;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const config = MovingBlockEntity.createParabolicConfiguration({
      moveSpeed: options.moveSpeed,
      blockTextureUri: options.blockTextureUri,
      movementBehavior: new ParabolicMovement({
        startPoint: options.startPoint,
        endPoint: options.endPoint,
        maxHeight: options.maxHeight,
        duration: options.duration
      })
    });

    const block = new MovingBlockEntity({
      ...config,
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultParabolicScoreMultiplier;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Use the start point from the movement behavior
    const startPosition = (config.movementBehavior as ParabolicMovement)['startPoint'];
    block.spawn(this.world, startPosition);
    this.blocks.push(block);
    
    return block;
  }

  public createPendulumTarget(options: {
    pivotPoint?: Vector3Like;
    length?: number;
    amplitude?: number;
    frequency?: number;
    moveSpeed?: number;
    blockTextureUri?: string;
  } = {}): MovingBlockEntity {
    // Clean up any despawned blocks first
    this.blocks = this.blocks.filter(block => block.isSpawned);

    const config = MovingBlockEntity.createPendulumConfiguration({
      moveSpeed: options.moveSpeed,
      blockTextureUri: options.blockTextureUri,
      movementBehavior: new PendulumMovement({
        pivotPoint: options.pivotPoint,
        length: options.length,
        amplitude: options.amplitude,
        frequency: options.frequency
      })
    });

    const block = new MovingBlockEntity({
      ...config,
      onBlockBroken: () => {
        if (this.scoreManager && (block as any).playerId) {
          const playerId = (block as any).playerId;
          // Apply the pendulum score multiplier consistently with other movement types
          const score = MOVING_BLOCK_CONFIG.BREAK_SCORE * MovingBlockEntity.DefaultPendulumScoreMultiplier;
          
          this.scoreManager.addScore(playerId, score);
          this.scoreManager.broadcastScores(this.world);
          this.removeBlock(block);
        }
      }
    });
    
    // Calculate spawn position based on pivot point and length
    const spawnPosition = {
      x: options.pivotPoint?.x ?? 0,
      y: (options.pivotPoint?.y ?? MovingBlockEntity.DefaultPendulumPivotHeight) - 
         (options.length ?? MovingBlockEntity.DefaultPendulumLength),
      z: (options.pivotPoint?.z ?? 0) + (options.length ?? MovingBlockEntity.DefaultPendulumLength)
    };
    
    block.spawn(this.world, spawnPosition);
    this.blocks.push(block);
    
    return block;
  }

  public removeBlock(block: MovingBlockEntity): void {
    const index = this.blocks.indexOf(block);
    if (index !== -1) {
      this.blocks.splice(index, 1);
    }
  }
}