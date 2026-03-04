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
    private readonly SETTINGS_KEY = "playerSettings";

    private constructor(world: World) {
        this.world = world;
    }

    public static getInstance(world: World): PlayerSettingsManager {
        if (!PlayerSettingsManager.instance) {
            PlayerSettingsManager.instance = new PlayerSettingsManager(world);
        }
        return PlayerSettingsManager.instance;
    }

    public initializePlayer(playerId: string, player: Player): void {
        const defaultSettings: PlayerSettings = {
            crosshairColor: '#ffff00',
            bgmVolume: 0.1,
            gameMode: 'multiplayer'
        };

        try {
            const persistedSettings = this.loadPlayerSettings(player);
            const settings = persistedSettings || defaultSettings;
            this.playerSettings.set(playerId, settings);
        } catch (error) {
            console.error("Error loading player settings:", error);
            this.playerSettings.set(playerId, defaultSettings);
        }
    }

    public removePlayer(playerId: string): void {
        this.playerSettings.delete(playerId);
    }

    public updateSetting(
        playerId: string,
        setting: keyof PlayerSettings,
        value: any,
        player?: Player
    ): void {
        const settings = this.playerSettings.get(playerId);
        if (!settings) return;

        if (setting === 'bgmVolume') {
            const normalizedVolume = value / 100;
            settings.bgmVolume = normalizedVolume === 0 ? 0 : Math.max(0, Math.min(1, normalizedVolume));
        } else {
            settings[setting] = value;
        }

        if (player) {
            this.savePlayerSettings(player, settings);
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

    private loadPlayerSettings(player: Player): PlayerSettings | null {
        try {
            const data = player.getPersistedData();

            if (data && data[this.SETTINGS_KEY]) {
                const rawSettings = data[this.SETTINGS_KEY] as Record<string, unknown>;

                return {
                    crosshairColor: String(rawSettings.crosshairColor || '#ffff00'),
                    bgmVolume: Number(rawSettings.bgmVolume || 0.1),
                    gameMode: (rawSettings.gameMode as 'solo' | 'multiplayer') || 'multiplayer'
                };
            }
            return null;
        } catch (error) {
            console.error("Error loading player settings from persistence:", error);
            return null;
        }
    }

    private savePlayerSettings(player: Player, settings: PlayerSettings): void {
        try {
            const existingData = player.getPersistedData() || {};

            const dataToSave: Record<string, unknown> = {
                ...existingData,
                [this.SETTINGS_KEY]: settings
            };

            player.setPersistedData(dataToSave);
        } catch (error) {
            console.error("Error saving player settings to persistence:", error);
        }
    }

    /**
     * Send current settings to the player's UI
     * @param player The Player object
     */
    public sendSettingsToUI(player: Player): void {
        const settings = this.playerSettings.get(player.id);
        if (settings) {
            player.ui.sendData({
                type: 'settingsUpdate',
                settings: {
                    bgmVolume: settings.bgmVolume * 100, // Convert to percentage
                    crosshairColor: settings.crosshairColor,
                    gameMode: settings.gameMode
                }
            });
        }
    }

    public cleanup(): void {
        this.playerSettings.clear();
    }
} 