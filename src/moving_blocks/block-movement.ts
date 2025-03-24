import { Vector3Like } from 'hytopia';
import { MovingBlockEntity } from './moving-block-entity';

export interface BlockMovementBehavior {
  update(block: MovingBlockEntity, deltaTimeMs: number): void;
}

export class DefaultBlockMovement implements BlockMovementBehavior {
  private initialY: number = 0;
  private heightVariation: number = 2;  // Height variation range
  private heightPhase: number = 0;      // Phase for height oscillation
  private lastReversalTime: number = 0; // Track time of last reversal
  private minReversalInterval: number = 800; // Increased from 500ms to 800ms to reduce bounce frequency
  private lastPositions: Vector3Like[] = []; // Track last few positions
  private stuckCounter: number = 0;    // Counter for potentially stuck state
  private stuckThreshold: number = 5;  // Number of frames to consider "stuck"
  private consecBounceCounter: number = 0; // Count consecutive bounces in short time
  private consecBounceThreshold: number = 3; // Threshold for detecting "ping-pong" movement
  private bounceEscapeDirection: Vector3Like | null = null; // Direction to escape ping-pong pattern
  private inBounceEscapeMode: boolean = false; // Whether we're currently in escape mode
  private bounceEscapeDuration: number = 0; // How long to maintain escape behavior
  private bounceEscapeTimer: number = 0; // Current escape timer

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    // Initialize height parameters on first update if needed
    if (this.initialY === 0) {
      this.initialY = block.position.y;
      this.heightPhase = Math.random() * Math.PI * 2; // Random starting phase
      this.heightVariation = 1 + Math.random() * 2;   // Random height variation between 1-3
    }

    const deltaSeconds = deltaTimeMs / 1000;
    const currentTime = Date.now();
    
    // Calculate height oscillation
    const heightOffset = Math.sin(this.heightPhase + deltaTimeMs / 1000) * this.heightVariation;
    
    // Update phase
    this.heightPhase += deltaSeconds;

    // Check if we're in bounce escape mode
    if (this.inBounceEscapeMode) {
      this.bounceEscapeTimer += deltaTimeMs;
      if (this.bounceEscapeTimer >= this.bounceEscapeDuration) {
        // Exit escape mode when timer expires
        this.inBounceEscapeMode = false;
        this.bounceEscapeDirection = null;
        this.bounceEscapeTimer = 0;
        this.consecBounceCounter = 0;
      }
    }
    
    // Store current position for stuck detection
    this.lastPositions.push({...block.position});
    if (this.lastPositions.length > 10) {
      this.lastPositions.shift(); // Keep last 10 positions only
    }
    
    // Get direction - use escape direction if in escape mode
    const direction = this.inBounceEscapeMode && this.bounceEscapeDirection 
      ? this.bounceEscapeDirection
      : block.getDirection();
    
    const speed = block.getMoveSpeed() * deltaSeconds;
    
    // Calculate new position with normalized movement
    let newPosition = {
      x: block.position.x + direction.x * speed,
      y: this.initialY + heightOffset,
      z: block.position.z + direction.z * speed,
    };

    // Check if we're potentially stuck or in ping-pong pattern
    const isStuck = this.detectStuckState();
    
