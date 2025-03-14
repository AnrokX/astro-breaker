// Simple manual test script for round transitions
// This isn't a proper test but allows us to manually verify the changes

console.log('=== ROUND TRANSITION TEST ===');

// Mock the core classes and functions
class World {
  constructor() {
    this.entityManager = {
      getAllPlayerEntities: () => [
        { player: { id: 'player1', ui: { sendData: (data) => console.log('UI update for player1:', JSON.stringify(data).substring(0, 100) + '...') } } },
        { player: { id: 'player2', ui: { sendData: (data) => console.log('UI update for player2:', JSON.stringify(data).substring(0, 100) + '...') } } }
      ],
      getAllEntities: () => []
    };
  }
}

class MockBlockManager {
  getBlockCount() {
    return 0;
  }
  createStaticTarget() {}
  createZAxisBlock() {}
  createSineWaveBlock() {}
  createVerticalWaveBlock() {}
}

class ScoreManager {
  startNewRound() {}
  handleRoundEnd() {
    return { winnerId: 'player1', placements: [{ playerId: 'player1', points: 100 }] };
  }
  broadcastScores() {}
}

// Import the actual RoundManager - note: this would fail in a real environment
// with TypeScript/ES modules, but this is just a demonstration
console.log('Note: This is a simplified test that mocks the RoundManager');

// Create a mock RoundManager for testing instead
class RoundManager {
  constructor(world, blockManager, scoreManager, transitionDuration = 2000) {
    this.world = world;
    this.blockManager = blockManager;
    this.scoreManager = scoreManager;
    this.TRANSITION_DURATION = transitionDuration || 1000;
    this.currentRound = 0;
    this.isRoundActive = false;
    this.roundTransitionPending = false;
    this.roundTimer = null;
  }

  getRoundConfig() {
    return {
      duration: 1000,
      minBlockCount: 1,
      maxBlockCount: 2,
      blockSpawnInterval: 500,
      speedMultiplier: 0.5,
      blockTypes: {
        normal: 0,
        sineWave: 0,
        static: 1.0,
        verticalWave: 0,
        popup: 0,
        rising: 0,
        parabolic: 0,
        pendulum: 0
      }
    };
  }

  startRound() {
    console.log('startRound called');
    if (this.roundTransitionPending) {
      console.log('Round transition pending, not starting new round');
      return;
    }

    console.log('Starting countdown...');
    setTimeout(() => {
      this.actuallyStartRound();
    }, 100); // Simplified countdown
  }

  actuallyStartRound() {
    console.log('actuallyStartRound called');
    if (this.isRoundActive) {
      console.log('Attempted to start round while another is active');
      return;
    }

    this.currentRound++;
    this.isRoundActive = true;
    
    console.log(`Starting round ${this.currentRound}`);
    
    // Set round timer
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    
    this.roundTimer = setTimeout(() => {
      console.log('Round timer completed');
      this.endRound();
    }, this.getRoundConfig().duration);
  }

  endRound() {
    console.log(`Ending round: ${this.currentRound}`);
    
    if (!this.isRoundActive) return;

    // Clear timers
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    this.isRoundActive = false;

    console.log('Round ended, starting transition');
    
    // Prevent multiple transitions
    if (this.roundTransitionPending) {
      console.log('Round transition already pending, skipping');
      return;
    }

    // Set transition flag
    this.roundTransitionPending = true;
    
    // Schedule next round after transition
    this.roundTimer = setTimeout(() => {
      console.log('Round transition complete');
      this.roundTransitionPending = false;
      this.startRound();
    }, this.TRANSITION_DURATION);
  }

  isActive() {
    return this.isRoundActive;
  }

  getCurrentRound() {
    return this.currentRound;
  }

  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }
}

// Test function
async function testRoundTransitions() {
  // Create instances with short durations for testing
  const world = new World();
  const blockManager = new MockBlockManager();
  const scoreManager = new ScoreManager();
  const roundManager = new RoundManager(world, blockManager, scoreManager, 500); // 500ms transition

  console.log('Starting first round...');
  roundManager.startRound();
  
  // Wait for first round to complete
  await new Promise(resolve => setTimeout(resolve, 1500));
  console.log('First round should have ended, checking transition...');
  
  // Should be in transition now
  console.log('In transition: ', roundManager.roundTransitionPending);
  console.log('Round active: ', roundManager.isActive());
  console.log('Current round: ', roundManager.getCurrentRound());
  
  // Try to start another round during transition (should be blocked)
  console.log('Attempting to start another round during transition...');
  roundManager.startRound();
  
  // Wait for transition and start of next round
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Second round should have started...');
  console.log('In transition: ', roundManager.roundTransitionPending);
  console.log('Round active: ', roundManager.isActive());
  console.log('Current round: ', roundManager.getCurrentRound());
  
  // End the second round and try rapid multiple endRound calls
  console.log('Testing multiple endRound calls...');
  roundManager.endRound();
  console.log('Calling endRound again immediately (should be ignored)');
  roundManager.endRound();
  
  // Cleanup
  roundManager.cleanup();
  console.log('Test complete');
}

// Run the test
testRoundTransitions().catch(console.error); 