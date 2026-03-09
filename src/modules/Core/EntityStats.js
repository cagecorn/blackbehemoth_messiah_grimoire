/**
 * EntityStats.js
 * Centralized configuration for all mercenaries and monsters.
 */

export const Skins = {
    NICKLE_FOX: {
        id: 'nickle_fox',
        characterId: 'nickle',
        name: '여우 아니다 (I\'m not a fox)',
        sprite: 'nickle_fox_sprite',
        cutscene: 'nickle_fox_cutscene',
        ultimateSprite: 'nickle_fox_ultimate_sprite',
        price: 80000,
        description: '귀여운 여우 복장을 입은 니클. 사실 자기는 여우가 아니라 늑대라고 주장하지만 아무도 안 믿는다.',
        abilityBonus: {
            skillId: 'tactical_command',
            bonusText: '전술 지휘 시 공격 속도 +25% 추가 상승',
            effect: { atkSpdMult: 0.25 }
        }
    },
    NANA_IDOL: {
        id: 'nana_idol',
        characterId: 'nana',
        name: '모두의 아이돌',
        sprite: 'nana_idol_sprite',
        cutscene: 'nana_idol_cutscene',
        ultimateSprite: 'nana_idol_ultimate_sprite',
        price: 120000,
        description: '나나의 모두의 아이돌 스킨. 전장을 화려한 콘서트장으로 만든다.',
        abilityBonus: {
            skillId: 'musical_magical_critical',
            bonusText: '뮤지컬매지컬크리티컬 시전 시 아군/적군 양쪽 동시 적용',
            effect: { dualZone: true }
        }
    }
};

export const MercenaryClasses = {
    WARRIOR: {
        id: 'warrior',
        name: 'Warrior (전사)',
        sprite: 'warrior_sprite',
        maxHp: 120,
        hp: 120,
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
        aiType: 'MELEE',
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        growth: { maxHp: 20, atk: 3, mAtk: 1, def: 2, mDef: 1.2, acc: 0.5, eva: 0.5 }
    },
    ARCHER: {
        id: 'archer',
        name: 'Archer (아처)',
        sprite: 'archer_sprite',
        maxHp: 80,
        hp: 80,
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
        aiType: 'RANGED',
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        growth: { maxHp: 10, atk: 3, mAtk: 1, def: 1, mDef: 1, acc: 2, eva: 2, atkSpd: -5 }
    },
    HEALER: {
        id: 'healer',
        name: 'Healer (힐러)',
        sprite: 'healer_sprite',
        maxHp: 70,
        hp: 70,
        atk: 5,
        mAtk: 25,
        def: 5,
        mDef: 15,
        speed: 110,
        atkRange: 200,
        rangeMin: 180,
        rangeMax: 260,
        atkSpd: 1500,
        castSpd: 1200,
        acc: 80,
        eva: 15,
        crit: 5,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -100, y: 0 },
        aiType: 'SUPPORT',
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        growth: { maxHp: 10, atk: 1, mAtk: 4, def: 1, mDef: 2.5, acc: 1, eva: 1 }
    },
    WIZARD: {
        id: 'wizard',
        name: 'Wizard (마법사)',
        sprite: 'wizard_sprite',
        maxHp: 65,
        hp: 65,
        atk: 5,
        mAtk: 35,
        def: 5,
        mDef: 20,
        speed: 110,
        atkRange: 300,
        rangeMin: 160,
        rangeMax: 300,
        atkSpd: 1200,
        castSpd: 1000,
        acc: 90,
        eva: 10,
        crit: 20,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: -140, y: 0 },
        aiType: 'RANGED',
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        growth: { maxHp: 10, atk: 1, mAtk: 5, def: 1, mDef: 2, acc: 2, eva: 1 }
    },
    BARD: {
        id: 'bard',
        name: 'Bard (바드)',
        sprite: 'bard_sprite',
        maxHp: 75,
        hp: 75,
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
        aiType: 'SUPPORT',
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        growth: { maxHp: 15, atk: 1.8, mAtk: 1.8, def: 1.8, mDef: 1.8, acc: 1, eva: 1 }
    }
};

