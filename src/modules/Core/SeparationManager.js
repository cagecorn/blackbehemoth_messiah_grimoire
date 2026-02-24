import Phaser from 'phaser';

/**
 * SeparationManager.js
 * Modular utility to handle repulsive forces between units.
 * Prevents "infinite spinning" and stacking by nudging overlapping units apart.
 */
export default class SeparationManager {
    /**
     * Applies a repulsive force to both units if they are overlapping.
     * @param {Phaser.GameObjects.GameObject} unitA 
     * @param {Phaser.GameObjects.GameObject} unitB 
     * @param {number} strength - Initial nudge strength (default 50)
     */
    static applyRepulsion(unitA, unitB, strength = 50) {
        if (!unitA.body || !unitB.body || !unitA.active || !unitB.active) return;

        // If either unit is phasing, they can pass through each other
        if (unitA.isPhasing || unitB.isPhasing) return;

        // Optimization: Check squared distance first to avoid expensive sqrt
        const radiusA = unitA.body.radius || 20;
        const radiusB = unitB.body.radius || 20;
        const minOverlap = radiusA + radiusB;
        const minOverlapSq = minOverlap * minOverlap;

        const distSq = Phaser.Math.Distance.Squared(unitA.x, unitA.y, unitB.x, unitB.y);

        if (distSq < minOverlapSq) {
            const dist = Math.sqrt(distSq);

            // Calculate direction from B to A
            let angle = Phaser.Math.Angle.Between(unitB.x, unitB.y, unitA.x, unitA.y);

            // If they are at the exact same point, use a random angle to break the tie
            if (dist === 0) {
                angle = Math.random() * Math.PI * 2;
            }

            // Calculate overlap distance
            const overlap = minOverlap - dist;
            // Apply a small positional nudge (0.5 for each to share the displacement)
            const nudgeX = Math.cos(angle) * overlap * 0.5;
            const nudgeY = Math.sin(angle) * overlap * 0.5;

            unitA.x += nudgeX;
            unitA.y += nudgeY;

            unitB.x -= nudgeX;
            unitB.y -= nudgeY;
        }
    }
}
