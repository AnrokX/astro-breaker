# Solo Mode Implementation Plan

## 1. Analysis of Current System

### Overview
The Astro Breaker game currently requires a minimum of 2 players to start a game, as defined in:
- `DEFAULT_GAME_CONFIG.requiredPlayers = 2` in `game-configs.ts`
- `PlayerTracker` constructor default parameter `requiredPlayers = 2`

The main components involved in handling player requirements are:

1. **PlayerTracker**: Tracks player count and determines if there are enough players
2. **RoundManager**: Uses PlayerTracker to wait for required players before starting rounds
3. **RoundUI**: Displays "Waiting for players" messages in the UI
4. **GameConfig interface**: Defines the `requiredPlayers` configuration parameter

### Core Issues to Address

1. **Player Requirement Logic**: The game waits for 2+ players, preventing solo play
2. **UI Messaging**: "Waiting for players" messaging isn't relevant for solo mode
3. **Game Mode Selection**: No way to choose between solo and multiplayer modes
4. **Score and Leaderboard**: Score display is oriented toward multiple players

## 2. Proposed Solo Mode Implementation

### Approach
We'll implement a switchable game mode that allows players to select between:
1. **Solo Mode**: Playable with a single player
2. **Multiplayer Mode**: Requires 2+ players (existing behavior)

### Key Implementation Components

1. **Game Mode Configuration**:
   - Add a `gameMode` field to `GameConfig` (values: 'solo', 'multiplayer')
   - Update constructor parameters to include game mode option
   - Create a default solo configuration with `requiredPlayers: 1`

2. **Mode Selection UI**:
   - Add a simple mode selection button/toggle in the UI
   - Allow switching before a game starts

3. **PlayerTracker Modifications**:
   - Update to support a `requiredPlayers` value of 1
   - Add mode-specific messaging

4. **RoundManager Adjustments**:
   - Detect solo mode and apply appropriate behavior
   - Handle solo game reset and transitions

5. **UI Enhancements**:
   - Display appropriate messages for solo mode
   - Adapt game end/stats display for single player

## 3. Detailed Implementation Plan

### Phase 1: Core Solo Mode Support

#### Update Game Configuration
1. Modify `round-interfaces.ts`:
   ```typescript
   export interface GameConfig {
     maxRounds: number;
     requiredPlayers: number;
     transitionDuration: number;
     gameMode: 'solo' | 'multiplayer'; // Add this field
   }
   ```

2. Update `game-configs.ts`:
   ```typescript
   export const DEFAULT_GAME_CONFIG: GameConfig = {
     maxRounds: 10,
     requiredPlayers: 2,
     transitionDuration: 3000,
     gameMode: 'multiplayer'
   };

   export const SOLO_GAME_CONFIG: GameConfig = {
     maxRounds: 10,
     requiredPlayers: 1,
     transitionDuration: 3000,
     gameMode: 'solo'
   };
   ```

#### Modify PlayerTracker
1. Update constructor to support solo mode:
   ```typescript
   constructor(
     private world: World,
     requiredPlayers: number = 2,
     private isSoloMode: boolean = false
   ) {
     this.requiredPlayers = requiredPlayers;
   }
   ```

2. Add a helper method to check for solo mode:
   ```typescript
   public isSolo(): boolean {
     return this.isSoloMode;
   }
   ```

### Phase 2: UI Mode Selection

1. Add mode selection UI to `assets/ui/index.html`:
   - Create a simple toggle or button set
   - Style with appropriate CSS
   - Add JavaScript to send mode selection to the game

2. Implement API to receive mode selection:
   - Handle a new message type 'setGameMode'
   - Update RoundManager configuration based on selection
   - Reset game with new configuration

### Phase 3: RoundManager Integration

1. Update RoundManager constructor to accept gameMode:
   ```typescript
   constructor(
     private world: World,
     private transition: RoundTransition,
     private spawner: RoundSpawner,
     private playerTracker: PlayerTracker,
     private ui: RoundUI,
     private scoreManager: ScoreManager,
     gameConfig?: Partial<GameConfig>
   ) {
     // Merge provided config with defaults, choosing the right default based on mode
     const defaultConfig = (gameConfig?.gameMode === 'solo') 
       ? SOLO_GAME_CONFIG 
       : DEFAULT_GAME_CONFIG;
       
     this.gameConfig = {
       ...defaultConfig,
       ...gameConfig
     };
     
     // Update player tracker with solo mode info if needed
     if (this.gameConfig.gameMode === 'solo') {
       this.playerTracker = new PlayerTracker(
         world, 
         1, // Required players is 1
         true // isSoloMode = true
       );
     }
   }
   ```

2. Modify game status messaging:
   ```typescript
   private resetGame(): void {
     // ... existing code
     
     if (this.gameConfig.gameMode === 'solo') {
       this.ui.displaySystemMessage('Solo game starting...', 'FFFFFF');
       setTimeout(() => {
         this.startRound();
       }, 3000);
     } else {
       // Existing multiplayer code
       // ... 
     }
   }
   ```

### Phase 4: UI Display Updates

1. Update RoundUI.displayWaitingForPlayers:
   ```typescript
   public displayWaitingForPlayers(currentCount: number, requiredCount: number, isSoloMode: boolean = false): void {
     let message;
     
     if (isSoloMode) {
       message = {
         type: 'waitingForSoloStart',
         data: {
           message: 'Press SPACE to start solo game'
         }
       };
     } else {
       message = {
         type: 'waitingForPlayers',
         data: {
           current: currentCount,
           required: requiredCount,
           remaining: requiredCount - currentCount
         }
       };
     }

     this.broadcastToAllPlayers(message);
   }
   ```

2. Update RoundUI.displayGameEnd to support solo mode:
   ```typescript
   public displayGameEnd(winner: GameEndStanding, standings: GameEndStanding[], 
                         totalRounds: number, completedRounds: number, 
                         nextGameIn: number = 10000): void {
     // ... existing code
     
     // Different messages for solo mode
     if (this.gameConfig?.gameMode === 'solo') {
       this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
         playerEntity.player.ui.sendData({
           type: 'systemMessage',
           message: `Game Over! Your final score: ${winner.totalScore}`,
           color: 'FFD700'
         });
       });
     } else {
       // Existing multiplayer message
       // ...
     }
   }
   ```

## 4. Testing Strategy

1. **Unit Tests**:
   - Update PlayerTracker tests to include solo mode
   - Add tests for RoundManager with solo configuration
   - Test UI message handling for solo mode

2. **Integration Tests**:
   - Test game flow with solo player
   - Verify round transitions with a single player
   - Test score tracking for solo mode

3. **Manual Testing**:
   - Verify solo mode selection UI
   - Test complete solo gameplay experience
   - Check UI messages and displays

## 5. Backward Compatibility

The implementation should maintain backward compatibility by:

1. Defaulting to the current multiplayer mode
2. Only applying solo mode logic when explicitly selected
3. Preserving all existing multiplayer functionality

## 6. Implementation Steps

1. **Core Configuration Updates**:
   - Update GameConfig interface in round-interfaces.ts
   - Add SOLO_GAME_CONFIG to game-configs.ts
   - Update PlayerTracker to support solo mode

2. **UI Mode Selection**:
   - Add game mode selection UI components
   - Add handler for mode selection in the game

3. **RoundManager Changes**:
   - Update constructor to handle solo mode config
   - Modify game flow logic for solo play
   - Adapt messaging for solo player

4. **Testing and Refinement**:
   - Update and run unit tests
   - Manually test gameplay and UI
   - Fix issues and refine implementation