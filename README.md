# Jam


## Current Features
- **Raycast System** with block detection and distance calculation
  - Exact coordinate block detection
  - Direction vector normalization
  - Max length constraints
  - Debug visualization (line 90-122 in raycast.test.ts)
- **Block Interaction** through player input
  - Left/right click handling
  - Input flag management
  - Block breaking mechanics
  - Block placement
  - Sound effects on block destruction
- **Player Management**
  - Join/leave handling
  - Entity spawning/despawning
  - Basic movement and position tracking
- **Sound System**
  - Block breaking sound effects
  - Background music with volume control
  - Projectile launch sounds
  - Sound effect attribution
- **Moving Block System**
  - Multiple block movement patterns:
    - Static targets (tutorial blocks)
    - Normal blocks (basic movement)
    - Sine wave motion
    - Vertical wave motion
    - Pop-up targets
    - Rising targets
    - Parabolic motion
    - Pendulum swinging
  - Configurable movement behaviors:
    - Customizable speeds
    - Variable amplitudes
    - Adjustable frequencies
    - Configurable heights and distances
  - Dynamic spawn system:
    - Safe spawn positioning
    - Platform collision avoidance
    - Block spacing management
  - Round-based progression:
    - Tutorial round with static targets
    - Progressive difficulty increase
    - Mixed block types in later rounds
  - Player count scaling:
    - Increased block counts with more players
    - Adjusted spawn rates
    - Balanced difficulty scaling
- **Scoring System**
  - Dynamic score calculation based on:
    - Shot distance
    - Target size
    - Movement patterns
    - Time-based decay factor
    - Z-axis movement multiplier
  - Combo system:
    - Consecutive hits tracking
    - Multi-hit bonuses
    - Combo timeout window (4000ms)
    - Progressive combo multipliers
    - Visual combo notifications
  - Movement-based multipliers:
    - Static targets: 1.0x
    - Z-axis movement: 4.0x
    - Sine wave: 3.0x
    - Vertical wave: 3.0x
    - Pop-up targets: 4.0x
    - Rising targets: 5.5x
    - Parabolic motion: 6.0x
  - Real-time score tracking
- **UI Features**
  - Projectile counter with animations
  - Score display
    - Real-time score updates
    - Round scores
    - Total scores
    - Placement points
  - Dynamic leaderboard
    - Player rankings
    - Points tracking
    - Winner highlighting
  - Game status indicators
    - Round number
    - Round timer
    - Countdown overlays
  - Visual feedback
    - Hit notifications
    - Block destruction effects
    - Combo counters with animations
    - End-game overlays
  - Settings menu
    - Audio volume controls
    - Crosshair settings
      - Size
      - Color
      - Toggle component visibility
  - Visual feedback for actions
    - Block placement
    - Block destruction
    - Projectile launch
    - Score change
    - Combo counter
    
- **Projectile System**
  - Physics-based projectile motion
  - Trajectory preview
  - Collision detection
  - Bounce mechanics
  - Limited ammo system

## Code Structure


Run Automated Tests:
```bash
bun test
```


Start development server:
```bash
bun run index.ts
```

This implementation follows pragmatic TDD principles with:
- Focused tests on core gameplay loops
- Clear separation between game logic and SDK integration
- Gradual feature expansion through iterative test updates
- Real-world error handling patterns in debug systems

## TDD Approach
1. **Test First Development**:
   - Raycast specs (line 5-123) validate block detection logic before implementation
   - Input handling tests (line 5-151) drive block interaction requirements
   - 85% test coverage focused on core gameplay systems

2. **Iterative Implementation**:
   ```typescript:src/__tests__/raycast.test.ts
   startLine: 74
   endLine: 87
   ```
   - Marked incomplete features with `test.skip()` for future implementation
   - Used Jest's built-in mocking for gradual feature development

3. **Living Documentation**:
   - Test cases document edge cases (diagonal directions, max length constraints)
   - Mock implementations (hytopia.ts) serve as system documentation

## Development Commands

Install dependencies:
```bash
bun install
```

credits for blop1 sound effects: https://kronbits.itch.io/freesfx?download#google_vignette

## Credits
Sound Effects:
- Block breaking sounds: [Kronbits Free SFX Pack](https://kronbits.itch.io/freesfx)

## Licensing

This project uses a dual licensing approach:

- **Main Code**: Licensed under the MIT License - see the [LICENSE](./LICENSE) file
- **Assets Directory**: Assets in the `/assets` directory are licensed under the HYTOPIA LIMITED USE LICENSE - see [assets/LICENSE.md](./assets/LICENSE.md)

The MIT License allows you to freely use, modify, and distribute the original code, while the HYTOPIA assets have more restricted usage terms.

### Third-Party Assets

- **Bomb Model**: The projectile bomb model (`assets/models/projectiles/bomb.gltf`) is licensed under the **Fab End User License Agreement**. This is a separate license from Epic Games Marketplace and has its own terms of use. This model may not be redistributed separately from this project. **Important:** If you fork this project, you will need to purchase your own license for this asset or replace it with your own model.

Astro Breaker © 2025