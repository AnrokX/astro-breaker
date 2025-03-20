import { Vector3Like } from 'hytopia';

export type Vector3 = Vector3Like;

// Global leaderboard structure
export interface GlobalLeaderboard {
  allTimeHighScores: {
    playerName: string;
    playerId: string;
    score: number;
    date: string;
    gameMode?: 'solo' | 'multiplayer';  // Indicator of which game mode the score was achieved in
  }[];
  
  roundHighScores: {
    playerName: string;
    playerId: string;
    roundScore: number;
    roundNumber: number;
    date: string;
    gameMode?: 'solo' | 'multiplayer';  // Indicator of which game mode the score was achieved in
  }[];
}

// Player-specific persistence data
export interface PlayerPersistentData {
  personalBest: {
    totalScore: number;  // Total high score across all rounds
    roundScores: {       // Individual high scores for each round
      [roundNumber: number]: {
        score: number;
        date: string;
      }
    };
    date: string;        // Last updated date
  };
  gamesPlayed: number;
  totalWins: number;
}