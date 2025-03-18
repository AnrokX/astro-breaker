import { World, Audio } from 'hytopia';

export class AudioManager {
    private static instance: AudioManager;
    private world: World;
    private backgroundMusic?: Audio;
    private sfxVolume: number = 0.5;
    private bgmVolume: number = 0.08; // Slightly lower default volume for Battle Maggots

    private constructor(world: World) {
        this.world = world;
    }

    public static getInstance(world: World): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager(world);
        }
        return AudioManager.instance;
    }

    public playBackgroundMusic(): void {
        try {
            // If we already have background music, just update its volume
            if (this.backgroundMusic) {
                const actualVolume = this.bgmVolume === 0 ? 0 : this.bgmVolume;
                this.backgroundMusic.setVolume(actualVolume);
                    return;
            }

            // Create new background music instance
            this.backgroundMusic = new Audio({
                uri: 'audio/music/Battle Maggots loop.mp3',
                loop: true,
                volume: this.bgmVolume,
            });

            // Play the music and log success
            this.backgroundMusic.play(this.world);
        } catch (error) {
            console.error('Failed to initialize background music:', error);
            this.backgroundMusic = undefined;
        }
    }

    public setBgmVolume(volume: number): void {
        // Update the stored volume
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        
        // Try to update the actual audio instance
        try {
            // Always try to initialize music if it doesn't exist
            if (!this.backgroundMusic) {
                this.playBackgroundMusic();
                return;
            }

            // Update volume of existing background music
            // Ensure we're setting exactly 0 when muting
            const actualVolume = this.bgmVolume === 0 ? 0 : this.bgmVolume;
            this.backgroundMusic.setVolume(actualVolume);
        } catch (error) {
            console.error('Error setting background music volume:', error);
        }
    }

    public getBgmVolume(): number {
        return this.bgmVolume;
    }

    public playSoundEffect(sfxPath: string, volume: number = this.sfxVolume): void {
        const sfx = new Audio({
            uri: sfxPath,
            loop: false,
            volume: volume,
        });
        sfx.play(this.world);
    }

    public playRandomSoundEffect(sfxPaths: string[], volume: number = this.sfxVolume): void {
        const randomIndex = Math.floor(Math.random() * sfxPaths.length);
        this.playSoundEffect(sfxPaths[randomIndex], volume);
    }

    public setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    public cleanup(): void {
        try {
            if (this.backgroundMusic) {
                this.backgroundMusic.setVolume(0);
            }
        } catch (error) {
            console.error('Error during audio cleanup:', error);
        }
        this.backgroundMusic = undefined;
    }
} 