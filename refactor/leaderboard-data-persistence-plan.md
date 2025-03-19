# Leaderboard and High Score Data Persistence Plan (MVP)

## Overview

This document outlines the plan for implementing data persistence for leaderboards and high scores in the Astro Breaker game. The goal is to create a persistent record of player performance across game sessions using Hytopia's PersistenceManager.

## Current State Analysis

The game currently tracks player scores with the following components:
- `ScoreManager` handles player scoring during gameplay
- `PlayerStats` tracks both round and total scores
- Scores reset between game sessions
- No persistence mechanism is currently implemented

## Persistence Requirements

1. **All-Time Leaderboard**: Store top player scores across all game sessions
2. **Personal Best Records**: Store individual player's best performances
3. **Round High Scores**: Track best scores achieved in individual rounds

## Implementation Plan

### 1. Define Persistence Data Structures

```typescript
// Global leaderboard structure
interface GlobalLeaderboard {
  allTimeHighScores: {
    playerName: string;
    playerId: string;
    score: number;
    date: string;
  }[];
  
  roundHighScores: {
    playerName: string;
    playerId: string;
    roundScore: number;
    roundNumber: number;
    date: string;
  }[];
}

// Player-specific persistence data
interface PlayerPersistentData {
  personalBest: {
    totalScore: number;
    highestRoundScore: number;
    highestCombo: number;
    date: string;
  };
  gamesPlayed: number;
  totalWins: number;
  showLeaderboard: boolean;  // Player preference for showing the leaderboard
}
```

### 2. Create PersistenceManager Integration

Create a new `LeaderboardManager` class that will:
1. Interact with the Hytopia `PersistenceManager`
2. Handle loading/saving global and player-specific data
3. Provide an API for the rest of the game to access persistent data

```typescript
// Naming/location: src/managers/leaderboard-manager.ts
```

### 3. Score Storage Implementation

#### Global Leaderboard Updates
- Update global leaderboard at the end of each game
- Store top 10 scores for total game score
- Store top 5 scores for individual rounds

#### Player Data Updates
- Store personal bests on game completion
- Track statistics across multiple game sessions

### 4. UI Integration

- Add a new leaderboard UI panel to display:
  - All-time high scores
  - Personal bests for the current player
  - Best round scores
  
- **Leaderboard Access Methods**:
  1. **Key Binding**: Add an 'L' key binding to toggle the leaderboard display
  2. **Menu Button**: Add "Leaderboard" button to the game menu/settings panel
  3. **Round End**: Automatically show after completing a round/game
  
- **UI States**:
  - The leaderboard will be an overlay that can be toggled on/off
  - Should be accessible during gameplay and between rounds
  - Will automatically appear briefly at the end of a game

- **Player Setting Integration**:
  - Update `PlayerSettings` interface to include leaderboard display preference
  - Add toggle in settings menu for auto-display of leaderboard after rounds

### 5. Score Normalization (Handle Solo vs Multiplayer)

Two approaches to consider:
1. **Fixed Multiplier System**:
   - Apply a consistent multiplier to normalize scores across solo and multiplayer
   - Solo scores might be multiplied by 0.8 to maintain balance

2. **Separate Leaderboards**:
   - Maintain different leaderboards for solo and multiplayer modes
   - Display mode-specific results to players

**Selected Approach**: Use a fixed multiplier system for MVP simplicity.

## Implementation Steps

1. **Create LeaderboardManager**
   - Implement `LeaderboardManager` class with methods for:
     - Getting/updating global leaderboard
     - Getting/updating player stats
     - Normalizing scores across game modes
   - **Files to reference**:
     - Create new file: `src/managers/leaderboard-manager.ts`
     - Import from: `node_modules/hytopia/docs/server.persistencemanager.md`
     - Import types from: `src/types.ts`
     - Use patterns from: `src/managers/score-manager.ts`

2. **Integrate with ScoreManager**
   - Modify `ScoreManager.handleRoundEnd()` to update persistent data
   - Add methods to save scores to LeaderboardManager
   - **Files to modify**:
     - `src/managers/score-manager.ts` (primarily the `handleRoundEnd()` method)
     - Ensure integration with: `src/managers/round-manager.ts`
     - Update interface: `src/managers/round/interfaces/round-interfaces.ts` to include high score data

