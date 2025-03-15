"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneUIManager = void 0;
var SceneUIManager = /** @class */ (function () {
    function SceneUIManager(world) {
        this.world = world;
    }
    SceneUIManager.getInstance = function (world) {
        if (!SceneUIManager.instance) {
            SceneUIManager.instance = new SceneUIManager(world);
        }
        return SceneUIManager.instance;
    };
    SceneUIManager.prototype.showHitNotification = function (worldPosition, score, player) {
        console.log('Showing hit notification with score:', score);
        player.ui.sendData({
            type: 'showHitNotification',
            data: {
                score: Math.round(score),
                position: worldPosition
            }
        });
    };
    SceneUIManager.prototype.showBlockDestroyedNotification = function (worldPosition, score, player, spawnOrigin) {
        console.log('Showing block destroyed notification with score:', score);
        // Ensure score is rounded and positive
        var roundedScore = Math.max(0, Math.round(score));
        // Calculate distance multiplier if spawn origin is available
        var distanceMultiplier = 1;
        if (worldPosition && spawnOrigin) {
            var dx = worldPosition.x - spawnOrigin.x;
            var dy = worldPosition.y - spawnOrigin.y;
            var dz = worldPosition.z - spawnOrigin.z;
            var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            distanceMultiplier = 1 + Math.min(Math.pow(distance / 30, 1.1), 0.1);
        }
        // Calculate animation duration
        var duration = 500 + Math.min(roundedScore <= 30
            ? Math.pow(roundedScore, 1.2) * 3
            : Math.pow(roundedScore, 1.8) * 4
                * distanceMultiplier, 1200);
        // Calculate scale
        var scale = 1 + Math.min(roundedScore <= 30
            ? Math.pow(roundedScore / 80, 2.4)
            : Math.pow(roundedScore / 70, 2.4)
                * distanceMultiplier, 0.8);
        var verticalOffset = 1.5 + Math.min(Math.pow(roundedScore / 30, 1.4), 1.5);
        // Calculate color based on score
        var colorInfo = this.getScoreColor(roundedScore);
        // Create animation style
        var dynamicStyle = this.createDynamicStyle(roundedScore, scale, duration, colorInfo);
        // Send notification data to player's UI
        player.ui.sendData({
            type: 'showBlockDestroyedNotification',
            data: {
                score: roundedScore,
                position: worldPosition,
                style: dynamicStyle,
                verticalOffset: verticalOffset,
                duration: duration
            }
        });
    };
    SceneUIManager.prototype.showComboNotification = function (consecutiveHits, comboBonus, player) {
        console.log('Showing combo notification:', { hits: consecutiveHits, bonus: comboBonus });
        player.ui.sendData({
            type: 'showCombo',
            data: {
                hits: consecutiveHits,
                bonus: comboBonus,
                text: this.getComboText(consecutiveHits)
            }
        });
    };
    SceneUIManager.prototype.getComboText = function (hits) {
        if (hits >= 10)
            return 'UNSTOPPABLE!';
        if (hits >= 7)
            return 'DOMINATING!';
        if (hits >= 5)
            return 'IMPRESSIVE!';
        if (hits >= 3)
            return 'NICE COMBO!';
        return '';
    };
    SceneUIManager.prototype.getScoreColor = function (score) {
        var colors = [
            { score: 0, color: '#FFFFFF', glow: '#CCCCCC', intensity: 0.3 },
            { score: 15, color: '#FFFF00', glow: '#CCCC00', intensity: 0.6 },
            { score: 25, color: '#FFA500', glow: '#CC8400', intensity: 0.9 },
            { score: 50, color: '#FF0000', glow: '#CC0000', intensity: 1.2 },
            { score: 150, color: '#FF00FF', glow: '#FFFFFF', intensity: 1.5 }
        ];
        var lower = colors[0];
        var upper = colors[colors.length - 1];
        for (var i = 0; i < colors.length - 1; i++) {
            if (score >= colors[i].score && score < colors[i + 1].score) {
                lower = colors[i];
                upper = colors[i + 1];
                break;
            }
        }
        var range = upper.score - lower.score;
        var factor = range <= 0 ? 1 : (score - lower.score) / range;
        var intensity = lower.intensity + (upper.intensity - lower.intensity) * factor;
        return {
            main: this.interpolateHex(lower.color, upper.color, factor),
            glow: this.interpolateHex(lower.glow, upper.glow, factor),
            intensity: intensity
        };
    };
    SceneUIManager.prototype.interpolateHex = function (hex1, hex2, factor) {
        var r1 = parseInt(hex1.slice(1, 3), 16);
        var g1 = parseInt(hex1.slice(3, 5), 16);
        var b1 = parseInt(hex1.slice(5, 7), 16);
        var r2 = parseInt(hex2.slice(1, 3), 16);
        var g2 = parseInt(hex2.slice(3, 5), 16);
        var b2 = parseInt(hex2.slice(5, 7), 16);
        var r = Math.round(r1 + (r2 - r1) * factor);
        var g = Math.round(g1 + (g2 - g1) * factor);
        var b = Math.round(b1 + (b2 - b1) * factor);
        return "#".concat((r << 16 | g << 8 | b).toString(16).padStart(6, '0'));
    };
    SceneUIManager.prototype.createDynamicStyle = function (score, scale, duration, colorInfo) {
        return "\n      @keyframes scoreAnimation {\n        0% {\n          opacity: 0;\n          transform: translateY(0) scale(0.2);\n        }\n        15% {\n          opacity: 1;\n          transform: translateY(-".concat(8 * scale, "px) scale(").concat(scale * 0.9, ");\n        }\n        30% {\n          opacity: 1;\n          transform: translateY(-").concat(20 * scale, "px) scale(").concat(scale, ");\n        }\n        60% {\n          opacity: 1;\n          transform: translateY(-").concat(35 * scale, "px) scale(").concat(scale, ");\n        }\n        85% {\n          opacity: 0.5;\n          transform: translateY(-").concat(45 * scale, "px) scale(").concat(scale * 0.9, ");\n        }\n        100% {\n          opacity: 0;\n          transform: translateY(-").concat(50 * scale, "px) scale(").concat(scale * 0.8, ");\n        }\n      }\n      animation: scoreAnimation ").concat(duration, "ms ease-out forwards;\n      will-change: transform, opacity;\n      transform: translateZ(0);\n      font-size: ").concat(scale * 48, "px;\n      color: ").concat(colorInfo.main, ";\n      text-shadow: 0 0 ").concat(5 + colorInfo.intensity * 15, "px ").concat(colorInfo.glow, ";\n      --score-value: ").concat(score, ";\n      --intensity: ").concat(colorInfo.intensity, ";\n    ");
    };
    SceneUIManager.prototype.cleanup = function () {
        // No cleanup needed anymore as we're not storing any SceneUI instances
    };
    return SceneUIManager;
}());
exports.SceneUIManager = SceneUIManager;
