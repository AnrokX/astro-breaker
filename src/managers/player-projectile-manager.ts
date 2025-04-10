import { World, Player } from 'hytopia';
import { ProjectileEntity } from '../entities/projectile-entity';
import { Vector3Like } from 'hytopia';
import { BlockParticleEffects } from '../effects/block-particle-effects';
import { AudioManager } from './audio-manager';
import { RoundManager } from './round-manager';

export interface PlayerProjectileState {
  previewProjectile: ProjectileEntity | null;
  lastInputState: { mr: boolean };
  lastShotTime: number;
}

export class PlayerProjectileManager {
  private static readonly SHOT_COOLDOWN = 400; // 400ms cooldown (~150 shots per minute)
  private static readonly PROJECTILE_SOUNDS = [
    'audio/sfx/projectile/grenade-launcher.mp3',
    'audio/sfx/projectile/grenade-launcher2.mp3',
    'audio/sfx/projectile/grenade-launcher3.mp3'
  ];
  private playerStates = new Map<string, PlayerProjectileState>();
  private readonly world: World;
  private readonly enablePreview: boolean;
  private readonly audioManager: AudioManager;
  private roundManager?: RoundManager;
  // Special flag to force enable shooting in solo mode
  private forceEnableShooting: boolean = false;

  constructor(world: World, enablePreview: boolean = false, roundManager?: RoundManager) {
    this.world = world;
    this.enablePreview = enablePreview;
    this.audioManager = AudioManager.getInstance(world);
    this.roundManager = roundManager;
    
    // Check if this is solo mode initially
    if (roundManager) {
      this.forceEnableShooting = (roundManager as any)?.gameConfig?.gameMode === 'solo';
    }
    
    // Create a special method to update the round manager reference later
    (this as any).updateRoundManager = (newRoundManager: RoundManager) => {
      this.roundManager = newRoundManager;
      
      // Check if this is solo mode and enable force shooting if so
      this.forceEnableShooting = (newRoundManager as any)?.gameConfig?.gameMode === 'solo';
    };
  }

  initializePlayer(playerId: string): void {
    this.playerStates.set(playerId, {
      previewProjectile: null,
      lastInputState: { mr: false },
      lastShotTime: 0
    });
  }

  removePlayer(playerId: string): void {
    const state = this.playerStates.get(playerId);
    if (state?.previewProjectile) {
      state.previewProjectile.despawn();
    }
    this.playerStates.delete(playerId);
  }

  getProjectilesRemaining(playerId: string): number {
    return Infinity; // Always return infinite projectiles
  }

  private createProjectile(playerId: string, position: Vector3Like, direction: Vector3Like): ProjectileEntity {
    const projectile = new ProjectileEntity({
      modelScale: 1,
      enablePreview: this.enablePreview,
      playerId
    });

    // Calculate spawn position
    const spawnOffset = {
      x: direction.x,
      y: Math.max(direction.y, -0.5),
      z: direction.z
    };

    const offsetMag = Math.sqrt(
      spawnOffset.x * spawnOffset.x + 
      spawnOffset.y * spawnOffset.y + 
      spawnOffset.z * spawnOffset.z
    );

    const SPAWN_DISTANCE = 2.0;
    const spawnPos = {
      x: position.x + (spawnOffset.x / offsetMag) * SPAWN_DISTANCE,
      y: position.y + (spawnOffset.y / offsetMag) * SPAWN_DISTANCE + 1.5,
      z: position.z + (spawnOffset.z / offsetMag) * SPAWN_DISTANCE
    };

    projectile.spawn(this.world, spawnPos);
    this.handleProjectileSpawn(projectile);
    return projectile;
  }

  private handleProjectileSpawn(projectile: ProjectileEntity): void {
    projectile.onCollision = (position: Vector3Like, blockTextureUri: string) => {
      this.handleProjectileImpact(position, blockTextureUri);
    };
  }

  public handleProjectileInput(
    playerId: string,
    position: Vector3Like,
    direction: Vector3Like,
    input: any,
    player: Player
  ): void {
    const state = this.playerStates.get(playerId);
    if (!state) return;

    // Check if shooting is allowed based on round state
    if (this.forceEnableShooting) {
      // Skip the check in solo mode - always allow shooting if the round is active
      if (this.roundManager && !this.roundManager.isActive()) {
        // But still don't allow shooting if no round is active
        if (state.previewProjectile) {
          state.previewProjectile.despawn();
          state.previewProjectile = null;
        }
        return;
      }
    } else if (this.roundManager && !this.roundManager.isShootingAllowed()) {
      // Normal check for multiplayer mode
      // Clear any existing preview if shooting is not allowed
      if (state.previewProjectile) {
        state.previewProjectile.despawn();
        state.previewProjectile = null;
      }
      return;
    }

    const currentMrState = input.mr ?? false;
    const mrJustPressed = currentMrState && !state.lastInputState.mr;
    const mrJustReleased = !currentMrState && state.lastInputState.mr;

    // Right mouse button just pressed
    if (mrJustPressed) {
      const currentTime = Date.now();
      const timeSinceLastShot = currentTime - state.lastShotTime;

      if (timeSinceLastShot < PlayerProjectileManager.SHOT_COOLDOWN) {
        // Still on cooldown - provide feedback via console log only
        // We're not sending UI data because there seems to be no handler for it
        if (player) {
          const remainingCooldown = Math.ceil((PlayerProjectileManager.SHOT_COOLDOWN - timeSinceLastShot) / 100) / 10;
          // Projectile on cooldown
        }
        return;
      }

      // Projectiles are now unlimited, so this check is removed

      if (!state.previewProjectile) {
        state.previewProjectile = this.createProjectile(playerId, position, direction);
      }
    }
    
    // Update trajectory while held
    if (currentMrState && state.previewProjectile) {
      state.previewProjectile.showTrajectoryPreview(direction);
    }

    // Right mouse button just released
    if (mrJustReleased && state.previewProjectile) {
      // Play random grenade launcher sound
      this.audioManager.playRandomSoundEffect(PlayerProjectileManager.PROJECTILE_SOUNDS, 0.4);
      
      // Throw the projectile and clean up preview
      state.previewProjectile.throw(direction);
      state.previewProjectile.clearTrajectoryMarkers();
      state.previewProjectile = null;
      
      // Only update last shot time since projectiles are unlimited
      state.lastShotTime = Date.now();
    }

    // Update last input state
    state.lastInputState.mr = currentMrState;
  }

  // No longer needed as projectiles are unlimited
  refillProjectiles(playerId: string, amount: number = Infinity): void {
    // Method kept for backward compatibility, but no longer does anything
    return;
  }

  private handleProjectileImpact(position: Vector3Like, blockTextureUri: string): void {
    try {
      const particleSystem = BlockParticleEffects.getInstance(this.world);
      particleSystem.createDestructionEffect(this.world, position, blockTextureUri);
    } catch (error) {
      // Silently fail if particle creation fails
    }
  }
} 