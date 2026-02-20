import Phaser from 'phaser';

/**
 * TargetingUtils.js
 * Utility functions for advanced targeting like finding clusters of enemies.
 */
export default class TargetingUtils {

    /**
     * Finds the 'center of mass' of the largest cluster of targets within a given radius.
     * @param {Array} targets - Array of potential targets (e.g. enemies.getChildren())
     * @param {number} clusterRadius - The radius defining a "cluster"
     * @returns {Object|null} { x, y, targetsInCluster, count } or null if no targets
     */
    static findLargestCluster(targets, clusterRadius = 150) {
        if (!targets || targets.length === 0) return null;

        // Filter out dead targets
        const validTargets = targets.filter(t => t.active && t.hp > 0);
        if (validTargets.length === 0) return null;

        let bestCluster = null;
        let maxCount = 0;

        // O(N^2) approach: For each target, count how many other targets are within clusterRadius
        // This is fine for small numbers of entities (<50). For larger, use a spatial grid.
        for (let i = 0; i < validTargets.length; i++) {
            const centerTarget = validTargets[i];
            const inCluster = [];

            for (let j = 0; j < validTargets.length; j++) {
                const other = validTargets[j];
                const dist = Phaser.Math.Distance.Between(centerTarget.x, centerTarget.y, other.x, other.y);

                if (dist <= clusterRadius) {
                    inCluster.push(other);
                }
            }

            if (inCluster.length > maxCount) {
                maxCount = inCluster.length;

                // Calculate average position of the cluster
                let sumX = 0, sumY = 0;
                inCluster.forEach(t => {
                    sumX += t.x;
                    sumY += t.y;
                });

                bestCluster = {
                    x: sumX / maxCount,
                    y: sumY / maxCount,
                    targetsInCluster: inCluster,
                    count: maxCount
                };
            }
        }

        return bestCluster;
    }
}
