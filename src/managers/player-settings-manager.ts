import { World, Player } from 'hytopia';

export interface PlayerSettings {
    crosshairColor: string;
    bgmVolume: number;
    gameMode: 'solo' | 'multiplayer';
}

export interface UISettingsData {
    type: 'updateSettings';
    setting: keyof PlayerSettings;
    value: any;
}

export class PlayerSettingsManager {
    private static instance: PlayerSettingsManager;
    private readonly world: World;
    private playerSettings = new Map<string, PlayerSettings>();

    private constructor(world: World) {
        this.world = world;
    }

    public static getInstance(world: World): PlayerSettingsManager {
        if (!PlayerSettingsManager.instance) {
            PlayerSettingsManager.instance = new PlayerSettingsManager(world);
        }
        return PlayerSettingsManager.instance;
    }

    public initializePlayer(playerId: string): void {
        this.playerSettings.set(playerId, {
            crosshairColor: '#ffff00',
            bgmVolume: 0.1, // Default background music volume
            gameMode: 'multiplayer' // Default to multiplayer
        });
    }

    public removePlayer(playerId: string): void {
        this.playerSettings.delete(playerId);
    }

    public updateSetting(playerId: string, setting: keyof PlayerSettings, value: any): void {
        const settings = this.playerSettings.get(playerId);
        if (!settings) return;

        if (setting === 'bgmVolume') {
            // Convert slider value (0-100) to volume (0-1)
            // Ensure exact 0 when muting
            const normalizedVolume = value / 100;
            settings.bgmVolume = normalizedVolume === 0 ? 0 : Math.max(0, Math.min(1, normalizedVolume));
        // showLeaderboard setting removed
        } else {
            // For other settings like crosshairColor and gameMode
            settings[setting] = value;
        }
    }

    /**
     * Gets the current settings for a player
     * @param playerId The ID of the player
     * @returns The player's settings or undefined if not found
     */
    public getPlayerSettings(playerId: string): PlayerSettings | undefined {
        return this.playerSettings.get(playerId);
    }

    public cleanup(): void {
        this.playerSettings.clear();
    }
} 