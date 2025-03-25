import { Player } from 'hytopia';

export class ComboNotificationManager {
  private static instance: ComboNotificationManager;

  private constructor() {}

  public static getInstance(): ComboNotificationManager {
    if (!ComboNotificationManager.instance) {
      ComboNotificationManager.instance = new ComboNotificationManager();
    }
    return ComboNotificationManager.instance;
  }

  public showComboNotification(consecutiveHits: number, comboBonus: number, player: Player): void {
    player.ui.sendData({
      type: 'showCombo',
      data: {
        hits: consecutiveHits,
        bonus: comboBonus,
        text: this.getComboText(consecutiveHits)
      }
    });
  }

  private getComboText(hits: number): string {
    if (hits >= 10) return 'UNSTOPPABLE!';
    if (hits >= 7) return 'DOMINATING!';
    if (hits >= 5) return 'IMPRESSIVE!';
    if (hits >= 3) return 'NICE COMBO!';
    return '';
  }
}