3. **Update RoundManager**
   - Modify `RoundManager` to trigger leaderboard updates on game end
   - Add hooks to notify LeaderboardManager of game completion
   - **Files to modify**:
     - `src/managers/round-manager.ts` (facade class)
     - `src/managers/round/index.ts` (modular implementation)
     - `src/managers/round/components/round-transition.ts` (for end-of-game triggers)
     - Root game file: `index.ts` (for initialization and player join/leave events)

4. **Create Leaderboard UI**
   - Design simple UI components to display leaderboard data
   - Implement UI updates when new scores are recorded
   - Add key binding ('L') to toggle leaderboard display
   - **Files to modify/reference**:
     - `assets/ui/index.html` (add leaderboard section)
     - `assets/ui/styles/` (add leaderboard styling)
     - `src/scene-ui/scene-ui-manager.ts` (for UI updates)
     - `src/managers/player-settings-manager.ts` (update to handle 'L' key binding)
     - `index.ts` (add key binding event handler)
     - Reference pattern in: `src/managers/round/components/round-ui.ts`

## Technical Details

### Using PersistenceManager

```typescript
// Examples of using the PersistenceManager

// Getting global leaderboard
const leaderboard = await PersistenceManager.instance.getGlobalData("astroBreaker_leaderboard") || { 
  allTimeHighScores: [], 
  roundHighScores: [] 
};

// Updating global leaderboard
await PersistenceManager.instance.setGlobalData("astroBreaker_leaderboard", updatedLeaderboard);

// Getting player data
const playerData = await PersistenceManager.instance.getPlayerData(player) || {
  personalBest: { totalScore: 0, highestRoundScore: 0, highestCombo: 0, date: "" },
  gamesPlayed: 0,
  totalWins: 0
};

// Updating player data
await PersistenceManager.instance.setPlayerData(player, updatedPlayerData);
```

### Core File Structure for Implementation

```
src/
  managers/
    leaderboard-manager.ts  # New file for managing persistence
    score-manager.ts        # Update to integrate with leaderboard
    round-manager.ts        # Update to trigger high score updates
    round/
      index.ts              # Update for end-of-game hooks
      components/
        round-transition.ts # Update for leaderboard updates on game end
  scene-ui/
    scene-ui-manager.ts     # Update to support leaderboard UI
assets/
  ui/
    index.html              # Update to include leaderboard panel
    styles/                 # Add CSS for leaderboard
```

### Node Modules Reference

Critical Hytopia documentation files:
- `node_modules/hytopia/docs/server.persistencemanager.md` - Core API for persistence
- `node_modules/hytopia/docs/server.persistencemanager.instance.md` - Singleton instance
- `node_modules/hytopia/docs/server.persistencemanager.getglobaldata.md` - For leaderboard retrieval
- `node_modules/hytopia/docs/server.persistencemanager.setglobaldata.md` - For leaderboard updates
- `node_modules/hytopia/docs/server.persistencemanager.getplayerdata.md` - For player stats
- `node_modules/hytopia/docs/server.persistencemanager.setplayerdata.md` - For player stats updates

### Local Development

Data will be stored in the `./dev/persistence` directory during local development and will persist between game sessions.

### Required Imports

```typescript
// In leaderboard-manager.ts
import { World, Player, PersistenceManager } from 'hytopia';
import { ScoreManager } from './score-manager';

// In index.ts (main game file)
import { LeaderboardManager } from './src/managers/leaderboard-manager';
```

## Timeline

1. Create `LeaderboardManager` class - 1 day
2. Integrate with `ScoreManager` and `RoundManager` - 1 day
3. Update UI to display leaderboards - 1 day
4. Testing and refinement - 1 day

## User Interface Guidelines

1. **Keyboard Controls**:
   - 'L' key to toggle leaderboard visibility
   - ESC key should close the leaderboard if open

2. **UI Design**:
   - Leaderboard overlay should be semi-transparent
   - Include player names with scores
   - Highlight the current player's scores
   - Show a "Close" button for mouse users
   - Design should match the existing game UI style

3. **Accessibility**:
   - Clear color contrast for readability
   - Text size sufficient for all players
   - Keyboard and mouse navigation support

## Future Enhancements (Post-MVP)

1. Separate leaderboards for solo and multiplayer modes
2. Time-based leaderboards (daily, weekly, monthly)
3. Achievements system tied to persistent data
4. Social features (friend comparisons, challenges)
5. Seasonal leaderboards with rewards
6. Leaderboard filtering and sorting options
7. Player profile cards with stats and achievements