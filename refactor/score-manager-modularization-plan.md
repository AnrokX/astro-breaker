# ScoreManager Modularization Plan

## 1. Analysis of Current Structure and Responsibilities

### Overview
The `ScoreManager` class currently manages all aspects of player scoring and leaderboards in Astro Breaker, including:

- Player stats tracking (scores, ranks, combos)
- Score calculation for different target types
- Combo system management
- Round-based scoring and transitions
- Leaderboard management and ranking
- UI communication for score updates
- Placement tracking and win calculations
- Sound effects for score events

### Core Issues
1. **High Coupling**: The class is tightly coupled with `MovingBlockEntity`, `ProjectileEntity`, `SceneUIManager`, and `AudioManager`
2. **Mixed Responsibilities**: Handles multiple concerns beyond score management
3. **Complexity**: Large method sizes with complex conditional logic, especially in score calculation
4. **Configuration Management**: Scoring configurations are hard-coded within the class
5. **Limited Extensibility**: Adding new scoring systems or mechanics requires modifying core logic
6. **Duplication**: Similar patterns repeated for different types of score updates

## 2. Proposed Modular Architecture

### Folder Structure
```
src/
└── managers/
    └── score/
        ├── configs/
        │   └── scoring-configs.ts
        ├── components/
        │   ├── player-stats-tracker.ts
        │   ├── score-calculator.ts
        │   ├── combo-manager.ts
        │   ├── leaderboard-manager.ts
        │   └── score-ui.ts
        ├── interfaces/
        │   ├── score-interfaces.ts
        │   └── leaderboard-interfaces.ts
        └── events/
            └── score-events.ts
```

### Core Modules

1. **ScoreManager**
   - Focus purely on coordinating scoring components
   - Delegate specific responsibilities to other modules
   - Serve as the main API for interacting with the scoring system

2. **PlayerStatsTracker**
   - Handle player initialization and stats tracking
   - Manage player's score across rounds
   - Track wins, rank changes, and placement points

3. **ScoreCalculator**
   - Calculate scores based on hit parameters
   - Apply multipliers for different target types
   - Handle time-based decay and distance/size factors

4. **ComboManager**
   - Track consecutive hits and combos
   - Calculate combo bonuses
   - Handle combo timeouts and resets

5. **LeaderboardManager**
   - Maintain player rankings
   - Calculate placement points
   - Track rank changes (up/down/same)

6. **ScoreUI**
   - Handle all UI communication related to scores
   - Format and dispatch UI messages for scores and leaderboards
   - Coordinate combo notifications

7. **Configurations**
   - Extract all scoring constants into dedicated configuration files
   - Support multiple scoring systems
   - Enable dynamic configuration loading

## 3. Detailed Component Responsibilities

### ScoreManager (Core Component)
```typescript
// src/managers/score/index.ts
export class ScoreManager {
  constructor(
    private world: World,
    private statsTracker: PlayerStatsTracker,
    private calculator: ScoreCalculator,
    private comboManager: ComboManager,
    private leaderboard: LeaderboardManager,
    private ui: ScoreUI
  ) { }

  // Public API
  public initializePlayer(playerId: string): void { /* ... */ }
  public removePlayer(playerId: string): void { /* ... */ }
  public addScore(playerId: string, score: number): void { /* ... */ }
  public resetScore(playerId: string): void { /* ... */ }
  public startNewRound(): void { /* ... */ }
  public handleRoundEnd(): { winnerId: string | null, placements: Array<{ playerId: string, points: number }> } { /* ... */ }
  public calculateGrenadeTargetScore(projectile: ProjectileEntity, block: MovingBlockEntity, 
    impactPoint: Vector3Like, playerId: string): number { /* ... */ }
  public resetCombo(playerId: string): void { /* ... */ }
  
  // Getters
  public getScore(playerId: string): number { /* ... */ }
  public getRoundScore(playerId: string): number { /* ... */ }
  public getLastScore(playerId: string): number { /* ... */ }
  public getWins(playerId: string): number { /* ... */ }
  public getLeaderboardPoints(playerId: string): number { /* ... */ }
}
```

### PlayerStatsTracker
```typescript
// src/managers/score/components/player-stats-tracker.ts
export class PlayerStatsTracker {
  private playerStats = new Map<string, PlayerStats>();
  private playerCount = 0;

  constructor(private world: World) { }

  public initializePlayer(playerId: string): void { /* ... */ }
  public removePlayer(playerId: string): void { /* ... */ }
  public updateScore(playerId: string, score: number): void { /* ... */ }
  public resetScore(playerId: string): void { /* ... */ }
  public resetAllScores(): void { /* ... */ }
  public resetAllStats(): void { /* ... */ }
  public startNewRound(): void { /* ... */ }
  public getPlayer(playerId: string): PlayerStats | undefined { /* ... */ }
  public getAllPlayers(): Map<string, PlayerStats> { /* ... */ }
  public getPlayerCount(): number { /* ... */ }
}
```

