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
          roundScores: {}
        },
        gamesPlayed: 0
      };
      
      const data = await PersistenceManager.instance.getPlayerData(player);
      
      // If we have data, use it, otherwise use default
      if (data) {
        try {
          // Try to parse it as PlayerPersistentData
          const rawData = data as Record<string, unknown>;
          const personalBestRaw = rawData.personalBest as Record<string, unknown> || {};
          // Convert old format to new format if needed
          let roundScores: {[roundNumber: number]: {score: number, date: string}} = {};
          
          // Try to get round scores from new format first
          if (personalBestRaw.roundScores) {
            try {
              roundScores = personalBestRaw.roundScores as {[roundNumber: number]: {score: number, date: string}};
            } catch (e) {
              console.error("Error parsing round scores:", e);
            }
          } 
          // If no round scores in new format, try to migrate from old format
          else if (personalBestRaw.highestRoundScore) {
            // Add a single entry for round 1 (assuming it was from round 1)
            roundScores[1] = {
              score: Number(personalBestRaw.highestRoundScore) || 0,
              date: String(personalBestRaw.highestRoundScoreDate) || new Date().toISOString()
            };
          }
          
          return {
            personalBest: {
              totalScore: Number(personalBestRaw.totalScore) || 0,
              roundScores: roundScores
            },
            gamesPlayed: Number(rawData.gamesPlayed) || 0
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
        personalBest: { 
          totalScore: 0, 
          roundScores: {}
        },
        gamesPlayed: 0
      };
    }
  }
  
  public async updatePlayerData(player: Player, updatedData: PlayerPersistentData): Promise<void> {
    try {
      // Data validation
      if (updatedData.gamesPlayed < 0) updatedData.gamesPlayed = 0;
      if (updatedData.personalBest.totalScore < 0) updatedData.personalBest.totalScore = 0;
      
      // Validate round scores
      if (updatedData.personalBest.roundScores) {
        for (const roundNum in updatedData.personalBest.roundScores) {
          if (updatedData.personalBest.roundScores[roundNum].score < 0) {
            updatedData.personalBest.roundScores[roundNum].score = 0;
          }
        }
      }
      
      // Convert to Record<string, unknown> for Hytopia's API
      const dataToSave: Record<string, unknown> = {
        personalBest: updatedData.personalBest,
        gamesPlayed: updatedData.gamesPlayed
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
    maxEntries: number = 10,
    gameMode: 'solo' | 'multiplayer' = 'multiplayer'
  ): Promise<void> {
    try {
      // Skip scores of 0 or less
      if (score <= 0) return;

      const leaderboard = await this.getGlobalLeaderboard();
      
      // Check if score qualifies for leaderboard before adding
      if (leaderboard.allTimeHighScores.length >= maxEntries) {
        const lowestScore = [...leaderboard.allTimeHighScores]
          .sort((a, b) => a.score - b.score)[0].score;
        if (score <= lowestScore) {
          console.log(`Score ${score} does not qualify for leaderboard (minimum: ${lowestScore})`);
          return;
        }
      }

      // Normalize score based on game mode
      const normalizedScore = this.normalizeScore(score, gameMode);
      
      // Create a new high score entry
      const newEntry = {
        playerName: player.id, // Use player ID since name property doesn't exist
        playerId: player.id,
        score: normalizedScore,
        date: new Date().toISOString(),
        gameMode: gameMode
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
    maxEntries: number = 10,
    gameMode: 'solo' | 'multiplayer' = 'multiplayer'
  ): Promise<void> {
    try {
      // Skip scores of 0 or less
      if (roundScore <= 0) return;

      const leaderboard = await this.getGlobalLeaderboard();

      // Filter existing entries for this round number
      const roundScores = leaderboard.roundHighScores.filter(
        entry => entry.roundNumber === roundNumber
      );
      
      // Check if score qualifies for this specific round's leaderboard
      const entriesPerRound = maxEntries / 2; // Limit entries per round
      if (roundScores.length >= entriesPerRound) {
        const lowestRoundScore = [...roundScores]
          .sort((a, b) => a.roundScore - b.roundScore)[0].roundScore;
        if (roundScore <= lowestRoundScore) {
          console.log(`Round score ${roundScore} for round ${roundNumber} does not qualify (minimum: ${lowestRoundScore})`);
          return;
        }
      }
      
      // Check if player already has an entry for this round
      const existingPlayerEntry = roundScores.find(entry => entry.playerId === player.id);
      if (existingPlayerEntry) {
        // Only update if the new score is better
        if (roundScore <= existingPlayerEntry.roundScore) {
          console.log(`Player already has a higher score (${existingPlayerEntry.roundScore}) for round ${roundNumber}`);
          return;
        }
        // Remove the old entry
        const index = leaderboard.roundHighScores.findIndex(
          e => e.playerId === player.id && e.roundNumber === roundNumber
        );
        if (index !== -1) {
          leaderboard.roundHighScores.splice(index, 1);
        }
      }

      // Normalize score based on game mode
      const normalizedScore = this.normalizeScore(roundScore, gameMode);
      
      // Create a new round high score entry
      const newEntry = {
        playerName: player.id, // Use player ID since name property doesn't exist
        playerId: player.id,
        roundScore: normalizedScore,
        roundNumber: roundNumber,
        date: new Date().toISOString(),
        gameMode: gameMode
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
    roundNumber: number,
    roundScore: number
  ): Promise<void> {
    try {
      const playerData = await this.getPlayerData(player);
      const currentDate = new Date().toISOString();
      
      // Create a copy of the existing personal best
      const newPersonalBest = { ...playerData.personalBest };
      
      // Ensure roundScores object exists
      if (!newPersonalBest.roundScores) {
        newPersonalBest.roundScores = {};
      }
      
      // Only update total score if the new score is better
      if (totalScore > playerData.personalBest.totalScore) {
        newPersonalBest.totalScore = totalScore;
      }
      
      // Update round score if it's a new high score for this round
      const currentRoundBest = playerData.personalBest.roundScores[roundNumber]?.score || 0;
      if (roundScore > currentRoundBest) {
        newPersonalBest.roundScores[roundNumber] = {
          score: roundScore,
          date: currentDate
        };
      }
      
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

  // Helper method to increment wins counter - REMOVED
  // This method has been removed as totalWins is no longer tracked

  // setLeaderboardVisibility method has been removed as part of Phase 1.4 of the refactoring plan

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
    // Skip normalization for invalid scores
    if (score <= 0) return 0;
    
    // REMOVED NORMALIZATION - we now return the original score as requested by user
    // Just log for debugging purposes
    console.log(`Score received: ${score}, mode=${gameMode} (no normalization applied)`);
      
    // Ensure we don't return negative scores
    return Math.max(0, score);
  }

  // Update leaderboard with round scores - called during round completion
  public async updateWithRoundScores(
    scores: Array<{playerId: string, playerName?: string, roundScore: number}>,
    roundNumber: number,
    totalRounds: number = 3,  // Added total rounds parameter for UI filtering
    gameMode: 'solo' | 'multiplayer' = 'multiplayer'
  ): Promise<void> {
    try {
      const leaderboard = await this.getGlobalLeaderboard();
      const maxEntries = 10;
      
      // Process each player's score
      for (const scoreData of scores) {
        // Skip zero or negative scores
        if (scoreData.roundScore <= 0) continue;
        
        // Check if player already has an entry for this round
        const existingEntryIndex = leaderboard.roundHighScores.findIndex(
          entry => entry.playerId === scoreData.playerId && entry.roundNumber === roundNumber
        );
        
        // If player already has an entry, only update if the new score is better
        if (existingEntryIndex !== -1) {
          const existingEntry = leaderboard.roundHighScores[existingEntryIndex];
          
          if (scoreData.roundScore <= existingEntry.roundScore) {
            console.log(`Player ${scoreData.playerId} already has a higher score (${existingEntry.roundScore}) for round ${roundNumber}`);
            continue;
          }
          
          // Remove the existing entry
          leaderboard.roundHighScores.splice(existingEntryIndex, 1);
        }
        
        // Normalize score based on game mode
        const normalizedScore = this.normalizeScore(scoreData.roundScore, gameMode);
        
        // Create new round high score entry
        const newEntry = {
          playerName: scoreData.playerName || scoreData.playerId,
          playerId: scoreData.playerId,
          roundScore: normalizedScore,
          roundNumber: roundNumber,
          date: new Date().toISOString(),
          gameMode: gameMode
        };
        
        // Add entry to the array
        leaderboard.roundHighScores.push(newEntry);
      }
      
      // Filter to limit entries per round
      // Group by round number and ensure we don't have more than maxEntries/2 per round
      const entriesByRound = new Map<number, Array<any>>();
      for (const entry of leaderboard.roundHighScores) {
        if (!entriesByRound.has(entry.roundNumber)) {
          entriesByRound.set(entry.roundNumber, []);
        }
        entriesByRound.get(entry.roundNumber)!.push(entry);
      }
      
      // Keep top entries for each round
      let newRoundHighScores: any[] = [];
      const entriesPerRound = Math.floor(maxEntries / 2);
      
      for (const [roundNum, entries] of entriesByRound.entries()) {
        // Sort by score and take top entries
        const topEntries = entries
          .sort((a, b) => b.roundScore - a.roundScore)
          .slice(0, entriesPerRound);
          
        newRoundHighScores = newRoundHighScores.concat(topEntries);
      }
      
      // Sort in descending order by round score
      newRoundHighScores.sort((a, b) => b.roundScore - a.roundScore);
      
      // Ensure we don't exceed the total max entries
      if (newRoundHighScores.length > maxEntries) {
        newRoundHighScores = newRoundHighScores.slice(0, maxEntries);
      }
      
      // Update the leaderboard with the filtered entries
      leaderboard.roundHighScores = newRoundHighScores;
      
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
      console.log(`updateWithGameResults called with ${finalStandings.length} players, mode: ${gameMode}`);
      console.log(`Final standings: ${JSON.stringify(finalStandings)}`);
      
      const leaderboard = await this.getGlobalLeaderboard();
      console.log(`Current leaderboard: ${JSON.stringify(leaderboard)}`);
      
      const maxEntries = 10;
      
      // Process each player's final score
      for (const playerData of finalStandings) {
        // Calculate total score as sum of all round scores for this player
        const playerRoundScores = leaderboard.roundHighScores
          .filter(entry => entry.playerId === playerData.playerId)
          .map(entry => entry.roundScore);
        
        // Sum up all round scores to get the true total score
        const sumOfRoundScores = playerRoundScores.reduce((sum, score) => sum + score, 0);
        
        // Use the sum of round scores instead of the provided totalScore
        const calculatedTotalScore = Math.max(sumOfRoundScores, playerData.totalScore);
        
        console.log(`Processing player ${playerData.playerId} with original score ${playerData.totalScore}`);
        console.log(`Calculated total score (sum of rounds): ${calculatedTotalScore}`);
        
        // Skip zero or negative scores
        if (calculatedTotalScore <= 0) {
          console.log(`Skipping player ${playerData.playerId} - score is zero or negative`);
          continue;
        }
        
        // For solo mode, we'll always add the score to provide better feedback
        let qualifiesForLeaderboard = gameMode === 'solo';
        
        // For multiplayer, check qualification
        if (gameMode === 'multiplayer' && leaderboard.allTimeHighScores.length >= maxEntries) {
          const sortedScores = [...leaderboard.allTimeHighScores].sort((a, b) => a.score - b.score);
          const lowestScore = sortedScores[0].score;
            
          // Check if score qualifies
          qualifiesForLeaderboard = calculatedTotalScore > lowestScore;
          
          if (!qualifiesForLeaderboard) {
            console.log(`Score ${calculatedTotalScore} by player ${playerData.playerId} doesn't qualify for leaderboard (minimum: ${lowestScore})`);
          }
        } else {
          // If we have fewer than max entries, any score qualifies
          qualifiesForLeaderboard = true;
        }
        
        if (qualifiesForLeaderboard) {
          // Check if player already has an entry with a higher score
          const existingEntryIndex = leaderboard.allTimeHighScores.findIndex(
            entry => entry.playerId === playerData.playerId
          );
          
          let shouldAddEntry = true;
          
          if (existingEntryIndex !== -1) {
            const existingEntry = leaderboard.allTimeHighScores[existingEntryIndex];
            
            // For solo mode, always update the player's entry
            // For multiplayer, only replace if the new score is higher
            if (gameMode === 'multiplayer' && calculatedTotalScore <= existingEntry.score) {
              console.log(`Player ${playerData.playerId} already has a higher score (${existingEntry.score})`);
              shouldAddEntry = false;
            } else {
              // Remove the existing entry
              console.log(`Removing existing entry for player ${playerData.playerId}`);
              leaderboard.allTimeHighScores.splice(existingEntryIndex, 1);
            }
          }
          
          if (shouldAddEntry) {
            // Normalize score based on game mode
            const normalizedScore = this.normalizeScore(calculatedTotalScore, gameMode);
            
            // Create new all-time high score entry
            const newEntry = {
              playerName: playerData.playerName || playerData.playerId,
              playerId: playerData.playerId,
              score: normalizedScore,
              date: new Date().toISOString(),
              gameMode: gameMode
            };
            
            console.log(`Adding new entry to all-time high scores: ${JSON.stringify(newEntry)}`);
            
            // Add the entry to the array
            leaderboard.allTimeHighScores.push(newEntry);
          }
        }
      }
      
      // Sort in descending order by score
      leaderboard.allTimeHighScores.sort((a, b) => b.score - a.score);
      
      // Trim to maximum number of entries
      if (leaderboard.allTimeHighScores.length > maxEntries) {
        leaderboard.allTimeHighScores = leaderboard.allTimeHighScores.slice(0, maxEntries);
      }
      
      console.log(`Updated leaderboard: ${JSON.stringify(leaderboard)}`);
      
      // Update the leaderboard
      await this.updateGlobalLeaderboard(leaderboard);
      
      // Also update player-specific data
      for (const playerData of finalStandings) {
        // Process player data even with zero scores so we can update games played
        
        // Get the player instance - we need this to update player-specific data
        const playerEntities = this.world.entityManager.getAllPlayerEntities();
        const playerEntity = playerEntities.find(entity => entity.player.id === playerData.playerId);
        
        if (playerEntity) {
          console.log(`Updating player best data for ${playerData.playerId}`);
          
          // Calculate total score as sum of all round scores for this player again
          const playerRoundScores = leaderboard.roundHighScores
            .filter(entry => entry.playerId === playerData.playerId)
            .map(entry => entry.roundScore);
            
          const sumOfRoundScores = playerRoundScores.reduce((sum, score) => sum + score, 0);
          
          // Use the sum rather than the passed in totalScore
          await this.updatePlayerBest(playerEntity.player, {
            totalScore: sumOfRoundScores > 0 ? sumOfRoundScores : playerData.totalScore
          });
        } else {
          console.log(`Could not find player entity for ${playerData.playerId}`);
        }
      }
    } catch (error) {
      console.error("Error updating game results:", error);
    }
  }
  
  // Helper method to update a player's personal best
  private async updatePlayerBest(player: Player, gameStats: {
    totalScore: number;
    roundScores?: {[roundNumber: number]: number};
    wins?: number;
  }): Promise<void> {
    try {
      // Data validation
      if (gameStats.totalScore < 0) gameStats.totalScore = 0;
      
      // Get existing player data
      const playerData = await this.getPlayerData(player);
      const currentDate = new Date().toISOString();
      
      console.log(`Updating player best data: existing=${JSON.stringify(playerData.personalBest)}, new total=${gameStats.totalScore}`);
      
      // Ensure roundScores object exists
      if (!playerData.personalBest.roundScores) {
        playerData.personalBest.roundScores = {};
      }
      
      // Calculate sum of all round scores from global leaderboard
      let sumOfRoundScores = gameStats.totalScore; // Default to provided score
      
      try {
        // Get the global leaderboard to access all round scores
        const leaderboard = await this.getGlobalLeaderboard();
        
        // Find all round scores for this player
        const playerRoundScores = leaderboard.roundHighScores
          .filter(entry => entry.playerId === player.id)
          .map(entry => entry.roundScore);
        
        // Calculate sum of all round scores
        if (playerRoundScores.length > 0) {
          sumOfRoundScores = playerRoundScores.reduce((sum, score) => sum + score, 0);
          console.log(`Calculated sum of all round scores: ${sumOfRoundScores}`);
        }
      } catch (e) {
        console.error("Error calculating sum of round scores:", e);
      }
      
      // Update total score with the calculated sum
      if (sumOfRoundScores > 0) {
        // Always update with the sum of round scores, as this is the new behavior
        playerData.personalBest.totalScore = sumOfRoundScores;
        console.log(`Updated total score to ${sumOfRoundScores} (sum of all round scores)`);
      } else if (gameStats.totalScore > 0 && gameStats.totalScore > playerData.personalBest.totalScore) {
        // Fallback to provided score if we couldn't calculate the sum
        playerData.personalBest.totalScore = gameStats.totalScore;
        console.log(`Updated total score to ${gameStats.totalScore} (provided score)`);
      }
      
      // Try to sync round scores from global leaderboard
      try {
        const leaderboard = await this.getGlobalLeaderboard();
        const playerRoundEntries = leaderboard.roundHighScores.filter(entry => entry.playerId === player.id);
        
        // Update personal best round scores from global leaderboard entries
        for (const entry of playerRoundEntries) {
          const roundNum = entry.roundNumber;
          const score = entry.roundScore;
          
          // Get current best for this round
          const currentBest = playerData.personalBest.roundScores[roundNum]?.score || 0;
          
          // Only update if global score is better than personal best
          if (score > currentBest) {
            playerData.personalBest.roundScores[roundNum] = {
              score: score,
              date: entry.date || currentDate
            };
            console.log(`Synced round ${roundNum} score to ${score} from global leaderboard`);
          }
        }
      } catch (e) {
        console.error("Error syncing round scores from global leaderboard:", e);
      }
      
      // Update round scores if explicitly provided in gameStats
      if (gameStats.roundScores) {
        for (const [roundNumber, score] of Object.entries(gameStats.roundScores)) {
          const roundNum = parseInt(roundNumber);
          if (isNaN(roundNum) || score <= 0) continue;
          
          // Get current best for this round
          const currentBest = playerData.personalBest.roundScores[roundNum]?.score || 0;
          
          // Only update if new score is better
          if (score > currentBest) {
            playerData.personalBest.roundScores[roundNum] = {
              score: score,
              date: currentDate
            };
            console.log(`Updated round ${roundNum} score to ${score} from provided gameStats`);
          }
        }
      }
      
      // Update games played (increment by 1 to avoid double-counting)
      // Only increment if this is a new game, not just a stats update
      if (gameStats.wins !== undefined) {
        playerData.gamesPlayed++;
        console.log(`Incremented games played to ${playerData.gamesPlayed}`);
      }
      
      // Update the player data
      await this.updatePlayerData(player, playerData);
      console.log(`Player data updated successfully`);
    } catch (error) {
      console.error("Error updating player best:", error);
    }
  }
}