    // Check bounds and handle oscillation
    if (!block.isWithinMovementBounds(newPosition) || isStuck) {
      if (block.shouldOscillate()) {
        // Handle being stuck by forcing direction change
        if (isStuck) {
          // Reset all tracking variables to start fresh
          this.stuckCounter = 0;
          this.consecBounceCounter = 0;
          this.lastPositions = [];
          this.inBounceEscapeMode = false;
          
          // Generate a completely new randomized direction
          const randomEscapeAngle = Math.random() * Math.PI * 2; // Full 360 degrees
          const escapeDirection = {
            x: Math.sin(randomEscapeAngle) * 0.8,
            y: 0,
            z: Math.cos(randomEscapeAngle) * 0.8
          };
          
          // Force direction change directly rather than using reversal
          (block as any).direction = escapeDirection;
          this.lastReversalTime = currentTime;
          
          // Apply strong push in the new direction
          const escapePushFactor = 0.8;
          newPosition = {
            x: block.position.x + escapeDirection.x * (speed + escapePushFactor),
            y: this.initialY + heightOffset,
            z: block.position.z + escapeDirection.z * (speed + escapePushFactor),
          };
        }
        // Normal boundary hit logic
        else {
          const timeSinceLastReversal = currentTime - this.lastReversalTime;
          
          // Track consecutive bounces happening in a short time
          if (timeSinceLastReversal < 1500) {
            this.consecBounceCounter++;
          } else {
            this.consecBounceCounter = 0;
          }
          
          // If we detect ping-pong behavior, enter escape mode
          if (this.consecBounceCounter >= this.consecBounceThreshold && !this.inBounceEscapeMode) {
            this.inBounceEscapeMode = true;
            this.bounceEscapeDuration = 2000; // 2 seconds of escape behavior
            this.bounceEscapeTimer = 0;
            
            // Generate escape direction perpendicular to current movement
            // This creates a 90-degree turn to break out of ping-pong patterns
            this.bounceEscapeDirection = {
              x: direction.z, // Swap and negate components for perpendicular direction
              y: 0,
              z: -direction.x
            };
            
            // Use the escape direction immediately
            const escapePushFactor = 0.5;
            newPosition = {
              x: block.position.x + this.bounceEscapeDirection.x * (speed + escapePushFactor),
              y: this.initialY + heightOffset,
              z: block.position.z + this.bounceEscapeDirection.z * (speed + escapePushFactor),
            };
          }
          // Regular bounce behavior if not in escape mode
          else if (!this.inBounceEscapeMode) {
            // Only reverse direction if enough time has passed since last reversal
            if (timeSinceLastReversal >= this.minReversalInterval) {
              block.reverseMovementDirection();
              this.lastReversalTime = currentTime;
              
              // Get new direction after reversal
              const newDirection = block.getDirection();
              
              // Ensure the direction has a significant component in both X and Z
              const minComponentValue = 0.3;
              if (Math.abs(newDirection.x) < minComponentValue) {
                // Apply a minimum X component
                newDirection.x = newDirection.x < 0 ? -minComponentValue : minComponentValue;
                // Re-normalize
                const mag = Math.sqrt(newDirection.x * newDirection.x + newDirection.z * newDirection.z);
                newDirection.x /= mag;
                newDirection.z /= mag;
              }
              
              // Add a larger push away from boundary
              const pushFactor = 0.35; // Increased from 0.25
              newPosition = {
                x: block.position.x + newDirection.x * (speed + pushFactor),
                y: this.initialY + heightOffset,
                z: block.position.z + newDirection.z * (speed + pushFactor),
              };
            } else {
              // If we can't reverse yet, maintain position but continue to move in Y
              newPosition = { 
                ...block.position,
                y: this.initialY + heightOffset
              };
            }
          }
        }
      } else {
        // Reset state and position for non-oscillating blocks
        block.resetToInitialPosition();
        this.initialY = block.position.y;
        this.stuckCounter = 0;
        this.consecBounceCounter = 0;
        this.lastPositions = [];
        this.inBounceEscapeMode = false;
        return;
      }
    } else {
      // Not hitting bounds and not stuck - reset counters
      this.stuckCounter = 0;
    }
    
    block.setPosition(newPosition);
  }
  
  // Detect if the block appears to be stuck by analyzing recent movement patterns
  private detectStuckState(): boolean {
    if (this.lastPositions.length < 5) return false;
    
    // Check if movement is very small over last several frames
    let totalDistance = 0;
    
    for (let i = 1; i < this.lastPositions.length; i++) {
      const prev = this.lastPositions[i-1];
      const curr = this.lastPositions[i];
      
      // Calculate distance moved between frames (ignore Y which oscillates)
      const dx = curr.x - prev.x;
      const dz = curr.z - prev.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      
      totalDistance += dist;
    }
    
    // Calculate average movement per frame
    const avgMovement = totalDistance / (this.lastPositions.length - 1);
    
    // If average movement is very small, increment stuck counter
    if (avgMovement < 0.01) {
      this.stuckCounter++;
    } else {
      // Reset counter if we're moving normally
      this.stuckCounter = Math.max(0, this.stuckCounter - 1);  // Gradual decrease instead of immediate reset
    }
    
    // Return true if stuck counter exceeds threshold
    return this.stuckCounter >= this.stuckThreshold;
  }
}