### ScoreCalculator
```typescript
// src/managers/score/components/score-calculator.ts
export class ScoreCalculator {
  constructor(private scoringConfig: ScoringConfig) { }

  public calculateGrenadeTargetScore(
    projectile: ProjectileEntity, 
    block: MovingBlockEntity,
    impactPoint: Vector3Like, 
    comboData: ComboData
  ): number { /* ... */ }

  private calculateDistance(point1: Vector3Like, point2: Vector3Like): number { /* ... */ }
  private calculateAverageSize(halfExtents: Vector3Like): number { /* ... */ }
  private getMovementMultiplier(block: MovingBlockEntity): number { /* ... */ }
  private applyTimeDecay(blockAge: number): number { /* ... */ }
}
```

### ComboManager
```typescript
// src/managers/score/components/combo-manager.ts
export class ComboManager {
  private playerCombos = new Map<string, ComboData>();
  
  constructor(
    private world: World,
    private comboConfig: ComboConfig
  ) { }

  public updateHitCounters(playerId: string, hitPosition: Vector3Like): ComboData { /* ... */ }
  public resetCombo(playerId: string): void { /* ... */ }
  public getComboData(playerId: string): ComboData | undefined { /* ... */ }
  public calculateBonusMultiplier(comboData: ComboData): number { /* ... */ }
  public isComboActive(playerId: string): boolean { /* ... */ }
}
```

### LeaderboardManager
```typescript
// src/managers/score/components/leaderboard-manager.ts
export class LeaderboardManager {
  constructor(private statsTracker: PlayerStatsTracker) { }

  public calculateRoundPlacements(): Array<{ playerId: string, points: number }> { /* ... */ }
  public updateRankings(): void { /* ... */ }
  public getLeaderboard(): LeaderboardEntry[] { /* ... */ }
  public isLeadingPlayer(playerId: string): boolean { /* ... */ }
  public getPlayerRank(playerId: string): number { /* ... */ }
  public getRankChange(playerId: string): 'up' | 'down' | 'same' | 'new' { /* ... */ }
}
```

### ScoreUI
```typescript
// src/managers/score/components/score-ui.ts
export class ScoreUI {
  constructor(
    private world: World,
    private statsTracker: PlayerStatsTracker,
    private leaderboard: LeaderboardManager,
    private audioManager: AudioManager
  ) { }

  public broadcastScores(): void { /* ... */ }
  public showComboNotification(playerId: string, comboCount: number, bonusPercent: number): void { /* ... */ }
  public playScoreSound(score: number): void { /* ... */ }
  public notifyComboReset(playerId: string): void { /* ... */ }
  private formatLeaderboardData(): LeaderboardUIData[] { /* ... */ }
  private formatScoreData(): ScoreUIData[] { /* ... */ }
}
```

### Configurations
```typescript
// src/managers/score/configs/scoring-configs.ts
export const SCORING_CONFIG: ScoringConfig = {
  BASE_SCORE: {
    MIN_SCORE: 5,
    BASE_SCORE_MULTIPLIER: 1.0,
    TIME_DECAY_FACTOR: 20.0
  },
  MOVEMENT_MULTIPLIERS: {
    BASE_MOVEMENT_MULTIPLIER: 1.0,
    Z_AXIS_MULTIPLIER: 4.0,
    SINE_WAVE_MULTIPLIER: 3.0,
    VERTICAL_WAVE_MULTIPLIER: 3.0,
    POPUP_MULTIPLIER: 4.0,
    RISING_MULTIPLIER: 5.5,
    PARABOLIC_MULTIPLIER: 6.0,
    PENDULUM_MULTIPLIER: 5.0
  },
  COMBO: {
    COMBO_TIMEOUT_MS: 4000,
    MAX_COMBO_BONUS: 0.5,
    MAX_MULTI_HIT_BONUS: 0.3
  },
  PLAYER_COLORS: [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FFC107', // Amber
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#FF5722', // Deep Orange
    '#00BCD4', // Cyan
    '#FFEB3B'  // Yellow
  ]
};
```

## 4. Implementation Strategy

### Phase 1: Component Extraction
1. Create the folder structure and interfaces
2. Extract configurations into dedicated files
3. Implement the simplest components first (PlayerStatsTracker, ComboManager)
4. Create tests for individual components

### Phase 2: Core Component Development
1. Implement remaining components (ScoreCalculator, LeaderboardManager, ScoreUI)
2. Test each component in isolation
3. Create the new ScoreManager to use the components
4. Add integration tests

