import { World, Vector3Like } from 'hytopia';
import { MovingBlockManager, MOVING_BLOCK_CONFIG } from '../../../moving_blocks/moving-block-entity';
import { RoundConfig } from '../interfaces/round-interfaces';

export class RoundSpawner {
  private blockSpawnTimer: NodeJS.Timeout | null = null;
  private isSpawning: boolean = false;

  constructor(
    private world: World,
    private blockManager: MovingBlockManager
  ) { }

  public startSpawning(config: RoundConfig): void {
    // Clear any existing blocks before starting new round
    this.world.entityManager.getAllEntities()
      .filter(entity => entity.name.toLowerCase().includes('block'))
      .forEach(entity => entity.despawn());
      
    // Set spawning state
    this.isSpawning = true;
    
    // Calculate player scaling factor
    const playerCount = this.world.entityManager.getAllPlayerEntities().length;
    const additionalPlayers = Math.max(0, playerCount - 2); // Count players above 2
    // Disable scaling by setting playerScaling to 0 regardless of player count
    // Original: const playerScaling = Math.min(0.3, additionalPlayers * 0.1); // 10% per player, max 30%
    const playerScaling = 0; // Scaling disabled
    
    // Scale block counts
    const scaledMaxBlocks = Math.floor(config.maxBlockCount * (1 + playerScaling));
    const scaledMinBlocks = Math.floor(config.minBlockCount * (1 + playerScaling));

    // Initial spawn - spawn minimum blocks more quickly
    for (let i = 0; i < scaledMinBlocks; i++) {
      setTimeout(() => this.spawnBlock(config, scaledMinBlocks, scaledMaxBlocks), i * 1000);
    }

    // Adaptive spawn interval based on current block count
    this.blockSpawnTimer = setInterval(() => {
      const currentBlocks = this.blockManager.getBlockCount();
      
      // If blocks are low, schedule next spawn sooner
      if (currentBlocks < scaledMinBlocks * 0.5) {
        // Clear current timer and set a faster one just once
        if (this.blockSpawnTimer) {
          clearInterval(this.blockSpawnTimer);
        }
        this.blockSpawnTimer = setInterval(() => {
          this.spawnBlock(config, scaledMinBlocks, scaledMaxBlocks);
        }, config.blockSpawnInterval * 0.6); // 40% faster spawning when low
      }
      
      this.spawnBlock(config, scaledMinBlocks, scaledMaxBlocks);
    }, config.blockSpawnInterval);
  }

  public stopSpawning(): void {
    this.isSpawning = false;
    
    if (this.blockSpawnTimer) {
      clearInterval(this.blockSpawnTimer);
      this.blockSpawnTimer = null;
    }
  }

  public cleanup(): void {
    this.stopSpawning();
  }

  private spawnBlock(config: RoundConfig, scaledMinBlocks: number, scaledMaxBlocks: number): void {
    if (!this.isSpawning) return;

    const currentBlocks = this.blockManager.getBlockCount();
    
    // Determine how many blocks to spawn using scaled values
    const blocksNeeded = Math.min(
      scaledMaxBlocks - currentBlocks,
      // Modified spawn logic for more aggressive repopulation:
      // - If no blocks left (0): spawn 3 at once 
      // - If only 1 block left: spawn 2 at once
      // - Below minimum: spawn 2 at once
      // - Below 25% of max: spawn 1 at once
      currentBlocks === 0 ? 3 :
      currentBlocks === 1 ? 2 :
      currentBlocks < scaledMinBlocks ? 2 : 
      currentBlocks < (scaledMaxBlocks * 0.25) ? 1 : 1
    );

    // Add randomized delay to create more natural, less predictable spawning
    const spawnChance = 1; // 100% chance to spawn each interval
    
    // Always proceed with spawn (100% chance)
    if (true) {
      // Try to spawn blocks if needed
      for(let i = 0; i < blocksNeeded; i++) {
        // Choose block type first
        const chosenType = this.selectBlockType(config);
        if (!chosenType) continue;

        // Find a safe spawn position
        const spawnPosition = this.getSpawnPosition(chosenType);
        
        // Calculate the base speed for this block
        const baseSpeed = 8 * config.speedMultiplier;

        // Spawn the chosen block type with appropriate parameters
        this.spawnBlockByType(chosenType, spawnPosition, baseSpeed);
      }
    }
  }

  private selectBlockType(config: RoundConfig): keyof typeof config.blockTypes | null {
    const rand = Math.random();
    const total = Object.values(config.blockTypes).reduce((a, b) => a + b, 0);
    let sum = 0;
    let chosenType: keyof typeof config.blockTypes | null = null;

    for (const [type, weight] of Object.entries(config.blockTypes)) {
      sum += weight / total;
      if (rand <= sum && !chosenType) {
        chosenType = type as keyof typeof config.blockTypes;
      }
    }

    return chosenType;
  }

