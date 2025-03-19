import { Vector3Like } from 'hytopia';

export type Vector3 = Vector3Like;

// Global leaderboard structure
export interface GlobalLeaderboard {
  allTimeHighScores: {
    playerName: string;
    playerId: string;
    score: number;
    date: string;
  }[];
  
  roundHighScores: {
    playerName: string;
    playerId: string;
    roundScore: number;
    roundNumber: number;
    date: string;
  }[];
}

// Player-specific persistence data
export interface PlayerPersistentData {
  personalBest: {
    totalScore: number;
    highestRoundScore: number;
    highestCombo: number;
    date: string;
  };
  gamesPlayed: number;
  totalWins: number;
  showLeaderboard: boolean;  // Player preference for showing the leaderboard
}