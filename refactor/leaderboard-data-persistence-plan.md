# Leaderboard and High Score Data Persistence Plan (MVP)

## Overview

This document outlines the plan for implementing data persistence for leaderboards and high scores in the Astro Breaker game. The goal is to create a persistent record of player performance across game sessions using Hytopia's PersistenceManager.

## Current State Analysis

The game currently tracks player scores with the following components:
- `ScoreManager` handles player scoring during gameplay
- `PlayerStats` tracks both round and total scores
- Scores reset between game sessions
- No persistence mechanism is currently implemented

## Requirements

1. **All-Time Leaderboard**: Store top player scores across all game sessions
2. **Personal Best Records**: Store individual player's best performances
3. **Round High Scores**: Track best scores achieved in individual rounds
4. **User Interface**: Provide a way to view leaderboards during and after gameplay

## Implementation Phases

### Phase 1: Data Structures and LeaderboardManager

**Tasks:**
- Define data interfaces for persisted information
- Create the LeaderboardManager class
- Implement core persistence functions

**Data Structures:**
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

**Files to Modify/Create:**
- Create new file: `src/managers/leaderboard-manager.ts`

**Core Implementation:**
```typescript
// In leaderboard-manager.ts
import { World, Player, PersistenceManager } from 'hytopia';
import { ScoreManager } from './score-manager';

export class LeaderboardManager {
  private static instance: LeaderboardManager;
  private world: World;
  private leaderboardCache: GlobalLeaderboard | null = null;
  private readonly LEADERBOARD_KEY = "astroBreaker_leaderboard";
  
  // Singleton pattern
  public static getInstance(world: World): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager(world);
    }
    return LeaderboardManager.instance;
  }
  
  private constructor(world: World) {
    this.world = world;
  }
  
  // Core persistence methods
  public async getGlobalLeaderboard(): Promise<GlobalLeaderboard> {
    try {
      if (this.leaderboardCache) return this.leaderboardCache;
      
      const leaderboard = await PersistenceManager.instance.getGlobalData(this.LEADERBOARD_KEY) as GlobalLeaderboard || { 
        allTimeHighScores: [], 
        roundHighScores: [] 
      };
      
      this.leaderboardCache = leaderboard;
      return leaderboard;
    } catch (error) {
      console.error("Error retrieving leaderboard:", error);
      return { allTimeHighScores: [], roundHighScores: [] };
    }
  }
  
  public async updateGlobalLeaderboard(updatedLeaderboard: GlobalLeaderboard): Promise<void> {
    try {
      await PersistenceManager.instance.setGlobalData(this.LEADERBOARD_KEY, updatedLeaderboard);
      this.leaderboardCache = updatedLeaderboard;
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }
  
  public async getPlayerData(player: Player): Promise<PlayerPersistentData> {
    try {
      const playerData = await PersistenceManager.instance.getPlayerData(player) as PlayerPersistentData || {
        personalBest: { 
          totalScore: 0, 
          highestRoundScore: 0, 
          highestCombo: 0, 
          date: "" 
        },
        gamesPlayed: 0,
        totalWins: 0,
        showLeaderboard: true
      };
      
      return playerData;
    } catch (error) {
      console.error("Error retrieving player data:", error);
      return {
        personalBest: { totalScore: 0, highestRoundScore: 0, highestCombo: 0, date: "" },
        gamesPlayed: 0,
        totalWins: 0,
        showLeaderboard: true
      };
    }
  }
  
  public async updatePlayerData(player: Player, updatedData: PlayerPersistentData): Promise<void> {
    try {
      await PersistenceManager.instance.setPlayerData(player, updatedData);
    } catch (error) {
      console.error("Error updating player data:", error);
    }
  }
  
  // Additional helper methods will be added in Phase 2
}
```

**References:**
- `node_modules/hytopia/docs/server.persistencemanager.md`
- `node_modules/hytopia/docs/server.persistencemanager.instance.md`
- `node_modules/hytopia/docs/server.persistencemanager.getglobaldata.md`
- `node_modules/hytopia/docs/server.persistencemanager.setglobaldata.md`
- `node_modules/hytopia/docs/server.persistencemanager.getplayerdata.md`
- `node_modules/hytopia/docs/server.persistencemanager.setplayerdata.md`

### Phase 2: Integration with Game Systems

