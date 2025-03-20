# Leaderboard Data Persistence Simplification Plan

## Overview

This document outlines the plan for simplifying the leaderboard data persistence in Astro Breaker. Based on the requirements, we'll make focused changes to streamline the leaderboard experience while maintaining its core functionality.

## Requirements Summary

1. **All Time High Scores**:
   - Simple sum of all round scores in the total amount of rounds
   - No additional complexity or filtering needed

2. **Best Round Scores**:
   - Include a filter for viewing high scores by round number
   - Dynamic round selection that adapts to the number of rounds in the game
   - Not hardcoded - should automatically adjust if round count changes

3. **Personal Bests**:
   - Simplified to show only:
     - Total high score across all rounds
     - Individual high score for each round

## Current Implementation Analysis

The current leaderboard implementation has:
- Complex data structures in `GlobalLeaderboard` and `PlayerPersistentData`
- Multiple score tracking methods in `LeaderboardManager`
- Potentially confusing UI with too many options

## Implementation Plan

### Phase 1: Data Structure Simplification

**Tasks:**
- Simplify the `GlobalLeaderboard` interface
- Streamline the `PlayerPersistentData` interface
- Remove unused properties and methods

```typescript
// Simplified Global Leaderboard structure
interface GlobalLeaderboard {
  allTimeHighScores: {
    playerName: string;
    playerId: string;
    score: number;  // Total sum of all round scores
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

// Simplified Player-specific persistence data
interface PlayerPersistentData {
  personalBest: {
    totalScore: number;  // Total high score across all rounds
    roundScores: {  // Individual high scores for each round
      [roundNumber: number]: {
        score: number;
        date: string;
      }
    };
    date: string;  // Last updated date
  };
  gamesPlayed: number;
  totalWins: number;
}
```

**Files to Modify:**
- `src/types.ts` - Update interfaces
- `src/managers/leaderboard-manager.ts` - Adjust implementation

### Phase 2: LeaderboardManager Simplification

**Tasks:**
- Simplify score tracking methods
- Update the round score handling logic
- Implement dynamic round detection

**Key Implementation Changes:**

1. **Total Score Calculation**:
```typescript
// In leaderboard-manager.ts
public async updateWithGameResults(
  finalStandings: Array<{
    playerId: string;
    playerName?: string;
    totalScore: number;  // This is now simply the sum of all round scores
  }>,
  gameMode: 'solo' | 'multiplayer' = 'multiplayer'
): Promise<void> {
  // Simplified implementation with just totalScore
}
```

2. **Round Score Tracking**:
```typescript
// In leaderboard-manager.ts
public async updateWithRoundScores(
  scores: Array<{playerId: string, playerName?: string, roundScore: number}>,
  roundNumber: number,
  totalRounds: number,  // Pass in total rounds to enable dynamic filtering
  gameMode: 'solo' | 'multiplayer' = 'multiplayer'
): Promise<void> {
  // Implementation that stores scores by round
}
```

3. **Personal Best Handling**:
```typescript
// In leaderboard-manager.ts
private async updatePlayerBest(
  player: Player, 
  gameStats: {
    totalScore: number;
    roundScores?: {[roundNumber: number]: number};
  }
): Promise<void> {
  // Simplified implementation that tracks total score and per-round scores
}
```

### Phase 3: UI Simplification

**Tasks:**
- Simplify the leaderboard UI layout
- Implement dynamic round filtering
- Update the data display logic

