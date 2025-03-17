import { RoundEndPlacement } from '../interfaces/round-interfaces';

export enum RoundEvent {
    ROUND_START = 'roundStart',
    ROUND_END = 'roundEnd',
    GAME_START = 'gameStart',
    GAME_END = 'gameEnd',
    WAITING_FOR_PLAYERS = 'waitingForPlayers',
    TRANSITION_START = 'transitionStart',
    TRANSITION_END = 'transitionEnd'
}

export interface RoundStartEventData {
    round: number;
    totalRounds: number;
    remainingRounds: number;
    duration: number;
}

export interface RoundEndEventData {
    round: number;
    totalRounds: number;
    nextRoundIn: number;
    winnerId: string | null;
    placements: RoundEndPlacement[];
}

export interface WaitingForPlayersEventData {
    current: number;
    required: number;
    remaining: number;
}

export interface GameEndEventData {
    winner: {
        playerId: string;
        playerNumber?: number;
        playerColor?: string;
        placementPoints: number;
        wins: number;
        totalScore: number;
    };
    standings: Array<{
        playerId: string;
        playerNumber?: number;
        playerColor?: string;
        placementPoints: number;
        wins: number;
        totalScore: number;
    }>;
    stats: {
        totalRounds: number;
        completedRounds: number;
    };
    nextGameIn: number;
}