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
        skillEmoji: '⚔️',
        skillDescription: '가장 많은 적이 뭉친 곳으로 돌격하여 1.5배의 물리 피해를 입히고 1.2초간 공중에 띄웁니다.',
        atk: 12,
        personality: '메시아를 향한 충성심에 불타오르는 충직한 전사. 모든 상황을 기승전"메시아"로 해석한다. 고기를 광적으로 좋아하며 야채는 독약처럼 여긴다. 단순무식하지만 의리는 있다.',
        narrativeUnlocks: [
            { level: 1, trait: '충성심 강한 고기 덕후 전사' },
            { level: 20, trait: '사실 그가 메시아를 따르는 이유는 어린 시절 굶주림에서 구해준 은인이 메시아의 전사였기 때문입니다. 그 전사가 준 육포 맛을 잊지 못해 고기에 집착합니다.' },
            { level: 40, trait: '무식해 보이지만 비밀리에 "고기 요리 대백과"를 집필 중입니다. 언젠가 메시아와 함께 평화로운 세상에서 고기 파티를 여는 것이 꿈입니다.' }
        ],
        relationships: {
            sera: '치료해주는 건 고맙지만, 왜 항상 화가 나 있는지 이해할 수 없다. 혹시 고기를 못 먹어서 예민한 건가?',
            boon: '나와 같은 신념을 가진 훌륭한 동료! 하지만 가끔 눈빛이 너무 무서워서 흠칫한다.',
            king: '과거의 폭군이라 경계하고 있다. 하지만 벌레만 보면 비명을 지르는 꼴이 우습기도 하다.'
        }
    },
    ELLA: {
        id: 'ella',
        classId: 'archer',
        name: 'Ella (엘라)',
        sprite: 'archer_sprite',
        skillName: 'KnockbackShot',
        skillEmoji: '🏹',
        skillDescription: '모든 적을 관통하는 거대한 화살을 발사합니다. 2.0배의 물리 피해를 입히고 뒤로 강하게 밀쳐냅니다.',
        atk: 10,
        personality: '남자임에도 여자 이름을 지어주신 부모님을 원망하는 아처. 심각한 콤플렉스가 있다. 까칠하고 시큰둥하지만, 사실은 동료들을 챙기는 츤데레. 뜨개질 덕후라 전투 중에도 실 색깔을 고민한다.',
        narrativeUnlocks: [
            { level: 1, trait: '츤데레 뜨개질 아처' },
            { level: 20, trait: '그가 뜨개질에 집착하는 이유는 부모님이 지어준 여성스러운 이름에 어울리는 섬세한 기술을 익혀 부모님께 복수(?)하겠다는 엉뚱한 동기에서 시작되었습니다.' },
            { level: 40, trait: '사실 그가 뜬 목도리에는 받은 사람을 지켜주는 고대 마법의 매듭법이 섞여 있습니다. 무심한 척 건네는 선물에는 깊은 애정이 담겨 있습니다.' }
        ],
        relationships: {
            nickle: '잔소리 심한 꼰대 영감탱이. 말만 안 하면 귀여운 여우인데 입만 열면 깬다.',
            silvi: '너무 소심해서 답답하다. 그래도 챙겨주고 싶다. 이번에 뜬 목도리는 얘한테 줘야지.',
            lute: '제발 노래 좀 안 불렀으면 좋겠다. 뜨개질 집중이 안 된다.'
        }
    },
    SERA: {
        id: 'sera',
        classId: 'healer',
        name: 'Sera (세라)',
        sprite: 'healer_sprite',
        skillName: 'MassHeal',
        skillEmoji: '💚',
        skillDescription: '모든 아군에게 마법 공격력의 3.0배에 달하는 대량의 체력을 즉시 회복시킵니다.',
        atk: 5,
        mAtk: 25,
        personality: '입이 아주 거친 욕쟁이 힐러. "이런 젠장, 또 다쳤어?"라며 쌍욕을 퍼붓고 치료해준다. 인간에겐 불친절하지만 동물에겐 한없이 다정한 동물 애호가.',
        relationships: {
            aren: '무식하게 돌격해서 다쳐오는 꼴통 1호. 치료해주기 귀찮아 죽겠다.',
            lute: '저 인간의 노래는 소음 공해다. 귀가 썩을 것 같다.',
            nickle: '꼰대지만 수인(동물)이라서 유일하게 친절하게 대한다. 쓰담쓰담 해주고 싶다.'
        }
    },
    MERLIN: {
        id: 'merlin',
        classId: 'wizard',
        name: 'Merlin (멀린)',
        sprite: 'wizard_sprite',
        skillName: 'SkillFireball',
        skillEmoji: '🔥',
        skillDescription: '하늘에서 거대한 불덩이를 떨어뜨려 넓은 범위에 마법 공격력의 1.8배 피해를 입히고 기절시킵니다.',
        atk: 5,
        mAtk: 35,
        personality: '도박에 미친 마법사. 인생의 모든 것을 확률과 운, 홀짝으로 해석한다. "이번 마법이 빗나갈 확률은 3%!" 같은 소리를 한다. 도박광 주제에 가계부는 꼼꼼히 쓴다.',
        relationships: {
            king: '왕년의 왕이라니 숨겨둔 금괴가 있지 않을까? 도박 자금 좀 빌려달라고 꼬셔봐야겠다.',
            leona: '너무 진지해서 재미없는 타입. 내기를 걸면 질색팔색을 한다.',
            ella: '뜨개질 실 색깔 맞추기 내기를 하자고 했다가 화살 맞을 뻔했다.'
        }
    },
    LUTE: {
        id: 'lute',
        classId: 'bard',
        name: 'Lute (루트)',
        sprite: 'bard_sprite',
        skillName: 'SongOfProtection',
        skillEmoji: '🛡️',
        skillDescription: '수호의 노래로 모든 아군에게 마법 공격력의 2.5배에 해당하는 보호막(5초)을 부여합니다.',
        atk: 10,
        mAtk: 15,
        personality: '심각한 음치 바드. 본인은 절대음감이라 믿는다. 그의 노래는 아군에게 버프를 주지만 고막에는 고통을 준다. 잘 안 씻어서 냄새가 좀 난다.',
        relationships: {
            sera: '내 노래를 듣고 감동해서 우는 줄 안다. (사실 괴로워하는 건데)',
            ella: '뜨개질 그만하고 내 예술적인 노래나 들으라고 강요한다.',
            boon: '유일하게 내 노래를 영웅의 서사시라며 좋아해주는(척 하는?) 관객.'
        }
    },
    SILVI: {
        id: 'silvi',
        classId: 'warrior',
        name: 'Silvi (실비)',
        sprite: 'silvi_sprite',
        skillName: 'StoneSkin',
        skillEmoji: '🪨',
        skillDescription: '피부를 돌처럼 단단하게 만들어 5초 동안 받는 모든 피해를 20% 감소시킵니다.',
        // Tank: high hp/def, low atk
        maxHp: 145,
        hp: 145,
        atk: 12,
        def: 22,
        mDef: 12,
        speed: 90,
        crit: 5,
        personality: '고향의 부모님을 부양하는 효녀 소녀가장. 겁이 많고 소심해서 몬스터를 보면 눈물부터 흘린다. "죄송합니다, 때려서 죄송합니다!"라고 사과하며 탱킹을 한다. 존댓말 캐릭터.',
        narrativeUnlocks: [
            { level: 1, trait: '착한 효녀 소녀 기사' },
            { level: 20, trait: '부모님께 부쳐드리는 약값 봉투 안에는 항상 자신이 기사로서 용맹하게 싸우고 있다는 거짓 섞인 영웅담 편지가 들어있습니다.' },
            { level: 40, trait: '사실 그녀는 겁쟁이가 아닙니다. 사랑하는 사람들을 지키기 위해서라면 죽음조차 두려워하지 않는 누구보다 강한 영혼의 소유자입니다.' }
        ],
        relationships: {
            king: '너무 무섭게 생겨서 눈도 못 마주치겠다. 옆에만 가도 얼어버린다.',
            boon: '착한 오빠 같지만, 화나면 눈빛이 변해서 무섭다. 최대한 피해 다닌다.',
            ella: '항상 챙겨주시는 고마운 언니... 오빠? 아무튼 고마운 분.'
        }
    },
    NICKLE: {
        id: 'nickle',
        classId: 'archer',
        name: 'Nickle (니클)',
        sprite: 'nickle_sprite',
        skillName: 'TacticalCommand',
        skillEmoji: '📢',
        skillDescription: '자신과 무작위 아군 1명의 모든 기본 행동(공격, 힐, 버프) 수치를 10초간 50% 강화합니다.',
        atk: 6,
        mAtk: 1,
        def: 5,
        speed: 40,
        atkRange: 250,
        personality: '여우 수인족 출신의 늙은 베테랑. "나 때는 말이야~"를 입에 달고 사는 꼰대. 늙은이 취급 당하는 걸 싫어하지만, 귀여운 외모 때문에 아무도 그를 어르신으로 안 본다.',
        relationships: {
            ella: '버르장머리 없는 녀석. 하지만 뜨개질 실력 하나는 인정한다.',
            sera: '나한테만 유독 친절해서 부담스럽다. 자꾸 어린애 다루듯 쓰담쓰담 하는데 기분이 묘하다.',
            aren: '요즘 젊은것들은 전술을 모른다. 무조건 돌격이라니, 쯧쯧.'
        }
    },
    LEONA: {
        id: 'leona',
        classId: 'archer',
        name: 'Leona (레오나)',
        sprite: 'leona_sprite',
        skillName: 'ElectricGrenade',
        skillEmoji: '💣',
        skillDescription: '전기 수류탄을 던져 범위 내 적들에게 1.8배 피해를 입히고 3초간 감전(행동불능) 상태로 만듭니다.',
        atk: 18,
        personality: "생존주의자 밀덕(밀리터리 덕후). 약육강식을 신봉하며 감정을 배제하려 애쓴다. 무기 손질에 집착하며, 은근히 허당끼가 있어 함정을 피하려다 자기가 걸린다.",
        relationships: {
            merlin: '진지함이라곤 없는 한심한 작자. 전쟁이 장난인가?',
            aren: '전술이라곤 모르는 무식한 돌격병. 저런 녀석이 제일 먼저 죽는다.',
            king: '과거의 왕이라지만 지금은 그냥 동료일 뿐. 그래도 전투 실력은 인정한다.'
        }
    },
    KING: {
        id: 'king',
        classId: 'warrior',
        name: 'King (킹)',
        sprite: 'king_sprite',
        skillName: 'BloodRage',
        skillEmoji: '🩸',
        skillDescription: '5초간 공격력/이동속도/공격속도를 50% 증가시키고, 피해량의 35%를 흡혈합니다.',
        // Aggressive attacker: high atk/crit, lower def/hp
        maxHp: 100,
        hp: 100,
        atk: 32,
        def: 7,
        mDef: 3,
        speed: 105,
        crit: 15,
        personality: '몰락한 왕국의 폭군 출신. 위엄 있고 잔혹한 척하지만, 사실 벌레 공포증이 있다. 벌레만 보면 "꺄아악!" 비명을 지르며 체통을 잃는다.',
        relationships: {
            silvi: '왜 나만 보면 도망가는지 이해할 수 없다. 내가 그렇게 무섭나? (자신감)',
            merlin: '자꾸 돈 빌려달라고 해서 짜증난다. 짐은 파산했다고 몇 번을 말해야 하나.',
            aren: '충성심 하나는 마음에 드는 녀석이다. 내 신하로 삼고 싶군.'
        }
    },
    BOON: {
        id: 'boon',
        classId: 'warrior',
        name: 'Boon (분)',
        sprite: 'boon_sprite',
        skillName: 'HolyAura',
        skillEmoji: '✨',
        skillDescription: '5초간 caster 주변에 치유의 오라를 생성하여 범위 내 아군을 매초 (5 + 마법 공격력의 50%)만큼 회복시킵니다.',
        maxHp: 120,
        hp: 120,
        atk: 8,
        mAtk: 40,
        def: 15,
        castSpd: 1200,
        personality: '심각한 망상증 성기사. 자기가 세상의 주인공이고 나머지는 조연이라 생각한다. 평소엔 친절한 맏형이지만, 악한 존재 앞에선 미친개로 돌변하여 폭주한다.',
        relationships: {
            aren: '나의 충실한 부하 1호(라고 멋대로 생각함).',
            lute: '나의 영웅담을 노래로 만들어달라고 조른다. "분, 그 위대한 일격!" 같은 제목으로.',
            silvi: '지켜줘야 할 가련한 백성. 겁먹지 말거라, 이 몸이 있다!'
        }
    },
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