**Tasks:**
- Integrate LeaderboardManager with ScoreManager
- Add high score tracking to round completion
- Update player data on game events
- Normalize scores for solo vs. multiplayer

**Files to Modify:**
- `src/managers/score-manager.ts`
- `src/managers/round-manager.ts`
- `src/managers/round/index.ts`
- `src/managers/round/components/round-transition.ts`
- `index.ts` (Main game file)

**Key Implementation Details:**

1. **Score Normalization:**
   ```typescript
   // In leaderboard-manager.ts
   private normalizeScore(score: number, gameMode: 'solo' | 'multiplayer'): number {
     // Apply fixed multiplier for solo mode to balance with multiplayer
     const SOLO_MULTIPLIER = 0.8;
     return gameMode === 'solo' ? Math.round(score * SOLO_MULTIPLIER) : score;
   }
   ```

2. **ScoreManager Integration:**
   ```typescript
   // In score-manager.ts - Modify handleRoundEnd
   public handleRoundEnd(): { winnerId: string | null, placements: Array<{ playerId: string, points: number }> } {
     // Existing code...
     
     // Add leaderboard update
     const leaderboardManager = LeaderboardManager.getInstance(this.world);
     const roundScores = Array.from(this.playerStats.entries())
       .map(([playerId, stats]) => ({
         playerId,
         roundScore: stats.roundScore,
         totalScore: stats.totalScore
       }));
     
     // Update leaderboard asynchronously
     this.updateLeaderboard(roundScores, this.getCurrentRound());
     
     return { winnerId, placements };
   }
   
   private async updateLeaderboard(scores: Array<{playerId: string, roundScore: number, totalScore: number}>, roundNumber: number): Promise<void> {
     // Implementation details for updating the leaderboard
     // This will call the LeaderboardManager methods
   }
   ```

3. **RoundManager Integration:**
   ```typescript
   // In round-manager.ts or src/managers/round/index.ts
   private async handleGameEnd(): Promise<void> {
     // Get final standings
     const standings = this.getFinalStandings();
     
     // Update leaderboard with game results
     const leaderboardManager = LeaderboardManager.getInstance(this.world);
     await leaderboardManager.updateWithGameResults(standings, this.gameConfig.gameMode);
     
     // Display leaderboard to players
     this.displayLeaderboard();
   }
   ```

4. **Player Event Tracking:**
   ```typescript
   // In index.ts - Add to PlayerEvent.JOINED_WORLD handler
   world.on(PlayerEvent.JOINED_WORLD, async ({ player }) => {
     // Existing code...
     
     // Initialize player in LeaderboardManager
     const leaderboardManager = LeaderboardManager.getInstance(world);
     const playerData = await leaderboardManager.getPlayerData(player);
     
     // Update games played count
     playerData.gamesPlayed++;
     await leaderboardManager.updatePlayerData(player, playerData);
   });
   ```

### Phase 3: UI Implementation

**Tasks:**
- Create leaderboard UI components
- Add key binding for toggling leaderboard
- Implement leaderboard display logic
- Add leaderboard to settings menu

**Files to Modify:**
- `assets/ui/index.html` (all UI needs to be here)
- `src/scene-ui/scene-ui-manager.ts`
- `src/managers/player-settings-manager.ts`
- `index.ts` (for key binding)