export class SineWaveMovement implements BlockMovementBehavior {
  private elapsedTime: number = 0;
  private readonly amplitude: number;
  private readonly frequency: number;
  private readonly baseAxis: 'x' | 'y' | 'z';
  private readonly waveAxis: 'x' | 'y' | 'z';
  private initialY: number = 0;
  private lastWaveOffset: number = 0;
  private lastReversalTime: number = 0;
  private minReversalInterval: number = 1000; // Longer interval to prevent too frequent reversals
  private stuckCounter: number = 0;
  private stuckThreshold: number = 5;
  private lastPositions: Vector3Like[] = [];
  private boundsEpsilon: number = 0.2; // Larger epsilon for boundary detection
  private startingPhaseOffset: number = 0;
  private moveSpeedOriginal: number = 0; // Store original move speed

  constructor(options: {
    amplitude?: number;
    frequency?: number;
    baseAxis?: 'x' | 'y' | 'z';
    waveAxis?: 'x' | 'y' | 'z';
  } = {}) {
    this.amplitude = options.amplitude ?? 8;
    this.frequency = options.frequency ?? 0.2;
    this.baseAxis = options.baseAxis ?? 'z';
    this.waveAxis = options.waveAxis ?? 'x';
    // Random phase offset to prevent synchronization
    this.startingPhaseOffset = Math.random() * Math.PI * 2;
  }

  private clampPosition(pos: Vector3Like, bounds: { min: Vector3Like; max: Vector3Like }): Vector3Like {
    // Use a large epsilon for vertical waves to prevent boundary problems
    const epsilon = this.waveAxis === 'y' ? this.boundsEpsilon : 0.15;
    
    return {
      x: bounds.min.x === bounds.max.x ? bounds.min.x : Math.max(bounds.min.x + epsilon, Math.min(pos.x, bounds.max.x - epsilon)),
      y: bounds.min.y === bounds.max.y ? bounds.min.y : Math.max(bounds.min.y + epsilon, Math.min(pos.y, bounds.max.y - epsilon)),
      z: bounds.min.z === bounds.max.z ? bounds.min.z : Math.max(bounds.min.z + epsilon, Math.min(pos.z, bounds.max.z - epsilon))
    };
  }

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    const isVerticalWave = this.waveAxis === 'y';
    const currentTime = Date.now();
    
    // Store original speed on first update and set initial position
    if (this.elapsedTime === 0) {
      // Store original speed to keep movement consistent
      this.moveSpeedOriginal = block.getMoveSpeed();
      
      if (isVerticalWave) {
        // For vertical waves, allow a lower starting height
        this.initialY = Math.max(-2, Math.min(8, block.position.y));
      } else {
        this.initialY = block.position.y;
      }
      
      // Initialize with a small offset to avoid sudden jumps
      this.lastWaveOffset = 0;
    }
    
    const deltaSeconds = deltaTimeMs / 1000;
    this.elapsedTime += deltaSeconds;

    // Track positions for stuck detection
    this.lastPositions.push({...block.position});
    if (this.lastPositions.length > 8) {
      this.lastPositions.shift();
    }

    // Always use the original speed for consistency - NOT the current block speed
    // which might have been changed elsewhere
    const baseSpeed = isVerticalWave ? 
      this.moveSpeedOriginal * 0.4 * deltaSeconds : // Reduced to 40% speed for vertical waves (was 0.5)
      this.moveSpeedOriginal * deltaSeconds;        // Full speed for horizontal waves
    
    const baseMovement = block.getDirection()[this.baseAxis] * baseSpeed;
    
