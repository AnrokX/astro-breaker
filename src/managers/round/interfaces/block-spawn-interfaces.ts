import { Vector3Like } from 'hytopia';

export interface SpawnPosition extends Vector3Like {
    moveSpeed?: number;
}

export interface SineWaveBlockConfig {
    spawnPosition: Vector3Like;
    moveSpeed: number;
    amplitude: number;
    frequency: number;
    blockTextureUri?: string;
}

export interface VerticalWaveBlockConfig {
    spawnPosition: Vector3Like;
    moveSpeed: number;
    amplitude: number;
    frequency: number;
}

export interface PopUpTargetConfig {
    spawnPosition: Vector3Like;
    startY: number;
    topY: number;
    moveSpeed: number;
}

export interface RisingTargetConfig {
    startY: number;
    firstStopY: number;
    finalY: number;
    moveSpeed: number;
    pauseDuration: number;
}

export interface ParabolicTargetConfig {
    startPoint: Vector3Like;
    endPoint: Vector3Like;
    maxHeight: number;
    duration: number;
    moveSpeed: number;
}

export interface PendulumTargetConfig {
    pivotPoint: Vector3Like;
    length: number;
    amplitude: number;
    frequency: number;
    moveSpeed: number;
}