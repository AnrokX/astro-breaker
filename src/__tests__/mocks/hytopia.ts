// Mock Hytopia classes for testing
export class World {
  // Basic properties required by the interface
  id = 'test-world';
  ambientLightColor = { r: 1, g: 1, b: 1 };
  ambientLightIntensity = 1;
  directionalLightColor = { r: 1, g: 1, b: 1 };
  directionalLightIntensity = 1;
  directionalLightDirection = { x: 0, y: -1, z: 0 };
  directionalLightPosition = { x: 0, y: 10, z: 0 };
  skyboxUri = 'skybox/default';
  isDebugEnabled = false;
  name = 'TestWorld';
  
  // Additional required properties to match interface
  fogColor = { r: 1, g: 1, b: 1 };
  fogDensity = 0.01;
  fogEnable = false;
  fogEndDistance = 1000;
  fogStartDistance = 0;
  gravity = { x: 0, y: -9.8, z: 0 };
  blockRegistry = { getBlockById: jest.fn() };
  blockTypeRegistry = { getBlockTypeById: jest.fn() };
  physicsEnabled = false;
  prefabRegistry = { registerPrefab: jest.fn() };
  projectSettings = { settings: { gameId: 'test-game' }};
  voxelMeshRegistry = { getMeshForBlock: jest.fn() };
  audioManager = { play: jest.fn() };
  
  // Additional properties needed by recent tests
  chunkLattice = { getChunkAt: jest.fn() };
  lightManager = { addLight: jest.fn() };
  loop = { on: jest.fn() };
  sceneUIManager = { registerElement: jest.fn() };
  worldSize = { x: 1000, y: 1000, z: 1000 };
  worldGeneration = { enabled: false };
  voxelMeshes = { debug: false };
  networkManager = { sendNetworkMessage: jest.fn() };
  particleManager = { createParticleSystem: jest.fn() };
  instanceManager = { createInstancedMesh: jest.fn() };
  inputManager = { registerKeybinding: jest.fn() };
  ragdollManager = { createRagdoll: jest.fn() };
  collisionManager = { registerCollisionHandler: jest.fn() };
  uiManager = { registerElement: jest.fn() };
  weatherManager = { setWeather: jest.fn() };
  timeManager = { setTime: jest.fn() };
  navMeshManager = { buildNavMesh: jest.fn() };
  soundManager = { playSound: jest.fn() };

  // Methods required by the interface
  enablePhysics = jest.fn();
  setGravity = jest.fn();
  
  // Managers
  entityManager = {
    getAllEntities: jest.fn().mockReturnValue([]),
    getAllPlayerEntities: jest.fn().mockReturnValue([]),
    getPlayerEntitiesByPlayer: jest.fn().mockReturnValue([]),
    spawnEntity: jest.fn(),
    getEntityById: jest.fn(),
    loadPrefab: jest.fn(),
    despawnEntity: jest.fn(),
    getEntityByName: jest.fn()
  };
  
  simulation = {
    enableDebugRendering: jest.fn(),
    raycast: jest.fn().mockReturnValue(null),
    enableDebugRaycasting: jest.fn(),
    isDebugRaycastingEnabled: false,
    // For testing
    addTestBlock: jest.fn()
  };
  
  chatManager = {
    registerCommand: jest.fn(),
    sendPlayerMessage: jest.fn(),
    sendGlobalMessage: jest.fn(),
    onMessage: jest.fn()
  };
  
  // Event methods
  on = jest.fn();
  off = jest.fn();
  emit = jest.fn();
  
  // Timer and map methods
  loadMap = jest.fn();
  setInterval = jest.fn().mockReturnValue(123);
  clearInterval = jest.fn();
  setTimeout = jest.fn().mockReturnValue(456);
  clearTimeout = jest.fn();
}

export class Audio {
  static load = jest.fn();
  static play = jest.fn();
  static setVolume = jest.fn();
  static stop = jest.fn();
}

export class Entity {
  id = 'entity1';
  name = 'Entity';
  position = { x: 0, y: 0, z: 0 };
  rotation = { x: 0, y: 0, z: 0 };
  scale = { x: 1, y: 1, z: 1 };
  velocity = { x: 0, y: 0, z: 0 };
  
  spawn = jest.fn();
  despawn = jest.fn();
  setPosition = jest.fn();
  setRotation = jest.fn();
  setScale = jest.fn();
  on = jest.fn();
}

export class PlayerEntity extends Entity {
  player = {
    id: 'player1',
    name: 'Player',
    camera: {
      facingDirection: { x: 0, y: 0, z: 1 },
      setMode: jest.fn(),
      setOffset: jest.fn(),
      setFov: jest.fn(),
      setModelHiddenNodes: jest.fn()
    },
    ui: {
      load: jest.fn(),
      sendData: jest.fn(),
      on: jest.fn()
    }
  };
  
  controller = {
    on: jest.fn()
  };
}

export enum PlayerCameraMode {
  FIRST_PERSON = 'first_person',
  THIRD_PERSON = 'third_person'
}

export enum PlayerEvent {
  JOINED_WORLD = 'player_joined_world',
  LEFT_WORLD = 'player_left_world'
}

export enum BaseEntityControllerEvent {
  TICK_WITH_PLAYER_INPUT = 'tick_with_player_input'
}

export enum PlayerUIEvent {
  DATA = 'data'
}

export enum EntityEvent {
  TICK = 'tick',
  COLLIDE = 'collide'
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface RaycastOptions {
  maxDistance?: number;
  layerMask?: number;
  ignoreEntities?: boolean;
}