    // Wave calculations with fixed parameters
    let waveOffset;
    
    if (isVerticalWave) {
      // Using a lower frequency for vertical waves to make it smoother and slower
      const fixedFrequency = 0.15; // Reduced from 0.3 for smoother oscillation
      // Calculate wave with phase offset for vertical waves
      // Use a larger amplitude multiplier (2.0) to create wider vertical movement
      waveOffset = this.amplitude * 2.0 * Math.sin(2 * Math.PI * fixedFrequency * this.elapsedTime + this.startingPhaseOffset);
      
      // Add gentle smoothing for vertical waves to make transitions more fluid
      const smoothingFactor = 0.03; // Very gentle smoothing
      this.lastWaveOffset += (waveOffset - this.lastWaveOffset) * smoothingFactor;
    } else {
      // Standard calculation for horizontal sine waves
      waveOffset = this.amplitude * Math.sin(2 * Math.PI * this.frequency * this.elapsedTime);
      // Use a moderate smoothing factor for horizontal waves
      const smoothingFactor = 0.1;
      this.lastWaveOffset += (waveOffset - this.lastWaveOffset) * smoothingFactor;
    }
    
    // Calculate new position
    let newPosition = { ...block.position };
    
    // Apply forward movement along base axis
    newPosition[this.baseAxis] += baseMovement;

    // Apply wave offset
    if (isVerticalWave) {
      // Apply vertical offset with much wider limits
      newPosition.y = this.initialY + this.lastWaveOffset;
      // Allow much lower positions (down to -10) with higher upper limit
      newPosition.y = Math.max(-10, Math.min(12, newPosition.y));
    } else {
      // Horizontal waves centered at 0
      newPosition[this.waveAxis] = this.lastWaveOffset;
    }

    // Check for stuck state
    const isStuck = this.detectStuckState();
    
    // Handle boundary collisions and stuck states
    if (!block.isWithinMovementBounds(newPosition) || isStuck) {
      if (block.shouldOscillate()) {
        // Handle stuck state
        if (isStuck) {
          this.stuckCounter = 0;
          this.lastPositions = [];
          
          // For vertical waves, choose from a limited set of directions
          // that are more natural for the movement
          const directions = isVerticalWave ? 
            [
              { x: 0, y: 0, z: 1 },     // North
              { x: 0, y: 0, z: -1 },    // South
              { x: 1, y: 0, z: 0 },     // East
              { x: -1, y: 0, z: 0 },    // West
            ] :
            [
              { x: 0, y: 0, z: 1 },
              { x: 0.7, y: 0, z: 0.7 },
              { x: 1, y: 0, z: 0 },
              { x: 0.7, y: 0, z: -0.7 },
              { x: 0, y: 0, z: -1 },
              { x: -0.7, y: 0, z: -0.7 },
              { x: -1, y: 0, z: 0 },
              { x: -0.7, y: 0, z: 0.7 }
            ];
          
          const directionIndex = Math.floor(Math.random() * directions.length);
          const newDirection = directions[directionIndex];
          
          // Force direction change
          (block as any).direction = newDirection;
          this.lastReversalTime = currentTime;
          
          // Apply push in new direction
          const pushFactor = isVerticalWave ? 0.6 : 1.0;
          newPosition = {
            x: block.position.x + newDirection.x * (baseSpeed + pushFactor),
            y: block.position.y, // Maintain height
            z: block.position.z + newDirection.z * (baseSpeed + pushFactor)
          };
        } else {
          const timeSinceLastReversal = currentTime - this.lastReversalTime;
          
          if (timeSinceLastReversal >= this.minReversalInterval) {
            // Simple direction reversal
            block.reverseMovementDirection();
            this.lastReversalTime = currentTime;
            
            // For vertical waves, we don't need to adjust the wave pattern
            // Just recalculate position with new direction
            const newDirection = block.getDirection();
            const pushFactor = isVerticalWave ? 0.4 : 0.3;
            
            newPosition = { ...block.position };
            newPosition[this.baseAxis] += newDirection[this.baseAxis] * (baseSpeed + pushFactor);
            
            if (isVerticalWave) {
              newPosition.y = this.initialY + this.lastWaveOffset;
              newPosition.y = Math.max(-10, Math.min(12, newPosition.y)); // Allow much lower heights
            } else {
              newPosition[this.waveAxis] = this.lastWaveOffset;
            }
          } else {
            // Can't reverse yet, maintain current position but continue wave movement
            newPosition = { ...block.position };
            
            if (isVerticalWave) {
              newPosition.y = this.initialY + this.lastWaveOffset;
              newPosition.y = Math.max(-10, Math.min(12, newPosition.y)); // Allow much lower heights
            } else {
              newPosition[this.waveAxis] = this.lastWaveOffset;
            }
          }
        }
        
        // Final boundary check with strong clamping
        if (block['movementBounds']) {
          newPosition = this.clampPosition(newPosition, (block as any)['movementBounds']);
        }
      } else {
        // Non-oscillating block reset
        block.resetToInitialPosition();
        this.elapsedTime = 0;
        this.lastWaveOffset = 0;
        this.stuckCounter = 0;
        this.lastPositions = [];
        return;
      }
    }
    
