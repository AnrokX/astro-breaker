import { World, Vector3Like, Player, SceneUI } from 'hytopia';
import { ComboNotificationManager } from './combo-notification-manager';

export class SceneUIManager {
  private static instance: SceneUIManager;
  private world: World;
  private comboManager: ComboNotificationManager;
  private notifications: Map<string, SceneUI[]> = new Map();

  private constructor(world: World) {
    this.world = world;
    this.comboManager = ComboNotificationManager.getInstance();
  }

  public static getInstance(world: World): SceneUIManager {
    if (!SceneUIManager.instance) {
      SceneUIManager.instance = new SceneUIManager(world);
    }
    return SceneUIManager.instance;
  }

  public showBlockDestroyedNotification(worldPosition: Vector3Like, score: number, player: Player, spawnOrigin?: Vector3Like): void {
    // Send player ID to the client UI first
    player.ui.sendData({
      type: 'playerId',
      playerId: player.id
    });
    
    // Ensure score is rounded and positive
    const roundedScore = Math.max(0, Math.round(score));
    
    // Calculate distance multiplier if spawn origin is available
    let distanceMultiplier = 1;
    if (worldPosition && spawnOrigin) {
      const dx = worldPosition.x - spawnOrigin.x;
      const dy = worldPosition.y - spawnOrigin.y;
      const dz = worldPosition.z - spawnOrigin.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      distanceMultiplier = 1 + Math.min(Math.pow(distance / 30, 1.1), 0.1);
    }
    
    // Calculate animation duration
    const duration = 500 + Math.min(
      roundedScore <= 30 
        ? Math.pow(roundedScore, 1.2) * 3 
        : Math.pow(roundedScore, 1.8) * 4
      * distanceMultiplier, 1200);
    
    // Calculate scale
    const scale = 1 + Math.min(
      roundedScore <= 30
        ? Math.pow(roundedScore / 80, 2.4)
        : Math.pow(roundedScore / 70, 2.4)
      * distanceMultiplier, 0.8);
    
    const verticalOffset = 1.5 + Math.min(Math.pow(roundedScore / 30, 1.4), 1.5);

    // For scores above 100, always use bright red without any effects
    const colorInfo = roundedScore > 100 
      ? { main: '#FF0000', glow: 'transparent', intensity: 0 }
      : this.getScoreColor(roundedScore);
    
    // Create a SceneUI for block destroyed notification
    const notification = new SceneUI({
      templateId: 'block-destroyed-notification',
      position: {
        x: worldPosition.x,
        y: worldPosition.y + verticalOffset,
        z: worldPosition.z
      },
      state: {
        score: roundedScore,
        playerId: player.id, // Include player ID in state
        style: {
          fontSize: `${scale * 48}px`,
          color: colorInfo.main,
          animationDuration: `${duration}ms`
        }
      },
      viewDistance: 100
    });

    // Add to tracking for cleanup
    if (!this.notifications.has(player.id)) {
      this.notifications.set(player.id, []);
    }
    this.notifications.get(player.id)?.push(notification);

    // Load the scene UI for the world
    notification.load(this.world);

    // Automatically remove the notification after the animation completes
    setTimeout(() => {
      notification.unload();
      
      // Remove from our tracking
      const notifications = this.notifications.get(player.id);
      if (notifications) {
        const index = notifications.indexOf(notification);
        if (index !== -1) {
          notifications.splice(index, 1);
        }
      }
    }, duration + 100);
  }

  public showComboNotification(consecutiveHits: number, comboBonus: number, player: Player): void {
    this.comboManager.showComboNotification(consecutiveHits, comboBonus, player);
  }

  private getScoreColor(score: number): { main: string, glow: string, intensity: number } {
    const colors = [
      { score: 0, color: '#FFFFFF', glow: 'transparent', intensity: 0 }, // This color is white
      { score: 10, color: '#99CCFF', glow: 'transparent', intensity: 0 }, // Light blue
      { score: 20, color: '#FFFF00', glow: 'transparent', intensity: 0 }, // Yellow
      { score: 30, color: '#FF9900', glow: 'transparent', intensity: 0 }, // Orange
      { score: 40, color: '#FF6600', glow: 'transparent', intensity: 0 }, // Dark orange
      { score: 50, color: '#FF00FF', glow: 'transparent', intensity: 0 }, // Pink
      { score: 60, color: '#CC00FF', glow: 'transparent', intensity: 0 }, // Purple
      { score: 65, color: '#CC00FF', glow: 'transparent', intensity: 0 }, // Deep purple
      { score: 75, color: '#FF3333', glow: 'transparent', intensity: 0 },  // Brighter red
      { score: 130, color: '#FF3333', glow: 'transparent', intensity: 0 },  // Brighter red
      { score: 180, color: '#FF3333', glow: 'transparent', intensity: 0 }  // Brighter red
    ];

    let lower = colors[0];
    let upper = colors[colors.length - 1];
    
    for (let i = 0; i < colors.length - 1; i++) {
      if (score >= colors[i].score && score < colors[i + 1].score) {
        lower = colors[i];
        upper = colors[i + 1];
        break;
      }
    }

    const range = upper.score - lower.score;
    const factor = range <= 0 ? 1 : (score - lower.score) / range;
    const intensity = lower.intensity + (upper.intensity - lower.intensity) * factor;

    return {
      main: this.interpolateHex(lower.color, upper.color, factor),
      glow: this.interpolateHex(lower.glow, upper.glow, factor),
      intensity
    };
  }

  private interpolateHex(hex1: string, hex2: string, factor: number): string {
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  public cleanup(): void {
    // Clean up any remaining notifications
    this.notifications.forEach(playerNotifications => {
      playerNotifications.forEach(notification => {
        if (notification.isLoaded) {
          notification.unload();
        }
      });
    });
    this.notifications.clear();
  }
}