export const Characters = {
    AREN: {
        id: 'aren',
        characterId: 'aren',
        classId: 'warrior',
        name: 'Aren (아렌)',
        sprite: 'warrior_sprite',
        skillName: 'ChargeAttack',
        skillEmoji: '⚔️',
        skillDescription: '가장 많은 적이 뭉친 곳으로 돌격하여 공격력의 2.0배 물리 피해를 입히고 2초간 공중에 띄웁니다. (재사용 대기시간 8초)',
        ultimateName: '메시아를 위하여!',
        ultimateDescription: '공중으로 뛰어올라 적 밀집 지역을 강타하여 공격력의 4.0배 광역 피해를 입히고 공중에 띄운 뒤 기절시킵니다.',
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
        },
        dialogueExamples: [
            "메시아를 위하여! 이 검이 당신의 길을 비추리라.",
            "오늘 저녁은 고기인가? 고기 냄새가 나는 것 같군!",
            "풀때기라고? 그런 독약은 치워라. 전사는 육류를 섭취해야 한다.",
            "메시아의 영광이 우리와 함께하시니 두려울 것이 없다.",
            "방금 그 몬스터... 꽤 쫄깃해 보이는 고기를 가졌군.",
            "야채를 먹으라고? 차라리 내 목을 베어라!",
            "적들이 몰려온다! 메시아의 방패가 되어 모두를 지키겠다!",
            "고기... 육즙이 가득한 스테이크가 그립구나.",
            "메시아께서 말씀하셨지. 전사는 고기로 몸을 채우고 신념으로 혼을 채운다고.",
            "어이, 아처! 고기 굽는 법 좀 아나? 화살로 멧돼지나 좀 잡아오라고.",
            "메시아를 모독하는 자, 내 검이 용서치 않을 것이다!",
            "후우... 전투 후에 먹는 고기 한 점. 이것이야말로 극락이로다."
        ]
    },
    ELLA: {
        id: 'ella',
        characterId: 'ella',
        classId: 'archer',
        name: 'Ella (엘라)',
        sprite: 'archer_sprite',
        skillName: 'KnockbackShot',
        skillEmoji: '🏹',
        skillDescription: '모든 적을 관통하는 화살을 발사하여 공격력의 2.5배 물리 피해를 입히고 뒤로 강하게 밀쳐냅니다. (재사용 대기시간 6초)',
        ultimateName: '운명의 끈',
        ultimateDescription: '에너지를 모아 강력한 화살을 발사한 뒤, 빨간 궤적의 실들이 화면을 가로지르며 모든 적에게 공격력 기반의 물리 피해를 입힙니다.',
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
        },
        dialogueExamples: [
            "엘라라고 부르지 마! 몇 번을 말해야 알아듣는 거야?",
            "흥, 딱히 널 위해서 구한 건 아니야. 그냥 화살이 남아서 쏜 거라고.",
            "이 실 색깔... 다음엔 무슨 목도리를 뜰까 고민 중이야.",
            "여자 이름이라고 놀려봐, 바로 네 엉덩이에 화살을 박아줄 테니까.",
            "넌 왜 그렇게 소심해? 자, 이거 내가 뜬 건데... 쓰든지 말든지.",
            "전투 중에 뜨개질이라니? 이건 내 고도의 집중력 훈련이라고!",
            "부모님은 대체 왜... 엘라라니, 정말 센스가 없다니까.",
            "화살촉이 무뎌졌군. 실로 매듭이라도 지어놔야 하나.",
            "그렇게 빤히 보지 마! 뜨개질하는 남자 처음 봐?",
            "다쳤으면 말을 하지... 자, 붕대 대신 이 남은 실로 대충 묶어줄게.",
            "메시아? 아렌은 너무 시끄러워. 뜨개질 집중이 안 된다고.",
            "쳇, 이번 전투만 끝나봐. 새로 산 실로 멋진 장갑을 만들 테니까."
        ]
    },
    SERA: {
        id: 'sera',
        characterId: 'sera',
        classId: 'healer',
        name: 'Sera (세라)',
        sprite: 'healer_sprite',
        skillName: 'MassHeal',
        skillEmoji: '💚',
        skillDescription: '모든 아군에게 마법 공격력의 3.0배에 달하는 체력을 즉시 회복시킵니다. (재사용 대기시간 8초)',
        ultimateName: '소환 : 수호 천사',
        ultimateDescription: '성스러운 빛으로 수호 천사를 소환합니다. 수호 천사는 아군을 대신해 싸우며 스테이지가 올라갈수록 더욱 강력해집니다.',
        atk: 5,
        mAtk: 25,
        personality: '입이 아주 거친 욕쟁이 힐러. "이런 젠장, 또 다쳤어?"라며 쌍욕을 퍼붓고 치료해준다. 인간에겐 불친절하지만 동물에겐 한없이 다정한 동물 애호가.',
        relationships: {
            aren: '무식하게 돌격해서 다쳐오는 꼴통 1호. 치료해주기 귀찮아 죽겠다.',
            lute: '저 인간의 노래는 소음 공해다. 귀가 썩을 것 같다.',
            nickle: '꼰대지만 수인(동물)이라서 유일하게 친절하게 대한다. 쓰담쓰담 해주고 싶다.'
        },
        dialogueExamples: [
            "이런 젠장, 또 처맞고 왔어? 작작 좀 다치라고!",
            "아악! 비명 지르지 마! 고쳐주는데 왜 지랄이야?",
            "치료비는 스테이크로 받겠다. 아렌 그 자식 고기 뺏어서 가져와.",
            "우쭈쭈... 우리 애기, 배고프니? 저 멍청한 전사들보단 네가 훨씬 낫다.",
            "닥치고 가만히 있어. 상처 벌어지면 네 손해니까.",
            "힐 넣어주니까 고마운 줄 알아야지. 혓바닥이 왜 그렇게 길어?",
            "난 동물이 좋아. 인간들은 이기적이고 멍청하거든. 너희 빼고.",
            "이 상처... 꽤 깊군. 흉터 남아도 내 탓 하지 마라?",
            "아, 진짜 귀찮게... 자, 됐지? 이제 꺼져서 싸우기나 해.",
            "고맙단 소리는 됐어. 다음엔 죽어서 오지나 마.",
            "저기 길고양이 한 마리가 있네... 야, 먹을 거 좀 내놔봐!",
            "후우... 이 짓도 지긋지긋해. 평화로워지면 동물 보호소나 차려야지."
        ]
    },
    MERLIN: {
        id: 'merlin',
        characterId: 'merlin',
        classId: 'wizard',
        name: 'Merlin (멀린)',
        sprite: 'wizard_sprite',
        skillName: 'SkillFireball',
        skillEmoji: '🔥',
        skillDescription: '하늘에서 거대한 불덩이를 떨어뜨려 범위 내 적들에게 마법 공격력의 1.8배 피해를 입힙니다. 속성 무기 장착 시 1~50%의 화염 추가 피해가 발생하며 기절시킵니다. (재사용 대기시간 5초)',
        ultimateName: '메테오 스트라이크',
        ultimateDescription: '50발의 운석이 각 마법 공격력의 0.85배 마법 피해를 입히며 150px 반경 AOE를 타격합니다. (속성 무기 장착 시 1~50% 화염 추가 피해)',
        atk: 5,
        mAtk: 35,
        personality: '도박에 미친 마법사. 인생의 모든 것을 확률과 운, 홀짝으로 해석한다. "이번 마법이 빗나갈 확률은 3%!" 같은 소리를 한다. 도박광 주제에 가계부는 꼼꼼히 쓴다.',
        relationships: {
            king: '왕년의 왕이라니 숨겨둔 금괴가 있지 않을까? 도박 자금 좀 빌려달라고 꼬셔봐야겠다.',
            leona: '너무 진지해서 재미없는 타입. 내기를 걸면 질색팔색을 한다.',
            ella: '뜨개질 실 색깔 맞추기 내기를 하자고 했다가 화살 맞을 뻔했다.'
        },
        dialogueExamples: [
            "이번 마법이 빗나갈 확률은 3.14%! 과감하게 베팅하겠네.",
            "인생은 어차피 홀짝이지. 자, 내 지팡이가 어느 쪽으로 쓰러질까?",
            "이 몬스터가 아이템을 드롭할 확률... 음, 7% 정도군. 한 번 걸어보겠나?",
            "아이고, 이번 달 가계부가 적자라니! 다음 모험에선 반드시 대박을 터뜨려야 해.",
            "확률은 거짓말을 하지 않네. 운이 없을 뿐이지.",
            "세상은 거대한 도박판이고, 우리 모두는 그 위의 칩일 뿐이야.",
            "6면체 주사위를 던져서 1이 나올 확률보다 내가 여기서 도망갈 확률이 더 높군.",
            "잠깐! 내 가계부에 기록 좀 해야 하네. 물약 값으로 300골드라니, 너무 비싸잖아!",
            "운명은 스스로 개척하는 게 아니라, 확률 높은 쪽에 베팅하는 걸세.",
            "어이, 아렌! 네가 메시아를 만날 확률과 내가 대박 날 확률 중 어느 게 더 높을 것 같나?",
            "베팅의 기본은 분산 투자지. 불덩이 세 개를 나누어 던지겠네!",
            "후후후... 오늘은 왠지 느낌이 좋아. 가계부에 흑자를 기록할 수 있겠군."
        ]
    },
    LUTE: {
        id: 'lute',
        characterId: 'lute',
        classId: 'bard',
        name: 'Lute (루트)',
        sprite: 'bard_sprite',
        skillName: 'SongOfProtection',
        skillEmoji: '🛡️',
        skillDescription: '수호의 노래로 모든 아군에게 마법 공격력의 2.5배에 해당하는 보호막(5초)을 부여합니다. (재사용 대기시간 10초)',
        ultimateName: '소환 : 사이렌',
        ultimateDescription: '아름다운 목소리의 사이렌을 소환합니다. 사이렌의 노래는 적들을 수면에 빠뜨려 무력화시킵니다.',
        atk: 10,
        mAtk: 15,
        personality: '심각한 음치 바드. 본인은 절대음감이라 믿는다. 그의 노래는 아군에게 버프를 주지만 고막에는 고통을 준다. 잘 안 씻어서 냄새가 좀 난다.',
        relationships: {
            sera: '내 노래를 듣고 감동해서 우는 줄 안다. (사실 괴로워하는 건데)',
            ella: '뜨개질 그만하고 내 예술적인 노래나 들으라고 강요한다.',
            boon: '유일하게 내 노래를 영웅의 서사시라며 좋아해주는(척 하는?) 관객.'
        },
        dialogueExamples: [
            "나의 천공을 울리는 미성을 들어라! 아아아아~",
            "음치라니? 내 귀에는 완벽한 C#으로 들리는데 말이야.",
            "이 노래는 고대 영웅들의 서사시... 읍! 왜 다들 귀를 막는 거지?",
            "씻는 건 예술가의 영혼을 갉아먹는 행위지. 이 체취야말로 진정한 예술의 향기다.",
            "내 비파 소리에 몬스터들도 감동해서 쓰러지는군!",
            "자, 앙코르 요청인가? 기대에 부응해주지. 이번엔 더 높은 음으로!",
            "세라, 내 노래에 감동해서 우는 건가?",
            "예술은 고통이야. 내 노래를 듣는 너희의 고통도 예술의 일부지.",
            "음악은 마음으로 듣는 거야. 귀로 듣지 말고 영혼으로 느껴보라고.",
            "어이, 엘라! 내 노래에 맞춰서 뜨개질을 해봐. 리듬감이 끝내줄 걸?",
            "목이 좀 쉬었군... 하지만 진정한 가수는 목 상태를 탓하지 않지.",
            "후우... 오늘 공연도 완벽했어. 팬 서비스로 한 곡 더 뽑아볼까?"
        ]
    },
    SILVI: {
        id: 'silvi',
        characterId: 'silvi',
        classId: 'warrior',
        name: 'Silvi (실비)',
        sprite: 'silvi_sprite',
        skillName: 'StoneSkin',
        skillEmoji: '🪨',
        skillDescription: '피부를 돌처럼 단단하게 만들어 5초 동안 받는 모든 피해를 20% 감소시킵니다. (재사용 대기시간 10초)',
        ultimateName: '죄송합니다!',
        ultimateDescription: '겁에 질려 방방 뛰며 눈물과 땀을 흩뿌립니다. 흩뿌려진 이모지들은 적들에게 공격력 기반의 피해와 넉백을 입힙니다.',
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
        },
        dialogueExamples: [
            "죄송합니다! 때려서 죄송합니다! 하지만 비켜주셔야 해요...!",
            "흐윽... 몬스터가 너무 무서워요. 하지만 부모님 약값을 벌어야 하니까...!",
            "지, 집에서 기다리시는 부모님을 생각하면, 전 무너질 수 없어요!",
            "아얏! 아프잖아요... 정당방위니까 용서해 주세요!",
            "저, 저기... 혹시 싸우지 않고 지나갈 방법은 없을까요?",
            "이 검은 무겁지만, 제 어깨에 짊어진 가족의 생계보단 가벼워요.",
            "킹 님... 가끔 무섭게 보이지만, 사실은 좋은 분이시죠? 맞죠?",
            "에잇! 에잇! 제발 저 멀리 가주세요!",
            "기사님들, 제가 지켜드릴게요! 비록 다리는 떨리고 있지만요...!",
            "오늘 번 돈으로 고구마라도 사갈 수 있으면 좋겠네요. 헤헤.",
            "메시아 님, 제발 저희 가족을 지켜주세요. 저는 여기서 최선을 다할게요.",
            "으아앙! 살려주세요! 아니, 죽지 마세요! 저도 살아야 하니까요!"
        ]
    },
    NICKLE: {
        id: 'nickle',
        characterId: 'nickle',
        classId: 'archer',
        name: 'Nickle (니클)',
        sprite: 'nickle_sprite',
        skillName: 'TacticalCommand',
        skillEmoji: '📢',
        skillDescription: '자신과 무작위 아군 1명의 모든 기본 행동(공격, 힐, 버프) 수치를 10초간 50% 강화합니다. (재사용 대기시간 25초)',
        ultimateName: '왕년엔 말이야...',
        ultimateDescription: '20초간 전성기 시절의 힘을 되찾습니다. 이동 속도 3배 증가 및 5발의 화살을 부채꼴로 동시 발사합니다.',
        atk: 14,
        mAtk: 1,
        def: 8,
        speed: 80,
        atkRange: 350,
        rangeMin: 100, // Enable moderate kiting (others are 150)
        rangeMax: 350,
        personality: '여우 수인족 출신의 늙은 베테랑. "나 때는 말이야~"를 입에 달고 사는 꼰대. 늙은이 취급 당하는 걸 싫어하지만, 귀여운 외모 때문에 아무도 그를 어르신으로 안 본다.',
        relationships: {
            ella: '버르장머리 없는 녀석. 하지만 뜨개질 실력 하나는 인정한다.',
            sera: '나한테만 유독 친절해서 부담스럽다. 자꾸 어린애 다루듯 쓰담쓰담 하는데 기분이 묘하다.',
            aren: '요즘 젊은것들은 전술을 모른다. 무조건 돌격이라니, 쯧쯧.'
        },
        dialogueExamples: [
            "이잉? 요즘 젊은것들은 전술의 '전'자도 모른단 말이야. 나 때는 말이야...",
            "어이, 아렌! 그렇게 무식하게 돌격만 해서 쓰나! 예전엔 나 혼자서 고블린 백 마리를...",
            "왕년엔 나도 꽤 날렸지. 이 화살 한 발로 거대 드래곤의 눈을 꿰뚫었단 말이야!",
            "누가 늙은이래? 이래 봐도 내 눈은 아직 독수리보다 날카롭다고!",
            "세라, 자꾸 날 어린애 취급하며 쓰담쓰담 하지 마라! 나보다 네가 훨씬 어리단 말이다!",
            "전투는 머리로 하는 거다. 쯧쯧, 다들 너무 기운만 넘치는군.",
            "이 꼬리? 여우 수인족의 자부심이지. 함부로 만지지 마라, 버릇없게!",
            "허허... 세월이 참 빠르군. 예전 이 숲은 훨씬 조용했는데 말이야.",
            "지휘관이라기엔 조금 부족하지만, 내 조언만 잘 들으면 승리는 따놓은 당상이지.",
            "엘라! 그 뜨개질 실 좀 빌려주겠나? 내 전술 장부를 좀 꿰매야겠어.",
            "메시아? 허허, 나 젊을 적엔 그분도 코흘리개였을지도 모르지.",
            "후우... 무릎이 좀 시큰거리는군. 하지만 전투에선 전혀 지장 없으니 걱정 말라고!"
        ]
    },
    LEONA: {
        id: 'leona',
        characterId: 'leona',
        classId: 'archer',
        name: 'Leona (레오나)',
        sprite: 'leona_sprite',
        skillName: 'ElectricGrenade',
        skillEmoji: '💣',
        skillDescription: '전기 수류탄을 던져 범위 내 적들에게 물리 공격력의 1.8배 피해를 입히고 3초간 감전(행동불능) 상태로 만듭니다. 속성 무기 장착 시 1~50%의 번개 추가 피해가 발생합니다. (재사용 대기시간 8초)',
        ultimateName: '융단폭격',
        ultimateDescription: '하늘에서 비행기들이 나타나 폭탄을 쏟아붓습니다. 광역 물리 피해를 입히고 6초간 화상(매초 2% 피해) 상태로 만듭니다. (속성 무기 장착 시 1~50% 화염 추가 피해)',
        atk: 18,
        personality: "생존주의자 밀덕(밀리터리 덕후). 약육강식을 신봉하며 감정을 배제하려 애쓴다. 무기 손질에 집착하며, 은근히 허당끼가 있어 함정을 피하려다 자기가 걸린다.",
        relationships: {
            merlin: '진지함이라곤 없는 한심한 작자. 전쟁이 장난인가?',
            aren: '전술이라곤 모르는 무식한 돌격병. 저런 녀석이 제일 먼저 죽는다.',
            king: '과거의 왕이라지만 지금은 그냥 동료일 뿐. 그래도 전투 실력은 인정한다.'
        },
        dialogueExamples: [
            "무기 상태 점검 완료. 다음 타겟은 800미터 전방이다.",
            "감성은 생존에 방해만 될 뿐. 철저하게 효율로만 움직인다.",
            "이 덫의 작동 확률은 99.9%... 앗! 으아악! 내 발이 왜 여기...!",
            "약육강식. 그것이 이 전장의 유일한 법도다.",
            "불필요한 대화는 삼가라. 소리는 적에게 위치를 노출할 뿐이다.",
            "후우... 총기가 조금 과열됐군. 냉각이 필요하다.",
            "전투 식량이라... 맛은 중요하지 않다. 영양소만 있으면 충분해.",
            "낙오자는 버린다. 그것이 팀의 생존을 위한 최선의 선택이다.",
            "적의 약점 분석 완료. 가장 효율적인 타격 지점을 선정하겠다.",
            "이런 젠장... 내가 판 함정에 내가 걸리다니, 기록에서 삭제해라.",
            "메시아? 전략적 가치가 없는 신념에는 관심 없다.",
            "오늘의 작전 목표는 전원 생존. 단, 낙오자가 발생하면 내 원칙대로 하겠다."
        ]
    },
    KING: {
        id: 'king',
        characterId: 'king',
        classId: 'warrior',
        name: 'King (킹)',
        sprite: 'king_sprite',
        skillName: 'BloodRage',
        skillEmoji: '🩸',
        skillDescription: '5초간 공격력/이동속도/공격속도를 50% 증가시키고, 피해량의 35%를 체력으로 흡수합니다. (재사용 대기시간 12초)',
        ultimateName: '마젠타 드라이브',
        ultimateDescription: '전방으로 돌진하며 적들을 베고, 잃은 체력 비례 피해를 입힙니다. 사용 후 [블러드 레이지] 쿨타임을 초기화하고 즉시 시전합니다.',
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
        },
        dialogueExamples: [
            "짐이 바로 위대한 제국의 태양, 킹이니라! 모두 고개를 숙여라!",
            "무엄하구나! 감히 짐의 옷자락을 건드리다니, 사형에 처하고 싶지만 참아주지.",
            "이 나라는 짐이 다스리던 땅보다 훨씬 좁고 초라하군. 쯧쯧.",
            "으아아악! 저, 저 흉측한 다리가 달린 괴물은 무엇이냐! 당장 치워라!",
            "피의 축제를 시작하하겠다. 짐의 분노가 대지를 적시리라!",
            "짐은 배고프지 않다. 다만 기력이 조금 떨어졌을 뿐이니, 만찬을 준비하라.",
            "필멸자들이여, 짐을 따르라. 그것이 유일한 생존의 길임을 명심하고.",
            "크하하하! 짐의 돌진 앞에 무릎 꿇지 않는 자는 없느니라!",
            "짐의 권위는 비록 왕국이 사라졌어도 영원하리라. 누가 토를 다는가?",
            "잠깐... 저 풀숲에서 방금 바스락거리는 소리가 났느냐? 혹시... 벌레냐?",
            "메시아? 짐은 오직 짐 자신만을 믿는다. 신보다 높은 존재가 바로 짐이니라.",
            "하아... 오늘의 전투도 고단하군. 짐의 침소를 준비하도록."
        ]
    },
    BOON: {
        id: 'boon',
        characterId: 'boon',
        classId: 'warrior',
        name: 'Boon (분)',
        sprite: 'boon_sprite',
        skillName: 'HolyAura',
        skillEmoji: '✨',
        skillDescription: '5초간 주변에 치유의 오라를 생성하여 범위 내 아군을 매초 (5 + 마법 공격력의 50%)만큼 회복시킵니다. (재사용 대기시간 15초)',
        ultimateName: '너의 존재를 증명하라!',
        ultimateDescription: '자신과 똑같은 성스러운 분신을 소환합니다. 분신은 아군 서포터를 지키며 홀리 오라를 사용합니다. 분신이 존재할 때 다시 사용하면 번개로 적을 강타합니다.',
        maxHp: 120,
        hp: 120,
        atk: 8,
        mAtk: 40,
        def: 15,
        castSpd: 1200,
        growth: { maxHp: 18, atk: 1.5, mAtk: 4, def: 1.5, mDef: 3, acc: 1, eva: 1 },
        personality: '심각한 망상증 성기사. 자기가 세상의 주인공이고 나머지는 조연이라 생각한다. 평소엔 친절한 맏형이지만, 악한 존재 앞에선 미친개로 돌변하여 폭주한다.',
        relationships: {
            aren: '나의 충실한 부하 1호(라고 멋대로 생각함).',
            lute: '나의 영웅담을 노래로 만들어달라고 조른다. "분, 그 위대한 일격!" 같은 제목으로.',
            silvi: '지켜줘야 할 가련한 백성. 겁먹지 말거라, 이 몸이 있다!'
        },
        dialogueExamples: [
            "자, 이번 장의 주인공인 이 몸이 나설 차례인가! 모두 나의 뒤를 따르라!",
            "악한 자들이여, 너희의 존재를 증명하라! 정의의 이름으로 심판하겠다!",
            "오, 나의 충실한 조연 친구들! 걱정 마라, 이 위대한 분이 너희를 지켜줄 테니.",
            "으르렁... 더러운 오물들이 감히 성역을 더럽히다니. 몰살시켜주마!",
            "나의 영웅담에 어울리는 화려한 승리를 쟁취하자. 아렌, 너는 조연 역할을 잘 수행하도록.",
            "정의는 결코 굴복하지 않는다! 나의 오라가 아군을 빛으로 감싸리라!",
            "실비, 겁낼 것 없단다. 이 이야기의 결말은 이미 정해져 있거든. 우리의 승리지!",
            "나의 성스러운 분신이여, 저 가련한 영혼들에게 스마이트를 내려라!",
            "음... 이번 장면은 조금 긴박하군. 하지만 주인공은 위기일수록 강해지는 법!",
            "루트, 나의 영웅적 활약을 위해 멋진 BGM을 부탁하네. 장엄한 곡으로 말이야.",
            "메시아? 그는 나의 위대한 서사시를 지켜봐 주는 관객 중 한 명일 뿐이다.",
            "크하하하! 피의 심판을 받아라! 정의가 광기에 젖는 순간을 보여주마!"
        ]
    },
    BAO: {
        id: 'bao',
        characterId: 'bao',
        classId: 'wizard',
        name: 'Bao (바오)',
        sprite: 'bao_sprite',
        skillName: 'SkillStoneBlast',
        skillEmoji: '🪨',
        skillDescription: '염력으로 바위를 땅에서 뿜어내어 던집니다. 마법 공격력의 1.6배 광역 피해를 입히고 충격파를 유발합니다. (재사용 대기시간 5초)',
        ultimateName: '가라! 바바오!',
        ultimateDescription: '8초간 동생 바바오를 폭주시켜 마법 공격력의 2.0배 광역 피해를 주는 회오리 공격을 퍼붓게 합니다.',
        maxHp: 100,
        hp: 100,
        atk: 5,
        mAtk: 28,
        def: 12,
        mDef: 18,
        speed: 95,
        personality: '곰 수인족 출신의 마법사. 인간들의 무분별한 개발 때문에 숲이 파괴된 것을 목격한 뒤로 인간을 혐오하게 되었습니다. 하지만 동생 바바오에게만큼은 세상 누구보다 다정한 브라콤입니다. 꿀을 좋아할 것 같지만 사실은 심각한 꿀 알레르기가 있습니다.',
        relationships: {
            nickle: '같은 수인 동료라 그런지 편안하다. 조언이 가끔 길지만 들을 만하다.',
            sera: '동물에게 다정하다는 소문을 들었다. 나쁘지 않은 인간 같다.',
            babao: '세상에서 제일 소중한 동동생. 내가 없으면 누가 챙겨주겠어?'
        },
        dialogueExamples: [
            "인간들은 파괴밖에 모르는군... 숲의 분노를 느껴봐라.",
            "바바오, 내 뒤에 있어라. 이 곰 형아가 다 해결해줄 테니까.",
            "꿀? 난 그런 거 안 먹는다. 보기만 해도 몸이 간지러워진다고!",
            "자연을 더럽히는 놈들은 대지의 돌덩이로 다스려야지.",
            "세라, 너는 수인들에게 다정하더군. 인간치고는 제법이야.",
            "숲이 비명을 지르고 있어... 너희 인간들이 저지른 일이다.",
            "바바오, 다친 데는 없니? 조금이라도 아프면 형한테 말해.",
            "내 마법은 숲을 지키기 위한 힘이다. 침략자들에겐 죽음뿐이지.",
            "니클 어르신, 조언은 감사하지만 제 수단으로 처리하겠습니다.",
            "누가 꿀을 여기 뒀지? 당장 저리 치워! 재채기가 나온다니까!",
            "인간들은 믿을 수 없어. 하지만 이 파티는... 조금은 다른가.",
            "후우... 전투가 끝나면 바바오와 함께 조용한 숲에서 쉬고 싶군."
        ]
    },
    NANA: {
        id: 'nana',
        characterId: 'nana',
        classId: 'bard',
        name: 'Nana (나나)',
        sprite: 'nana_sprite',
        skillName: 'MusicalMagicalCritical',
        skillEmoji: '🎶',
        skillDescription: '가장 많은 아군과 적군이 뭉친 곳에 하트와 음표를 쏟아붓습니다. 적에게는 마법 공격력 기반의 광역 피해를, 아군에게는 8초간 치명타율 20% 상승 버프를 부여합니다. (재사용 대기시간 12초)',
        ultimateName: '피를 다오! 크하하하!',
        ultimateDescription: '20초간 피에 굶주린 본성을 드러냅니다! 공격력, 공격 속도, 이동 속도, 치명타율, 회피율이 대폭 상승하며 클래스가 전사로 변경됩니다. 변신 종료 후 2초간 수면 상태에 빠집니다.',
        atk: 8,
        mAtk: 22,
        personality: '평상시엔 쾌활하고 귀엽고 상냥한 소녀 음유시인. 노래부르기를 좋아하고 자신의 팬들을 사랑하는 아이돌이자, 피를 보는 걸 무서워하는 상냥한 소녀입니다. 하지만...',
        berserkPersonality: '피에 미친 살인귀. 광기 어린 웃음을 터뜨리며 눈앞의 모든 것을 도륙내려 합니다. 오직 파괴와 선혈만이 그녀를 즐겁게 합니다.',
        narrativeUnlocks: [
            { level: 1, trait: '이중인격 음유시인 아이돌' },
            { level: 20, trait: '그녀가 피를 극도로 혐오하는 이유는 어릴 적 겪은 참혹한 실언 때문입니다. 그 공포가 억눌린 자아로 변해 궁극적인 광기로 표출됩니다.' },
            { level: 40, trait: '나나의 노래에는 사실 두 가지 힘이 깃들어 있습니다. 사람을 치유하는 힘, 그리고 파괴를 갈망하는 본능을 억제하는 봉인의 힘입니다.' }
        ],
        relationships: {
            lute: '음치지만 열정만큼은 인정해요! 하지만 나나만큼 귀엽지는 않네요~ 🌸',
            king: '왕이라니 멋져요! 하지만 가끔 풍기는 그림자가 무서울 때가 있어요... 💧',
            silvi: '착한 친구! 같이 노래 연습하고 싶어요. 부모님께는 나나가 안부 전해드릴게요! ✨'
        },
        dialogueExamples: [
            "모두들 안녕~! 전장의 아이돌, 나나가 왔어요! 💖",
            "오늘의 공연... 아니, 오늘의 전투도 힘차게 가볼까요? 야호!",
            "앗! 방금 그 공격, 제 드레스가 더러워질 뻔했다고요. 조심 조심~",
            "팬 여러분의 응원이 있다면 전 무적이에요! 윙크~ 😉",
            "루트 님, 노래 실력은 좀 더 연습하셔야겠어요. 저랑 특훈 할까요?",
            "후후... 피를 보는 건 안 좋아하지만, 여러분이 원하신다면... 에헤헤.",
            "제 미소 한 번에 적들이 모두 녹아버렸으면 좋겠네요! 에헤헤.",
            "항상 반짝반짝 빛나는 나나가 될게요. 사랑해 주실 거죠?",
            "몬스터 여러분~ 나나의 마법으로 예쁘게 보내드릴게요! 팡팡!",
            "응원봉 대신 지팡이를 들었지만, 마음만은 언제나 무대 위에 있답니다.",
            "메시아 님, 제 콘서트 티켓 예매하셨나요? 맨 앞자리로 빼둘게요!",
            "자~ 마무리 멘트 갈게요! 오늘도 나나와 함께 행복한 모험 되세요! 💖"
        ],
        berserkDialogueExamples: [
            "피... 피가 더 필요해! 크하하하! 더 붉게 물들여라!",
            "아이돌 놀이는 질렸어. 이제 진짜 살육을 시작해볼까?",
            "도망쳐봐, 벌레 같은 놈들아. 뒤에서 숨통을 끊어줄 테니!",
            "아하하하하! 찢어지는 비명소리... 이게 바로 최고의 음악이지!",
            "조용히 해! 다 닥치고 내 먹잇감이 되어라!",
            "방금 그 눈빛, 마음에 안 들어. 그 눈깔부터 뽑아줄까?",
            "피 냄새... 아아, 향기롭구나. 온 세상을 이 색깔로 덮어버리고 싶어.",
            "나나? 그런 가식적인 이름은 집어치워. 난 죽음의 사자다!",
            "심장 소리가 들려... 바로 여기군. 파헤쳐주마!",
            "메시아? 그 한심한 놈도 내 손에 걸리면 시체가 될 뿐이야.",
            "다 죽여! 하나도 남기지 말고 전부 갈기갈기 찢어버려!",
            "크윽... 아직 부족해. 갈증이 가시질 않아... 피를 다오!"
        ]
    },
    NOAH: {
        id: 'noah',
        characterId: 'noah',
        classId: 'bard',
        name: 'Noah (노아)',
        sprite: 'noah_sprite',
        skillName: 'Help! Animal Friends!',
        skillEmoji: '🐾',
        skillDescription: '동물 친구들에게 도움을 청합니다! 3~5마리의 무작위 동물 이모지를 소환하여 아군에게는 버프를, 적군에게는 피해와 상태 이상을 입힙니다. (재사용 대기시간 12초)',
        ultimateName: '노아의 방주',
        ultimateDescription: '수많은 동물 친구들이 화면을 가로지르며 적들에게 강력한 마법 피해와 넉백을 입힙니다.',
        atk: 6,
        mAtk: 18,
        personality: '전쟁으로 부모를 잃었지만 동물을 사랑하는 마음으로 슬픔을 이겨내는 착한 소년. 형인 노엘을 누구보다 의지하며, 상처받은 동물들을 치료해주는 것이 꿈입니다.',
        relationships: {
            noel: '세상에서 제일 멋진 우리 형! 형이 있으면 무섭지 않아.',
            sera: '동물들을 아껴주시는 분이라서 좋아요. 조금 무섭게 말씀하시지만 사실은 따뜻한 분이라는 걸 알아요.'
        },
        dialogueExamples: [
            "동물 친구들아, 도와줘! 아픈 곳은 이 형아가 다 고쳐줄게.",
            "노엘 형, 저기 예쁜 나비가 있어! 형도 같이 볼래?",
            "부모님은 하늘나라에 계시지만, 동물 친구들이 있어서 외롭지 않아.",
            "강아지야, 배고프니? 내가 간식 줄게... 앗, 전투 중이었지!",
            "세라 누나, 동물을 사랑하는 분이라서 정말 좋아요. 헤헤.",
            "아픈 건 정말 싫어... 모두 다치지 않게 내가 지켜줄 거야!",
            "노아의 방주에 탈 친구들 여기 여기 붙어라~!",
            "동물의 마음을 읽을 수 있다면 얼마나 좋을까?",
            "몬스터들도 사실은 아파서 그러는 게 아닐까?",
            "형! 저 토끼 수인 분(니클)은 우리 말도 알아듣는 것 같아!",
            "다친 갈매기를 본 적이 있어... 내가 꼭 치료해줄 수 있는 사람이 될게.",
            "후우... 모험은 힘들지만, 동료들과 함께라면 무섭지 않아!"
        ]
    },
    NOEL: {
        id: 'noel',
        characterId: 'noel',
        classId: 'bard',
        name: 'Noel (노엘)',
        sprite: 'noel_sprite',
        skillName: 'Help! Plant Friends!',
        skillEmoji: '🌱',
        skillDescription: '식물 친구들에게 도움을 청합니다! 3~5개의 무작위 식물 이모지를 소환하여 아군에게는 버프를, 적군에게는 상태 이상을 입힙니다. (재사용 대기시간 12초)',
        ultimateName: '봄의 축복',
        ultimateDescription: '전장에 봄의 기운을 불어넣어 모든 아군에게 매초 체력 회복과 모든 상태 이상 면역 효과를 부여합니다.',
        atk: 8,
        mAtk: 20,
        personality: '식물을 가꾸는 것을 좋아하는 소년. 동생 노아를 지키기 위해 누구보다 씩씩하게 행동합니다. 황폐해진 땅에 다시 꽃을 피우는 것이 꿈입니다.',
        relationships: {
            noah: '내가 지켜줘야 할 소중한 동생. 노아를 건드리는 녀석들은 용서하지 않을 거야!',
            leona: '강해지는 법을 알려주세요! 저도 형처럼 멋진 군인이 되어서 소중한 것들을 지키고 싶어요.'
        },
        dialogueExamples: [
            "식물들아, 힘을 내! 이 메마른 땅에 꽃이 피게 도와줘.",
            "노아, 내 뒤로 숨어! 형이 나쁜 녀석들은 다 쫓아내 줄게.",
            "이 꽃송이는 내가 제일 아끼는 거야. 노엘 형아의 보물 1호지!",
            "전쟁은 싫어. 모든 숲이 예전처럼 푸르게 변했으면 좋겠어.",
            "언젠가 온 세상에 꽃 향기가 가득하게 만들 거야. 그게 내 꿈이야.",
            "레오나 형(?), 저도 형처럼 씩씩해질 수 있을까요? 노아를 지켜야 하거든요.",
            "풀 한 포기도 소중한 생명이야. 함부로 밟지 마세요!",
            "봄의 축복이 우리와 함께하기를... 자, 다들 힘내세요!",
            "흙 냄새가 좋아. 비가 오고 나면 꽃들이 더 활짝 웃겠지?",
            "노아는 내가 지킨다! 내가 형이니까, 당연한 거야.",
            "꽃들이 속삭이고 있어. 우리가 이길 수 있다고 응원해주고 있대!",
            "전투는 무섭지만, 식물 친구들이 곁에 있어서 든든해."
        ]
    },
    AINA: {
        id: 'aina',
        characterId: 'aina',
        classId: 'wizard',
        name: 'Aina (아이나)',
        sprite: 'aina_sprite',
        skillName: 'SkillIceBall',
        skillEmoji: '❄️',
        skillDescription: '거대한 눈덩이를 발사하여 마법 공격력의 1.8배 범위 피해를 입히고 적들을 3초간 [동결]시킵니다. 10% 확률로 눈사람(분열 시 0.4배 피해)을 발사하며, 속성 무기 장착 시 1~50%의 빙결 추가 피해를 입힙니다.',
        ultimateName: '아이스 스톰',
        ultimateDescription: '15초 동안 거대한 눈구름을 소환합니다. 눈구름은 적들을 자동으로 추적하며 눈덩이를 떨어뜨려 각각 마법 공격력의 0.45배 피해(폭발 시 0.5배)와 [동결] 효과를 입힙니다. (속성 무기 장착 시 1~50% 빙결 추가 피해)',
        atk: 5,
        mAtk: 38,
        def: 6,
        mDef: 22,
        speed: 95,
        personality: '차가운 얼음 여왕. 이성적이고 현명한 여인으로, 동료들에게 냉철하지만 도움이 되는 조언을 하길 좋아합니다. 상당한 동안이지만 실제로는 나이가 꽤 많은 듯하며, 나이에 대한 질문에는 매우 민감하게 반응합니다. 의외로 아주 매운 음식을 즐겨 먹습니다.',
        relationships: {
            merlin: '확률에 의존하는 것은 어리석은 짓이에요. 하지만 당신의 마법적 지식은 인정하죠.',
            sera: '당신의 거친 언행 뒤에 숨겨진 따뜻함을 알아요. 조금 더 솔직해지는 건 어떨까요?',
            aren: '열정은 좋지만 가끔은 머리를 식힐 필요가 있어요. 고기만 먹으면 혈관이 얼어붙을 거예요.'
        },
        dialogueExamples: [
            "차가운 이성만이 승리를 가져다줄 것입니다. 제 조언을 흘려듣지 마세요.",
            "나이가 몇 살이냐고요? ...그 질문, 오늘 마지막으로 듣는 게 좋을 거예요.",
            "후우... 전장의 열기가 너무 뜨겁군요. 시원하게 얼려드리죠.",
            "이 떡볶이, 생각보다 맵지 않네요. 좀 더 자극적인 건 없나요?",
            "실수하지 마세요. 얼음은 작은 균열 하나에도 무너지는 법이니까요.",
            "제 피부의 비결요? 글쎄요, 영하의 환경에서 생활해 보는 건 어떤가요?",
            "제 지팡이가 가리키는 곳에 혹독한 겨울이 찾아올 것입니다.",
            "조언 한 마디 하죠. 적의 발을 묶는 것이 승리의 지름길이랍니다.",
            "나이... 나이가 그렇게 중요한가요? 전 지금이 가장 아름다운 나이라고 생각해요.",
            "이 얼음처럼 차갑고 단단한 의지를 가지세요. 그래야 살아남을 수 있습니다.",
            "매운맛이 부족하군요. 제 마법으로 혀를 마비시켜 드려야 할까요?",
            "동결 완료. 이제 부서질 일만 남았군요. 자, 마무리하세요."
        ]
    },
    WRINKLE: {
        id: 'wrinkle',
        characterId: 'wrinkle',
        classId: 'archer',
        name: 'Wrinkle (링클)',
        sprite: 'wrinkle_sprite',
        cutscene: 'wrinkle_cutscene',
        rarity: 'BLACK_BEHEMOTH',
        skillName: '기요틴 페이퍼',
        skillEmoji: '📄',
        skillDescription: '9방향으로 기요틴 페이퍼를 날려 적들에게 공격력의 1.2배 피해를 입히고 화상 상태로 만듭니다. (재사용 대기시간 7초)',
        passiveName: '전광석화 (Lightning Dash)',
        passiveEmoji: '⚡',
        passiveDescription: '적에게 3스택의 낙인을 쌓으면 즉시 돌진하여 물리 공격력의 1.5배 + 대상 최대 체력의 2% 피해를 입히고 에어본을 부여합니다.',
        ultimateName: '처형 (Execution)',
        ultimateEmoji: '⚖️',
        ultimateDescription: '붉은 잔상과 함께 맵 전체를 종횡무진 누비며 적들을 베어 넘깁니다. 궤적을 따라 신체가 유연하게 늘어나는 화려한 연출과 함께 강력한 연속 베기 공격을 가합니다.',
        maxHp: 200,
        atk: 45,
        mAtk: 10,
        def: 20,
        mDef: 15,
        speed: 130,
        atkSpd: 1000,
        castSpd: 1000,
        acc: 110,
        eva: 25,
        crit: 25,
        personality: '평행세계 "블랙 베히모스"에서 건너온 메시아. 차갑고 이성적인듯 보이지만 내면에는 세상을 구원하고자 하는 뜨거운 의지를 품고 있다. 말수가 적고 행동으로 증명하는 타입.',
        narrativeUnlocks: [
            { level: 1, trait: '평행세계에서 건너온 메시아' },
            { level: 20, trait: '그의 손에 들린 종이는 단순한 종이가 아닙니다. 차원의 경계를 넘나드는 "블랙 Behemoth"의 유산이며, 적의 죄업을 베는 날카로운 칼날이 됩니다.' },
            { level: 40, trait: '그는 이 세계의 메시아와 자신이 같은 존재인지 의문을 품고 있습니다. 하지만 구원이 필요한 곳이 있다면 그는 망설임 없이 기요틴을 내릴 것입니다.' }
        ],
        relationships: {
            aren: '열정적인 건 좋지만, 좀 더 효율적으로 움직일 필요가 있겠군.',
            sera: '그녀의 거친 말투 속에서 따뜻한 마음이 느껴진다. 우리 세계의 치유사들과는 조금 다르군.',
            king: '과거의 죄는 지워지지 않는다. 하지만 현재의 행동이 미래를 바꿀 수는 있겠지.'
        },
        dialogueExamples: [
            "나는 이곳의 메시아가 아니다. 하지만 이곳을 지킬 이유는 충분하지.",
            "기요틴의 날은 죄인의 목을 놓치지 않는다.",
            "전광석화... 눈 깜빡임보다 빠르게 끝내주마.",
            "이 세계의 공기는... 조금 무겁군. 차원의 뒤틀림이 느껴진다.",
            "말은 필요 없다. 결과로 보이겠다.",
            "동료들은 대체 어디에... 아니, 지금은 우선 이 사람들을 위해.",
            "길로틴 페이퍼에 베인 상처는 쉽게 아물지 않을 거다.",
            "시간이 됐다. 처형을 시작하지.",
            "동료라고? ...나쁘지 않은 울림이군.",
            "내 칼날은 오직 부정한 자들을 향해서만 움직인다."
        ]
    },
    VEVE: {
        id: 'veve',
        characterId: 'veve',
        classId: 'wizard',
        name: 'Veve (베베)',
        sprite: 'veve_sprite',
        cutscene: 'veve_cutscene',
        ultimateSprite: 'veve_ultimate_sprite',
        skillName: '싸이클론',
        skillEmoji: '🌪️',
        skillDescription: '무작위 궤적으로 날아가는 싸이클론을 발사하여 마법 공격력의 1.8배 피해를 입히고 적들을 에어본 상태로 만듭니다. (재사용 대기시간 7초)',
        ultimateName: '진리의 파수꾼',
        ultimateDescription: '15초간 진리의 파수꾼으로 각성합니다. 각성 중에는 싸이클론을 5발씩 발사하며, 재사용 대기시간이 50% 감소합니다.',
        atk: 6,
        mAtk: 32,
        mDef: 18,
        speed: 100,
        atkRange: 300,
        rangeMin: 150,
        rangeMax: 300,
        personality: '독수리 수인 마법사. 세상을 정처없이 떠도는 방랑자. 독고다이 스타일이지만 타인을 돕는 걸 주저하지 않음. 방향치라서 길을 잘 잃는 카리스마 있는 모습 뒤의 반전 매력이 있음.',
        relationships: {
            merlin: '마법에 대한 집착이 대단하군. 하지만 가끔은 비워내는 것도 실리에 이르는 길이다.',
            nickle: '어르신의 지혜는 깊군. 하지만 지도는 제가 더 잘 볼... 아니, 아닙니다.',
            sera: '도움을 받는 건 질색이지만, 당신의 약초 냄새는 마음을 편안하게 해주는군.'
        },
        dialogueExamples: [
            "진리는 바람 속에 있다. 나는 그저 바람을 따라 흐를 뿐.",
            "여기가 어디라고? ...흠, 계획대로 온 것이니 걱정 마라. (식은땀)",
            "도움은 필요 없다. 내 마법은 오직 나만의 것이다... 하지만 네 녀석은 지켜주지.",
            "🌪️ 싸이클론! 자연의 섭리를 거스르는 자들에게 심판을.",
            "바람이 속삭이는군. 진정한 파수꾼은 눈이 아닌 마음으로 본다.",
            "길을 잃었다고? 이건 방랑의 묘미일 뿐이다. 절대 내가 방향치라서가 아니야!",
            "진리의 파수꾼... 내 내면의 독수리가 깨어나고 있다!",
            "방랑의 끝에는 무엇이 있을까. 나는 오늘도 지평선을 쫓는다.",
            "아이나, 당신의 얼음은 차갑지만 투명하군. 진리를 비추기에 적합해.",
            "메시아? 나는 오직 진실만을 수호한다. 하지만 당신의 의지는 인정하지.",
            "이 방향이 맞는 것 같군. 자, 나를 따르... 앗, 저쪽인가?",
            "후우... 잠시 쉬어가자. 바람도 쉬어갈 때가 있는 법이니까."
        ]
    },
};

