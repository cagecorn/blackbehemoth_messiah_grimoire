export default class Blackboard {
    constructor() {
        this.data = new Map();
    }

    set(key, value) {
        this.data.set(key, value);
    }

    get(key) {
        return this.data.get(key);
    }

    has(key) {
        return this.data.has(key);
    }

    delete(key) {
        this.data.delete(key);
    }

    // Helper to get formatted dump for debugging
    dump() {
        let output = 'Blackboard Dump:\n';
        for (const [key, value] of this.data.entries()) {
            output += `  ${key}: ${JSON.stringify(value)}\n`;
        }
        return output;
    }
}