### Phase 3: Integration and Migration
1. Create temporary facade for backward compatibility
2. Gradually migrate functionality from old ScoreManager
3. Update unit tests to work with the new architecture
4. Perform integration testing with actual gameplay

### Phase 4: Cleanup and Finalization
1. Remove backward compatibility code
2. Update documentation
3. Optimize component interactions
4. Finalize tests and ensure coverage

## 5. Backward Compatibility Considerations

The refactored ScoreManager will maintain the same public API to ensure existing code continues to work:

```typescript
// src/managers/score-manager.ts - Compatibility facade
import { ScoreManager as ModularScoreManager } from './score';
import { PlayerStatsTracker, ScoreCalculator, ComboManager, LeaderboardManager, ScoreUI } from './score/components';
import { SCORING_CONFIG } from './score/configs/scoring-configs';

export class ScoreManager extends Entity {
  private modularManager: ModularScoreManager;
  
  constructor() {
    super({
      name: 'ScoreManager',
      blockTextureUri: 'blocks/stone.png',
      blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 }
    });
  }
  
  override spawn(world: World, position: Vector3Like): void {
    super.spawn(world, { x: 0, y: -1000, z: 0 });
    
    // Initialize components
    const statsTracker = new PlayerStatsTracker(world);
    const calculator = new ScoreCalculator(SCORING_CONFIG);
    const comboManager = new ComboManager(world, SCORING_CONFIG.COMBO);
    const leaderboard = new LeaderboardManager(statsTracker);
    const audioManager = AudioManager.getInstance(world);
    const ui = new ScoreUI(world, statsTracker, leaderboard, audioManager);
    
    // Create the modular manager with components
    this.modularManager = new ModularScoreManager(
      world, statsTracker, calculator, comboManager, leaderboard, ui
    );
  }
  
  // Implement all original public methods by delegating to the modular manager
  public initializePlayer(playerId: string): void {
    this.modularManager.initializePlayer(playerId);
  }
  
  public removePlayer(playerId: string): void {
    this.modularManager.removePlayer(playerId);
  }
  
  // ... and so on for all public methods
}
```

### Key Points for Compatibility
1. Keep method signatures identical for external code
2. Ensure score calculation remains consistent
3. Maintain combo and leaderboard behavior
4. Document any subtle behavioral changes

## 6. Potential Risks and Mitigation Strategies

### Risk 1: Breaking Existing Functionality
- **Mitigation**: Comprehensive test suite covering all existing behavior
- **Mitigation**: Incremental implementation with feature toggles

### Risk 2: Performance Degradation
- **Mitigation**: Benchmark score calculation before and after refactoring
- **Mitigation**: Optimize data flow between components

### Risk 3: State Synchronization Issues
- **Mitigation**: Clear ownership of state between components
- **Mitigation**: Use a single source of truth for player stats

### Risk 4: Complex Dependencies
- **Mitigation**: Dependency injection for all components
- **Mitigation**: Clear interfaces between components

### Risk 5: Test Coverage Gaps
- **Mitigation**: Create tests for each component before implementation
- **Mitigation**: Integration tests focusing on score calculation accuracy

## 7. Future Enhancements and Next Steps

Once the modular architecture is implemented, here are recommended enhancements:

### 7.1 Enhanced Scoring Systems

Implement additional scoring systems for different game modes:
- Time-attack mode with decay-based scoring
- Precision mode with multipliers for shot accuracy
- Team-based scoring with shared combos

### 7.2 Achievements and Milestones

Add a milestone tracking system:
- Track special achievements (consecutive hits, perfect rounds)
- Reward bonus points for milestone completion
- Show achievement notifications

### 7.3 Advanced Leaderboards

Enhance the leaderboard system:
- Historical rankings across multiple games
- Statistical analysis of player performance
- Personal best tracking

### 7.4 Real-time Score Visualization

Improve score feedback:
- Floating score numbers at hit locations
- Visual combo counters
- Dynamic score multiplier displays

### 7.5 Social Features

Add social aspects to scoring:
- Score sharing functionality
- Challenge system based on score targets
- Tournament mode with elimination based on scores

### 7.6 Analytics Integration

Add detailed scoring analytics:
- Track scoring patterns and player strategies
- Identify high-value targets
- Provide insights for balancing game difficulty

## Next Steps

1. Create the directory structure and interfaces
2. Extract scoring configurations to separate files
3. Implement the PlayerStatsTracker component
4. Create unit tests for the component
5. Continue with the implementation strategy outlined above

By following this plan, we'll create a more maintainable and extensible scoring system while preserving existing functionality and ensuring backward compatibility.