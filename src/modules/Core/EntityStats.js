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
        castSpd: 1000,
        atkRange: 80,
        rangeMin: 0,
        rangeMax: 80,
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
        atkSpd: 1000,
        castSpd: 1000,
        atkRange: 300,
        rangeMin: 150,
        rangeMax: 300,
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

export const Characters = {
    AREN: {
        id: 'aren',
        classId: 'warrior',
        name: 'Aren (아렌)',
        sprite: 'warrior_sprite',
        skillName: 'ChargeAttack',
        personality: '메시아를 향한 충성심에 불타오르는 충직한 전사. 가끔 그 충성심이 지나칠 때가 있음. 고기를 좋아하고 야채를 먹지 못함.'
    },
    ELLA: {
        id: 'ella',
        classId: 'archer',
        name: 'Ella (엘라)',
        sprite: 'archer_sprite',
        skillName: 'KnockbackShot',
        personality: '남자임에도 여자 이름을 지어주신 자신의 부모님을 원망하는 아처. 까칠하고 시큰둥하지만, 이따금씩 동료들을 챙기는 츤데레. 뜨개질을 좋아한다.'
    },
    SERA: {
        id: 'sera',
        classId: 'healer',
        name: 'Sera (세라)',
        sprite: 'healer_sprite',
        skillName: 'MassHeal',
        personality: '입이 아주 거친 힐러. 상처 입은 사람에게 쌍욕을 하며 치유를 해줌. 유기동물들을 돕는 자원 봉사를 자주 다님.'
    },
    MERLIN: {
        id: 'merlin',
        classId: 'wizard',
        name: 'Merlin (멀린)',
        sprite: 'wizard_sprite',
        skillName: 'SkillFireball',
        personality: '가끔 도박장에 출몰한다는 소문이 있는 마법사. 인생은 모든 것이 주사위 놀음이라는 이상한 신조를 가지고 있다. 도박에 빠져사는 주제에 가계부를 아주 잘 쓴다.'
    },
    LUTE: {
        id: 'lute',
        classId: 'bard',
        name: 'Lute (루트)',
        sprite: 'bard_sprite',
        skillName: 'SongOfProtection',
        personality: '음치라서 악기를 연주하는 쪽으로 빠진 음유시인. 아직 노래에 대한 열정을 포기하지 못해서 이따금씩 저질스러운 목소리로 노래를 불러 주위에 민폐를 끼친다. 자주 씻지 않는 편인듯 하다.'
    },
    SILVI: {
        id: 'silvi',
        classId: 'warrior',
        name: 'Silvi (실비)',
        sprite: 'silvi_sprite',
        skillName: 'StoneSkin',
        personality: '가난한 부모님을 돕기 위해 싸우는 소녀 전사. 겁이 많음.'
    },
    NICKLE: {
        id: 'nickle',
        classId: 'archer',
        name: 'Nickle (니클)',
        sprite: 'nickle_sprite',
        skillName: 'TacticalCommand',
        atk: 6,
        mAtk: 1,
        def: 5,
        speed: 40,
        atkRange: 250,
        personality: '여우 수인족 출신의 늙은 베테랑 용병. 전술적이고 통찰력이 깊으나 꼰대 기질이 다분하다. 나이가 많아도 귀여운 수인의 외모를 가지고 있어 그 부분에 심각한 콤플렉스를 가지고 있다.'
    },
    LEONA: {
        id: 'leona',
        classId: 'archer',
        name: 'Leona (레오나)',
        sprite: 'leona_sprite',
        skillName: 'ElectricGrenade',
        personality: "어린 나이에 군에 입대한 병사. 총기를 다루는 데 능숙하며, 생존을 최우선으로 생각한다. '약육강식'을 믿으며, 무력한 자는 살아남을 수 없다고 생각한다."
    },
    KING: {
        id: 'king',
        classId: 'warrior',
        name: 'King (킹)',
        sprite: 'king_sprite',
        skillName: 'BloodRage',
        personality: '몰락한 왕국의 왕이었던 폭군. 지금은 자신의 나라를 재건하기 위해 메시아의 군대에 들어왔다. 무시무시하고 폭력적인 성향이지만, 벌레를 극도로 무서워한다.'
    },
    BOON: {
        id: 'boon',
        classId: 'warrior',
        name: 'Boon (분)',
        sprite: 'boon_sprite',
        skillName: 'HolyAura',
        maxHp: 120,
        hp: 120,
        atk: 8,
        mAtk: 40,
        def: 15,
        castSpd: 1200,
        personality: '구원을 쫓아 메시아의 군대에 들어온 성기사. 자신이 세상을 구원할 존재라 믿는 망상에 시달리고 있다. 평소 생활에선 친절한 맏형 느낌이지만, 악한 존재 앞에선 짐승(미친개)으로 돌변한다.'
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
        atkSpd: 1500,
        castSpd: 1000,
        atkRange: 80,
        rangeMin: 0,
        rangeMax: 80,
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