  private getSpawnPosition(blockType: string): Vector3Like {
    const safetyMargin = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN;
    const existingBlocks = this.world.entityManager.getAllEntities()
      .filter(entity => entity.name.toLowerCase().includes('block'));
    
    const minSpacing = 2;
    let attempts = 0;
    let spawnPosition: Vector3Like;

    do {
      // Adjust spawn ranges based on block type
      const isStaticBlock = blockType === 'static';
      const isVerticalWave = blockType === 'verticalWave';

      spawnPosition = {
        x: (() => {
          if (isStaticBlock) return Math.random() * 16 - 8; // Static: -8 to 8
          // Moving blocks: Use movement bounds with safety margin
          const movementBounds = MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
          return movementBounds.min.x + safetyMargin + 
                 Math.random() * (movementBounds.max.x - movementBounds.min.x - 2 * safetyMargin);
        })(),
        y: (() => {
          switch(blockType) {
            case 'static':
              return this.getRandomY(0, 12);  // Static: Wide range for variety
            case 'normal':
              return this.getRandomY(-1, 10);  // Normal: Good spread above and below
            case 'sineWave':
              return this.getRandomY(0, 10);  // Sine wave: Slight bias towards higher
            case 'verticalWave':
              return this.getRandomY(-3, 3);  // Vertical wave: Base height
            case 'popup':
              return this.getRandomY(-12, -6);  // Start even lower with more variance
            case 'rising':
              return this.getRandomY(-5, 4);  // Start deep to rise up dramatically
            case 'parabolic':
              return this.getRandomY(-4, 8);  // Equal spread for parabolic arcs
            case 'pendulum':
              return this.getRandomY(-2, 8);  // Keep high for swinging down
            default:
              return this.getRandomY(0, 10);
          }
        })(),
        z: (() => {
          if (isStaticBlock) return Math.random() * 24 - 12; // Static: -12 to 12
          // Moving blocks: Use movement bounds with safety margin
          const movementBounds = MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS;
          return movementBounds.min.z + safetyMargin + 
                 Math.random() * (movementBounds.max.z - movementBounds.min.z - 2 * safetyMargin);
        })()
      };

      // Check if position is safe
      if (this.isPositionSafe(spawnPosition)) break;
      
      attempts++;
    } while (attempts < 10);

    // If we couldn't find a safe position after max attempts, use a default safe position
    if (attempts >= 10) {
      spawnPosition = {
        x: 0,
        y: 3,
        z: 0
      };
    }

    return spawnPosition;
  }

  private isPositionSafe(position: Vector3Like): boolean {
    const safetyMargin = MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN;
    const minSpacing = 2;
    
    // Check distance from platforms
    const rightPlatformDistance = Math.abs(position.x - MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.X);
    const isInRightPlatformZRange = position.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MIN - safetyMargin && 
                                  position.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.RIGHT_PLATFORM_EDGE.Z_MAX + safetyMargin;
    
    const leftPlatformDistance = Math.abs(position.x - MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.X);
    const isInLeftPlatformZRange = position.z >= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MIN - safetyMargin && 
                                 position.z <= MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.LEFT_PLATFORM_EDGE.Z_MAX + safetyMargin;
    
    const isSafeFromRightPlatform = rightPlatformDistance >= safetyMargin || !isInRightPlatformZRange;
    const isSafeFromLeftPlatform = leftPlatformDistance >= safetyMargin || !isInLeftPlatformZRange;
    
    // Check distance from all existing blocks
    const existingBlocks = this.world.entityManager.getAllEntities()
      .filter(entity => entity.name.toLowerCase().includes('block'));
      
    const isTooCloseToBlocks = existingBlocks.some(block => {
      const dx = block.position.x - position.x;
      const dy = block.position.y - position.y;
      const dz = block.position.z - position.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < minSpacing;
    });

    // Return true if position is safe from both platforms and other blocks
    return !isTooCloseToBlocks && isSafeFromRightPlatform && isSafeFromLeftPlatform;
  }

