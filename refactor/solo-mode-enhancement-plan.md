# Solo Mode Enhancement Plan

## 1. Current Implementation Analysis

### Overview
The current solo mode implementation allows the game to be played with a single player, but has several limitations:
- Mode selection is buried in the settings menu
- UI elements aren't fully adapted for solo play
- Edge cases in player transitions between modes aren't handled
- Score presentation doesn't align with solo mode expectations

### Key Components Involved
1. **Game Mode Selection**: Currently in settings menu
2. **RoundManager**: Handles game state based on mode 
3. **PlayerTracker**: Tracks players and their mode status
4. **UI Components**: Need enhancement for solo-specific displays
5. **ScoreManager**: Manages scoring that needs solo-specific presentation

## 2. Enhancement Requirements

### Primary Objectives
1. **First Player Mode Selection**:
   - Show a prominent UI modal to the first player who joins
   - Allow selection between solo and multiplayer modes
   - Make the UI visually consistent with the leaderboard (regarding the style)

2. **Edge Case Handling**:
   - Handle additional players joining a solo mode game
   - Manage mode switching during active gameplay
   - Ensure smooth transitions between modes

3. **Solo-Specific UI**:
   - Distinct scoring display for solo mode
   - Appropriate round transition notifications
   - Solo-focused scoreboard/leaderboard

## 3. Detailed Implementation Plan

### Phase 1: First Player Mode Selection UI

1. **Create Mode Selection UI Component**:
   - Develop a UI component styled similar to the leaderboard, needs to be inside index.html
   - Include clear buttons for "Solo Mode" and "Multiplayer Mode"
   - MVP: Just the buttons, no text, make sure they work when clicked

2. **First Player Detection**:
   - Modify PlayerTracker to detect the first player joining
   - Add logic to display the mode selection UI only to this player

3. **Mode Selection Event Handling**:
   - Create event handlers for mode selection buttons
   - Implement propagation of mode choice to game systems
   - Ensure the UI is dismissed after selection

### Phase 2: Edge Case Management

1. **Solo Mode with New Player Joins**:
   - Detect when new players join a solo mode game
   - Options to implement:
     1. Show notification to solo player about new joins with option to switch to multiplayer
     2. Automatically transition to multiplayer mode with countdown and notification
     3. Place new players in a "waiting room" until solo player finishes or switches

     (select the easiest option to implement)

2. **Mode Switching During Gameplay**:
   - Implement a mode switch request mechanism in the UI
   - Create logic for graceful transition between modes:
     - Solo → Multiplayer: Reset scores, notify all players
     - Multiplayer → Solo: Only allowed if single player remains

3. **Player Disconnect Handling**:
   - Handle cases where the solo player disconnects
   - Handle transition from multiplayer to solo when all but one player leaves

### Phase 3: Solo-Specific UI Enhancements

phase 3.1:

1. **Score Display Adaptation**:

   - Create solo-specific score display focusing on:
     - Current score
     - High score tracking
     - Round-to-round progress
   - Remove multiplayer-focused elements (rankings, other players)
   - remember to add all of this in index.html
phase 3.2:
2. **Round Transition UI**:
   - Modify transitions to show solo-appropriate messages
   - Add personal best indicators during transitions
   - Implement performance metrics relevant to solo play
phase 3.3:
3. **Solo Scoreboard**:
   - Redesign leaderboard for solo mode to show:
     - Personal stats across rounds
     - Historical high scores
     - Progression metrics
   - Remove competitive elements from the display

### Phase 4: Game System Integration

1. **RoundManager Integration**:
   - Expand RoundManager to fully support dynamic mode switching
   - Ensure proper game state management during transitions
   - Add mode-specific round behaviors

2. **ScoreManager Enhancements**:
   - Implement solo scoring that focuses on:
     - Cumulative points across rounds
     - Personal bests tracking
     - Performance metrics (blocks/minute, accuracy, etc.)

3. **Session and Progress Persistence**:
   - Consider adding solo progress persistence
   - Implement session recovery for solo players
   - Add high score tracking between sessions

## 4. Edge Cases and Solutions

### Edge Case: Player Joins Solo Game
**Solution Options:**
1. **Notification Approach**:
   - Show notification to solo player: "Another player has joined. Switch to multiplayer mode?"
   - Provide Yes/No options with appropriate transitions
   - If declined, new player sees "Host is in solo mode" message with wait option

2. **Auto-Transition Approach**:
   - Automatically begin countdown to multiplayer mode
   - Allow solo player to cancel transition and remain in solo mode
   - Show explanatory UI to both players

3. **Waiting Room Approach**:
   - Place new player in spectator mode until solo game completes
   - Show estimated wait time and current solo player progress
   - Allow solo player to end early and switch to multiplayer

### Edge Case: Solo Player Switches to Multiplayer
**Solution:**
- End current solo round with score summary
- Reset game state for multiplayer
- Show "Waiting for players" screen with current count
- Begin new multiplayer game when enough players join

### Edge Case: Multiple Players to Solo Switch
**Solution:**
- Only enable option when single player remains
- Show warning about score reset
- Clear multiplayer scores and begin new solo game

### Edge Case: Solo Player Disconnects
**Solution:**
- End solo session, saving high scores if implemented
- Reset game state to "Waiting for players"
- Show appropriate messaging to any waiting players

## 5. Testing Strategy

1. **Unit Tests**:
   - Test mode switching logic in isolation
   - Validate proper score management in different modes
   - Verify event handling for player joins/leaves

2. **Integration Tests**:
   - Test complete flow of mode transitions
   - Verify UI updates correctly during transitions
   - Test edge cases with simulated player actions

3. **Manual Testing**:
   - Test actual gameplay experience in different modes
   - Verify UI clarity and intuitiveness
   - Test with various player counts and switching scenarios

## 6. Implementation Sequence

1. **First Player UI (Phase 1)**:
   - Highest priority - improves discoverability
   - Ensures players know about solo mode option
   - Enhances first-time player experience

2. **Solo UI Enhancements (Phase 3)**:
   - Improves core solo gameplay experience
   - Makes solo mode feel complete and purposeful
   - Delivers key user-facing improvements

3. **Edge Case Management (Phase 2)**:
   - Handles transitions between modes
   - Ensures robust gameplay with varying player counts
   - Prevents user frustration during edge cases

4. **System Integration (Phase 4)**:
   - Completes the implementation
   - Adds polish and persistence
   - Ensures sustainability of the feature