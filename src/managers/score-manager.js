"use strict";
// The ScoreManager handles player scoring for block breaks and other game events
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreManager = void 0;
var hytopia_1 = require("hytopia");
var scene_ui_manager_1 = require("../scene-ui/scene-ui-manager");
var audio_manager_1 = require("./audio-manager");
var ScoreManager = /** @class */ (function (_super) {
    __extends(ScoreManager, _super);
    function ScoreManager() {
        var _this = _super.call(this, {
            name: 'ScoreManager',
            blockTextureUri: 'blocks/stone.png', // Use a basic block texture that definitely exists
            blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 } // Normal scale, will be positioned out of view anyway
        }) || this;
        // Map to hold scores and stats for each player by their ID
        _this.playerStats = new Map();
        _this.playerCount = 0;
        return _this;
    }
    ScoreManager.prototype.spawn = function (world, position) {
        // Position it far away where it won't be visible
        _super.prototype.spawn.call(this, world, { x: 0, y: -1000, z: 0 });
    };
    // Initialize a score entry for a player
    ScoreManager.prototype.initializePlayer = function (playerId) {
        if (!this.playerStats.has(playerId)) {
            this.playerCount++;
            this.playerStats.set(playerId, {
                totalScore: 0,
                roundScore: 0,
                placementPoints: 0, // Initialize placement points
                wins: 0,
                playerNumber: this.playerCount,
                consecutiveHits: 0,
                multiHitCount: 0,
                lastHitTime: 0
            });
        }
    };
    // Remove a player's score when they leave the game
    ScoreManager.prototype.removePlayer = function (playerId) {
        if (this.playerStats.has(playerId)) {
            this.playerCount--;
            this.playerStats.delete(playerId);
        }
    };
    // Start a new round - reset round scores and total scores, but keep placement points
    ScoreManager.prototype.startNewRound = function () {
        for (var _i = 0, _a = this.playerStats.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], stats = _b[1];
            stats.totalScore = 0; // Reset total score at start of round
            stats.roundScore = 0; // Reset round score
            stats.consecutiveHits = 0;
            stats.multiHitCount = 0;
            stats.lastHitTime = 0;
            this.playerStats.set(playerId, stats);
        }
    };
    // Add a win for the player with the highest score in the round
    ScoreManager.prototype.handleRoundEnd = function () {
        var _this = this;
        // Sort players by round score in descending order
        var sortedPlayers = Array.from(this.playerStats.entries())
            .sort(function (a, b) { return b[1].roundScore - a[1].roundScore; });
        var playerCount = sortedPlayers.length;
        var placements = [];
        // Handle ties by giving same points to players with equal scores
        var currentPoints = playerCount;
        var currentScore = -1;
        var sameScoreCount = 0;
        sortedPlayers.forEach(function (entry, index) {
            var playerId = entry[0], stats = entry[1];
            // If this is a new score, update the points
            if (stats.roundScore !== currentScore) {
                currentPoints = playerCount - index;
                currentScore = stats.roundScore;
                sameScoreCount = 0;
            }
            else {
                sameScoreCount++;
            }
            stats.placementPoints += currentPoints; // Add to placement points
            _this.playerStats.set(playerId, stats);
            placements.push({ playerId: playerId, points: currentPoints });
        });
        var winnerId = sortedPlayers.length > 0 ? sortedPlayers[0][0] : null;
        if (winnerId) {
            var stats = this.playerStats.get(winnerId);
            stats.wins++;
            this.playerStats.set(winnerId, stats);
        }
        return { winnerId: winnerId, placements: placements };
    };
    // Increment (or decrement) player's score
    ScoreManager.prototype.addScore = function (playerId, score) {
        var stats = this.playerStats.get(playerId);
        if (stats) {
            stats.totalScore += score;
            stats.roundScore += score;
            this.playerStats.set(playerId, stats);
            // Play the score sound effect
            if (this.world && score > 0) {
                var audioManager = audio_manager_1.AudioManager.getInstance(this.world);
                audioManager.playSoundEffect('audio/sfx/damage/blop1.mp3', 0.4); // 0.4 volume for less intrusive feedback
            }
        }
    };
    // Get the current total score for a player
    ScoreManager.prototype.getScore = function (playerId) {
        var _a, _b;
        return (_b = (_a = this.playerStats.get(playerId)) === null || _a === void 0 ? void 0 : _a.totalScore) !== null && _b !== void 0 ? _b : 0;
    };
    // Get the current round score for a player
    ScoreManager.prototype.getRoundScore = function (playerId) {
        var _a, _b;
        return (_b = (_a = this.playerStats.get(playerId)) === null || _a === void 0 ? void 0 : _a.roundScore) !== null && _b !== void 0 ? _b : 0;
    };
    // Get wins for a player
    ScoreManager.prototype.getWins = function (playerId) {
        var _a, _b;
        return (_b = (_a = this.playerStats.get(playerId)) === null || _a === void 0 ? void 0 : _a.wins) !== null && _b !== void 0 ? _b : 0;
    };
    // Reset score for a player
    ScoreManager.prototype.resetScore = function (playerId) {
        var stats = this.playerStats.get(playerId);
        if (stats) {
            stats.totalScore = 0;
            stats.roundScore = 0;
            this.playerStats.set(playerId, stats);
        }
    };
    // Reset all players' scores
    ScoreManager.prototype.resetAllScores = function () {
        for (var _i = 0, _a = this.playerStats.keys(); _i < _a.length; _i++) {
            var playerId = _a[_i];
            this.resetScore(playerId);
        }
    };
    // Reset all stats including wins and placement points
    ScoreManager.prototype.resetAllStats = function () {
        for (var _i = 0, _a = this.playerStats.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], playerId = _b[0], stats = _b[1];
            stats.totalScore = 0;
            stats.roundScore = 0;
            stats.placementPoints = 0; // Reset placement points
            stats.wins = 0;
            stats.consecutiveHits = 0;
            stats.multiHitCount = 0;
            stats.lastHitTime = 0;
            this.playerStats.set(playerId, stats);
        }
    };
    // Add this method to broadcast scores and leaderboard
    ScoreManager.prototype.broadcastScores = function (world) {
        var _this = this;
        var scores = Array.from(world.entityManager.getAllPlayerEntities()).map(function (playerEntity) { return ({
            playerId: playerEntity.player.id,
            totalPoints: _this.getScore(playerEntity.player.id),
            roundScore: _this.getRoundScore(playerEntity.player.id)
        }); });
        // Create leaderboard data sorted by placement points
        var leaderboard = Array.from(this.playerStats.entries())
            .map(function (_a) {
            var playerId = _a[0], stats = _a[1];
            return ({
                playerNumber: stats.playerNumber,
                points: stats.placementPoints, // Use placement points for leaderboard
                isLeading: _this.isLeadingByPlacements(playerId) // New method for placement-based leading
            });
        })
            .sort(function (a, b) { return b.points - a.points; });
        world.entityManager.getAllPlayerEntities().forEach(function (playerEntity) {
            playerEntity.player.ui.sendData({
                type: 'updateScores',
                scores: scores
            });
            playerEntity.player.ui.sendData({
                type: 'updateLeaderboard',
                leaderboard: leaderboard
            });
        });
    };
    // New method to check who's leading by placement points
    ScoreManager.prototype.isLeadingByPlacements = function (playerId) {
        var _a, _b;
        var playerPoints = (_b = (_a = this.playerStats.get(playerId)) === null || _a === void 0 ? void 0 : _a.placementPoints) !== null && _b !== void 0 ? _b : 0;
        return Array.from(this.playerStats.values())
            .every(function (stats) { return stats.placementPoints <= playerPoints; });
    };
    // Calculate Euclidean distance between two points
    ScoreManager.prototype.calculateDistance = function (point1, point2) {
        var dx = point2.x - point1.x;
        var dy = point2.y - point1.y;
        var dz = point2.z - point1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    // Calculate average of target's half-extents (S)
    ScoreManager.prototype.calculateAverageSize = function (halfExtents) {
        // Get the full dimensions by multiplying by 2 (since these are half-extents)
        var fullWidth = Math.max(halfExtents.x * 2, 2); // Minimum size of 2 for standard blocks
        var fullHeight = Math.max(halfExtents.y * 2, 2);
        var fullDepth = Math.max(halfExtents.z * 2, 2);
        // Calculate the average dimension, considering the actual block formation
        return (fullWidth + fullHeight + fullDepth) / 3;
    };
    // Get movement multiplier based on block type
    ScoreManager.prototype.getMovementMultiplier = function (block) {
        var behaviorType = block.getMovementBehaviorType();
        console.log("Determining multiplier for behavior type: ".concat(behaviorType));
        switch (behaviorType) {
            case 'ZAxisMovement':
                return ScoreManager.SCORING_CONFIG.Z_AXIS_MULTIPLIER;
            case 'SineWaveMovement':
                return ScoreManager.SCORING_CONFIG.SINE_WAVE_MULTIPLIER;
            case 'VerticalWaveMovement':
                return ScoreManager.SCORING_CONFIG.VERTICAL_WAVE_MULTIPLIER;
            case 'PopUpMovement':
                return ScoreManager.SCORING_CONFIG.POPUP_MULTIPLIER;
            case 'RisingMovement':
                return ScoreManager.SCORING_CONFIG.RISING_MULTIPLIER;
            case 'ParabolicMovement':
                return ScoreManager.SCORING_CONFIG.PARABOLIC_MULTIPLIER;
            case 'PendulumMovement':
                return ScoreManager.SCORING_CONFIG.PENDULUM_MULTIPLIER;
            default:
                return ScoreManager.SCORING_CONFIG.BASE_MOVEMENT_MULTIPLIER;
        }
    };
    // Update combo and multi-hit counters
    ScoreManager.prototype.updateHitCounters = function (playerId, hitPosition) {
        var _a;
        var stats = this.playerStats.get(playerId);
        if (!stats)
            return;
        var currentTime = Date.now();
        // Check if within combo window
        if (currentTime - stats.lastHitTime <= ScoreManager.SCORING_CONFIG.COMBO_TIMEOUT_MS) {
            stats.consecutiveHits++;
            stats.multiHitCount++;
        }
        else {
            stats.consecutiveHits = 1;
            stats.multiHitCount = 1;
        }
        stats.lastHitTime = currentTime;
        this.playerStats.set(playerId, stats);
        var comboBonus = Math.min((stats.consecutiveHits - 1) * 0.15, ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS);
        var multiHitBonus = Math.min((stats.multiHitCount - 1) * 0.1, ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS);
        // Show combo notification for 3+ hits
        if (stats.consecutiveHits >= 3 && this.world) {
            var totalBonus = Math.round((comboBonus + multiHitBonus) * 100);
            var player = (_a = this.world.entityManager.getAllPlayerEntities()
                .find(function (entity) { return entity.player.id === playerId; })) === null || _a === void 0 ? void 0 : _a.player;
            if (player) {
                scene_ui_manager_1.SceneUIManager.getInstance(this.world).showComboNotification(stats.consecutiveHits, totalBonus, player);
            }
        }
        console.log("Player ".concat(playerId, " hit counters updated:"), {
            consecutiveHits: stats.consecutiveHits,
            multiHitCount: stats.multiHitCount,
            comboTimeRemaining: ScoreManager.SCORING_CONFIG.COMBO_TIMEOUT_MS - (currentTime - stats.lastHitTime),
            currentComboBonus: comboBonus.toFixed(2),
            currentMultiHitBonus: multiHitBonus.toFixed(2)
        });
    };
    // Calculate the dynamic score for a grenade hit
    ScoreManager.prototype.calculateGrenadeTargetScore = function (projectile, block, impactPoint, playerId) {
        var spawnOrigin = projectile.getSpawnOrigin();
        if (!spawnOrigin) {
            console.warn('No spawn origin found for projectile, using default score');
            return ScoreManager.SCORING_CONFIG.MIN_SCORE;
        }
        // Calculate distance (D)
        var distance = this.calculateDistance(spawnOrigin, impactPoint);
        console.log('🎯 Distance Analysis:', {
            spawnPoint: spawnOrigin,
            impactPoint: impactPoint,
            distance: distance.toFixed(2),
            explanation: 'Higher distance should increase score'
        });
        // Calculate size factor (S)
        var averageSize = this.calculateAverageSize(block.getBlockDimensions());
        console.log('📏 Size Analysis:', {
            blockDimensions: block.getBlockDimensions(),
            averageSize: averageSize.toFixed(2),
            distanceToSizeRatio: (distance / averageSize).toFixed(2),
            explanation: 'Smaller targets should give higher scores'
        });
        // Get movement multiplier (M)
        var movementMultiplier = this.getMovementMultiplier(block);
        console.log('🔄 Movement Analysis:', {
            behaviorType: block.getMovementBehaviorType(),
            multiplier: movementMultiplier,
            explanation: "Using ".concat(movementMultiplier, "x multiplier based on movement pattern")
        });
        // Calculate time factor (T)
        var elapsedTime = (Date.now() - block.getSpawnTime()) / 1000; // Convert to seconds
        var timeFactor = ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR / (elapsedTime + ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR);
        console.log('⏱️ Time Analysis:', {
            elapsedSeconds: elapsedTime.toFixed(2),
            decayFactor: ScoreManager.SCORING_CONFIG.TIME_DECAY_FACTOR,
            timeFactor: timeFactor.toFixed(4),
            explanation: 'Time factor decreases score for older targets'
        });
        // Get combo (C) and multi-hit (H) bonuses
        var stats = this.playerStats.get(playerId);
        if (!stats) {
            console.warn('No stats found for player, initializing new stats');
            this.initializePlayer(playerId);
        }
        this.updateHitCounters(playerId, impactPoint);
        var updatedStats = this.playerStats.get(playerId);
        var comboBonus = Math.min((updatedStats.consecutiveHits - 1) * 0.15, ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS);
        var multiHitBonus = Math.min((updatedStats.multiHitCount - 1) * 0.1, ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS);
        console.log('🔄 Combo Analysis:', {
            consecutiveHits: updatedStats.consecutiveHits,
            maxComboBonus: ScoreManager.SCORING_CONFIG.MAX_COMBO_BONUS,
            actualComboBonus: comboBonus.toFixed(2),
            explanation: "".concat(updatedStats.consecutiveHits, " consecutive hits = ").concat(comboBonus.toFixed(2), "x bonus")
        });
        console.log('🎯 Multi-Hit Analysis:', {
            multiHitCount: updatedStats.multiHitCount,
            maxMultiHitBonus: ScoreManager.SCORING_CONFIG.MAX_MULTI_HIT_BONUS,
            actualMultiHitBonus: multiHitBonus.toFixed(2),
            explanation: "".concat(updatedStats.multiHitCount, " hits on target = ").concat(multiHitBonus.toFixed(2), "x bonus")
        });
        // Calculate base score components
        var distanceSizeFactor = distance / averageSize;
        var baseScore = distanceSizeFactor *
            movementMultiplier *
            timeFactor *
            ScoreManager.SCORING_CONFIG.BASE_SCORE_MULTIPLIER;
        var bonusMultiplier = 1 + comboBonus + multiHitBonus;
        var finalScore = Math.max(ScoreManager.SCORING_CONFIG.MIN_SCORE, Math.round(baseScore * bonusMultiplier));
        console.log('💯 Final Score Breakdown:', {
            components: {
                distanceSizeFactor: distanceSizeFactor.toFixed(2),
                movementMultiplier: movementMultiplier.toFixed(2),
                timeFactor: timeFactor.toFixed(2),
                baseMultiplier: ScoreManager.SCORING_CONFIG.BASE_SCORE_MULTIPLIER,
                bonusMultiplier: bonusMultiplier.toFixed(2)
            },
            calculations: {
                baseScore: baseScore.toFixed(2),
                afterBonuses: (baseScore * bonusMultiplier).toFixed(2),
                finalScore: finalScore
            },
            formula: 'Score = ((D/S * M * timeFactor * BASE_MULTIPLIER) * (1 + C + H))'
        });
        return finalScore;
    };
    // Add new method to reset combo
    ScoreManager.prototype.resetCombo = function (playerId) {
        var stats = this.playerStats.get(playerId);
        if (stats) {
            var hadCombo = stats.consecutiveHits >= 3;
            stats.consecutiveHits = 0;
            stats.multiHitCount = 0;
            this.playerStats.set(playerId, stats);
            // Only notify UI if there was an active combo
            if (hadCombo && this.world) {
                this.world.entityManager.getAllPlayerEntities()
                    .filter(function (entity) { return entity.player.id === playerId; })
                    .forEach(function (entity) {
                    entity.player.ui.sendData({
                        type: 'resetCombo'
                    });
                });
            }
        }
    };
    // Add this new method to get placement points
    ScoreManager.prototype.getLeaderboardPoints = function (playerId) {
        var _a, _b;
        return (_b = (_a = this.playerStats.get(playerId)) === null || _a === void 0 ? void 0 : _a.placementPoints) !== null && _b !== void 0 ? _b : 0;
    };
    ScoreManager.SCORING_CONFIG = {
        COMBO_TIMEOUT_MS: 4000, // Increased combo window for early rounds
        TIME_DECAY_FACTOR: 20.0, // More forgiving time decay
        BASE_SCORE_MULTIPLIER: 1.0, // Reduced base multiplier to make progression more meaningful
        MIN_SCORE: 5, // Increased minimum score for better feedback
        // Movement multipliers adjusted for progression
        BASE_MOVEMENT_MULTIPLIER: 1.0, // Base for static targets
        Z_AXIS_MULTIPLIER: 4.0, // New multiplier for Z-Axis blocks
        SINE_WAVE_MULTIPLIER: 3.0, // Reduced from 2.5 for better scaling
        VERTICAL_WAVE_MULTIPLIER: 3.0, // Reduced from 3.0
        POPUP_MULTIPLIER: 4.0, // Reduced from 3.5
        RISING_MULTIPLIER: 5.5, // Reduced from 4.0
        PARABOLIC_MULTIPLIER: 6.0, // Reduced from 4.5
        PENDULUM_MULTIPLIER: 5.0, // Added for pendulum targets
        // Combo system adjusted for early game
        MAX_COMBO_BONUS: 0.5, // Slightly reduced max combo
        MAX_MULTI_HIT_BONUS: 0.3, // Slightly reduced multi-hit
    };
    return ScoreManager;
}(hytopia_1.Entity));
exports.ScoreManager = ScoreManager;
