"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendulumMovement = exports.ParabolicMovement = exports.RisingMovement = exports.PopUpMovement = exports.StaticMovement = exports.SineWaveMovement = exports.DefaultBlockMovement = void 0;
var DefaultBlockMovement = /** @class */ (function () {
    function DefaultBlockMovement() {
        this.initialY = 0;
        this.heightVariation = 2; // Height variation range
        this.heightPhase = 0; // Phase for height oscillation
    }
    DefaultBlockMovement.prototype.update = function (block, deltaTimeMs) {
        // Initialize height parameters on first update if needed
        if (this.initialY === 0) {
            this.initialY = block.position.y;
            this.heightPhase = Math.random() * Math.PI * 2; // Random starting phase
            this.heightVariation = 1 + Math.random() * 2; // Random height variation between 1-3
        }
        var deltaSeconds = deltaTimeMs / 1000;
        // Calculate height oscillation
        var heightOffset = Math.sin(this.heightPhase + deltaTimeMs / 1000) * this.heightVariation;
        // Update phase
        this.heightPhase += deltaSeconds;
        // Get normalized direction and calculate movement
        var direction = block.getDirection();
        var speed = block.getMoveSpeed() * deltaSeconds;
        // Calculate new position with normalized movement
        var newPosition = {
            x: block.position.x + direction.x * speed,
            y: this.initialY + heightOffset,
            z: block.position.z + direction.z * speed,
        };
        // Check bounds and handle oscillation
        if (!block.isWithinMovementBounds(newPosition)) {
            if (block.shouldOscillate()) {
                block.reverseMovementDirection();
                // Recalculate with reversed direction
                var newDirection = block.getDirection();
                newPosition = {
                    x: block.position.x + newDirection.x * speed,
                    y: this.initialY + heightOffset,
                    z: block.position.z + newDirection.z * speed,
                };
            }
            else {
                block.resetToInitialPosition();
                this.initialY = block.position.y;
                return;
            }
        }
        block.setPosition(newPosition);
    };
    return DefaultBlockMovement;
}());
exports.DefaultBlockMovement = DefaultBlockMovement;
var SineWaveMovement = /** @class */ (function () {
    function SineWaveMovement(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d;
        this.elapsedTime = 0;
        this.initialY = 0;
        this.lastWaveOffset = 0; // Track last offset for smoother transitions
        this.amplitude = (_a = options.amplitude) !== null && _a !== void 0 ? _a : 8; // Default to wider amplitude
        this.frequency = (_b = options.frequency) !== null && _b !== void 0 ? _b : 0.2; // Default to slower frequency
        this.baseAxis = (_c = options.baseAxis) !== null && _c !== void 0 ? _c : 'z';
        this.waveAxis = (_d = options.waveAxis) !== null && _d !== void 0 ? _d : 'x';
    }
    /**
     * Optionally clamps the position to be safely within the bounds.
     * If an axis is fixed (min === max) then it returns that fixed value.
     */
    SineWaveMovement.prototype.clampPosition = function (pos, bounds) {
        var epsilon = 0.05; // Increased epsilon for smoother clamping
        return {
            x: bounds.min.x === bounds.max.x ? bounds.min.x : Math.max(bounds.min.x + epsilon, Math.min(pos.x, bounds.max.x - epsilon)),
            y: bounds.min.y === bounds.max.y ? bounds.min.y : Math.max(bounds.min.y + epsilon, Math.min(pos.y, bounds.max.y - epsilon)),
            z: bounds.min.z === bounds.max.z ? bounds.min.z : Math.max(bounds.min.z + epsilon, Math.min(pos.z, bounds.max.z - epsilon))
        };
    };
    SineWaveMovement.prototype.update = function (block, deltaTimeMs) {
        // Set initialY on first update.
        if (this.elapsedTime === 0) {
            this.initialY = block.position.y;
            this.lastWaveOffset = 0;
        }
        var deltaSeconds = deltaTimeMs / 1000;
        this.elapsedTime += deltaSeconds;
        var baseSpeed = block.getMoveSpeed() * deltaSeconds;
        var baseMovement = block.getDirection()[this.baseAxis] * baseSpeed;
        // Calculate new wave offset with smooth transition
        var targetWaveOffset = this.amplitude * Math.sin(2 * Math.PI * this.frequency * this.elapsedTime);
        // Interpolate between last and target offset for smoother movement
        var smoothingFactor = 0.1; // Lower value = smoother but slower response
        this.lastWaveOffset += (targetWaveOffset - this.lastWaveOffset) * smoothingFactor;
        var newPosition = __assign({}, block.position);
        newPosition[this.baseAxis] += baseMovement;
        // Apply wave offset on the proper axis with smoothing
        if (this.waveAxis === 'y') {
            newPosition.y = this.initialY + this.lastWaveOffset;
        }
        else {
            newPosition[this.waveAxis] = this.lastWaveOffset;
        }
        if (!block.isWithinMovementBounds(newPosition)) {
            if (block.shouldOscillate()) {
                block.reverseMovementDirection();
                // Adjust elapsed time to maintain wave pattern
                this.elapsedTime = Math.PI / (2 * Math.PI * this.frequency) - this.elapsedTime;
                // Recalculate with reversed direction
                var reversedBaseSpeed = block.getMoveSpeed() * deltaSeconds;
                var reversedBaseMovement = block.getDirection()[this.baseAxis] * reversedBaseSpeed;
                newPosition = __assign({}, block.position);
                newPosition[this.baseAxis] += reversedBaseMovement;
                if (this.waveAxis === 'y') {
                    newPosition.y = this.initialY + this.lastWaveOffset;
                }
                else {
                    newPosition[this.waveAxis] = this.lastWaveOffset;
                }
                // Ensure position is within bounds
                if (block['movementBounds']) {
                    newPosition = this.clampPosition(newPosition, block['movementBounds']);
                }
            }
            else {
                block.resetToInitialPosition();
                this.elapsedTime = 0;
                this.lastWaveOffset = 0;
                return;
            }
        }
        block.setPosition(newPosition);
    };
    return SineWaveMovement;
}());
exports.SineWaveMovement = SineWaveMovement;
var StaticMovement = /** @class */ (function () {
    function StaticMovement() {
    }
    StaticMovement.prototype.update = function (block, deltaTimeMs) {
        // Static blocks don't move, but we still need to check if they're within bounds
        if (!block.isWithinMovementBounds(block.position)) {
            block.resetToInitialPosition();
        }
    };
    return StaticMovement;
}());
exports.StaticMovement = StaticMovement;
var PopUpMovement = /** @class */ (function () {
    function PopUpMovement(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c;
        this.elapsedTime = 0;
        this.state = 'rising';
        this.pauseDuration = 3000; // 3 seconds pause at top
        this.pauseStartTime = 0;
        this.startY = (_a = options.startY) !== null && _a !== void 0 ? _a : -20;
        this.topY = (_b = options.topY) !== null && _b !== void 0 ? _b : 8;
        this.pauseDuration = (_c = options.pauseDuration) !== null && _c !== void 0 ? _c : 3000;
    }
    Object.defineProperty(PopUpMovement.prototype, "currentState", {
        // Getters for movement state
        get: function () {
            return this.state;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PopUpMovement.prototype, "isComplete", {
        get: function () {
            return this.state === 'complete';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PopUpMovement.prototype, "isPaused", {
        get: function () {
            return this.state === 'paused';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PopUpMovement.prototype, "timeRemainingInPause", {
        get: function () {
            if (this.state !== 'paused')
                return 0;
            return Math.max(0, this.pauseDuration - (this.elapsedTime - this.pauseStartTime));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PopUpMovement.prototype, "totalElapsedTime", {
        get: function () {
            return this.elapsedTime;
        },
        enumerable: false,
        configurable: true
    });
    // Helper methods for state management
    PopUpMovement.prototype.transitionToState = function (newState) {
        this.state = newState;
        if (newState === 'paused') {
            this.pauseStartTime = this.elapsedTime;
        }
    };
    PopUpMovement.prototype.shouldTransitionFromPaused = function () {
        return this.elapsedTime - this.pauseStartTime >= this.pauseDuration;
    };
    PopUpMovement.prototype.calculateNewPosition = function (currentPosition, deltaSeconds, speed) {
        var newPosition = __assign({}, currentPosition);
        switch (this.state) {
            case 'rising':
                newPosition.y += speed * 2 * deltaSeconds;
                if (newPosition.y >= this.topY) {
                    newPosition.y = this.topY;
                    this.transitionToState('paused');
                }
                break;
            case 'falling':
                newPosition.y -= speed * 2 * deltaSeconds;
                if (newPosition.y <= this.startY) {
                    newPosition.y = this.startY;
                    this.transitionToState('complete');
                }
                break;
        }
        return newPosition;
    };
    PopUpMovement.prototype.update = function (block, deltaTimeMs) {
        this.elapsedTime += deltaTimeMs;
        var deltaSeconds = deltaTimeMs / 1000;
        var speed = block.getMoveSpeed();
        if (this.state === 'complete') {
            if (block.isSpawned) {
                block.despawn();
            }
            return;
        }
        if (this.state === 'paused' && this.shouldTransitionFromPaused()) {
            this.transitionToState('falling');
        }
        var newPosition = this.calculateNewPosition(block.position, deltaSeconds, speed);
        block.setPosition(newPosition);
    };
    return PopUpMovement;
}());
exports.PopUpMovement = PopUpMovement;
var RisingMovement = /** @class */ (function () {
    function RisingMovement(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d;
        this.elapsedTime = 0;
        this.state = 'rising';
        this.pauseDuration = 2000; // 2 seconds pause at first stop
        this.pauseStartTime = 0;
        this.startY = (_a = options.startY) !== null && _a !== void 0 ? _a : -20;
        this.firstStopY = (_b = options.firstStopY) !== null && _b !== void 0 ? _b : 8; // Same height as pop-up target
        this.finalY = (_c = options.finalY) !== null && _c !== void 0 ? _c : 30; // Much higher final position
        this.pauseDuration = (_d = options.pauseDuration) !== null && _d !== void 0 ? _d : 2000;
    }
    Object.defineProperty(RisingMovement.prototype, "currentState", {
        // Getters for movement state
        get: function () {
            return this.state;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RisingMovement.prototype, "isComplete", {
        get: function () {
            return this.state === 'complete';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RisingMovement.prototype, "isPaused", {
        get: function () {
            return this.state === 'paused';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RisingMovement.prototype, "isShooting", {
        get: function () {
            return this.state === 'shooting';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RisingMovement.prototype, "timeRemainingInPause", {
        get: function () {
            if (this.state !== 'paused')
                return 0;
            return Math.max(0, this.pauseDuration - (this.elapsedTime - this.pauseStartTime));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RisingMovement.prototype, "totalElapsedTime", {
        get: function () {
            return this.elapsedTime;
        },
        enumerable: false,
        configurable: true
    });
    // Helper methods for state management
    RisingMovement.prototype.transitionToState = function (newState) {
        this.state = newState;
        if (newState === 'paused') {
            this.pauseStartTime = this.elapsedTime;
        }
    };
    RisingMovement.prototype.shouldTransitionFromPaused = function () {
        return this.elapsedTime - this.pauseStartTime >= this.pauseDuration;
    };
    RisingMovement.prototype.calculateNewPosition = function (currentPosition, deltaSeconds, speed) {
        var newPosition = __assign({}, currentPosition);
        switch (this.state) {
            case 'rising':
                newPosition.y += speed * 2 * deltaSeconds; // Double speed for initial rise
                if (newPosition.y >= this.firstStopY) {
                    newPosition.y = this.firstStopY;
                    this.transitionToState('paused');
                }
                break;
            case 'shooting':
                newPosition.y += speed * 4 * deltaSeconds; // Quadruple speed for final ascent
                if (newPosition.y >= this.finalY) {
                    newPosition.y = this.finalY;
                    this.transitionToState('complete');
                }
                break;
        }
        return newPosition;
    };
    RisingMovement.prototype.update = function (block, deltaTimeMs) {
        this.elapsedTime += deltaTimeMs;
        var deltaSeconds = deltaTimeMs / 1000;
        var speed = block.getMoveSpeed();
        if (this.state === 'complete') {
            if (block.isSpawned) {
                block.despawn();
            }
            return;
        }
        if (this.state === 'paused' && this.shouldTransitionFromPaused()) {
            this.transitionToState('shooting');
        }
        var newPosition = this.calculateNewPosition(block.position, deltaSeconds, speed);
        block.setPosition(newPosition);
    };
    return RisingMovement;
}());
exports.RisingMovement = RisingMovement;
var ParabolicMovement = /** @class */ (function () {
    function ParabolicMovement(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d;
        this.elapsedTime = 0;
        this.startPoint = (_a = options.startPoint) !== null && _a !== void 0 ? _a : { x: 0, y: -20, z: 0 };
        this.endPoint = (_b = options.endPoint) !== null && _b !== void 0 ? _b : { x: 0, y: -20, z: 20 };
        this.maxHeight = (_c = options.maxHeight) !== null && _c !== void 0 ? _c : 15;
        this.totalDuration = (_d = options.duration) !== null && _d !== void 0 ? _d : 5000; // 5 seconds total
        // Calculate physics parameters
        this.gravity = 2 * (this.maxHeight - this.startPoint.y) / Math.pow(this.totalDuration / 4000, 2);
        this.initialVelocityY = Math.sqrt(2 * this.gravity * (this.maxHeight - this.startPoint.y));
        // Calculate horizontal speed based on total distance and time
        var horizontalDistance = Math.sqrt(Math.pow(this.endPoint.x - this.startPoint.x, 2) +
            Math.pow(this.endPoint.z - this.startPoint.z, 2));
        this.horizontalSpeed = horizontalDistance / (this.totalDuration / 1000);
    }
    ParabolicMovement.prototype.calculatePosition = function (time) {
        // Time in seconds
        var t = time / 1000;
        // Calculate progress through the motion (0 to 1)
        var progress = Math.min(t / (this.totalDuration / 1000), 1);
        // Calculate vertical position using physics equations
        var verticalTime = t;
        var y = this.startPoint.y +
            (this.initialVelocityY * verticalTime) -
            (0.5 * this.gravity * verticalTime * verticalTime);
        // Calculate horizontal position with linear interpolation
        var x = this.startPoint.x + (this.endPoint.x - this.startPoint.x) * progress;
        var z = this.startPoint.z + (this.endPoint.z - this.startPoint.z) * progress;
        return { x: x, y: y, z: z };
    };
    ParabolicMovement.prototype.update = function (block, deltaTimeMs) {
        this.elapsedTime += deltaTimeMs;
        // Check if the movement is complete
        if (this.elapsedTime >= this.totalDuration) {
            if (block.isSpawned) {
                block.despawn();
            }
            return;
        }
        var newPosition = this.calculatePosition(this.elapsedTime);
        block.setPosition(newPosition);
    };
    return ParabolicMovement;
}());
exports.ParabolicMovement = ParabolicMovement;
var PendulumMovement = /** @class */ (function () {
    function PendulumMovement(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d;
        this.elapsedTime = 0;
        this.pivotPoint = (_a = options.pivotPoint) !== null && _a !== void 0 ? _a : { x: 0, y: 15, z: 0 }; // Higher default pivot point
        this.length = (_b = options.length) !== null && _b !== void 0 ? _b : 10; // Longer default length
        this.amplitude = (_c = options.amplitude) !== null && _c !== void 0 ? _c : Math.PI / 3; // 60 degrees in radians
        this.frequency = (_d = options.frequency) !== null && _d !== void 0 ? _d : 0.4; // Slightly slower frequency
    }
    PendulumMovement.prototype.update = function (block, deltaTimeMs) {
        this.elapsedTime += deltaTimeMs / 1000;
        // Calculate the current angle using a sine wave
        var angle = this.amplitude * Math.sin(2 * Math.PI * this.frequency * this.elapsedTime);
        // Calculate new position - only rotating around Z axis
        var newPosition = {
            x: this.pivotPoint.x, // Keep X position fixed at pivot point
            y: this.pivotPoint.y - this.length * Math.cos(angle), // Y position changes with swing
            z: this.pivotPoint.z + this.length * Math.sin(angle) // Z position changes with swing
        };
        block.setPosition(newPosition);
    };
    return PendulumMovement;
}());
exports.PendulumMovement = PendulumMovement;
