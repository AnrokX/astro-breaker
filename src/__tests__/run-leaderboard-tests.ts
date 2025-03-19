import { World, Player } from 'hytopia';
import { LeaderboardManager } from '../managers/leaderboard-manager';
import { PlayerUIEvent } from 'hytopia';

/**
 * This script manually tests the LeaderboardManager functionality in a game environment
 * It will print out test results to the console
 * 
 * To use:
 * 1. Run the game
 * 2. Import and call testLeaderboardFunctionality() in your game code
 */

export async function testLeaderboardFunctionality(world: World, player: Player): Promise<void> {
  console.log('🧪 LEADERBOARD TESTS: Starting tests...');
  
  // Send immediate feedback to the player that tests are starting
  player.ui.sendData({
    type: 'systemMessage',
    message: '🧪 Starting leaderboard tests...',
    color: '4CAF50'  // Green color
  });
  
  player.ui.sendData({
    type: 'showNotification',
    message: '🧪 Starting leaderboard tests...',
    duration: 3000
  });
  
  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{name: string, passed: boolean, error?: string}>
  };
  
  function recordTest(name: string, passed: boolean, error?: string) {
    results.tests.push({name, passed, error});
    if (passed) {
      results.passed++;
      console.log(`✅ PASS: ${name}`);
    } else {
      results.failed++;
      console.log(`❌ FAIL: ${name}${error ? ` - ${error}` : ''}`);
    }
  }
  
  // Get the leaderboard manager instance
  const leaderboardManager = LeaderboardManager.getInstance(world);
  
  try {
    // Test 1: Get global leaderboard
    try {
      const leaderboard = await leaderboardManager.getGlobalLeaderboard();
      recordTest('Get global leaderboard', true);
      console.log('  Current leaderboard:', leaderboard);
    } catch (error) {
      recordTest('Get global leaderboard', false, String(error));
    }
    
    // Test 2: Get player data
    try {
      const playerData = await leaderboardManager.getPlayerData(player);
      recordTest('Get player data', true);
      console.log('  Current player data:', playerData);
    } catch (error) {
      recordTest('Get player data', false, String(error));
    }
    
    // Test 3: Add test high score
    try {
      const testScore = 9999;
      await leaderboardManager.addAllTimeHighScore(player, testScore);
      
      // Verify it was added
      const leaderboard = await leaderboardManager.getGlobalLeaderboard();
      const found = leaderboard.allTimeHighScores.some(
        entry => entry.playerId === player.id && entry.score === testScore
      );
      
      recordTest('Add all-time high score', found);
      if (!found) {
        console.log('  Score not found in leaderboard after adding');
      }
    } catch (error) {
      recordTest('Add all-time high score', false, String(error));
    }
    
    // Test 4: Add test round score
    try {
      const testRoundScore = 8888;
      const testRoundNumber = 5;
      await leaderboardManager.addRoundHighScore(player, testRoundScore, testRoundNumber);
      
      // Verify it was added
      const leaderboard = await leaderboardManager.getGlobalLeaderboard();
      const found = leaderboard.roundHighScores.some(
        entry => entry.playerId === player.id && 
                entry.roundScore === testRoundScore && 
                entry.roundNumber === testRoundNumber
      );
      
      recordTest('Add round high score', found);
      if (!found) {
        console.log('  Round score not found in leaderboard after adding');
      }
    } catch (error) {
      recordTest('Add round high score', false, String(error));
    }
    
    // Test 5: Update player personal best
    try {
      const testTotalScore = 12345;
      const testRoundScore = 5000;
      const testCombo = 10;
      
      // Get current player data first
      const beforeData = await leaderboardManager.getPlayerData(player);
      console.log('  Before update:', beforeData.personalBest);
      
      await leaderboardManager.updatePlayerPersonalBest(
        player, 
        testTotalScore,
        testRoundScore,
        testCombo
      );
      
      // Verify it was updated
      const afterData = await leaderboardManager.getPlayerData(player);
      console.log('  After update:', afterData.personalBest);
      
      const scoreUpdated = afterData.personalBest.totalScore >= testTotalScore;
      const roundUpdated = afterData.personalBest.highestRoundScore >= testRoundScore;
      const comboUpdated = afterData.personalBest.highestCombo >= testCombo;
      
      recordTest('Update personal best', scoreUpdated && roundUpdated && comboUpdated);
      if (!scoreUpdated || !roundUpdated || !comboUpdated) {
        console.log('  Personal best not properly updated');
      }
    } catch (error) {
      recordTest('Update personal best', false, String(error));
    }
    
    // Test 6: Increment games played
    try {
      // Get current player data first
      const beforeData = await leaderboardManager.getPlayerData(player);
      const beforeCount = beforeData.gamesPlayed;
      console.log('  Games played before:', beforeCount);
      
      await leaderboardManager.incrementGamesPlayed(player);
      
      // Verify it was incremented
      const afterData = await leaderboardManager.getPlayerData(player);
      const afterCount = afterData.gamesPlayed;
      console.log('  Games played after:', afterCount);
      
      recordTest('Increment games played', afterCount === beforeCount + 1);
    } catch (error) {
      recordTest('Increment games played', false, String(error));
    }
    
    // Test 7: Increment wins
    try {
      // Get current player data first
      const beforeData = await leaderboardManager.getPlayerData(player);
      const beforeWins = beforeData.totalWins;
      console.log('  Wins before:', beforeWins);
      
      await leaderboardManager.incrementWins(player);
      
      // Verify it was incremented
      const afterData = await leaderboardManager.getPlayerData(player);
      const afterWins = afterData.totalWins;
      console.log('  Wins after:', afterWins);
      
      recordTest('Increment wins', afterWins === beforeWins + 1);
    } catch (error) {
      recordTest('Increment wins', false, String(error));
    }
    
    // Test 8: Set leaderboard visibility
    try {
      // Get current player data first
      // This test is now skipped since the showLeaderboard property has been removed
      console.log('  Leaderboard visibility test skipped - feature removed');
      
      recordTest('Set leaderboard visibility', true, 'Feature removed in Phase 1.4');
    } catch (error) {
      recordTest('Set leaderboard visibility', false, String(error));
    }
    
    // Test 9: Test score normalization via game results update
    try {
      const mockStandings = [
        { playerId: player.id, totalScore: 1000 }
      ];
      
      // Test solo normalization
      await leaderboardManager.updateWithGameResults(mockStandings, 'solo');
      const leaderboard1 = await leaderboardManager.getGlobalLeaderboard();
      
      // Test multiplayer normalization
      await leaderboardManager.updateWithGameResults(mockStandings, 'multiplayer');
      const leaderboard2 = await leaderboardManager.getGlobalLeaderboard();
      
      // Check if scores were normalized differently
      const soloEntry = leaderboard1.allTimeHighScores.find(
        entry => entry.playerId === player.id && entry.score === 800 // 1000 * 0.8
      );
      
      const multiEntry = leaderboard2.allTimeHighScores.find(
        entry => entry.playerId === player.id && entry.score === 1000 // no normalization
      );
      
      recordTest('Score normalization', Boolean(soloEntry && multiEntry));
      console.log('  Solo normalized score:', soloEntry?.score);
      console.log('  Multiplayer score:', multiEntry?.score);
    } catch (error) {
      recordTest('Score normalization', false, String(error));
    }
  } catch (error) {
    console.error('❌ TESTS FAILED WITH ERROR:', error);
  } finally {
    // Print final results
    console.log('\n🧪 LEADERBOARD TESTS SUMMARY:');
    console.log(`Tests passed: ${results.passed}/${results.passed + results.failed}`);
    
    if (results.failed > 0) {
      console.log('\nFailed tests:');
      results.tests
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.name}${test.error ? `: ${test.error}` : ''}`));
    }
    
    // Send UI message to player
    player.ui.sendData({
      type: 'systemMessage',
      message: `Leaderboard tests complete: ${results.passed}/${results.passed + results.failed} passed`,
      color: results.failed === 0 ? '4CAF50' : 'F44336'
    });
  }
}

// Function to add this test to the game's main menu
export function addLeaderboardTestToMainMenu(world: World): void {
  // Listen for the UI message from the keyboard shortcut
  world.on(PlayerUIEvent.DATA, ({ playerUI, data }) => {
    if (data && data.type === 'runLeaderboardTests') {
      console.log('Received runLeaderboardTests event');
      const player = world.entityManager.getAllPlayerEntities()
        .find(entity => entity.player.id === playerUI.player.id)?.player;
        
      if (player) {
        console.log('Found player, running tests');
        testLeaderboardFunctionality(world, player);
      }
    }
  });
  
  // When a player joins, send them instructions
  world.on('PlayerEvent.JOINED_WORLD', ({ player }) => {
    // Wait for UI to initialize
    setTimeout(() => {
      // Send a system message about the test shortcut
      player.ui.sendData({
        type: 'systemMessage',
        message: '🧪 Press B key to run leaderboard tests',
        color: '4CAF50'  // Green color
      });
      
      // Force-show the message in case systemMessage isn't working
      player.ui.sendData({
        type: 'showNotification',
        message: '🧪 Press B key to run leaderboard tests',
        duration: 10000  // 10 seconds
      });
    }, 3000);
  });
  
  // Add keyboard handler for all players
  world.on('BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT', ({ entity, input }) => {
    if (entity && input && input.b) {
      // T key was pressed - run tests
      const player = (entity as any).player;
      if (player) {
        // Reset the key press to prevent repeat runs
        input.b = false;
        
        // Run the tests
        testLeaderboardFunctionality(world, player);
      }
    }
  });
} 