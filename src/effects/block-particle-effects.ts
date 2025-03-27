import { Entity, Vector3Like, RigidBodyType, ColliderShape, World } from 'hytopia';
import { DESTRUCTION_PARTICLE_CONFIG } from '../config/particle-config';

export class BlockParticleEffects {
  private activeParticles: Set<Entity> = new Set(); // Use Set for faster lookups/removal
  private particlePools: Map<string, Entity[]> = new Map(); // Separate pool for each texture
  private static instance: BlockParticleEffects; // Singleton pattern
  private spatialGrid: Map<string, Set<Entity>> = new Map();
  private static readonly FRAME_BUDGET_MS = 16; // 60fps target
  private pendingEffects: Array<{position: Vector3Like, texture: string}> = [];
  private readonly world: World;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private particleSpawnTimes = new Map<Entity, number>();

  // Use TypedArrays for particle properties
  private particlePositions = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
  private particleVelocities = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
  private particleLifetimes = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE);

  private performanceMetrics = {
    lastFrameTime: 0,
    frameCount: 0,
    averageFrameTime: 16,
    particleReductionFactor: 1.0
  };

  // Add world parameter to constructor
  private constructor(world: World) {
    this.world = world;
    // Start the cleanup interval
    this.cleanupInterval = setInterval(() => this.forceCleanupParticles(), 5000); // Check every 5 seconds
  }

  private forceCleanupParticles(): void {
    const now = Date.now();
    this.activeParticles.forEach(particle => {
      if (!particle.isSpawned) {
        this.activeParticles.delete(particle);
        this.particleSpawnTimes.delete(particle);
        return;
      }

      // Force despawn particles that are:
      // 1. Below a certain height (on the ground)
      // 2. Haven't moved in a while
      // 3. Have been alive for too long
      const spawnTime = this.particleSpawnTimes.get(particle) || now;
      if (particle.position.y < 0.2 || // On ground
          (particle.rawRigidBody && particle.rawRigidBody.isAsleep()) || // Not moving
          (now - spawnTime > 2000)) { // Alive too long (2 seconds)
        
        this.returnParticleToPool(particle);
      }
    });
  }

  // Update getInstance to accept world parameter
  public static getInstance(world?: World): BlockParticleEffects {
    if (!BlockParticleEffects.instance && world) {
      BlockParticleEffects.instance = new BlockParticleEffects(world);
    }
    return BlockParticleEffects.instance;
  }

  private getParticleFromPool(world: World, blockTextureUri: string): Entity {
    // Get or create a texture-specific pool
    let pool = this.particlePools.get(blockTextureUri);
    if (!pool) {
      pool = [];
      this.particlePools.set(blockTextureUri, pool);
    }
    
    // Try to get a particle from the texture-specific pool
    let particle = pool.pop();
    
    if (!particle) {
      // Create new particle if pool is empty
      particle = new Entity({
        name: 'DestroyedBlockPiece',
        blockTextureUri,
        blockHalfExtents: {
          x: DESTRUCTION_PARTICLE_CONFIG.SCALE,
          y: DESTRUCTION_PARTICLE_CONFIG.SCALE,
          z: DESTRUCTION_PARTICLE_CONFIG.SCALE
        },
        rigidBodyOptions: {
          type: RigidBodyType.DYNAMIC,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: {
              x: DESTRUCTION_PARTICLE_CONFIG.SCALE,
              y: DESTRUCTION_PARTICLE_CONFIG.SCALE,
              z: DESTRUCTION_PARTICLE_CONFIG.SCALE
            },
            mass: DESTRUCTION_PARTICLE_CONFIG.PHYSICS.MASS,
            friction: DESTRUCTION_PARTICLE_CONFIG.PHYSICS.FRICTION,
            bounciness: DESTRUCTION_PARTICLE_CONFIG.PHYSICS.BOUNCINESS
          }]
        }
      });

      // If the engine supports setting sleep thresholds through the raw rigid body
      if (particle.rawRigidBody) {
        try {
          // Attempt to set sleep thresholds if the underlying physics engine supports it
          particle.rawRigidBody.setSleepThreshold?.(DESTRUCTION_PARTICLE_CONFIG.PHYSICS.SLEEP_THRESHOLD);
          particle.rawRigidBody.setAngularSleepThreshold?.(DESTRUCTION_PARTICLE_CONFIG.PHYSICS.ANGULAR_SLEEP_THRESHOLD);
        } catch (e) {
          // Silently fail if these methods aren't available
        }
      }
    }
    
    // Make sure the particle is despawned before reusing it
    if (particle.isSpawned) {
      particle.despawn();
    }

    // Track spawn time
    this.particleSpawnTimes.set(particle, Date.now());
    return particle;
  }

  private returnParticleToPool(particle: Entity): void {
    if (particle.isSpawned) {
      particle.despawn(); // Make sure to despawn first
    }
    this.activeParticles.delete(particle);
    this.particleSpawnTimes.delete(particle);
    
    // Get the correct pool based on the particle's texture
    const texture = particle.blockTextureUri;
    if (texture) {
      let pool = this.particlePools.get(texture);
      if (!pool) {
        pool = [];
        this.particlePools.set(texture, pool);
      }
      
      // Add to the texture-specific pool if it's not too big
      if (pool.length < DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE / 5) { // Divide by 5 to account for multiple textures
        pool.push(particle);
      }
    }
  }

  private getParticleCount(playerPosition: Vector3Like, explosionPosition: Vector3Like): number {
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - explosionPosition.x, 2) +
      Math.pow(playerPosition.y - explosionPosition.y, 2) +
      Math.pow(playerPosition.z - explosionPosition.z, 2)
    );
    
    // Reduce particles based on distance
    if (distance > 30) return Math.floor(DESTRUCTION_PARTICLE_CONFIG.COUNT * 0.2);  // 20% at far distance
    if (distance > 20) return Math.floor(DESTRUCTION_PARTICLE_CONFIG.COUNT * 0.5);  // 50% at medium distance
    return DESTRUCTION_PARTICLE_CONFIG.COUNT; // 100% when close
  }

  private getGridKey(position: Vector3Like): string {
    // 5x5x5 grid cells
    const gridX = Math.floor(position.x / 5);
    const gridY = Math.floor(position.y / 5);
    const gridZ = Math.floor(position.z / 5);
    return `${gridX},${gridY},${gridZ}`;
  }

  private updateParticleGrid(particle: Entity): void {
    const gridKey = this.getGridKey(particle.position);
    if (!this.spatialGrid.has(gridKey)) {
      this.spatialGrid.set(gridKey, new Set());
    }
    this.spatialGrid.get(gridKey)!.add(particle);
  }

  createDestructionEffect(world: World, position: Vector3Like, blockTextureUri: string): void {
    if (!world) return;

    // Pre-calculate some values to avoid repeated calculations
    const angleIncrement = (Math.PI * 2) / DESTRUCTION_PARTICLE_CONFIG.COUNT;
    const speed = DESTRUCTION_PARTICLE_CONFIG.SPEED * DESTRUCTION_PARTICLE_CONFIG.FORCES.EXPLOSION_MULTIPLIER;
    const spinForce = DESTRUCTION_PARTICLE_CONFIG.FORCES.SPIN_STRENGTH;

    // Batch creation to reduce overhead
    for (let i = 0; i < DESTRUCTION_PARTICLE_CONFIG.COUNT; i++) {
      const particle = this.getParticleFromPool(world, blockTextureUri);
      const angle = angleIncrement * i;

      // Calculate position with less random calls
      const offsetX = (Math.random() - 0.5) * DESTRUCTION_PARTICLE_CONFIG.SPAWN.RADIUS;
      const offsetY = (Math.random() - 0.5) * DESTRUCTION_PARTICLE_CONFIG.SPAWN.HEIGHT_VARIATION;
      const offsetZ = (Math.random() - 0.5) * DESTRUCTION_PARTICLE_CONFIG.SPAWN.RADIUS;

      particle.spawn(world, {
        x: position.x + offsetX,
        y: position.y + offsetY,
        z: position.z + offsetZ
      });

      this.activeParticles.add(particle);

      if (particle.rawRigidBody) {
        // Apply forces with fewer calculations
        const speedVariation = 0.8 + Math.random() * 0.4;
        particle.rawRigidBody.applyImpulse({
          x: Math.cos(angle) * speed * speedVariation,
          y: DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MIN + 
             Math.random() * (DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MAX - DESTRUCTION_PARTICLE_CONFIG.FORCES.UPWARD_MIN),
          z: Math.sin(angle) * speed * speedVariation
        });

        // Simplified spin calculation
        const spin = (Math.random() - 0.5) * spinForce;
        particle.rawRigidBody.applyTorqueImpulse({
          x: spin,
          y: spin,
          z: spin
        });
      }

      // Force cleanup after lifetime
      setTimeout(() => {
        if (this.activeParticles.has(particle)) {
          this.returnParticleToPool(particle);
        }
      }, DESTRUCTION_PARTICLE_CONFIG.LIFETIME);
    }
  }

  private processEffectQueue(deltaTime: number): void {
    const startTime = performance.now();
    while (this.pendingEffects.length > 0) {
      if (performance.now() - startTime > BlockParticleEffects.FRAME_BUDGET_MS) {
        // Defer remaining effects to next frame
        break;
      }
      const effect = this.pendingEffects.shift();
      if (effect) {
        this.createImmediateEffect(effect.position, effect.texture);
      }
    }
  }

  private updatePerformanceMetrics(currentTime: number): void {
    const frameTime = currentTime - this.performanceMetrics.lastFrameTime;
    this.performanceMetrics.frameCount++;
    
    // Update rolling average
    this.performanceMetrics.averageFrameTime = 
      (this.performanceMetrics.averageFrameTime * 0.95) + (frameTime * 0.05);
      
    // Adjust particle count based on performance
    if (this.performanceMetrics.averageFrameTime > 16.6) { // Below 60fps
      this.performanceMetrics.particleReductionFactor *= 0.95;
    } else if (this.performanceMetrics.averageFrameTime < 14) { // Above 70fps
      this.performanceMetrics.particleReductionFactor = 
        Math.min(1.0, this.performanceMetrics.particleReductionFactor * 1.05);
    }
    
    this.performanceMetrics.lastFrameTime = currentTime;
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Force cleanup all particles
    this.activeParticles.forEach(particle => {
      if (particle.isSpawned) {
        particle.despawn();
      }
    });
    this.activeParticles.clear();
    
    // Clear all particle pools
    this.particlePools.clear();
    
    this.spatialGrid.clear();
    this.particleSpawnTimes.clear();
    
    // Clear typed arrays
    this.particlePositions = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
    this.particleVelocities = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE * 3);
    this.particleLifetimes = new Float32Array(DESTRUCTION_PARTICLE_CONFIG.POOLING.POOL_SIZE);
  }

  private createImmediateEffect(position: Vector3Like, texture: string): void {
    if (this.world) {
      this.createDestructionEffect(this.world, position, texture);
    }
  }
} 