    // Set final position
    block.setPosition(newPosition);
  }
  
  private detectStuckState(): boolean {
    if (this.lastPositions.length < 5) return false;
    
    let totalDistance = 0;
    
    for (let i = 1; i < this.lastPositions.length; i++) {
      const prev = this.lastPositions[i-1];
      const curr = this.lastPositions[i];
      
      // Calculate horizontal movement only
      const dx = curr.x - prev.x;
      const dz = curr.z - prev.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      
      totalDistance += dist;
    }
    
    const avgMovement = totalDistance / (this.lastPositions.length - 1);
    const threshold = 0.01;
    
    if (avgMovement < threshold) {
      this.stuckCounter++;
    } else {
      this.stuckCounter = 0;
    }
    
    return this.stuckCounter >= this.stuckThreshold;
  }
}

export class StaticMovement implements BlockMovementBehavior {
  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    // Static blocks don't move, but we still need to check if they're within bounds
    if (!block.isWithinMovementBounds(block.position)) {
      block.resetToInitialPosition();
    }
  }
}

export class PopUpMovement implements BlockMovementBehavior {
  private elapsedTime: number = 0;
  private state: 'rising' | 'paused' | 'falling' | 'complete' = 'rising';
  private readonly pauseDuration: number = 3000; // 3 seconds pause at top
  private readonly startY: number;
  private readonly topY: number;
  private pauseStartTime: number = 0;

  constructor(options: {
    startY?: number;
    topY?: number;
    pauseDuration?: number;
  } = {}) {
    this.startY = options.startY ?? -20;
    this.topY = options.topY ?? 8;
    this.pauseDuration = options.pauseDuration ?? 3000;
  }

  // Getters for movement state
  public get currentState(): 'rising' | 'paused' | 'falling' | 'complete' {
    return this.state;
  }

  public get isComplete(): boolean {
    return this.state === 'complete';
  }

  public get isPaused(): boolean {
    return this.state === 'paused';
  }

  public get timeRemainingInPause(): number {
    if (this.state !== 'paused') return 0;
    return Math.max(0, this.pauseDuration - (this.elapsedTime - this.pauseStartTime));
  }

  public get totalElapsedTime(): number {
    return this.elapsedTime;
  }

  // Helper methods for state management
  private transitionToState(newState: 'rising' | 'paused' | 'falling' | 'complete'): void {
    this.state = newState;
    if (newState === 'paused') {
      this.pauseStartTime = this.elapsedTime;
    }
  }

  private shouldTransitionFromPaused(): boolean {
    return this.elapsedTime - this.pauseStartTime >= this.pauseDuration;
  }