**UI Components inside index.html:**
```html
<!-- Note: In Hytopia UI files, don't use <html>, <body>, or <head> tags -->
<div id="leaderboard-panel" class="game-panel" style="display: none;">
  <div class="panel-header">
    <h2>Leaderboard</h2>
    <button id="close-leaderboard" class="close-button">×</button>
  </div>
  
  <div class="tab-container">
    <button class="tab-button active" data-tab="all-time">All-Time High Scores</button>
    <button class="tab-button" data-tab="round">Best Round Scores</button>
    <button class="tab-button" data-tab="personal">Personal Bests</button>
  </div>
  
  <div id="all-time-tab" class="tab-content active">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Score</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody id="all-time-scores">
        <!-- Dynamically populated -->
      </tbody>
    </table>
  </div>
  
  <!-- Similar structure for round and personal tabs -->
</div>

<!-- Add a template for in-world leaderboard display -->
<template id="leaderboard-marker-template">
  <div class="leaderboard-marker">
    <div class="marker-title">High Scores</div>
    <div class="marker-scores"></div>
  </div>
</template>

<script>
  // Handle data from the server
  hytopia.onData(data => {
    if (data.type === 'toggleLeaderboard') {
      const panel = document.getElementById('leaderboard-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
    else if (data.type === 'displayLeaderboard') {
      displayLeaderboardData(data.data);
    }
  });

  // Send data to the server when closing the leaderboard
  document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-panel').style.display = 'none';
    hytopia.sendData({ type: 'closeLeaderboard' });
  });

  // Tab switching functionality
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      // Switch active tab
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      // Show corresponding content
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Register scene UI template for in-world leaderboard markers
  hytopia.registerSceneUITemplate('leaderboard-marker', (id, onState) => {
    const template = document.getElementById('leaderboard-marker-template');
    const clone = template.content.cloneNode(true);
    const scoresElement = clone.querySelector('.marker-scores');
    
    onState(state => {
      if (!state || !state.scores) return;
      
      scoresElement.innerHTML = state.scores
        .map((score, index) => `
          <div class="marker-score">
            <span class="rank">${index + 1}</span>
            <span class="name">${score.playerName}</span>
            <span class="score">${score.score}</span>
          </div>
        `)
        .join('');
    });
    
    return clone;
  });

  function displayLeaderboardData(data) {
    const panel = document.getElementById('leaderboard-panel');
    panel.style.display = 'block';
    
    // Display all-time high scores
    document.getElementById('all-time-scores').innerHTML = data.allTimeHighScores
      .map((score, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${score.playerName}</td>
          <td>${score.score}</td>
          <td>${score.date}</td>
        </tr>
      `)
      .join('');
    
    // Similar implementation for round and personal tabs
  }
</script>

<style>
  /* Leaderboard styling */
  .game-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
    padding: 20px;
    color: white;
    width: 80%;
    max-width: 600px;
    max-height: 80%;
    overflow-y: auto;
  }
  
  /* Additional styling */
</style>
```

**Key Binding Implementation:**
```typescript
// In index.ts - Add to player join event
world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
  // Existing code...
  
  // Load the UI for the player
  player.ui.load('ui/index.html');
  
  // Add key binding for leaderboard using proper event handling
  player.controller?.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, ({ entity, input, deltaTimeMs }) => {
    // 'L' key pressed (key code 76)
    if (input.keyDown && input.keyCode === 76) {
      // Toggle leaderboard display
      player.ui.sendData({
        type: 'toggleLeaderboard'
      });
      
      // Consume the input to prevent repeated toggling
      input.keyDown = false;
    }
  });
});

// Add UI event handler to the world
world.on(PlayerUIEvent.DATA, ({ playerUI, data }) => {
  if (data.type === 'closeLeaderboard') {
    // Handle any server-side actions when leaderboard is closed
  }
});
```

**Creating In-World Leaderboard Display:**
```typescript
// In scene-ui-manager.ts - Add method to create in-world leaderboard markers
public createLeaderboardMarker(position: Vector3Like, scores: Array<{playerName: string, score: number}>): SceneUI {
  const leaderboardMarker = new SceneUI({
    templateId: 'leaderboard-marker',
    state: { scores: scores.slice(0, 5) },  // Show top 5 scores
    viewDistance: 10,
    position
  });
  
  leaderboardMarker.load(this.world);
  return leaderboardMarker;
}
```

### Phase 4: Testing and Refinement

**Tasks:**
- Test persistence across game sessions
- Verify leaderboard sorting and display
- Test score normalization
- Ensure smooth UI integration
- Optimize performance

**Testing Approach:**
1. Create test scenarios for various game outcomes
2. Verify data persistence between game sessions
3. Test with multiple players
4. Ensure proper error handling
5. Optimize performance for larger leaderboards

## Local Development Notes

- Data will be stored in the `./dev/persistence` directory
- In production, data will persist based on each unique user
- Regularly backup the persistence directory during development

## Code Style Guidelines

- Use camelCase for variables and functions, PascalCase for classes
- Group imports by source (external libraries first, then local modules)
- Add proper JSDoc comments for all public methods
- Handle errors with try/catch and provide fallback data
- Follow existing code patterns in the codebase

## Future Enhancements (Post-MVP)

1. Separate leaderboards for solo and multiplayer modes
2. Time-based leaderboards (daily, weekly, monthly)
3. Achievements system tied to persistent data
4. Social features (friend comparisons, challenges)
5. Seasonal leaderboards with rewards
6. Leaderboard filtering options
7. Player profile cards with stats