import {
  startServer,
  Audio,
  PlayerEntity,
  PlayerCameraMode,
  PlayerUI,
  Vector3Like,
  PlayerEvent,
  BaseEntityControllerEvent,
  PlayerUIEvent,
  Player
} from 'hytopia';

import worldMap from './assets/map.json';
import { PlayerProjectileManager } from './src/managers/player-projectile-manager';
import { MovingBlockManager, MOVING_BLOCK_CONFIG } from './src/moving_blocks/moving-block-entity';
import { ScoreManager } from './src/managers/score-manager';
import { RoundManager } from './src/managers/round-manager';
import { BlockParticleEffects } from './src/effects/block-particle-effects';
import { TestBlockSpawner } from './src/utils/test-spawner';
import { SceneUIManager } from './src/scene-ui/scene-ui-manager';
import { AudioManager } from './src/managers/audio-manager';
import { PlayerSettingsManager, UISettingsData, PlayerSettings } from './src/managers/player-settings-manager';
import { LeaderboardManager } from './src/managers/leaderboard-manager';
// Import test utilities
import { addLeaderboardTestToMainMenu } from './src/__tests__/run-leaderboard-tests';

// Track which players have already seen welcome messages
const hasDisplayedWelcome = new Set<string>();

// Platform spawn configuration
const PLATFORM_SPAWNS = {
  LEFT: {
    BASE: { x: -43, y: 5, z: 1 },
    VARIATIONS: [
      { x: -43, y: 5, z: -1 },  // Back
      { x: -43, y: 5, z: 3 },   // Front
      { x: -41, y: 5, z: 1 },   // Closer to center
      { x: -45, y: 5, z: 1 },   // Further from center
    ]
  },
  RIGHT: {
    BASE: { x: 44, y: 5, z: 1 },
    VARIATIONS: [
      { x: 44, y: 5, z: -1 },   // Back
      { x: 44, y: 5, z: 3 },    // Front
      { x: 42, y: 5, z: 1 },    // Closer to center
      { x: 46, y: 5, z: 1 },    // Further from center
    ]
  }
};

// Game configuration
const GAME_CONFIG = {
  FALL_THRESHOLD: -50,  // Y position below which a player is considered fallen
  RESPAWN_HEIGHT_OFFSET: 1,  // How high above the spawn point to respawn
};

// Configuration flags
const IS_TEST_MODE = false;  // Set this to true to enable test mode, false for normal game
const DEBUG_ENABLED = false;  // Development debug flag

// Keep track of last used spawn points
let lastLeftSpawnIndex = -1;
let lastRightSpawnIndex = -1;

// Keep track of player spawn positions
const playerSpawnPositions = new Map<string, Vector3Like>();

// Helper function to get next spawn position
function getNextSpawnPosition(platform: 'LEFT' | 'RIGHT'): Vector3Like {
  const spawnConfig = PLATFORM_SPAWNS[platform];
  const variations = spawnConfig.VARIATIONS;
  
  // Get next index, avoiding the last used one
  let index;
  if (platform === 'LEFT') {
    lastLeftSpawnIndex = (lastLeftSpawnIndex + 1) % variations.length;
    index = lastLeftSpawnIndex;
  } else {
    lastRightSpawnIndex = (lastRightSpawnIndex + 1) % variations.length;
    index = lastRightSpawnIndex;
  }
  
  return variations[index];
}

