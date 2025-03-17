# RoundManager Modularization Plan

> **Status Update:** Phases 1-4 have been completed and merged to main. This document now includes future enhancement recommendations in Section 7.

## 1. Analysis of Current Structure and Responsibilities

### Overview
The `RoundManager` class currently manages all aspects of game rounds in Astro Breaker, including:

- Round lifecycle management (start, end, transitions)
- Player management (tracking, waiting, handling joins/leaves)
- Game state tracking (active rounds, transitions, game progress)
- Block spawning logic with complex configuration
- UI communication for game state updates
- Score handling via `ScoreManager` integration
- Timer and interval management

### Core Issues
1. **High Coupling**: The class is tightly coupled with `MovingBlockManager`, `ScoreManager`, and UI systems
2. **Mixed Responsibilities**: Handles multiple concerns beyond round management
3. **Complexity**: Large method sizes with complex conditional logic
4. **Code Duplication**: Similar patterns repeated in multiple places
5. **Configuration Management**: Round configurations are hard-coded within the class
6. **Limited Extensibility**: Adding new game modes or rule sets requires modifying core logic

## 2. Proposed Modular Architecture

### Folder Structure
```
src/
└── managers/
    └── round/
        ├── configs/
        │   ├── round-configs.ts
        │   └── game-configs.ts
        ├── components/
        │   ├── round-spawner.ts
        │   ├── round-transition.ts
        │   ├── player-tracker.ts
        │   └── round-ui.ts
        ├── interfaces/
        │   ├── round-interfaces.ts
        │   └── block-spawn-interfaces.ts
        └── events/
            └── round-events.ts
```

### Core Modules

1. **RoundManager**
   - Focus purely on round lifecycle (start, end, transitions)
   - Delegate specific responsibilities to other modules
   - Serve as the main API for interacting with the round system

2. **RoundSpawner**
   - Handle all block spawning functionality
   - Consume round configuration to determine spawn parameters
   - Optimize spawn locations and block distributions

3. **RoundTransition**
   - Manage transitions between rounds
   - Handle timers and countdowns
   - Coordinate state during transitions

4. **PlayerTracker**
   - Track players joining/leaving
   - Manage waiting for minimum players
   - Provide player state to other components

5. **RoundUI**
   - Handle all UI communication related to rounds
   - Format and dispatch UI messages
   - Maintain UI state consistency

6. **Configurations**
   - Extract all config data into dedicated configuration files
   - Support multiple game modes and difficulty levels
   - Enable dynamic configuration loading

## 3. Detailed Component Responsibilities

### RoundManager (Core Component)
```typescript
// src/managers/round/index.ts
export class RoundManager {
  constructor(
    private world: World,
    private transition: RoundTransition,
    private spawner: RoundSpawner,
    private playerTracker: PlayerTracker,
    private ui: RoundUI,
    private scoreManager: ScoreManager
  ) { }

  // Public API
  public startRound(): void { /* ... */ }
  public endRound(): void { /* ... */ }
  public cleanup(): void { /* ... */ }
  public handlePlayerLeave(): void { /* ... */ }
  
  // Game state getters
  public getCurrentRound(): number { /* ... */ }
  public isActive(): boolean { /* ... */ }
  public isShootingAllowed(): boolean { /* ... */ }
  public getRemainingRounds(): number { /* ... */ }
}
```

### RoundSpawner
```typescript
// src/managers/round/components/round-spawner.ts
export class RoundSpawner {
  constructor(
    private world: World,
    private blockManager: MovingBlockManager
  ) { }

  public startSpawning(config: RoundConfig): void { /* ... */ }
  public stopSpawning(): void { /* ... */ }
  private spawnBlock(roundConfig: RoundConfig): void { /* ... */ }
  private getSpawnPosition(blockType: string): Vector3Like { /* ... */ }
  private isPositionSafe(position: Vector3Like): boolean { /* ... */ }
}
```

