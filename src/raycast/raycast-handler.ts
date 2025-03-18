import { Vector3, RaycastHit } from '../types';
import { RaycastOptions, Simulation } from 'hytopia';

export interface WorldInterface {
    simulation: {
        raycast(origin: Vector3, direction: Vector3, length: number, options?: RaycastOptions): RaycastHit | null;
        enableDebugRaycasting(enabled: boolean): void;
        readonly isDebugRaycastingEnabled: boolean;
    };
}

export class RaycastHandler {
    constructor(private world: WorldInterface) {
        this.log('RaycastHandler initialized');
    }

    private log(message: string): void {
        if (this.isDebugRaycastingEnabled()) {
            console.log(message);
        }
    }

    private warn(message: string): void {
        console.warn(message);
    }

    raycast(origin: Vector3, direction: Vector3, length: number, options?: RaycastOptions): RaycastHit | null {
        // Validate inputs
        if (!origin || !direction || length <= 0) {
            this.warn('Invalid raycast parameters');
            return null;
        }

        // Check for zero vector
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (magnitude === 0) {
            this.warn('Invalid raycast parameters: zero direction vector');
            return null;
        }

        this.log(`Raycast: From (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)}) ` +
               `Dir (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)}) ` +
               `Length ${length}`);
        
        const result = this.world.simulation.raycast(origin, direction, length, options);
        
        if (!result) {
            this.log('No hit detected');
            return null;
        }

        this.log(`Hit detected at distance: ${result.hitDistance.toFixed(2)} ` +
               `Point: (${result.hitPoint.x.toFixed(2)}, ${result.hitPoint.y.toFixed(2)}, ${result.hitPoint.z.toFixed(2)})`);
        
        if (result.hitBlock) {
            const coord = result.hitBlock.globalCoordinate;
            this.log(`Block hit at: (${coord.x}, ${coord.y}, ${coord.z})`);
        }

        return result;
    }

    enableDebugRaycasting(enabled: boolean): void {
        this.world.simulation.enableDebugRaycasting(enabled);
    }

    isDebugRaycastingEnabled(): boolean {
        return this.world.simulation.isDebugRaycastingEnabled;
    }
} 
