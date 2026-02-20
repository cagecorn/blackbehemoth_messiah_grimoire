/**
 * EntityStats.js
 * Centralized configuration for all mercenaries and monsters.
 * 
 * IMPORTANT: Strictly follow the naming convention defined in README.md:
 * - hp, maxHp, mp, maxMp, atk, mAtk, def, mDef, speed, atkSpd, castSpd, acc, eva, crit, id
 */

export const MercenaryClasses = {
    WARRIOR: {
        id: 'warrior',
        name: 'Warrior (전사)',
        sprite: 'warrior_sprite',
        maxHp: 120,
        hp: 120,
        mp: 20,
        maxMp: 20,
        atk: 25,
        mAtk: 5,
        def: 10,
        mDef: 5,
        speed: 100,
        atkSpd: 1200,
        atkRange: 80,
        acc: 90,
        eva: 10,
        crit: 10,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: 0, y: 0 },
        aiType: 'MELEE'
    },
    ARCHER: {
        id: 'archer',
        name: 'Archer (아처)',
        sprite: 'archer_sprite',
        maxHp: 80,
        hp: 80,
        mp: 30,
        maxMp: 30,
        atk: 20,
        mAtk: 5,
        def: 5,
        mDef: 5,
        speed: 120,
        atkRange: 300,
        rangeMin: 150,
        rangeMax: 300,
        atkSpd: 1000,
        acc: 95,
        eva: 20,
        crit: 15,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -50, y: 0 },
        aiType: 'RANGED'
    },
    HEALER: {
        id: 'healer',
        name: 'Healer (힐러)',
        sprite: 'healer_sprite',
        maxHp: 70,
        hp: 70,
        mp: 100,
        maxMp: 100,
        atk: 5,
        mAtk: 25,
        def: 5,
        mDef: 15,
        speed: 110,
        atkRange: 200,
        rangeMin: 180,
        rangeMax: 250,
        atkSpd: 1500,
        castSpd: 1200,
        acc: 80,
        eva: 15,
        crit: 5,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -100, y: 0 },
        aiType: 'SUPPORT'
    },
    WIZARD: {
        id: 'wizard',
        name: 'Wizard (마법사)',
        sprite: 'wizard_sprite',
        maxHp: 65,
        hp: 65,
        mp: 150,
        maxMp: 150,
        atk: 5,
        mAtk: 35,
        def: 5,
        mDef: 20,
        speed: 100,
        atkRange: 250,
        rangeMin: 120,
        rangeMax: 250,
        atkSpd: 1200,
        castSpd: 1000,
        acc: 90,
        eva: 10,
        crit: 20,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -140, y: 0 },
        aiType: 'RANGED'
    },
    BARD: {
        id: 'bard',
        name: 'Bard (바드)',
        sprite: 'bard_sprite',
        maxHp: 75,
        hp: 75,
        mp: 120,
        maxMp: 120,
        atk: 10,
        mAtk: 15, // Used for buff scaling
        def: 5,
        mDef: 10,
        speed: 110,
        atkRange: 200, // Ranged attack distance
        rangeMin: 150,
        rangeMax: 220,
        atkSpd: 1500, // Speed for throwing notes
        castSpd: 2000, // Speed for applying buffs
        acc: 90,
        eva: 20,
        crit: 5,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -180, y: 0 },
        aiType: 'SUPPORT'
    }
};

export const MonsterClasses = {
    GOBLIN: {
        id: 'goblin',
        name: 'Goblin (고블린)',
        sprite: 'goblin_sprite',
        maxHp: 60,
        hp: 60,
        mp: 10,
        maxMp: 10,
        atk: 12,
        mAtk: 2,
        def: 2,
        mDef: 2,
        speed: 50,
        atkRange: 80,
        atkSpd: 1500,
        acc: 85,
        eva: 5,
        crit: 5,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: 400, y: 400 },
        aiType: 'MELEE',
        scale: 1
    },
    SHAMAN: {
        id: 'shaman',
        name: 'Goblin Shaman (주술사)',
        sprite: 'goblin_sprite',
        maxHp: 90,
        hp: 90,
        mp: 80,
        maxMp: 80,
        atk: 5,
        mAtk: 18,
        def: 4,
        mDef: 15,
        speed: 60,
        atkRange: 250,
        rangeMin: 150,
        rangeMax: 280,
        atkSpd: 2000,
        castSpd: 1500,
        acc: 80,
        eva: 10,
        crit: 5,
        physicsRadius: 20,
        spriteSize: 64,
        aiType: 'SUPPORT',
        scale: 1.2
    }
    // New monsters like SLIME or ORC can be added here easily
};

export const GameConfig = {
    LOOT: {
        COLLECT_DELAY: 800,
        SPAWN_VELOCITY_MIN: 50,
        SPAWN_VELOCITY_MAX: 150,
        COOLDOWN_BETWEEN_CHUNKS: 300
    },
    COMBAT: {
        TICK_RATE_MS: 1000,
        BATTLE_INIT_DISTANCE: 80
    }
};

export const StageConfigs = {
    CURSED_FOREST: {
        id: 'cursed_forest',
        name: '저주받은 숲',
        background: 'bg_cursed_forest'
    }
};
