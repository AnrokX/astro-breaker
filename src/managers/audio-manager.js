"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioManager = void 0;
var hytopia_1 = require("hytopia");
var AudioManager = /** @class */ (function () {
    function AudioManager(world) {
        this.sfxVolume = 0.5;
        this.bgmVolume = 0.08; // Slightly lower default volume for Battle Maggots
        this.world = world;
    }
    AudioManager.getInstance = function (world) {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager(world);
        }
        return AudioManager.instance;
    };
    AudioManager.prototype.playBackgroundMusic = function () {
        try {
            // If we already have background music, just update its volume
            if (this.backgroundMusic) {
                var actualVolume = this.bgmVolume === 0 ? 0 : this.bgmVolume;
                this.backgroundMusic.setVolume(actualVolume);
                console.log("Background music volume updated to: ".concat(actualVolume));
                return;
            }
            // Create new background music instance
            this.backgroundMusic = new hytopia_1.Audio({
                uri: 'audio/music/Battle Maggots loop.mp3',
                loop: true,
                volume: this.bgmVolume,
            });
            // Play the music and log success
            this.backgroundMusic.play(this.world);
            console.log("Background music started with volume: ".concat(this.bgmVolume));
        }
        catch (error) {
            console.error('Failed to initialize background music:', error);
            this.backgroundMusic = undefined;
        }
    };
    AudioManager.prototype.setBgmVolume = function (volume) {
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
            var actualVolume = this.bgmVolume === 0 ? 0 : this.bgmVolume;
            this.backgroundMusic.setVolume(actualVolume);
            console.log("Background music volume set to: ".concat(actualVolume));
        }
        catch (error) {
            console.error('Error setting background music volume:', error);
        }
    };
    AudioManager.prototype.getBgmVolume = function () {
        return this.bgmVolume;
    };
    AudioManager.prototype.playSoundEffect = function (sfxPath, volume) {
        if (volume === void 0) { volume = this.sfxVolume; }
        var sfx = new hytopia_1.Audio({
            uri: sfxPath,
            loop: false,
            volume: volume,
        });
        sfx.play(this.world);
    };
    AudioManager.prototype.playRandomSoundEffect = function (sfxPaths, volume) {
        if (volume === void 0) { volume = this.sfxVolume; }
        var randomIndex = Math.floor(Math.random() * sfxPaths.length);
        this.playSoundEffect(sfxPaths[randomIndex], volume);
    };
    AudioManager.prototype.setSfxVolume = function (volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    };
    AudioManager.prototype.cleanup = function () {
        try {
            if (this.backgroundMusic) {
                this.backgroundMusic.setVolume(0);
            }
        }
        catch (error) {
            console.error('Error during audio cleanup:', error);
        }
        this.backgroundMusic = undefined;
    };
    return AudioManager;
}());
exports.AudioManager = AudioManager;
