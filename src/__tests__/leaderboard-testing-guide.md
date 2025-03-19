# Leaderboard Testing Guide

This guide contains instructions for testing the leaderboard functionality in Astro Breaker, including data persistence, score normalization, and UI integration.

## Automated Testing

The automated tests verify the core functionality of the `LeaderboardManager` and its interactions with other game systems. These tests mock Hytopia dependencies to isolate and test the implementation logic.

### Running the Jest Tests

To run the automated tests:

```bash
npm test -- --testPathPattern=leaderboard
```

This will run both `leaderboard-manager.test.ts` and `leaderboard-integration.test.ts`.

### Tests Coverage

The automated tests verify:

1. **Singleton Instance:** Validates that `LeaderboardManager` maintains a singleton pattern
2. **Global Leaderboard Persistence:** Tests retrieving and updating the global leaderboard
3. **Player Data Persistence:** Tests retrieving and updating player-specific data
4. **Score Normalization:** Verifies scores are correctly normalized between solo and multiplayer modes
5. **High Score Management:** Tests adding and sorting all-time high scores
6. **Round Score Management:** Tests adding and sorting round high scores
7. **Personal Best Updates:** Verifies player personal bests are updated correctly
8. **ScoreManager Integration:** Tests the integration with `ScoreManager` during round end
9. **In-World Markers:** Verifies leaderboard markers can be created in the world
10. **Game Counters:** Tests game played and wins counters
11. **Leaderboard Settings:** Tests player preferences for leaderboard visibility
12. **Qualifier Checks:** Tests the logic for determining if a score qualifies for the leaderboard
13. **Game Results:** Tests updating the leaderboard with final game results

## Manual Testing

For real-world validation in the actual game environment, we've created runtime test tools.

### Setting Up the Test Interface

1. Import the test utilities in your game's main file (index.ts):

```typescript
import { addLeaderboardTestToMainMenu } from './__tests__/run-leaderboard-tests';

// In your world initialization code:
addLeaderboardTestToMainMenu(world);
```

2. Start the game and you'll see a "Test Leaderboard" button in the UI.

### Running the Manual Tests

1. Click the "Test Leaderboard" button to run through all leaderboard tests with the current player
2. Test results will be printed to the console and a summary message will appear in the UI
3. Check the console for detailed test results and data dumps

### Manual Test Cases

The manual tests execute the following operations in sequence:

1. **Get Global Leaderboard:** Retrieves and displays the current global leaderboard
2. **Get Player Data:** Retrieves and displays the current player's persistent data
3. **Add High Score:** Adds a test high score (9999) and verifies it appears in the leaderboard
4. **Add Round Score:** Adds a test round score (8888 for round 5) and verifies it appears
5. **Update Personal Best:** Updates player's personal best scores and verifies the changes
6. **Increment Games Played:** Increments and verifies the games played counter
7. **Increment Wins:** Increments and verifies the player's win counter
8. **Toggle Visibility:** Tests changing the leaderboard visibility preference
9. **Score Normalization:** Tests score normalization between solo and multiplayer modes

## UI Testing

In addition to the programmatic tests, visually check these UI features:

1. **Leaderboard Display (L key):** Press the "L" key to toggle the leaderboard panel
2. **In-World Markers:** Look for leaderboard markers showing high scores in the game world
3. **Round End Scores:** Verify scores are updated and displayed at the end of each round
4. **Game End Display:** Check the final game summary shows correct scores and rankings
5. **Personal Stats:** Verify your personal stats are correctly displayed in the UI

## Data Persistence Testing

To verify data persists correctly across sessions:

1. Play a few rounds with a specific player
2. Check leaderboard and personal stats
3. Restart the server and reconnect with the same player
4. Verify leaderboard and personal stats are maintained from the previous session
5. Verify new achievements are properly added and ranked

## Debugging

If you encounter issues during testing:

1. Check the `./dev/persistence` directory for raw data files
2. Use the console logs to see detailed error messages and data dumps
3. Use the LeaderboardManager's logging features to monitor data flow
4. Verify that the `PersistenceManager` is working correctly across server restarts

## Common Issues

- **Empty Leaderboards:** On a fresh install, leaderboards will be initially empty
- **Score Mismatch:** If scores appear incorrect, check the normalization calculations
- **UI Not Updating:** Ensure the UI event listeners are properly connected
- **Persistence Errors:** Check that the persistence directory has proper permissions 