  private spawnBlockByType(blockType: string, spawnPosition: Vector3Like, baseSpeed: number): void {
    switch(blockType) {
      case 'static':
        this.blockManager.createStaticTarget({
          x: spawnPosition.x,
          y: spawnPosition.y,
          z: spawnPosition.z
        });
        break;
      case 'normal':
        this.blockManager.createZAxisBlock(spawnPosition);
        break;
      case 'sineWave':
        // For sine wave blocks, we need to account for the amplitude in spawn position
        const sineWaveAmplitude = this.getRandomY(6, 10); // Random amplitude between 6-10 units
        const sineWaveFrequency = this.getRandomY(0.15, 0.25); // Varied frequency for different wave patterns
        
        // Create variety by spawning at different points in the wave cycle
        const initialOffset = this.getRandomY(-sineWaveAmplitude, sineWaveAmplitude);
        
        const sineWaveSpawnPosition = {
          ...spawnPosition,
          // Restrict X spawn position to account for sine wave amplitude
          x: Math.max(
            Math.min(
              spawnPosition.x,
              MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.max.x - sineWaveAmplitude - MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN
            ),
            MOVING_BLOCK_CONFIG.MOVEMENT_BOUNDS.min.x + sineWaveAmplitude + MOVING_BLOCK_CONFIG.PLATFORM_SAFETY.PLATFORM_SAFETY_MARGIN
          ),
          // Vary the Y position for initial offset
          y: spawnPosition.y + initialOffset
        };
        
        this.blockManager.createSineWaveBlock({
          spawnPosition: sineWaveSpawnPosition,
          moveSpeed: baseSpeed * 0.6,
          amplitude: sineWaveAmplitude,
          frequency: sineWaveFrequency,
          blockTextureUri: 'blocks/colors/yellowpng.png' // Round 3 (sine wave) - yellow
        });
        break;
      case 'verticalWave':
        // Use wider height range to allow lower positions
        const waveBaseHeight = this.getRandomY(-2, 6);  // Expanded range for more varied starting heights
        const waveAmplitude = this.getRandomY(4, 6);   // Moderate amplitude for stable waves
        const waveFrequency = 0.25; // Fixed frequency that matches block-movement.ts
        
        this.blockManager.createVerticalWaveBlock({
          spawnPosition: {
            ...spawnPosition,
            y: waveBaseHeight  // Start at more varied heights
          },
          moveSpeed: baseSpeed * 0.5, // Reduced speed for smoother movement
          amplitude: waveAmplitude,
          frequency: waveFrequency
        });
        break;
      case 'popup':
        // Start much lower and pop up much higher with less hang time
        const popupHeight = this.getRandomY(10, 18); // Much higher pop-up range
        const popupStartY = this.getRandomY(-12, -6); // Start even lower with more variance
        
        this.blockManager.createPopUpTarget({
          spawnPosition: {
            ...spawnPosition,
            y: popupStartY  // Use lower start position
          },
          startY: popupStartY,
          topY: popupStartY + popupHeight,  // Pop up much higher from lower start
          moveSpeed: baseSpeed * 1.6  // 60% faster for less hang time
        });
        break;
      case 'rising':
        const riseHeight = this.getRandomY(5, 8); // Random rise height between 5-8 units
        this.blockManager.createRisingTarget({
          startY: spawnPosition.y,
          firstStopY: spawnPosition.y + (riseHeight * 0.6), // Stop at 60% of total height
          finalY: spawnPosition.y + riseHeight,
          moveSpeed: baseSpeed * 0.7,
          pauseDuration: 500
        });
        break;
      case 'parabolic':
        // Calculate a natural throwing arc
        const throwDistance = this.getRandomY(15, 25); // Random throw distance
        const throwAngle = this.getRandomY(45, 75);    // Steeper angle between 45-75 degrees for more upward arc
        const throwHeight = this.getRandomY(10, 15);   // Higher maximum height
        
        // Start much lower and throw upward
        const throwStartY = this.getRandomY(-8, -4);   // Start well below ground level
        
        // Calculate random direction angle for more varied trajectories
        const directionAngle = Math.random() * Math.PI * 2; // Random angle 0-360 degrees
        
        this.blockManager.createParabolicTarget({
          startPoint: {
            x: spawnPosition.x,
            y: throwStartY,
            z: spawnPosition.z
          },
          endPoint: {
            // Use direction angle to create random horizontal movement direction
            x: spawnPosition.x + throwDistance * Math.cos(directionAngle),
            y: throwStartY - 2,  // End slightly lower than start for more dramatic fall
            z: spawnPosition.z + throwDistance * Math.sin(directionAngle)
          },
          maxHeight: throwHeight,
          duration: 4500,  // Much slower for more hang time
          moveSpeed: baseSpeed * 0.5,  // Slower speed for more hang time
          blockTextureUri: 'blocks/colors/red.png' // Round 5 (parabolic) - red
        });
        break;
      case 'pendulum':
        const pendulumHeight = this.getRandomY(6, 12); // Increased height range
        const pendulumLength = pendulumHeight * this.getRandomY(0.6, 1.0); // Varied rope length
        const swingAmplitude = this.getRandomY(0.8, 1.4); // Random swing amplitude
        const swingFrequency = this.getRandomY(0.15, 0.35); // Slower frequency
        
        this.blockManager.createPendulumTarget({
          pivotPoint: {
            x: spawnPosition.x,
            y: spawnPosition.y + pendulumHeight,  // Higher pivot point
            z: spawnPosition.z
          },
          length: pendulumLength,  // Varied rope length
          amplitude: swingAmplitude,  // More varied swing width
          frequency: swingFrequency,  // Slower swing speed
          moveSpeed: baseSpeed * this.getRandomY(0.25, 0.4)  // Much slower speed
        });
        break;
    }
  }

  private getRandomY(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}