### RoundTransition
```typescript
// src/managers/round/components/round-transition.ts
export class RoundTransition {
  private inTransition: boolean = false;
  private transitionTimer: NodeJS.Timeout | null = null;
  private readonly transitionDuration: number;

  constructor(transitionDuration: number = 3000) {
    this.transitionDuration = transitionDuration;
  }

  public startTransition(callback: () => void): void { /* ... */ }
  public cancelTransition(): void { /* ... */ }
  public isInTransition(): boolean { /* ... */ }
  public getRemainingTransitionTime(): number { /* ... */ }
}
```

### PlayerTracker
```typescript
// src/managers/round/components/player-tracker.ts
export class PlayerTracker {
  private waitingForPlayers: boolean = false;
  private readonly requiredPlayers: number;
  private checkPlayersInterval: NodeJS.Timeout | null = null;

  constructor(
    private world: World,
    requiredPlayers: number = 2
  ) {
    this.requiredPlayers = requiredPlayers;
  }

  public startWaitingForPlayers(onEnoughPlayers: () => void): void { /* ... */ }
  public stopWaitingForPlayers(): void { /* ... */ }
  public getPlayerCount(): number { /* ... */ }
  public hasEnoughPlayers(): boolean { /* ... */ }
  public isWaitingForPlayers(): boolean { /* ... */ }
}
```

### RoundUI
```typescript
// src/managers/round/components/round-ui.ts
export class RoundUI {
  constructor(
    private world: World,
    private scoreManager: ScoreManager
  ) { }

  public displayRoundInfo(round: number, totalRounds: number): void { /* ... */ }
  public displayRoundEnd(scores: any[]): void { /* ... */ }
  public displayWaitingForPlayers(currentCount: number, requiredCount: number): void { /* ... */ }
  public displayGameEnd(winner: any, standings: any[]): void { /* ... */ }
  public updateLeaderboard(scores: any[]): void { /* ... */ }
}
```

### Configurations
```typescript
// src/managers/round/configs/round-configs.ts
export const ROUND_CONFIGS: Record<number, RoundConfig> = {
  1: {
    // Tutorial round
    minBlockCount: 8,
    maxBlockCount: 12,
    blockSpawnInterval: 500,
    speedMultiplier: 0.5,
    blockTypes: {
      static: 1.0,
      // Other block types set to 0
    }
  },
  // Additional round configurations...
};

// src/managers/round/configs/game-configs.ts
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxRounds: 10,
  requiredPlayers: 2,
  transitionDuration: 3000
};
```

## 4. Implementation Strategy

### Phase 1: Component Extraction
1. Create the folder structure and interfaces
2. Extract configurations into dedicated files
3. Implement the simplest components first (RoundTransition, PlayerTracker)
4. Create tests for individual components

### Phase 2: Core Component Development
1. Implement remaining components (RoundSpawner, RoundUI)
2. Test each component in isolation
3. Create the new RoundManager to use the components
4. Add integration tests

### Phase 3: Integration and Migration
1. Create temporary facade for backward compatibility
2. Gradually migrate functionality from old RoundManager
3. Update unit tests to work with the new architecture
4. Perform integration testing with actual gameplay

### Phase 4: Cleanup and Finalization
1. Remove backward compatibility code
2. Update documentation
3. Optimize component interactions
4. Finalize tests and ensure coverage

## 5. Backward Compatibility Considerations

The refactored RoundManager will maintain the same public API to ensure existing code continues to work:

```typescript
// src/managers/round-manager.ts - Compatibility facade
import { RoundManager as ModularRoundManager } from './round';
import { RoundTransition, RoundSpawner, PlayerTracker, RoundUI } from './round/components';

export class RoundManager {
  private modularManager: ModularRoundManager;
  
  constructor(world, blockManager, scoreManager) {
    // Initialize components
    const transition = new RoundTransition();
    const spawner = new RoundSpawner(world, blockManager);
    const playerTracker = new PlayerTracker(world);
    const ui = new RoundUI(world, scoreManager);
    
    // Create the modular manager with components
    this.modularManager = new ModularRoundManager(
      world, transition, spawner, playerTracker, ui, scoreManager
    );
  }
  
  // Implement all original public methods by delegating to the modular manager
  startRound() { return this.modularManager.startRound(); }
  endRound() { return this.modularManager.endRound(); }
  // ... and so on
}
```

### Key Points for Compatibility
1. Keep method signatures identical for external code
2. Ensure event dispatching follows the same patterns
3. Maintain timing and behavior consistency
4. Document any subtle behavioral changes

