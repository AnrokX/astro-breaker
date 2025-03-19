import { World } from 'hytopia';
import { ScoreManager } from '../../score-manager';
import { GameEndStanding, RoundEndPlacement } from '../interfaces/round-interfaces';

export class RoundUI {
  private isSoloMode: boolean = false;

  constructor(
    private world: World,
    private scoreManager: ScoreManager,
    gameConfig?: { gameMode?: 'solo' | 'multiplayer' }
  ) { 
    this.isSoloMode = gameConfig?.gameMode === 'solo';
  }

  public displayRoundInfo(round: number, totalRounds: number, remainingRounds: number, remainingTime: number): void {
    const message = {
      type: 'roundUpdate',
      data: {
        round,
        totalRounds,
        remainingRounds,
        duration: remainingTime + (Date.now() - Date.now()), // Current duration is remaining time
        timeRemaining: remainingTime
      }
    };

    this.broadcastToAllPlayers(message);
  }

  public displayRoundEnd(roundNumber: number, totalRounds: number, 
                         winnerId: string | null, 
                         placements: Array<RoundEndPlacement>,
                         transitionDuration: number): void {
    // Enhance placements with player information (playerNumber and playerColor)
    const enhancedPlacements = placements.map(placement => {
      // Get player stats from score manager
      const playerStats = (this.scoreManager as any).playerStats.get(placement.playerId);
      const playerNumber = playerStats?.playerNumber || 0;
      
      // Get color from the player colors array
      const playerColors = (this.scoreManager as any).constructor.PLAYER_COLORS || [];
      const playerColor = playerColors.length > 0 
        ? playerColors[(playerNumber - 1) % playerColors.length] 
        : '#FFFFFF';
      
      return {
        ...placement,
        playerNumber,
        playerColor
      };
    });
    
    // Send enhanced data to each player with their own ID for highlighting
    for (const playerEntity of this.world.entityManager.getAllPlayerEntities()) {
      const currentPlayerId = playerEntity.player.id;
      
      playerEntity.player.ui.sendData({
        type: 'roundEnd',
        data: {
          round: roundNumber,
          totalRounds,
          nextRoundIn: transitionDuration,
          winnerId,
          placements: enhancedPlacements,
          currentPlayerId // Send current player ID for highlighting
        }
      });
    }
  }

  public displayWaitingForPlayers(currentCount: number, requiredCount: number, isSoloMode: boolean = false): void {
    let message;
    
    if (isSoloMode) {
      message = {
        type: 'waitingForSoloStart',
        data: {
          message: 'Press SPACE to start solo game'
        }
      };
    } else {
      message = {
        type: 'waitingForPlayers',
        data: {
          current: currentCount,
          required: requiredCount,
          remaining: requiredCount - currentCount
        }
      };
    }

    this.broadcastToAllPlayers(message);
  }

  public displayGameEnd(winner: GameEndStanding, standings: GameEndStanding[], 
                        totalRounds: number, completedRounds: number, 
                        nextGameIn: number = 10000): void {
    // Send game end message to all players with current player ID for highlighting
    this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
      const currentPlayerId = playerEntity.player.id;
      
      // Find this player's specific score from standings
      const playerStanding = standings.find(s => s.playerId === currentPlayerId);
      const playerScore = playerStanding ? playerStanding.totalScore : 0;
      
      console.log(`Sending game end UI for player ${currentPlayerId}, score: ${playerScore}`);
      
      // Send game end data with currentPlayerId
      playerEntity.player.ui.sendData({
        type: 'gameEnd',
        data: {
          winner,
          standings,
          currentPlayerId,
          nextGameIn,
          stats: {
            totalRounds,
            completedRounds
          },
          isSoloMode: this.isSoloMode
        }
      });
      
      // Different messages for solo vs multiplayer mode
      if (this.isSoloMode) {
        // In solo mode, show completion message with player's own score
        playerEntity.player.ui.sendData({
          type: 'systemMessage',
          message: `🏆 Game complete! Your final score: ${playerScore}`,
          color: 'FFD700' // Gold color
        });
        
        // Also send an extra message to update the UI directly
        playerEntity.player.ui.sendData({
          type: 'updateFinalScore',
          data: {
            totalScore: playerScore,
            wins: playerStanding ? playerStanding.wins || 0 : 0,
            points: playerStanding ? playerStanding.placementPoints || 0 : 0
          }
        });
      } else {
        // In multiplayer, show congratulatory message to winner
        if (currentPlayerId === winner.playerId) {
          playerEntity.player.ui.sendData({
            type: 'systemMessage',
            message: `🏆 Congratulations! You won the game with ${winner.placementPoints} placement points!`,
            color: 'FFD700' // Gold color
          });
        }
        
        // Use player number for clearer winner announcement
        playerEntity.player.ui.sendData({
          type: 'systemMessage',
          message: `Game Over! Player ${winner.playerNumber} wins with ${winner.totalScore} points!`,
          color: 'FFD700'
        });
      }
    });
  }

  public displaySystemMessage(message: string, color: string = 'FFFFFF'): void {
    this.world.entityManager.getAllPlayerEntities().forEach(playerEntity => {
      playerEntity.player.ui.sendData({
        type: 'systemMessage',
        message,
        color
      });
    });
  }

  public updateLeaderboard(): void {
    // Just forward to scoreManager to broadcast scores
    this.scoreManager.broadcastScores(this.world);
  }

  private broadcastToAllPlayers(message: any): void {
    for (const player of this.world.entityManager.getAllPlayerEntities()) {
      player.player.ui.sendData(message);
    }
  }
}