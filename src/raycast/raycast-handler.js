"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaycastHandler = void 0;
var RaycastHandler = /** @class */ (function () {
    function RaycastHandler(world) {
        this.world = world;
        this.log('RaycastHandler initialized');
    }
    RaycastHandler.prototype.log = function (message) {
        if (this.isDebugRaycastingEnabled()) {
            console.log(message);
        }
    };
    RaycastHandler.prototype.warn = function (message) {
        console.warn(message);
    };
    RaycastHandler.prototype.raycast = function (origin, direction, length, options) {
        // Validate inputs
        if (!origin || !direction || length <= 0) {
            this.warn('Invalid raycast parameters');
            return null;
        }
        // Check for zero vector
        var magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0) {
            this.warn('Invalid raycast parameters: zero direction vector');
            return null;
        }
        this.log("Raycast: From (".concat(origin.x.toFixed(2), ", ").concat(origin.y.toFixed(2), ", ").concat(origin.z.toFixed(2), ") ") +
            "Dir (".concat(direction.x.toFixed(2), ", ").concat(direction.y.toFixed(2), ", ").concat(direction.z.toFixed(2), ") ") +
            "Length ".concat(length));
        var result = this.world.simulation.raycast(origin, direction, length, options);
        if (!result) {
            this.log('No hit detected');
            return null;
        }
        this.log("Hit detected at distance: ".concat(result.hitDistance.toFixed(2), " ") +
            "Point: (".concat(result.hitPoint.x.toFixed(2), ", ").concat(result.hitPoint.y.toFixed(2), ", ").concat(result.hitPoint.z.toFixed(2), ")"));
        if (result.hitBlock) {
            var coord = result.hitBlock.globalCoordinate;
            this.log("Block hit at: (".concat(coord.x, ", ").concat(coord.y, ", ").concat(coord.z, ")"));
        }
        return result;
    };
    RaycastHandler.prototype.enableDebugRaycasting = function (enabled) {
        console.log("".concat(enabled ? 'Enabling' : 'Disabling', " debug raycasting"));
        this.world.simulation.enableDebugRaycasting(enabled);
    };
    RaycastHandler.prototype.isDebugRaycastingEnabled = function () {
        return this.world.simulation.isDebugRaycastingEnabled;
    };
    return RaycastHandler;
}());
exports.RaycastHandler = RaycastHandler;