  private calculateNewPosition(currentPosition: Vector3Like, deltaSeconds: number, speed: number): Vector3Like {
    const newPosition = { ...currentPosition };
    
    switch (this.state) {
      case 'rising':
        newPosition.y += speed * 2 * deltaSeconds;
        if (newPosition.y >= this.topY) {
          newPosition.y = this.topY;
          this.transitionToState('paused');
        }
        break;
        
      case 'falling':
        newPosition.y -= speed * 2 * deltaSeconds;
        if (newPosition.y <= this.startY) {
          newPosition.y = this.startY;
          this.transitionToState('complete');
        }
        break;
    }
    
    return newPosition;
  }

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    this.elapsedTime += deltaTimeMs;
    const deltaSeconds = deltaTimeMs / 1000;
    const speed = block.getMoveSpeed();
    
    if (this.state === 'complete') {
      if (block.isSpawned) {
        block.despawn();
      }
      return;
    }

    if (this.state === 'paused' && this.shouldTransitionFromPaused()) {
      this.transitionToState('falling');
    }

    const newPosition = this.calculateNewPosition(block.position, deltaSeconds, speed);
    block.setPosition(newPosition);
  }
}

export class RisingMovement implements BlockMovementBehavior {
  private elapsedTime: number = 0;
  private state: 'rising' | 'paused' | 'shooting' | 'complete' = 'rising';
  private readonly pauseDuration: number = 2000; // 2 seconds pause at first stop
  private readonly startY: number;
  private readonly firstStopY: number;
  private readonly finalY: number;
  private pauseStartTime: number = 0;

  constructor(options: {
    startY?: number;
    firstStopY?: number;
    finalY?: number;
    pauseDuration?: number;
  } = {}) {
    this.startY = options.startY ?? -20;
    this.firstStopY = options.firstStopY ?? 8; // Same height as pop-up target
    this.finalY = options.finalY ?? 30; // Much higher final position
    this.pauseDuration = options.pauseDuration ?? 2000;
  }

  // Getters for movement state
  public get currentState(): 'rising' | 'paused' | 'shooting' | 'complete' {
    return this.state;
  }

  public get isComplete(): boolean {
    return this.state === 'complete';
  }

  public get isPaused(): boolean {
    return this.state === 'paused';
  }

  public get isShooting(): boolean {
    return this.state === 'shooting';
  }

  public get timeRemainingInPause(): number {
    if (this.state !== 'paused') return 0;
    return Math.max(0, this.pauseDuration - (this.elapsedTime - this.pauseStartTime));
  }

  public get totalElapsedTime(): number {
    return this.elapsedTime;
  }

  // Helper methods for state management
  private transitionToState(newState: 'rising' | 'paused' | 'shooting' | 'complete'): void {
    this.state = newState;
    if (newState === 'paused') {
      this.pauseStartTime = this.elapsedTime;
    }
  }

  private shouldTransitionFromPaused(): boolean {
    return this.elapsedTime - this.pauseStartTime >= this.pauseDuration;
  }

  private calculateNewPosition(currentPosition: Vector3Like, deltaSeconds: number, speed: number): Vector3Like {
    const newPosition = { ...currentPosition };
    
    switch (this.state) {
      case 'rising':
        newPosition.y += speed * 2 * deltaSeconds; // Double speed for initial rise
        if (newPosition.y >= this.firstStopY) {
          newPosition.y = this.firstStopY;
          this.transitionToState('paused');
        }
        break;

      case 'shooting':
        newPosition.y += speed * 4 * deltaSeconds; // Quadruple speed for final ascent
        if (newPosition.y >= this.finalY) {
          newPosition.y = this.finalY;
          this.transitionToState('complete');
        }
        break;
    }
    
    return newPosition;
  }

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    this.elapsedTime += deltaTimeMs;
    const deltaSeconds = deltaTimeMs / 1000;
    const speed = block.getMoveSpeed();
    
    if (this.state === 'complete') {
      if (block.isSpawned) {
        block.despawn();
      }
      return;
    }

    if (this.state === 'paused' && this.shouldTransitionFromPaused()) {
      this.transitionToState('shooting');
    }

    const newPosition = this.calculateNewPosition(block.position, deltaSeconds, speed);
    block.setPosition(newPosition);
  }
}