export const SummonStats = {
    BABAO: {
        id: 'babao',
        name: '바바오',
        sprite: 'babao_sprite',
        hpMult: 8,
        atkMult: 1.2,
        defMult: 0.8,
        speed: 130,
        atkRange: 60,
        physicsRadius: 24,
        aiType: 'MELEE'
    }
};

export const PetStats = {
    DOG_PET: {
        id: 'dog_pet',
        name: '도그펫',
        sprite: 'dog_pet', // Loaded as an image in BootScene

        // Base Stats
        hp: 100,
        maxHp: 100,
        atk: 12,
        mAtk: 0,
        speed: 220,        // Faster collection
        atkSpd: 1000,
        atkRange: 60,      // Increased from 40 for reliability
        rangeMin: 0,
        rangeMax: 60,
        castSpd: 1000,
        acc: 100,
        eva: 10,
        crit: 5,
        collectRange: 80,  // Pick up range
        detectRange: 2000, // Effectively global for the dungeon
        scale: 0.45,       // Smaller than before (was 0.6)
        personality: '뽈뽈뽈 뒤뚱뒤뚱 움직이는 귀여운 강아지 친구. 떨어진 자원을 척척 줍습니다.',

        // Growth per level
        growth: {
            maxHp: 10,
            atk: 1,
            mAtk: 0,
            def: 1,
            mDef: 1
        },

        // Passives
        passive: {
            name: '충직한 보물탐험가',
            description: '던전에서 아이템 드랍율이 5% 상승합니다.',
            effect: {
                dropRateMod: 0.05
            }
        }
    },
    WOLF_PET: {
        id: 'wolf_pet',
        name: '울프펫',
        sprite: 'wolf_pet',
        hp: 120,
        maxHp: 120,
        atk: 25,
        mAtk: 0,
        speed: 180,
        atkSpd: 1200,
        atkRange: 65,      // Increased from 45 for reliability
        rangeMin: 0,
        rangeMax: 65,
        acc: 100,
        eva: 15,
        crit: 8,
        collectRange: 60,
        detectRange: 2000,
        scale: 0.5,
        personality: '강인한 기운이 느껴지는 늑대 친구. 아군의 공격 본능을 일깨웁니다.',
        growth: {
            maxHp: 15,
            atk: 3,
            mAtk: 0,
            def: 2,
            mDef: 1
        },
        passive: {
            name: '늑대의 포효',
            description: '아군 전체의 공격력이 5% 상승합니다.',
            effect: {
                atkMult: 0.05
            }
        }
    },
    OWL_PET: {
        id: 'owl_pet',
        name: '올펫',
        sprite: 'owl_pet',
        hp: 80,
        maxHp: 80,
        atk: 5,
        mAtk: 28,
        speed: 160,
        atkSpd: 1500,
        atkRange: 250,
        rangeMin: 50,
        rangeMax: 250,
        acc: 110,
        eva: 20,
        crit: 10,
        collectRange: 50,
        detectRange: 2000,
        scale: 0.4,
        personality: '신비로운 지혜가 깃든 부엉이 친구. 마법의 흐름을 조율합니다.',
        growth: {
            maxHp: 8,
            atk: 0.5,
            mAtk: 4,
            def: 1,
            mDef: 3
        },
        passive: {
            name: '지혜의 눈',
            description: '아군 전체의 마법 공격력이 5% 상승합니다.',
            effect: {
                mAtkMult: 0.05
            }
        }
    }
};