startServer(world => {
  console.log('Starting server and initializing debug settings...');
  console.log(`Test mode: ${IS_TEST_MODE ? 'enabled' : 'disabled'}`);
  
  // Initialize managers
  const sceneUIManager = SceneUIManager.getInstance(world);
  const settingsManager = PlayerSettingsManager.getInstance(world);
  
  // Enable debug rendering for development
  world.simulation.enableDebugRendering(DEBUG_ENABLED);
  
  // Initialize the score manager
  const scoreManager = new ScoreManager();
  scoreManager.spawn(world, { x: 0, y: 0, z: 0 }); // Make it available as an entity

  // Initialize the moving block manager
  const movingBlockManager = new MovingBlockManager(world, scoreManager);
  
  // Initialize test spawner if in test mode
  const testSpawner = IS_TEST_MODE ? new TestBlockSpawner(world, movingBlockManager) : null;
  
  // Initialize the round manager (only used in normal mode)
  // Default to multiplayer mode, will be updated based on player settings
  let roundManager = !IS_TEST_MODE ? new RoundManager(
    world, 
    movingBlockManager, 
    scoreManager, 
    { gameMode: 'multiplayer' }
  ) : null;

  // Development flag for trajectory preview - set to false to disable
  const SHOW_TRAJECTORY_PREVIEW = false;

  // Initialize the projectile manager with round manager if not in test mode
  const projectileManager = new PlayerProjectileManager(
    world,
    SHOW_TRAJECTORY_PREVIEW,
    roundManager ?? undefined
  );

  // Register test mode commands if in test mode
  if (IS_TEST_MODE && testSpawner) {
    // Register commands without the '/' prefix
    world.chatManager.registerCommand('spawn1', (player) => {
      testSpawner.spawnStaticTarget();
      world.chatManager.sendPlayerMessage(player, 'Spawned a static target', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn2', (player) => {
      testSpawner.spawnSineWaveBlock();
      world.chatManager.sendPlayerMessage(player, 'Spawned a sine wave block', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn3', (player) => {
      testSpawner.spawnVerticalWaveBlock();
      world.chatManager.sendPlayerMessage(player, 'Spawned a vertical wave block', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn4', (player) => {
      testSpawner.spawnRegularBlock();
      world.chatManager.sendPlayerMessage(player, 'Spawned a regular block', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn5', (player) => {
      testSpawner.spawnPopUpTarget();
      world.chatManager.sendPlayerMessage(player, 'Spawned a pop-up target', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn6', (player) => {
      testSpawner.spawnRisingTarget();
      world.chatManager.sendPlayerMessage(player, 'Spawned a rising target (stops at pop-up height, then shoots up)', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn7', (player) => {
      testSpawner.spawnParabolicTarget();
      world.chatManager.sendPlayerMessage(player, 'Spawned a parabolic target (moves in a long, dramatic arc with physics-based motion)', 'FFFF00');
    });

    world.chatManager.registerCommand('spawn8', (player) => {
      testSpawner.spawnPendulumTarget();
      world.chatManager.sendPlayerMessage(player, 'Spawned a pendulum target (swings like a pendulum in either XZ or YZ plane)', 'FFFF00');
    });

    world.chatManager.registerCommand('spawnall', (player) => {
      testSpawner.spawnTestBlocks();
      world.chatManager.sendPlayerMessage(player, 'Spawned all block types', 'FFFF00');
    });

    world.chatManager.registerCommand('clearblocks', (player) => {
      world.entityManager.getAllEntities()
        .filter(entity => entity.name.toLowerCase().includes('block'))
        .forEach(entity => entity.despawn());
      world.chatManager.sendPlayerMessage(player, 'Cleared all blocks', 'FFFF00');
    });

    world.chatManager.registerCommand('testround', (player) => {
      testSpawner.startTestRound();
      world.chatManager.sendPlayerMessage(player, 'Test Round Started!', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'Duration: 60 seconds', 'FFFF00');
      
      // End round notification
      setTimeout(() => {
        world.chatManager.sendPlayerMessage(player, 'Test Round Ended!', 'FFFF00');
      }, 60000);
    });

    world.chatManager.registerCommand('testhelp', (player) => {
      console.log('Executing testhelp command');
      world.chatManager.sendPlayerMessage(player, 'Test Mode Commands:', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn1 - Spawn static target', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn2 - Spawn sine wave block', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn3 - Spawn vertical wave block', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn4 - Spawn regular block', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn5 - Spawn pop-up target', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn6 - Spawn rising target (stops at pop-up height, then shoots up)', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn7 - Spawn parabolic target (long-range arc with physics-based motion)', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawn8 - Spawn pendulum target (swings like a pendulum in either XZ or YZ plane)', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'spawnall - Spawn all block types', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'clearblocks - Remove all blocks', 'FFFF00');
      world.chatManager.sendPlayerMessage(player, 'testround - Start a 60-second test round with mixed blocks', 'FFFF00');
    });
  }

  world.loadMap(worldMap);

  // Initialize AudioManager and start background music
  const audioManager = AudioManager.getInstance(world);
  
  /**
   * Check if a player has fallen and needs to be respawned
   */
  function checkPlayerFall(entity: PlayerEntity) {
    if (entity.position.y < GAME_CONFIG.FALL_THRESHOLD) {
      const spawnPos = playerSpawnPositions.get(entity.player.id);
      if (spawnPos) {
        // Add a small height offset to prevent immediate falling
        const respawnPos = {
          x: spawnPos.x,
          y: spawnPos.y + GAME_CONFIG.RESPAWN_HEIGHT_OFFSET,
          z: spawnPos.z
        };
        entity.setPosition(respawnPos);
        console.log(`Player ${entity.player.id} fell and respawned at their initial position`);
      }
    }
  }

  // Set up fall detection interval
  setInterval(() => {
    world.entityManager.getAllPlayerEntities().forEach(entity => {
      checkPlayerFall(entity);
    });
  }, 100); // Check every 100ms

  // Replace direct assignment with proper event listener for player join
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    console.log('New player joined the game');
    
    // Initialize player states
    scoreManager.initializePlayer(player.id);
    projectileManager.initializePlayer(player.id);
    
    // Initialize player settings with persistence (async)
    settingsManager.initializePlayer(player.id, player)
      .then(() => {
        // Send the loaded settings to the UI
        settingsManager.sendSettingsToUI(player);
        
        // Apply initial BGM volume setting
        const settings = settingsManager.getPlayerSettings(player.id);
        if (settings) {
          audioManager.setBgmVolume(settings.bgmVolume);
        }
      })
      .catch(error => console.error("Error initializing player settings:", error));
    
    // Initialize player in LeaderboardManager
    const leaderboardManager = LeaderboardManager.getInstance(world);
    leaderboardManager.getPlayerData(player)
      .then(playerData => {
        // Update games played count (this happens asynchronously)
        playerData.gamesPlayed++;
        return leaderboardManager.updatePlayerData(player, playerData);
      })
      .catch(error => console.error("Error updating player leaderboard data:", error));
    
    // Load the UI first
    player.ui.load('ui/index.html');
    
    // Generate spawn position based on player count
    const playerCount = world.entityManager.getAllPlayerEntities().length;
    const isEvenPlayer = playerCount % 2 === 0;
    const spawnPos = isEvenPlayer ? 
      getNextSpawnPosition('LEFT') :
      getNextSpawnPosition('RIGHT');

    // Store the spawn position for this player
    playerSpawnPositions.set(player.id, spawnPos);

    const playerEntity = new PlayerEntity({
      player,
      name: 'Player',
      modelUri: 'models/players/player.gltf',
      modelLoopedAnimations: ['idle'],
      modelScale: 0.5,
    });

    // Spawn the entity at the position
    playerEntity.spawn(world, spawnPos);
    console.log(`Player spawned at (${spawnPos.x.toFixed(2)}, ${spawnPos.y}, ${spawnPos.z.toFixed(2)})`);

    // Register UI event handlers directly on the player's UI
    player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
      console.log(`[Player ${player.id}] UI event received:`, data);
      
      // Special handling for mode selection - with safety checks
      if (data.type === 'modeSelection' && roundManager) {
        console.log(`[Player ${player.id}] MODE SELECTION: ${data.mode}`);
        
        // Handle solo mode
        if (data.mode === 'solo') {
          // Check if there's more than one player
          const playerCount = world.entityManager.getAllPlayerEntities().length;
          if (playerCount > 1) {
            console.log(`Solo mode requested but ${playerCount} players present - ignoring request`);
            return;
          }
          
          // Ensure the player's pointer is locked
          player.ui.lockPointer(true);
          
          // Call the round manager to start solo mode
          roundManager!.handleModeSelection('solo');
          
          // Force the round to start immediately
          setTimeout(() => {
            roundManager!.actuallyStartRound();
            
            // Update projectile manager
            if (projectileManager) {
              (projectileManager as any).forceEnableShooting = true;
            }
          }, 300);
        }
      }
      
      // Handle leaderboard visibility events
      if (data.type === 'closeLeaderboard') {
        console.log(`Player ${player.id} closed leaderboard UI`);
        // We no longer use the settings manager for this temporary UI state
      }
      
      // Handle leaderboard toggle settings
      if (data.type === 'toggleLeaderboardSetting' && data.visible !== undefined) {
        console.log(`Player ${player.id} set leaderboard visibility to: ${data.visible}`);
        // No longer storing this in settings, handled by UI state
      }
      
      // Handle leaderboard display request
      if (data.type === 'showLeaderboard') {
        console.log(`Player ${player.id} requested leaderboard display`);
        displayLeaderboardToPlayer(player);
      }
    });
    
    // Function to display leaderboard data to a player
    async function displayLeaderboardToPlayer(player: Player) {
      try {
        const leaderboardManager = LeaderboardManager.getInstance(world);
        const leaderboardData = await leaderboardManager.getGlobalLeaderboard();
        const playerData = await leaderboardManager.getPlayerData(player);
        
        // Send global leaderboard data
        player.ui.sendData({
          type: 'displayLeaderboard',
          data: leaderboardData
        });
        
        // Send personal stats data
        player.ui.sendData({
          type: 'personalStats',
          data: playerData
        });
      } catch (error) {
        console.error("Error displaying leaderboard:", error);
      }
    }

    // Add key binding for leaderboard toggle using 'L' key
    playerEntity.controller!.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, ({ entity, input, deltaTimeMs }) => {
      // Check for 'L' key press
      if (input.l) {
        console.log('Player pressed L key - toggling leaderboard');
        // Toggle leaderboard display
        player.ui.sendData({
          type: 'toggleLeaderboard'
        });
        
        // Also automatically load the data when toggled
        displayLeaderboardToPlayer(player);
        
        // Consume the input to prevent repeated toggling
        input.l = false;
      }
    });
    
    // Projectile count no longer needed as projectiles are unlimited
    
    // Configure first-person camera after spawning
    player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    
    // Hide only the local player's model from their own view
    // This won't affect how other players see them
    player.camera.setModelHiddenNodes([
      'Armature',      // Main skeleton
      'Mesh',          // Main mesh
      'Body_mesh',     // Body mesh if separated
      'Character',     // Common root node name
      'Skeleton',      // Alternative skeleton name
      'Root'           // Root node
    ]);
    
    // Set camera to eye level and slightly forward
    player.camera.setOffset({
      x: 0,
      y: 1,  // Eye level height
      z: 0   // Slightly forward to avoid any model clipping
    });

    // Set a comfortable FOV for first-person gameplay (70 degrees is a common value)
    player.camera.setFov(70);
  
    // Wire up projectile system to the SDK's input system
    playerEntity.controller!.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, ({ entity, input, cameraOrientation, deltaTimeMs }) => {
      // Create a clean copy of the input state to avoid recursive references
      const cleanInput = {
        ml: input.ml || false,
        mr: input.mr || false,
      };

      // Raycast removed
      if (cleanInput.mr) {
        cleanInput.mr = false;
      }

      // Handle projectile input through the manager with left click
      if (cleanInput.ml) {
        cleanInput.mr = true;
        cleanInput.ml = false;
      }
      
      projectileManager.handleProjectileInput(
        player.id,
        entity.position,
        entity.player.camera.facingDirection,
        cleanInput,
        player
      );

      // Return the original orientation
      return cameraOrientation;
    });

    // Handle settings updates from UI
    player.ui.on(PlayerUIEvent.DATA, (payload) => {
      const data = payload.data;
      if (data && data.type === 'updateSettings') {
        // Update the setting with persistence
        settingsManager.updateSetting(player.id, data.setting, data.value, player);
        
        // Handle background music volume changes
        if (data.setting === 'bgmVolume') {
          const volume = data.value / 100; // Convert from percentage to decimal
          audioManager.setBgmVolume(volume);
        }
        
        // Handle game mode changes
        if (data.setting === 'gameMode' && !IS_TEST_MODE && roundManager) {
          const gameMode = data.value;
          // Reset the game with new game mode
          if (roundManager.isActive()) {
            // End the current round first if active
            roundManager.endRound();
          }
          
          // Create a new round manager with the selected game mode
          // We need to reset the round manager to apply the new game mode
          // First, end any active round
          if (roundManager && roundManager.isActive()) {
            console.log('Ending current round before mode switch');
            roundManager.endRound();
          }
          
          // Save player camera orientation before cleaning up
          const playerPositions = new Map();
          world.entityManager.getAllPlayerEntities().forEach(entity => {
            // Store player's position and orientation
            playerPositions.set(entity.player.id, {
              position: { ...entity.position },
              rotation: { ...entity.rotation },
              // We don't need to store camera orientation as it's maintained by Hytopia
            });
          });
          
          // Clean up existing blocks only (not player entities)
          world.entityManager.getAllEntities()
            .filter(entity => entity.name.toLowerCase().includes('block'))
            .forEach(entity => entity.despawn());
          
          if (gameMode === 'solo') {
            // Use solo mode configuration
            console.log('Switching to solo mode');
            
            // Create a completely new round manager
            if (roundManager) {
              // Clean up the old manager first
              roundManager.cleanup();
            }
            
            // Create a new instance with solo mode
            roundManager = new RoundManager(
              world, 
              movingBlockManager, 
              scoreManager,
              { gameMode: 'solo' }
            );
            
            // We also need to update the projectile manager's reference to the round manager
            // This is critical since the projectile manager uses this to check if shooting is allowed
            if (projectileManager) {
              // Use our special method to update the reference
              if ((projectileManager as any).updateRoundManager) {
                (projectileManager as any).updateRoundManager(roundManager);
              } else {
                // Fallback to direct property update
                (projectileManager as any).roundManager = roundManager;
              }
              console.log('Updated projectile manager with new round manager');
            }
            
            // Immediately start a new round in solo mode without showing UI messages
            // console.log('Starting new solo round');
            // Immediately start the round - no delays
            if (roundManager) {
              // Start the round
              roundManager.startRound();
              
              // In solo mode, we need to force the round to actually start
              // This ensures the shooting is enabled
              // Access the internal method to start the round immediately
              (roundManager as any).actuallyStartRound();
              
              // Force another update to the projectile manager
              if (projectileManager) {
                // Update the round manager reference
                if ((projectileManager as any).updateRoundManager) {
                  (projectileManager as any).updateRoundManager(roundManager);
                } else {
                  (projectileManager as any).roundManager = roundManager;
                }
                
                // Explicitly enable force shooting in solo mode
                (projectileManager as any).forceEnableShooting = true;
              }
            }
          } else {
            // Use multiplayer mode configuration
            console.log('Switching to multiplayer mode');
            
            // Create a completely new round manager
            if (roundManager) {
              // Clean up the old manager first
              roundManager.cleanup();
            }
            
            // Create a new instance with multiplayer mode
            roundManager = new RoundManager(
              world, 
              movingBlockManager, 
              scoreManager,
              { gameMode: 'multiplayer' }
            );
            
            // We also need to update the projectile manager's reference to the round manager
            if (projectileManager) {
              // Use our special method to update the reference
              if ((projectileManager as any).updateRoundManager) {
                (projectileManager as any).updateRoundManager(roundManager);
              } else {
                // Fallback to direct property update
                (projectileManager as any).roundManager = roundManager;
              }
              console.log('Updated projectile manager with new round manager');
            }
            
            // Display information about multiplayer mode (without UI messages)
            console.log('Multiplayer Mode activated - waiting for more players');
            
            // Start a new round (it will wait for players in multiplayer mode)
            console.log('Starting new multiplayer round');
            setTimeout(() => {
              if (roundManager) {
                roundManager.startRound();
              }
            }, 1000);
          }
        }
      }
      // Handle resetSettings request
      else if (data && data.type === 'resetSettings') {
        console.log(`Player ${player.id} requested settings reset`);
        
        // Define default settings
        const defaultSettings: PlayerSettings = {
          crosshairColor: '#ffff00',
          bgmVolume: 0.1,
          gameMode: 'multiplayer'
        };
        
        // Update each setting with persistence
        for (const key in defaultSettings) {
          const settingKey = key as keyof PlayerSettings;
          const value = defaultSettings[settingKey];
          
          // Convert volume for UI (0-100 scale)
          const uiValue = settingKey === 'bgmVolume' ? (value as number) * 100 : value;
          
          settingsManager.updateSetting(player.id, settingKey, uiValue, player);
        }
        
        // Apply default volume
        audioManager.setBgmVolume(defaultSettings.bgmVolume);
        
        // Send updated settings to UI
        settingsManager.sendSettingsToUI(player);
      }
      // Handle leaderboard visibility events
      else if (data && data.type === 'closeLeaderboard') {
        console.log(`Player ${player.id} closed leaderboard UI`);
        // We no longer use the settings manager for this temporary UI state
      }
      
      // Handle leaderboard toggle settings
      if (data && data.type === 'toggleLeaderboardSetting' && data.visible !== undefined) {
        console.log(`Player ${player.id} set leaderboard visibility to: ${data.visible}`);
        // No longer storing this in settings, handled by UI state
      }
      
      // Handle leaderboard display request
      if (data && data.type === 'showLeaderboard') {
        console.log(`Player ${player.id} requested leaderboard display`);
        displayLeaderboardToPlayer(player);
      }
    });

    // Start the round or spawn test blocks based on mode
    if (IS_TEST_MODE && testSpawner) {
      testSpawner.spawnTestBlocks();
      console.log('Test blocks spawned');
    } else if (roundManager && !roundManager.isActive()) {
      roundManager.startRound();
    }

    // Send appropriate welcome messages
    // Only show welcome messages when player first joins, not when switching to solo mode
    if (!hasDisplayedWelcome.has(player.id)) {
      world.chatManager.sendPlayerMessage(player, 'Welcome to the game!', '00FF00');
      world.chatManager.sendPlayerMessage(player, 'Use WASD to move around.');
      world.chatManager.sendPlayerMessage(player, 'Press space to jump.');
      world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.');
      world.chatManager.sendPlayerMessage(player, 'Left click to throw projectiles.');
      world.chatManager.sendPlayerMessage(player, 'Press T to chat. Use Ctrl+L for leaderboard, Ctrl+H for help.', '00FF00');
      world.chatManager.sendPlayerMessage(player, 'Press Ctrl+ESC, Ctrl+Tab, or Ctrl+P to open settings.', '00FF00');
      
      if (IS_TEST_MODE) {
        world.chatManager.sendPlayerMessage(player, 'TEST MODE: One of each block type has been spawned', 'FFFF00');
      } else {
        world.chatManager.sendPlayerMessage(player, `Round ${roundManager!.getCurrentRound()} - Hit as many blocks as you can before time runs out!`, 'FFFF00');
      }
      
      world.chatManager.sendPlayerMessage(player, 'Press \\ to enter or exit debug view.');

      // Send help message for test mode
      if (IS_TEST_MODE) {
        world.chatManager.sendPlayerMessage(player, 'Type /testhelp to see available test commands', 'FFFF00');
      }
      
      // Mark that we've shown welcome messages for this player
      hasDisplayedWelcome.add(player.id);
    }

    // Create in-world leaderboard markers at strategic locations
    try {
      const leaderboardManager = LeaderboardManager.getInstance(world);
      leaderboardManager.getGlobalLeaderboard().then(leaderboardData => {
        if (leaderboardData.allTimeHighScores.length > 0) {
          // Leaderboard marker functionality removed
          console.log('In-world leaderboard marker functionality has been removed');
        }
      }).catch(error => {
        console.error("Error creating leaderboard marker:", error);
      });
    } catch (error) {
      console.error("Error setting up leaderboard:", error);
    }
  });

  /**
   * Handles the event when a player leaves the game.
   */
  // Replace direct assignment with proper event listener for player leave
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    console.log('Player left the game');
    
    // Clean up player states
    scoreManager.removePlayer(player.id);
    projectileManager.removePlayer(player.id);
    settingsManager.removePlayer(player.id);
    
    // Handle round system when player leaves (only in normal mode)
    if (!IS_TEST_MODE && roundManager) {
      roundManager.handlePlayerLeave();
    }
    
    // Clean up stored spawn position
    playerSpawnPositions.delete(player.id);
    
    // Remove from welcome messages tracking
    hasDisplayedWelcome.delete(player.id);
    
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
  });

  // Cleanup managers when the scene changes or the game shuts down
  BlockParticleEffects.getInstance(world).cleanup();
  sceneUIManager.cleanup();
  audioManager.cleanup();
  settingsManager.cleanup();

  // Setup leaderboard testing when not in production mode
  if (process.env.NODE_ENV !== 'production') {
    addLeaderboardTestToMainMenu(world);
    console.log('🧪 Leaderboard testing tools enabled - Press the "Test Leaderboard" button in-game');
  }
});
