import { World, Player, PersistenceManager } from 'hytopia';

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

    /**
     * Initialize a player with default settings or load from persistence
     * @param playerId The player ID
     * @param player The Player object (needed for persistence)
     */
    public async initializePlayer(playerId: string, player: Player): Promise<void> {
        // Default settings
        const defaultSettings: PlayerSettings = {
            crosshairColor: '#ffff00',
            bgmVolume: 0.1,
            gameMode: 'multiplayer'
        };

        try {
            // Try to load settings from persistence
            const persistedSettings = await this.loadPlayerSettings(player);
            
            // If persisted settings exist, use them, otherwise use defaults
            const settings = persistedSettings || defaultSettings;
            
            // Store in memory map
            this.playerSettings.set(playerId, settings);
        } catch (error) {
            console.error("Error loading player settings:", error);
            // Use default settings if there was an error
            this.playerSettings.set(playerId, defaultSettings);
        }
    }

    public removePlayer(playerId: string): void {
        this.playerSettings.delete(playerId);
    }

    /**
     * Update a setting for a player and persist the change
     * @param playerId The player ID
     * @param setting The setting to update
     * @param value The new value
     * @param player Optional Player object for persistence (if not provided, changes won't be persisted)
     */
    public async updateSetting(
        playerId: string, 
        setting: keyof PlayerSettings, 
        value: any, 
        player?: Player
    ): Promise<void> {
        const settings = this.playerSettings.get(playerId);
        if (!settings) return;

        // Update the setting in memory
        if (setting === 'bgmVolume') {
            // Convert slider value (0-100) to volume (0-1)
            // Ensure exact 0 when muting
            const normalizedVolume = value / 100;
            settings.bgmVolume = normalizedVolume === 0 ? 0 : Math.max(0, Math.min(1, normalizedVolume));
        } else {
            // For other settings like crosshairColor and gameMode
            settings[setting] = value;
        }

        // Persist the changes if player object is provided
        if (player) {
            await this.savePlayerSettings(player, settings);
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

    /**
     * Load player settings from persistence
     * @param player The Player object
     * @returns The loaded settings or null if not found
     */
    private async loadPlayerSettings(player: Player): Promise<PlayerSettings | null> {
        try {
            const data = await PersistenceManager.instance.getPlayerData(player);
            
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

    /**
     * Save player settings to persistence
     * @param player The Player object
     * @param settings The settings to save
     */
    private async savePlayerSettings(player: Player, settings: PlayerSettings): Promise<void> {
        try {
            // Get existing player data (to avoid overwriting other data)
            const existingData = await PersistenceManager.instance.getPlayerData(player) || {};
            
            // Prepare the updated data
            const dataToSave: Record<string, unknown> = {
                ...existingData,
                [this.SETTINGS_KEY]: settings
            };
            
            // Save to persistence
            await PersistenceManager.instance.setPlayerData(player, dataToSave);
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