export class ParabolicMovement implements BlockMovementBehavior {
  private elapsedTime: number = 0;
  private readonly startPoint: Vector3Like;
  private readonly endPoint: Vector3Like;
  private readonly totalDuration: number;
  private readonly maxHeight: number;
  private readonly gravity: number;
  private readonly initialVelocityY: number;
  private readonly horizontalSpeed: number;

  constructor(options: {
    startPoint?: Vector3Like;
    endPoint?: Vector3Like;
    maxHeight?: number;
    duration?: number;
  } = {}) {
    this.startPoint = options.startPoint ?? { x: 0, y: -20, z: 0 };
    this.endPoint = options.endPoint ?? { x: 0, y: -20, z: 20 };
    this.maxHeight = options.maxHeight ?? 15;
    this.totalDuration = options.duration ?? 5000; // 5 seconds total

    // Calculate physics parameters
    this.gravity = 2 * (this.maxHeight - this.startPoint.y) / Math.pow(this.totalDuration / 4000, 2);
    this.initialVelocityY = Math.sqrt(2 * this.gravity * (this.maxHeight - this.startPoint.y));
    
    // Calculate horizontal speed based on total distance and time
    const horizontalDistance = Math.sqrt(
      Math.pow(this.endPoint.x - this.startPoint.x, 2) +
      Math.pow(this.endPoint.z - this.startPoint.z, 2)
    );
    this.horizontalSpeed = horizontalDistance / (this.totalDuration / 1000);
  }

  private calculatePosition(time: number): Vector3Like {
    // Time in seconds
    const t = time / 1000;
    
    // Calculate progress through the motion (0 to 1)
    const progress = Math.min(t / (this.totalDuration / 1000), 1);
    
    // Calculate vertical position using physics equations
    const verticalTime = t;
    const y = this.startPoint.y + 
              (this.initialVelocityY * verticalTime) - 
              (0.5 * this.gravity * verticalTime * verticalTime);
    
    // Calculate horizontal position with linear interpolation
    const x = this.startPoint.x + (this.endPoint.x - this.startPoint.x) * progress;
    const z = this.startPoint.z + (this.endPoint.z - this.startPoint.z) * progress;

    return { x, y, z };
  }

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    this.elapsedTime += deltaTimeMs;
    
    // Check if the movement is complete
    if (this.elapsedTime >= this.totalDuration) {
      if (block.isSpawned) {
        block.despawn();
      }
      return;
    }

    const newPosition = this.calculatePosition(this.elapsedTime);
    block.setPosition(newPosition);
  }
}

export class PendulumMovement implements BlockMovementBehavior {
  private elapsedTime: number = 0;
  private readonly pivotPoint: Vector3Like;
  private readonly length: number;
  private readonly amplitude: number;
  private readonly frequency: number;

  constructor(options: {
    pivotPoint?: Vector3Like;
    length?: number;
    amplitude?: number;
    frequency?: number;
  } = {}) {
    this.pivotPoint = options.pivotPoint ?? { x: 0, y: 15, z: 0 }; // Higher default pivot point
    this.length = options.length ?? 10; // Longer default length
    this.amplitude = options.amplitude ?? Math.PI / 3; // 60 degrees in radians
    this.frequency = options.frequency ?? 0.4; // Slightly slower frequency
  }

  update(block: MovingBlockEntity, deltaTimeMs: number): void {
    this.elapsedTime += deltaTimeMs / 1000;
    
    // Calculate the current angle using a sine wave
    const angle = this.amplitude * Math.sin(2 * Math.PI * this.frequency * this.elapsedTime);
    
    // Calculate new position - only rotating around Z axis
    const newPosition = {
      x: this.pivotPoint.x, // Keep X position fixed at pivot point
      y: this.pivotPoint.y - this.length * Math.cos(angle), // Y position changes with swing
      z: this.pivotPoint.z + this.length * Math.sin(angle)  // Z position changes with swing
    };
    
    block.setPosition(newPosition);
  }
} 