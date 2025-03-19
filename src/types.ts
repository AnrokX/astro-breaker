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
    totalScore: number;
    highestRoundScore: number;
    highestCombo: number;
    date: string;
    totalScoreDate?: string;  // Date when highest total score was achieved
    highestRoundScoreDate?: string;  // Date when highest round score was achieved
    highestComboDate?: string;  // Date when highest combo was achieved
  };
  gamesPlayed: number;
  totalWins: number;
}