## 6. Potential Risks and Mitigation Strategies

### Risk 1: Breaking Existing Functionality
- **Mitigation**: Comprehensive test suite covering all existing behavior
- **Mitigation**: Incremental implementation with feature toggles

### Risk 2: Performance Degradation
- **Mitigation**: Benchmark critical paths before and after refactoring
- **Mitigation**: Optimize communication between components

### Risk 3: State Synchronization Issues
- **Mitigation**: Clear ownership of state between components
- **Mitigation**: Use immutable state patterns where appropriate

### Risk 4: Complex Dependencies
- **Mitigation**: Dependency injection for all components
- **Mitigation**: Clear interfaces between components

### Risk 5: Test Coverage Gaps
- **Mitigation**: Create tests for each component before implementation
- **Mitigation**: E2E tests for critical game flows

## Next Steps

1. Create the directory structure and interfaces
2. Extract round configurations to separate files
3. Implement the first component (RoundTransition)
4. Create unit tests for the component
5. Continue with the implementation strategy outlined above

By following this plan, we'll create a more maintainable and extensible round management system while preserving existing functionality and ensuring backward compatibility.

## 7. Future Enhancements and Next Steps

Now that the modular architecture has been implemented, here are recommended next steps for further improvements:

### 7.1 Migrate Consumer Code to Direct Component Usage

Rather than always going through the facade (`RoundManager`), consider updating code that needs specific functionality to use the components directly:

```typescript
// Instead of this:
const roundManager = new RoundManager(world, blockManager, scoreManager);
roundManager.startRound();

// Consider this for specific needs:
import { PlayerTracker } from './managers/round/components/player-tracker';
const playerTracker = new PlayerTracker(world);
if (playerTracker.hasEnoughPlayers()) {
  // Perform specific action
}
```

This approach gives more direct access to component features when needed.

### 7.2 Apply Similar Modularization to Other Manager Classes

The pattern has worked well for `RoundManager` and could be applied to other complex manager classes:

- **ScoreManager**: Could be broken down into components like PlayerScoring, Leaderboard, PointCalculation
- **MovingBlockManager**: Could separate movement logic, collision handling, spawning
- **AudioManager**: Could separate different audio domains (music, effects, ambience)

### 7.3 Enhance Component Interfaces

Further refine component interfaces to make them more standardized:

- Add consistent initialization methods
- Implement common lifecycle hooks (init, update, cleanup)
- Create a component registry for easier dependency injection

### 7.4 Create Development Documentation

Document the new architectural approach for your team:

- Create patterns and best practices for component development
- Document the component lifecycle and communication patterns
- Add examples of how to use and extend the modular system

### 7.5 Implement Event-Based Communication

Currently, components communicate through direct method calls. To evolve this to a more loosely coupled event system:

```typescript
// Create a central event bus
const eventBus = new EventBus();

// Components subscribe to events
playerTracker.listenTo(eventBus, 'round:starting', () => {
  // React to round starting
});

// Components publish events
roundManager.emit(eventBus, 'round:starting', { roundNumber: 1 });
```

This would make components even more independent and easier to test.

### 7.6 Add Metrics and Telemetry

Now that there are clear component boundaries, consider adding metrics to understand performance:

- Track component initialization time
- Measure event processing time
- Log component interactions for debugging
- Create performance profiles for different game scenarios

### 7.7 Create a Component Factory

To streamline component creation and wiring:

```typescript
const componentFactory = new ComponentFactory(world);
const roundManager = componentFactory.create(RoundManager, {
  maxRounds: 10,
  requiredPlayers: 2
});
```

This would automate dependency injection and configuration.

### 7.8 Create Specialized Game Modes

With the modular architecture, creating specialized game modes by swapping components becomes more practical:

```typescript
// Tournament mode
const tournamentRoundManager = new RoundManager(
  world,
  transition,
  tournamentSpawner, // Special spawner for tournaments
  playerTracker,
  ui,
  scoreManager,
  { maxRounds: 5, requiredPlayers: 4 }
);
```

By implementing these enhancements, the codebase will become even more flexible, maintainable, and easier to extend with new features.