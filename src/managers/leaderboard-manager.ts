// LeaderboardManager handles persistence of game scores and leaderboard data

import { World, Player, PersistenceManager } from 'hytopia';
import { GlobalLeaderboard, PlayerPersistentData } from '../types';

export class LeaderboardManager {
  private static instance: LeaderboardManager;
  private world: World;
  private leaderboardCache: GlobalLeaderboard | null = null;
  private readonly LEADERBOARD_KEY = "astroBreaker_leaderboard";
  
  // Singleton pattern
  public static getInstance(world: World): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager(world);
    }
    return LeaderboardManager.instance;
  }
  
  private constructor(world: World) {
    this.world = world;
  }
  
  // Core persistence methods
  public async getGlobalLeaderboard(): Promise<GlobalLeaderboard> {
    try {
      if (this.leaderboardCache) return this.leaderboardCache;
      
      const data = await PersistenceManager.instance.getGlobalData(this.LEADERBOARD_KEY);
      const defaultLeaderboard: GlobalLeaderboard = { 
        allTimeHighScores: [], 
        roundHighScores: [] 
      };
      
      // If we have data, use it, otherwise use default
      let leaderboard: GlobalLeaderboard;
      if (data) {
        try {
          // Try to parse it as GlobalLeaderboard
          const rawData = data as Record<string, unknown>;
          leaderboard = {
            allTimeHighScores: (rawData.allTimeHighScores as any[] || []).map(entry => ({
              playerName: entry.playerName || '',
              playerId: entry.playerId || '',
              score: entry.score || 0,
              date: entry.date || new Date().toISOString()
            })),
            roundHighScores: (rawData.roundHighScores as any[] || []).map(entry => ({
              playerName: entry.playerName || '',
              playerId: entry.playerId || '',
              roundScore: entry.roundScore || 0,
              roundNumber: entry.roundNumber || 1,
              date: entry.date || new Date().toISOString()
            }))
          };
        } catch (parseError) {
          console.error("Error parsing leaderboard data:", parseError);
          leaderboard = defaultLeaderboard;
        }
      } else {
        leaderboard = defaultLeaderboard;
      }
      
      this.leaderboardCache = leaderboard;
      return leaderboard;
    } catch (error) {
      console.error("Error retrieving leaderboard:", error);
      return { allTimeHighScores: [], roundHighScores: [] };
    }
  }
  
  public async updateGlobalLeaderboard(updatedLeaderboard: GlobalLeaderboard): Promise<void> {
    try {
      // Convert to Record<string, unknown> for Hytopia's API
      const dataToSave: Record<string, unknown> = {
        allTimeHighScores: updatedLeaderboard.allTimeHighScores,
        roundHighScores: updatedLeaderboard.roundHighScores
      };
      
      await PersistenceManager.instance.setGlobalData(this.LEADERBOARD_KEY, dataToSave);
      this.leaderboardCache = updatedLeaderboard;
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }
  
  public async getPlayerData(player: Player): Promise<PlayerPersistentData> {
    try {
      const defaultData: PlayerPersistentData = {
        personalBest: { 
          totalScore: 0, 
          highestRoundScore: 0, 
          highestCombo: 0, 
          date: "" 
        },
        gamesPlayed: 0,
        totalWins: 0,
        showLeaderboard: true
      };
      
      const data = await PersistenceManager.instance.getPlayerData(player);
      
      // If we have data, use it, otherwise use default
      if (data) {
        try {
          // Try to parse it as PlayerPersistentData
          const rawData = data as Record<string, unknown>;
          const personalBestRaw = rawData.personalBest as Record<string, unknown> || {};
          
          return {
            personalBest: {
              totalScore: Number(personalBestRaw.totalScore) || 0,
              highestRoundScore: Number(personalBestRaw.highestRoundScore) || 0,
              highestCombo: Number(personalBestRaw.highestCombo) || 0,
              date: String(personalBestRaw.date) || new Date().toISOString()
            },
            gamesPlayed: Number(rawData.gamesPlayed) || 0,
            totalWins: Number(rawData.totalWins) || 0,
            showLeaderboard: Boolean(rawData.showLeaderboard !== undefined ? rawData.showLeaderboard : true)
          };
        } catch (parseError) {
          console.error("Error parsing player data:", parseError);
          return defaultData;
        }
      }
      
      return defaultData;
    } catch (error) {
      console.error("Error retrieving player data:", error);
      return {
        personalBest: { totalScore: 0, highestRoundScore: 0, highestCombo: 0, date: "" },
        gamesPlayed: 0,
        totalWins: 0,
        showLeaderboard: true
      };
    }
  }
  
  public async updatePlayerData(player: Player, updatedData: PlayerPersistentData): Promise<void> {
    try {
      // Convert to Record<string, unknown> for Hytopia's API
      const dataToSave: Record<string, unknown> = {
        personalBest: updatedData.personalBest,
        gamesPlayed: updatedData.gamesPlayed,
        totalWins: updatedData.totalWins,
        showLeaderboard: updatedData.showLeaderboard
      };
      
      await PersistenceManager.instance.setPlayerData(player, dataToSave);
    } catch (error) {
      console.error("Error updating player data:", error);
    }
  }

  // Helper method to add a score to the all-time high scores list
  public async addAllTimeHighScore(
    player: Player, 
    score: number, 
    maxEntries: number = 10
  ): Promise<void> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      
      // Create a new high score entry
      const newEntry = {
        playerName: player.id, // Use player ID since name property doesn't exist
        playerId: player.id,
        score: score,
        date: new Date().toISOString()
      };
      
      // Add the new entry to the array
      leaderboard.allTimeHighScores.push(newEntry);
      
      // Sort in descending order by score
      leaderboard.allTimeHighScores.sort((a, b) => b.score - a.score);
      
      // Trim to maximum number of entries
      if (leaderboard.allTimeHighScores.length > maxEntries) {
        leaderboard.allTimeHighScores = leaderboard.allTimeHighScores.slice(0, maxEntries);
      }
      
      // Update the leaderboard
      await this.updateGlobalLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error adding high score:", error);
    }
  }

  // Helper method to add a round high score
  public async addRoundHighScore(
    player: Player, 
    roundScore: number,
    roundNumber: number,
    maxEntries: number = 10
  ): Promise<void> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      
      // Create a new round high score entry
      const newEntry = {
        playerName: player.id, // Use player ID since name property doesn't exist
        playerId: player.id,
        roundScore: roundScore,
        roundNumber: roundNumber,
        date: new Date().toISOString()
      };
      
      // Add the new entry to the array
      leaderboard.roundHighScores.push(newEntry);
      
      // Sort in descending order by round score
      leaderboard.roundHighScores.sort((a, b) => b.roundScore - a.roundScore);
      
      // Trim to maximum number of entries
      if (leaderboard.roundHighScores.length > maxEntries) {
        leaderboard.roundHighScores = leaderboard.roundHighScores.slice(0, maxEntries);
      }
      
      // Update the leaderboard
      await this.updateGlobalLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error adding round high score:", error);
    }
  }

  // Helper method to update a player's personal best
  public async updatePlayerPersonalBest(
    player: Player,
    totalScore: number,
    highestRoundScore: number,
    highestCombo: number
  ): Promise<void> {
    try {
      const playerData = await this.getPlayerData(player);
      
      // Only update if the new scores are better than the existing ones
      const newPersonalBest = {
        totalScore: Math.max(playerData.personalBest.totalScore, totalScore),
        highestRoundScore: Math.max(playerData.personalBest.highestRoundScore, highestRoundScore),
        highestCombo: Math.max(playerData.personalBest.highestCombo, highestCombo),
        date: new Date().toISOString()
      };
      
      // Update the player data
      playerData.personalBest = newPersonalBest;
      await this.updatePlayerData(player, playerData);
    } catch (error) {
      console.error("Error updating player personal best:", error);
    }
  }

  // Helper method to increment games played counter
  public async incrementGamesPlayed(player: Player): Promise<void> {
    try {
      const playerData = await this.getPlayerData(player);
      playerData.gamesPlayed++;
      await this.updatePlayerData(player, playerData);
    } catch (error) {
      console.error("Error incrementing games played:", error);
    }
  }

  // Helper method to increment wins counter
  public async incrementWins(player: Player): Promise<void> {
    try {
      const playerData = await this.getPlayerData(player);
      playerData.totalWins++;
      await this.updatePlayerData(player, playerData);
    } catch (error) {
      console.error("Error incrementing wins:", error);
    }
  }

  // Helper method to set leaderboard visibility preference
  public async setLeaderboardVisibility(player: Player, visible: boolean): Promise<void> {
    try {
      const playerData = await this.getPlayerData(player);
      playerData.showLeaderboard = visible;
      await this.updatePlayerData(player, playerData);
    } catch (error) {
      console.error("Error setting leaderboard visibility:", error);
    }
  }

  // Helper method to check if a score qualifies for the leaderboard
  public async isLeaderboardQualifier(score: number): Promise<boolean> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      
      // If there are fewer than 10 entries, any score qualifies
      if (leaderboard.allTimeHighScores.length < 10) {
        return true;
      }
      
      // Sort the high scores to make sure we have the correct order
      const sortedScores = [...leaderboard.allTimeHighScores].sort((a, b) => b.score - a.score);
      
      // Otherwise, check if the score is higher than the lowest score on the leaderboard
      const lowestScore = sortedScores[sortedScores.length - 1].score;
      return score > lowestScore;
    } catch (error) {
      console.error("Error checking leaderboard qualifier:", error);
      return false;
    }
  }

  // Helper method to normalize scores based on game mode
  private normalizeScore(score: number, gameMode: 'solo' | 'multiplayer'): number {
    // Apply fixed multiplier for solo mode to balance with multiplayer
    const SOLO_MULTIPLIER = 0.8;
    return gameMode === 'solo' ? Math.round(score * SOLO_MULTIPLIER) : score;
  }

  // Update leaderboard with round scores - called during round completion
  public async updateWithRoundScores(
    scores: Array<{playerId: string, playerName?: string, roundScore: number}>,
    roundNumber: number,
    gameMode: 'solo' | 'multiplayer' = 'multiplayer'
  ): Promise<void> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      const maxEntries = 10;
      
      // Process each player's score
      for (const scoreData of scores) {
        // Skip zero or negative scores
        if (scoreData.roundScore <= 0) continue;
        
        // Normalize score based on game mode
        const normalizedScore = this.normalizeScore(scoreData.roundScore, gameMode);
        
        // Create new round high score entry
        const newEntry = {
          playerName: scoreData.playerName || scoreData.playerId,
          playerId: scoreData.playerId,
          roundScore: normalizedScore,
          roundNumber: roundNumber,
          date: new Date().toISOString()
        };
        
        // Add entry to the array
        leaderboard.roundHighScores.push(newEntry);
      }
      
      // Sort in descending order by round score
      leaderboard.roundHighScores.sort((a, b) => b.roundScore - a.roundScore);
      
      // Trim to maximum number of entries
      if (leaderboard.roundHighScores.length > maxEntries) {
        leaderboard.roundHighScores = leaderboard.roundHighScores.slice(0, maxEntries);
      }
      
      // Update the leaderboard
      await this.updateGlobalLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error updating round scores:", error);
    }
  }
  
  // Update leaderboard with game results - called at game end
  public async updateWithGameResults(
    finalStandings: Array<{
      playerId: string;
      playerName?: string;
      totalScore: number;
      wins?: number;
    }>,
    gameMode: 'solo' | 'multiplayer' = 'multiplayer'
  ): Promise<void> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      const maxEntries = 10;
      
      // Process each player's final score
      for (const playerData of finalStandings) {
        // Skip zero or negative scores
        if (playerData.totalScore <= 0) continue;
        
        // Normalize score based on game mode
        const normalizedScore = this.normalizeScore(playerData.totalScore, gameMode);
        
        // Create new all-time high score entry
        const newEntry = {
          playerName: playerData.playerName || playerData.playerId,
          playerId: playerData.playerId,
          score: normalizedScore,
          date: new Date().toISOString()
        };
        
        // Add the entry to the array
        leaderboard.allTimeHighScores.push(newEntry);
      }
      
      // Sort in descending order by score
      leaderboard.allTimeHighScores.sort((a, b) => b.score - a.score);
      
      // Trim to maximum number of entries
      if (leaderboard.allTimeHighScores.length > maxEntries) {
        leaderboard.allTimeHighScores = leaderboard.allTimeHighScores.slice(0, maxEntries);
      }
      
      // Update the leaderboard
      await this.updateGlobalLeaderboard(leaderboard);
      
      // Also update player-specific data
      for (const playerData of finalStandings) {
        // Get the player instance - we need this to update player-specific data
        const playerEntities = this.world.entityManager.getAllPlayerEntities();
        const playerEntity = playerEntities.find(entity => entity.player.id === playerData.playerId);
        
        if (playerEntity) {
          await this.updatePlayerBest(playerEntity.player, {
            totalScore: playerData.totalScore,
            wins: playerData.wins || 0
          });
        }
      }
    } catch (error) {
      console.error("Error updating game results:", error);
    }
  }
  
  // Helper method to update a player's personal best
  private async updatePlayerBest(player: Player, gameStats: {
    totalScore: number;
    highestRoundScore?: number;
    highestCombo?: number;
    wins?: number;
  }): Promise<void> {
    try {
      // Get existing player data
      const playerData = await this.getPlayerData(player);
      
      // Update only if the new score is better than the previous best
      if (gameStats.totalScore > (playerData.personalBest.totalScore || 0)) {
        playerData.personalBest.totalScore = gameStats.totalScore;
        playerData.personalBest.date = new Date().toISOString();
      }
      
      // Update highest round score if provided and better than the previous best
      if (gameStats.highestRoundScore && gameStats.highestRoundScore > (playerData.personalBest.highestRoundScore || 0)) {
        playerData.personalBest.highestRoundScore = gameStats.highestRoundScore;
      }
      
      // Update highest combo if provided and better than the previous best
      if (gameStats.highestCombo && gameStats.highestCombo > (playerData.personalBest.highestCombo || 0)) {
        playerData.personalBest.highestCombo = gameStats.highestCombo;
      }
      
      // Update games played and wins
      playerData.gamesPlayed++;
      if (gameStats.wins) {
        playerData.totalWins += gameStats.wins;
      }
      
      // Update the player data
      await this.updatePlayerData(player, playerData);
    } catch (error) {
      console.error("Error updating player best:", error);
    }
  }
}