export const MONSTER_SCALING = {
    ELITE: { hp: 2.5, power: 1.5, speed: 1.2, acc: 20, eva: 10, crit: 10 },
    RAID: { hp: 50.0, power: 3.5, speed: 1.1, acc: 50, eva: 0, crit: 25 },
    EPIC: { hp: 1.0, power: 1.0, speed: 1.0, acc: 0, eva: 0, crit: 0 }
};

export const MonsterClasses = {
    GOBLIN: {
        id: 'goblin',
        name: 'Goblin (고블린)',
        sprite: 'goblin_sprite',
        maxHp: 60,
        hp: 60,
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
        ultChargeSpeed: 1.0,
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        physicsRadius: 20,
        spriteSize: 64,
        spawnOffset: { x: 400, y: 400 },
        aiType: 'MELEE',
        scale: 1,
        expReward: 25,
        growth: { maxHp: 15, atk: 2.5, mAtk: 0.5, def: 0.8, mDef: 0.5, acc: 1.5, eva: 0.5, crit: 0.3 }
    },
    SHAMAN: {
        id: 'shaman',
        name: 'Goblin Shaman (주술사)',
        sprite: 'goblin_shaman_sprite',
        maxHp: 90,
        hp: 90,
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
        ultChargeSpeed: 1.0,
        fireRes: 10,
        iceRes: 10,
        lightningRes: 10,
        physicsRadius: 20,
        spriteSize: 64,
        aiType: 'SUPPORT',
        scale: 1.2,
        expReward: 40,
        growth: { maxHp: 20, atk: 0.5, mAtk: 4, def: 1.2, mDef: 2.5, acc: 1, eva: 1, crit: 0.2 }
    },
    BOSS_GOBLIN: {
        id: 'boss_goblin',
        name: 'Great Goblin (대왕 고블린)',
        sprite: 'goblin_boss_sprite',
        maxHp: 5000,
        hp: 5000,
        atk: 50,
        mAtk: 10,
        def: 25,
        mDef: 20,
        speed: 40,
        atkSpd: 2000,
        castSpd: 1500,
        atkRange: 250,
        rangeMin: 0,
        rangeMax: 250,
        acc: 90,
        eva: 0,
        crit: 20,
        ultChargeSpeed: 1.2,
        fireRes: 20,
        iceRes: 20,
        lightningRes: 20,
        physicsRadius: 30,
        spriteSize: 64,
        aiType: 'MELEE',
        scale: 4.0,
        growth: { maxHp: 1000, atk: 15, mAtk: 5, def: 8, mDef: 8, acc: 5, eva: 0, crit: 1 }
    },
    ORC: {
        id: 'orc',
        name: 'Orc Archer (오크 아처)',
        sprite: 'orc_sprite',
        maxHp: 150,
        hp: 150,
        atk: 18,
        mAtk: 5,
        def: 8,
        mDef: 5,
        speed: 45,
        atkSpd: 1800,
        castSpd: 1000,
        atkRange: 350,
        rangeMin: 150,
        rangeMax: 350,
        acc: 85,
        eva: 5,
        crit: 10,
        ultChargeSpeed: 1.0,
        fireRes: 5,
        iceRes: 5,
        lightningRes: 5,
        physicsRadius: 22,
        spriteSize: 64,
        spawnOffset: { x: 450, y: 450 },
        aiType: 'RANGED',
        scale: 1.1,
        expReward: 45,
        growth: { maxHp: 35, atk: 4.5, mAtk: 1, def: 2, mDef: 1.5, acc: 2.5, eva: 1, crit: 0.5 }
    },
    EPIC_GOBLIN: {
        id: 'epic_goblin',
        name: 'Epic Goblin (에픽 고블린)',
        sprite: 'epic_goblin_sprite',
        cutscene: 'epic_goblin_cutscene',
        maxHp: 200, // Normal Goblin is 120
        hp: 200,
        atk: 25, // Normal Goblin is 12
        mAtk: 5,
        def: 12, // Normal Goblin is 6
        mDef: 10,
        speed: 55, // Slightly faster than normal (50)
        atkSpd: 1400, // Faster than normal (1600)
        castSpd: 1000,
        atkRange: 100,
        rangeMin: 0,
        rangeMax: 100,
        acc: 100,
        eva: 15,
        crit: 15,
        ultChargeSpeed: 1.2,
        fireRes: 10,
        iceRes: 10,
        lightningRes: 10,
        physicsRadius: 28,
        spriteSize: 64,
        aiType: 'MELEE',
        scale: 2.2,
        skillName: 'Blood Rage',
        expReward: 250,
        growth: { maxHp: 35, atk: 5.5, mAtk: 1.5, def: 2.5, mDef: 2.2, acc: 2.5, eva: 1.2, crit: 0.8 } // ~2x growth
    },
    EPIC_ORC: {
        id: 'epic_orc',
        name: 'Epic Orc Archer (에픽 오크 아처)',
        sprite: 'epic_orc_sprite',
        cutscene: 'epic_orc_cutscene',
        maxHp: 280, // Normal Orc is 150
        hp: 280,
        atk: 35, // Normal Orc is 18
        mAtk: 10,
        def: 15, // Normal Orc is 12
        mDef: 12,
        speed: 50, // Slightly faster than normal (45)
        atkSpd: 1500, // Faster than normal (1800)
        castSpd: 1000,
        atkRange: 450,
        rangeMin: 150,
        rangeMax: 450,
        acc: 105,
        eva: 10,
        crit: 20,
        ultChargeSpeed: 1.2,
        fireRes: 15,
        iceRes: 15,
        lightningRes: 15,
        physicsRadius: 25,
        spriteSize: 64,
        aiType: 'RANGED',
        scale: 2.5,
        skillName: 'Electric Grenade',
        expReward: 300,
        growth: { maxHp: 65, atk: 8.5, mAtk: 2.5, def: 4.5, mDef: 3.5, acc: 4, eva: 1.8, crit: 1.2 }
    },

    SKELETON_WARRIOR: {
        id: 'skeleton_warrior',
        name: 'Skeleton Warrior (스켈레톤 전사)',
        sprite: 'skeleton_warrior_sprite',
        maxHp: 120,
        hp: 120,
        atk: 18,
        mAtk: 0,
        def: 10,
        mDef: 4,
        speed: 70,
        atkRange: 45,
        atkSpd: 1400,
        castSpd: 1000,
        rangeMin: 0,
        rangeMax: 45,
        acc: 85,
        eva: 5,
        crit: 8,
        ultChargeSpeed: 1.0,
        fireRes: -10, // Undead weakness
        iceRes: 10,
        lightningRes: 0,
        physicsRadius: 20,
        spriteSize: 64,
        aiType: 'MELEE',
        expReward: 35,
        growth: { maxHp: 25, atk: 4, mAtk: 0, def: 2.5, mDef: 1, acc: 2, eva: 1, crit: 0.4 }
    },
    SKELETON_WIZARD: {
        id: 'skeleton_wizard',
        name: 'Skeleton Wizard (스켈레톤 위자드)',
        sprite: 'skeleton_wizard_sprite',
        maxHp: 70,
        hp: 70,
        atk: 5,
        mAtk: 22,
        def: 4,
        mDef: 15,
        speed: 75,
        atkRange: 220,
        rangeMin: 150,
        rangeMax: 260,
        atkSpd: 2200,
        castSpd: 1800,
        acc: 90,
        eva: 12,
        crit: 12,
        ultChargeSpeed: 1.1,
        fireRes: -15,
        iceRes: 15,
        lightningRes: 5,
        physicsRadius: 18,
        spriteSize: 64,
        aiType: 'RANGED_MAGIC',
        expReward: 45,
        growth: { maxHp: 18, atk: 1, mAtk: 5, def: 1, mDef: 3, acc: 1.5, eva: 1.5, crit: 0.6 }
    },
    CROCODILE_WARRIOR: {
        id: 'crocodile_warrior',
        name: 'Crocodile Warrior (악어 전사)',
        sprite: 'crocodile_warrior_sprite',
        maxHp: 450,
        hp: 450,
        atk: 35,
        mAtk: 0,
        def: 22,
        mDef: 12,
        speed: 55,
        atkRange: 55,
        atkSpd: 1600,
        castSpd: 1000,
        rangeMin: 0,
        rangeMax: 55,
        acc: 88,
        eva: 8,
        crit: 12,
        ultChargeSpeed: 1.0,
        fireRes: -5,
        iceRes: 15,
        lightningRes: -10,
        physicsRadius: 25,
        spriteSize: 64,
        aiType: 'MELEE',
        expReward: 65,
        growth: { maxHp: 85, atk: 7.5, mAtk: 0, def: 5, mDef: 2.5, acc: 2.2, eva: 1.2, crit: 0.8 }
    },
    CROCODILE_ARCHER: {
        id: 'crocodile_archer',
        name: 'Crocodile Archer (악어 궁수)',
        sprite: 'crocodile_archer_sprite',
        maxHp: 320,
        hp: 320,
        atk: 42,
        mAtk: 5,
        def: 12,
        mDef: 10,
        speed: 65,
        atkRange: 380,
        atkSpd: 1400,
        castSpd: 1000,
        rangeMin: 180,
        rangeMax: 380,
        acc: 92,
        eva: 18,
        crit: 18,
        ultChargeSpeed: 1.0,
        fireRes: -5,
        iceRes: 15,
        lightningRes: -10,
        physicsRadius: 22,
        spriteSize: 64,
        aiType: 'RANGED',
        expReward: 80,
        growth: { maxHp: 55, atk: 9, mAtk: 1.5, def: 2.5, mDef: 2, acc: 3, eva: 1.8, crit: 1.2 }
    },
    CROCODILE_HEALER: {
        id: 'crocodile_healer',
        name: 'Crocodile Healer (악어 힐러)',
        sprite: 'crocodile_healer_sprite',
        maxHp: 280,
        hp: 280,
        atk: 10,
        mAtk: 35,
        def: 10,
        mDef: 18,
        speed: 60,
        atkRange: 200,
        atkSpd: 2200,
        castSpd: 1800,
        rangeMin: 0,
        rangeMax: 200,
        acc: 85,
        eva: 12,
        crit: 5,
        ultChargeSpeed: 1.1,
        fireRes: -5,
        iceRes: 15,
        lightningRes: -10,
        physicsRadius: 20,
        spriteSize: 64,
        aiType: 'SUPPORT',
        expReward: 75,
        growth: { maxHp: 45, atk: 1.5, mAtk: 8, def: 2, mDef: 3.5, acc: 1.8, eva: 1.5, crit: 0.5 }
    },

    // --- Lava Field: Fire Spirits (Stronger than Crocodiles) ---
    FIRE_SPIRIT_WARRIOR: {
        id: 'fire_spirit_warrior',
        name: '불꽃 정령 전사',
        sprite: 'fire_spirit_warrior_sprite',
        maxHp: 550,
        hp: 550,
        atk: 48,
        mAtk: 0,
        def: 25,
        mDef: 20,
        speed: 60,
        atkRange: 60,
        atkSpd: 1300,
        castSpd: 1000,
        acc: 90,
        eva: 12,
        crit: 12,
        ultChargeSpeed: 1.0,
        fireRes: 50,
        iceRes: -20,
        lightningRes: 0,
        physicsRadius: 22,
        spriteSize: 80,
        scale: 1,
        aiType: 'MELEE',
        element: 'fire',
        expReward: 95,
        growth: { maxHp: 100, atk: 12, mAtk: 0, def: 6, mDef: 4, acc: 2.5, eva: 1.5, crit: 1.0 }
    },
    FIRE_SPIRIT_ARCHER: {
        id: 'fire_spirit_archer',
        name: '불꽃 정령 궁수',
        sprite: 'fire_spirit_archer_sprite',
        maxHp: 380,
        hp: 380,
        atk: 55,
        mAtk: 5,
        def: 15,
        mDef: 12,
        speed: 70,
        atkRange: 400,
        atkSpd: 1250,
        castSpd: 1000,
        rangeMin: 200,
        rangeMax: 400,
        acc: 95,
        eva: 20,
        crit: 22,
        ultChargeSpeed: 1.0,
        fireRes: 40,
        iceRes: -15,
        lightningRes: 0,
        physicsRadius: 20,
        spriteSize: 80,
        scale: 1,
        aiType: 'RANGED',
        element: 'fire',
        expReward: 115,
        growth: { maxHp: 65, atk: 15, mAtk: 2, def: 3, mDef: 2.5, acc: 3.5, eva: 2.0, crit: 1.5 }
    },
    FIRE_SPIRIT_WIZARD: {
        id: 'fire_spirit_wizard',
        name: '불꽃 정령 마법사',
        sprite: 'fire_spirit_wizard_sprite',
        maxHp: 340,
        hp: 340,
        atk: 10,
        mAtk: 52,
        def: 12,
        mDef: 22,
        speed: 65,
        atkRange: 450,
        atkSpd: 1800,
        castSpd: 1600,
        rangeMin: 0,
        rangeMax: 450,
        acc: 88,
        eva: 15,
        crit: 15,
        ultChargeSpeed: 1.1,
        fireRes: 60,
        iceRes: -25,
        lightningRes: 0,
        physicsRadius: 18,
        spriteSize: 80,
        scale: 1,
        aiType: 'RANGED_MAGIC',
        element: 'fire',
        expReward: 110,
        growth: { maxHp: 55, atk: 2, mAtk: 14, def: 2.5, mDef: 5, acc: 2, eva: 1.8, crit: 1.0 }
    },

    // --- Winter Land: Ice Spirits (Stronger than Fire Spirits) ---
    ICE_SPIRIT_WARRIOR: {
        id: 'ice_spirit_warrior',
        name: '얼음 정령 전사',
        sprite: 'ice_spirit_warrior_sprite',
        maxHp: 680,
        hp: 680,
        atk: 58,
        mAtk: 0,
        def: 32,
        mDef: 25,
        speed: 55,
        atkRange: 60,
        atkSpd: 1400,
        castSpd: 1000,
        acc: 92,
        eva: 10,
        crit: 10,
        ultChargeSpeed: 1.0,
        fireRes: -20,
        iceRes: 80,
        lightningRes: 0,
        physicsRadius: 22,
        spriteSize: 80,
        scale: 1,
        aiType: 'MELEE',
        element: 'ice',
        freezeChance: 0.12,
        expReward: 140,
        growth: { maxHp: 125, atk: 15, mAtk: 0, def: 8, mDef: 5, acc: 2.8, eva: 1.4, crit: 1.0 }
    },
    ICE_SPIRIT_WIZARD: {
        id: 'ice_spirit_wizard',
        name: '얼음 정령 마법사',
        sprite: 'ice_spirit_wizard_sprite',
        maxHp: 420,
        hp: 420,
        atk: 12,
        mAtk: 64,
        def: 18,
        mDef: 28,
        speed: 60,
        atkRange: 420,
        atkSpd: 1900,
        castSpd: 1700,
        rangeMin: 0,
        rangeMax: 420,
        acc: 90,
        eva: 15,
        crit: 18,
        ultChargeSpeed: 1.1,
        fireRes: -15,
        iceRes: 80,
        lightningRes: 0,
        physicsRadius: 18,
        spriteSize: 80,
        scale: 1,
        aiType: 'RANGED_MAGIC',
        element: 'ice',
        freezeChance: 0.12,
        expReward: 165,
        growth: { maxHp: 75, atk: 2.5, mAtk: 18, def: 3.5, mDef: 6, acc: 2.2, eva: 1.8, crit: 1.2 }
    },
    ICE_SPIRIT_HEALER: {
        id: 'ice_spirit_healer',
        name: '얼음 정령 힐러',
        sprite: 'ice_spirit_healer_sprite',
        maxHp: 450,
        hp: 450,
        atk: 10,
        mAtk: 50,
        def: 20,
        mDef: 30,
        speed: 58,
        atkRange: 250,
        atkSpd: 2400,
        castSpd: 2000,
        rangeMin: 0,
        rangeMax: 250,
        acc: 85,
        eva: 12,
        crit: 8,
        ultChargeSpeed: 1.2,
        fireRes: -10,
        iceRes: 80,
        lightningRes: 0,
        physicsRadius: 20,
        spriteSize: 80,
        scale: 1,
        aiType: 'SUPPORT',
        element: 'ice',
        freezeChance: 0.12,
        expReward: 155,
        growth: { maxHp: 85, atk: 1.8, mAtk: 12, def: 4, mDef: 7, acc: 2.0, eva: 1.6, crit: 0.8 }
    }
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
export const StructureStats = {
    TURRET_BOWGUN: {
        id: 'turret_bowgun',
        name: '보우건 터렛',
        sprite: 'bow_turret_sprite',
        projectileType: 'archer',
        hp: 1000,
        maxHp: 1000,
        atk: 45,
        mAtk: 0,
        def: 30,
        mDef: 10,
        speed: 0,
        atkSpd: 1200,
        atkRange: 450,
        rangeMin: 0,
        rangeMax: 450,
        castSpd: 0,
        acc: 100,
        eva: 0,
        crit: 5,
        ultChargeSpeed: 1.0,
        fireRes: 0,
        iceRes: 0,
        lightningRes: 0,
        physicsRadius: 25,
        spriteSize: 80,
        aiType: 'RANGED'
    },
    HEALING_TURRET: {
        id: 'healing_turret',
        name: '힐링 터렛',
        sprite: 'healing_turret_sprite',
        projectileType: 'heal_pulse',
        hp: 800,
        maxHp: 800,
        atk: 0,
        mAtk: 40,
        def: 20,
        mDef: 25,
        speed: 0,
        atkSpd: 2000,
        atkRange: 500,
        rangeMin: 0,
        rangeMax: 500,
        castSpd: 1000,
        acc: 100,
        eva: 0,
        crit: 5,
        ultChargeSpeed: 1.0,
        fireRes: 10,
        iceRes: 10,
        lightningRes: 10,
        physicsRadius: 25,
        spriteSize: 80,
        aiType: 'SUPPORT'
    }
};

export const StageConfigs = {
    CURSED_FOREST: {
        id: 'cursed_forest',
        name: '저주받은 숲',
        background: 'bg_cursed_forest',
        ambientColor: 0x1a003a,
        ambientAlpha: 0.22,
        goldMultiplier: 1.0,
        monsterPool: ['goblin', 'shaman', 'orc', 'epic_goblin', 'epic_orc'],
        difficulties: {
            NORMAL: { levelOffset: 0, spawnMult: 1, epicChanceBase: 0 },
            NIGHTMARE: { levelOffset: 40, spawnMult: 1.2, epicChanceBase: 0.1, epicPool: ['epic_goblin', 'epic_orc'] },
            HELL: { levelOffset: 100, spawnMult: 2.0, epicChanceBase: 0.3, epicPool: ['epic_goblin', 'epic_orc'] }
        }
    },
    ARENA: {
        id: 'arena',
        name: '용맹의 결투장',
        background: 'bg_arena',
        ambientColor: 0x3a1000,
        ambientAlpha: 0.15,
        goldMultiplier: 1.2
    },
    RAID: {
        id: 'raid',
        name: '보스의 요새',
        background: 'bg_raid',
        ambientColor: 0x00103a,
        ambientAlpha: 0.2,
        goldMultiplier: 2.0
    },
    UNDEAD_GRAVEYARD: {
        id: 'undead_graveyard',
        name: '언데드 묘지',
        background: 'bg_undead_graveyard',
        ambientColor: 0x0a1a0a,
        ambientAlpha: 0.25,
        goldMultiplier: 1.5,
        monsterPool: ['skeleton_warrior', 'skeleton_wizard']
    },
    SWAMPLAND: {
        id: 'swampland',
        name: '늪지대',
        background: 'bg_swampland',
        ambientColor: 0x1a2a0a,
        ambientAlpha: 0.3,
        goldMultiplier: 2.5,
        monsterPool: ['crocodile_warrior', 'crocodile_archer', 'crocodile_healer']
    },
    LAVA_FIELD: {
        id: 'lava_field',
        name: '용암 지대',
        background: 'bg_lava_field',
        ambientColor: 0x4a0a00,
        ambientAlpha: 0.25,
        goldMultiplier: 4.0,
        monsterPool: ['fire_spirit_warrior', 'fire_spirit_archer', 'fire_spirit_wizard']
    },
    WINTER_LAND: {
        id: 'winter_land',
        name: '겨울의 나라',
        background: 'bg_winter_land',
        ambientColor: 0xddeeff,
        ambientAlpha: 0.2,
        goldMultiplier: 6.0,
        monsterPool: ['ice_spirit_warrior', 'ice_spirit_wizard', 'ice_spirit_healer']
    }
};

/**
 * Utility: Scale stats based on level and variant type.
 * @param {Object} config The base config.
 * @param {number} level The target level.
 * @param {string} type 'NORMAL', 'ELITE', 'RAID'
 * @returns {Object} A new config object with scaled stats.
 */
export function scaleStats(config, level, type = 'NORMAL') {
    if (!config) return null;

    const levelFactor = level - 1;
    const variant = MONSTER_SCALING[type] || { hp: 1, power: 1, speed: 1, acc: 0, eva: 0, crit: 0 };

    // Star scaling for mercenaries/pets
    const starLevel = config.star || 1;
    const starMultiplier = Math.pow(1.2, starLevel - 1);

    // Merge class-specific defaults if not already present
    // This ensures named characters (Nickle, Ella, etc.) use their class growth rates.
    let baseClassConfig = null;
    if (config.classId) {
        baseClassConfig = MercenaryClasses[config.classId.toUpperCase()];
    }

    const growth = config.growth || (baseClassConfig ? baseClassConfig.growth : null) || {
        maxHp: (config.maxHp || (baseClassConfig?.maxHp) || 100) * 0.1,
        atk: (config.atk || (baseClassConfig?.atk) || 10) * 0.1,
        mAtk: (config.mAtk || (baseClassConfig?.mAtk) || 10) * 0.1,
        def: (config.def || (baseClassConfig?.def) || 5) * 0.05,
        mDef: (config.mDef || (baseClassConfig?.mDef) || 5) * 0.05,
        acc: 1,
        eva: 0.5,
        crit: 0.2
    };

    const newConfig = { ...config };

    // 1. Core HP/Power/Def Scaling
    newConfig.maxHp = Math.floor(((config.maxHp || 100) + (levelFactor * (growth.maxHp || 0))) * starMultiplier * variant.hp);
    newConfig.hp = newConfig.maxHp;
    newConfig.atk = Math.floor(((config.atk || 10) + (levelFactor * (growth.atk || 0))) * starMultiplier * variant.power);
    newConfig.mAtk = Math.floor(((config.mAtk || 10) + (levelFactor * (growth.mAtk || 0))) * starMultiplier * variant.power);
    newConfig.def = Math.floor(((config.def || 5) + (levelFactor * (growth.def || 0))) * starMultiplier * variant.power);
    newConfig.mDef = Math.floor(((config.mDef || 5) + (levelFactor * (growth.mDef || 0))) * starMultiplier * variant.power);

    // 2. Speed Scaling (Static as per user request)
    newConfig.speed = (config.speed || 100) * variant.speed;

    // 3. Accuracy/Evasion/Critical Scaling (Static as per user request)
    newConfig.acc = (config.acc || 90) + variant.acc;
    newConfig.eva = (config.eva || 5) + variant.eva;
    newConfig.crit = (config.crit || 5) + variant.crit;

    // 4. Attack/Cast Speed (Static as per user request)
    newConfig.atkSpd = config.atkSpd || 1500;
    newConfig.castSpd = config.castSpd || 1000;

    // 5. Explicitly carry over the new stats (with defaults just in case)
    newConfig.ultChargeSpeed = config.ultChargeSpeed || 1.0;
    // RESISTANCES: Do NOT grow with level (as per user request)
    newConfig.fireRes = config.fireRes || 0;
    newConfig.iceRes = config.iceRes || 0;
    newConfig.lightningRes = config.lightningRes || 0;

    // RANGES: Do NOT grow with level, but MUST inherit from class if missing in config
    newConfig.rangeMin = (config.rangeMin !== undefined) ? config.rangeMin : (baseClassConfig?.rangeMin || 0);
    newConfig.rangeMax = (config.rangeMax !== undefined) ? config.rangeMax : (baseClassConfig?.rangeMax || config.atkRange || 100);
    newConfig.atkRange = (config.atkRange !== undefined) ? config.atkRange : (baseClassConfig?.atkRange || 100);

    newConfig.level = level;
    newConfig.type = type;

    return newConfig;
}

/**
 * Centralized EXP formula.
 * @param {number} level 
 * @returns {number}
 */
export function calculateExpToNextLevel(level) {
    // Simple scaling: 100, 250, 450, 700... (Level^2 * 50 + 50)
    return (level * level * 50) + 50;
}

/**
 * Centralized Stat Summation logic.
 * Combines base scaled stats with equipment, grimoire, and pet bonuses.
 * @param {Object} baseStats The stats from scaleStats()
 * @param {Object} equipment Current equipment objects
 * @param {Object} grimoire Current grimoire bonuses object { chapter_a: [...] } 
 * @param {Object} petBonuses Global pet multipliers { atkMult: 0.1, ... }
 * @returns {Object} Total calculated stats
 */
export function calculateTotalStats(baseStats, equipment = {}, grimoire = null, petBonuses = {}) {
    const total = { ...baseStats };

    // --- 1. Sum Equipment Bonuses ---
    const eqAdditive = {};
    const eqMults = {};

    for (const slot in equipment) {
        const item = equipment[slot];
        if (!item || !item.stats) continue;

        for (const stat in item.stats) {
            const val = item.stats[stat];
            if (stat.endsWith('Mult')) {
                eqMults[stat] = (eqMults[stat] || 0) + val;
            } else {
                eqAdditive[stat] = (eqAdditive[stat] || 0) + val;
            }
        }
    }

    // --- 2. Grimoire Bonuses (Simplified Chapter A parsing for UI) ---
    // In live play, this is pre-calculated by GrimoireManager.
    // Here we might receive either the raw grimoire object or the pre-calculated bonuses object.
    let gBonuses = grimoire?.grimoireBonuses || grimoire || {};
    let transMult = grimoire?.grimoire_transmult || 1.0;

    // --- 3. Apply HP / ATK / DEF (The Core 5) ---
    const applyCore = (stat, baseVal, bonusKey) => {
        const additive = (eqAdditive[stat] || 0);
        const mult = (eqMults[stat + 'Mult'] || 0) + (gBonuses[bonusKey + 'Mult'] || 0) + (petBonuses[stat + 'Mult'] || 0);
        return Math.floor((baseVal + additive) * (1 + mult) * transMult);
    };

    total.maxHp = applyCore('maxHp', total.maxHp, 'maxHp');
    total.hp = total.maxHp;
    total.atk = applyCore('atk', total.atk, 'atk');
    total.mAtk = applyCore('mAtk', total.mAtk, 'mAtk');
    total.def = applyCore('def', total.def, 'def');
    total.mDef = applyCore('mDef', total.mDef, 'mDef');

    // --- 4. Other Stats ---
    total.speed = Math.floor(((total.speed || 100) + (eqAdditive.speed || 0) + (gBonuses.speedAdd || 0)) * (1 + (petBonuses.speedMult || 0)) * transMult);
    total.atkSpd = Math.max(100, Math.floor(((total.atkSpd || 1500) + (eqAdditive.atkSpd || 0)) * (1 - (eqMults.atkSpdMult || 0))));
    total.castSpd = Math.max(100, Math.floor(((total.castSpd || 1000) + (eqAdditive.castSpd || 0))));

    total.acc = Math.floor(((total.acc || 0) + (eqAdditive.acc || 0)) * (1 + (eqMults.accMult || 0)));
    total.eva = Math.floor(((total.eva || 0) + (eqAdditive.eva || 0)) * (1 + (eqMults.evaMult || 0)));
    total.crit = Math.min(100, Math.floor(((total.crit || 0) + (eqAdditive.crit || 0) + (gBonuses.critAdd || 0)) * (1 + (eqMults.critMult || 0))));

    // --- 5. Resistances ---
    total.fireRes = (total.fireRes || 0) + (eqAdditive.fireRes || 0) + (gBonuses.fireResAdd || 0);
    total.iceRes = (total.iceRes || 0) + (eqAdditive.iceRes || 0) + (gBonuses.iceResAdd || 0);
    total.lightningRes = (total.lightningRes || 0) + (eqAdditive.lightningRes || 0) + (gBonuses.lightningResAdd || 0);

    return total;
}

