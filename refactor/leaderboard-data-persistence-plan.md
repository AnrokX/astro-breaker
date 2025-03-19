# Leaderboard and High Score Data Persistence Plan

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

2. **Integrate with ScoreManager**
   - Modify `ScoreManager.handleRoundEnd()` to update persistent data
   - Add methods to save scores to LeaderboardManager

3. **Update RoundManager**
   - Modify `RoundManager` to trigger leaderboard updates on game end
   - Add hooks to notify LeaderboardManager of game completion

4. **Create Leaderboard UI**
   - Design simple UI components to display leaderboard data
   - Implement UI updates when new scores are recorded

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

### Local Development

Data will be stored in the `./dev/persistence` directory during local development and will persist between game sessions.

## Timeline

1. Create `LeaderboardManager` class - 1 day
2. Integrate with `ScoreManager` and `RoundManager` - 1 day
3. Update UI to display leaderboards - 1 day
4. Testing and refinement - 1 day

## Future Enhancements (Post-MVP)

1. Separate leaderboards for solo and multiplayer modes
2. Time-based leaderboards (daily, weekly, monthly)
3. Achievements system tied to persistent data
4. Social features (friend comparisons, challenges)
5. Seasonal leaderboards with rewards