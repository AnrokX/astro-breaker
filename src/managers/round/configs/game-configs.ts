import { GameConfig } from '../interfaces/round-interfaces';

export const DEFAULT_GAME_CONFIG: GameConfig = {
    maxRounds: 10,
    requiredPlayers: 2,
    transitionDuration: 3000,
    gameMode: 'multiplayer'
};

export const SOLO_GAME_CONFIG: GameConfig = {
    maxRounds: 10,
    requiredPlayers: 1,
    transitionDuration: 3000,
    gameMode: 'solo'
};