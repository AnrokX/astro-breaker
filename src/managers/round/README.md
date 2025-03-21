# Round Management System

This directory contains a modular implementation of the round management system for Astro Breaker.

## Architecture Overview

The round management system follows a component-based architecture with clear separation of concerns:

```
src/managers/round/
├── components/       # Core components with specific responsibilities
├── configs/          # Game and round configuration
├── events/           # Event definitions
├── interfaces/       # Type definitions
└── index.ts          # Main RoundManager implementation
```

## Components

### RoundManager (index.ts)
- The central coordinator that manages the game's round lifecycle
- Delegates specific responsibilities to specialized components
- Provides a clean API for the rest of the game to interact with

### RoundTransition
- Manages transitions between rounds
- Handles timing and callbacks for round transitions
- Provides methods to start, cancel, and track transitions

### PlayerTracker
- Tracks players joining and leaving the game
- Manages waiting for minimum player requirements
- Provides methods to check if enough players are present

### RoundSpawner
- Handles block spawning based on round configuration
- Manages spawn timers and block creation
- Optimizes spawn locations and distributions

### RoundUI
- Manages all UI communication related to the round system
- Formats and dispatches UI messages to players
- Handles game state visualization

## Configuration

- `game-configs.ts`: Contains overall game configuration like max rounds
- `round-configs.ts`: Contains round-specific configurations for block types, spawn rates, etc.

## Usage

```typescript
// Create component instances
const transition = new RoundTransition(3000); // 3s transitions
const spawner = new RoundSpawner(world, blockManager);
const playerTracker = new PlayerTracker(world);
const ui = new RoundUI(world, scoreManager);

// Create the round manager
const roundManager = new RoundManager(
  world,
  transition,
  spawner,
  playerTracker,
  ui,
  scoreManager,
  { maxRounds: 8, requiredPlayers: 2 }
);

// Start a round
roundManager.startRound();

// End the current round
roundManager.endRound();

// Check if shooting is allowed
if (roundManager.isShootingAllowed()) {
  // Allow player to shoot
}
```

## Backward Compatibility

For backward compatibility, there is a facade in `src/managers/round-manager.ts` that preserves the original API while using this modular implementation internally.