**UI Component Changes:**
```html
<!-- Simplified Leaderboard UI -->
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
  
  <!-- All-Time High Scores Tab (Simple sum of all rounds) -->
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
  
  <!-- Round Scores Tab (With dynamic round selector) -->
  <div id="round-tab" class="tab-content">
    <div class="round-selector">
      <label for="round-select">Select Round:</label>
      <select id="round-select">
        <!-- Dynamically populated based on total rounds -->
      </select>
    </div>
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Score</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody id="round-scores">
        <!-- Dynamically populated based on selected round -->
      </tbody>
    </table>
  </div>
  
  <!-- Personal Bests Tab (Just total score and per-round scores) -->
  <div id="personal-tab" class="tab-content">
    <div class="personal-total">
      <h3>Total High Score</h3>
      <div id="personal-total-score">0</div>
      <div id="personal-total-date">Never</div>
    </div>
    
    <h3>Round High Scores</h3>
    <div id="personal-round-scores" class="personal-rounds">
      <!-- Dynamically populated -->
    </div>
  </div>
</div>

<script>
  // Handle data from the server
  hytopia.onData(data => {
    if (data.type === 'displayLeaderboard') {
      displayLeaderboardData(data.data);
    }
  });

  // Function to populate the round selector
  function populateRoundSelector(totalRounds) {
    const selector = document.getElementById('round-select');
    selector.innerHTML = '';
    
    // Create an option for each round
    for (let i = 1; i <= totalRounds; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Round ${i}`;
      selector.appendChild(option);
    }
    
    // Add event listener to update displayed scores when selection changes
    selector.addEventListener('change', () => {
      const selectedRound = parseInt(selector.value);
      displayRoundScores(selectedRound);
    });
  }

  // Display the leaderboard data
  function displayLeaderboardData(data) {
    // Display all-time high scores
    document.getElementById('all-time-scores').innerHTML = data.allTimeHighScores
      .map((score, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${score.playerName}</td>
          <td>${score.score}</td>
          <td>${formatDate(score.date)}</td>
        </tr>
      `)
      .join('');
    
    // Populate round selector based on total rounds
    populateRoundSelector(data.totalRounds || 3);
    
    // Display round scores for initially selected round
    const selectedRound = parseInt(document.getElementById('round-select').value) || 1;
    displayRoundScores(selectedRound, data.roundHighScores);
    
    // Display personal bests
    if (data.personalBest) {
      document.getElementById('personal-total-score').textContent = data.personalBest.totalScore;
      document.getElementById('personal-total-date').textContent = formatDate(data.personalBest.date);
      
      // Display individual round scores
      const roundScoresContainer = document.getElementById('personal-round-scores');
      roundScoresContainer.innerHTML = '';
      
      if (data.personalBest.roundScores) {
        Object.entries(data.personalBest.roundScores).forEach(([round, scoreData]) => {
          roundScoresContainer.innerHTML += `
            <div class="round-score">
              <div class="round-label">Round ${round}</div>
              <div class="round-value">${scoreData.score}</div>
              <div class="round-date">${formatDate(scoreData.date)}</div>
            </div>
          `;
        });
      }
    }
  }

  // Display scores for a specific round
  function displayRoundScores(roundNumber, allRoundScores) {
    const roundScores = allRoundScores.filter(score => score.roundNumber === roundNumber);
    
    document.getElementById('round-scores').innerHTML = roundScores
      .map((score, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${score.playerName}</td>
          <td>${score.roundScore}</td>
          <td>${formatDate(score.date)}</td>
        </tr>
      `)
      .join('');
  }

  // Helper to format dates
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  }
</script>
```

### Phase 4: Integration and Testing

**Tasks:**
- Update the integration between LeaderboardManager and score tracking systems
- Ensure data persistence works correctly with simplified model
- Test dynamic round filtering
- Verify all requirements are met

**Testing Approach:**
1. Test with different numbers of rounds to ensure dynamic behavior
2. Verify all three sections display correctly:
   - All-time high scores (sum of all rounds)
   - Best round scores with filter
   - Personal bests for total and per-round

## Implementation Timeline

1. **Data Structure Simplification**: 1 day
   - Update interfaces and adjust current implementation

2. **LeaderboardManager Changes**: 2 days
   - Simplify score tracking methods
   - Implement dynamic round handling

3. **UI Implementation**: 2 days
   - Redesign the leaderboard UI
   - Implement dynamic round selector

4. **Testing and Integration**: 1 day
   - Verify all requirements are met
   - Fix any issues or edge cases

## Success Metrics

A successful implementation will:
1. Reduce the complexity of the leaderboard system
2. Correctly display all required information
3. Dynamically adapt to changes in round configuration
4. Maintain proper data persistence across game sessions