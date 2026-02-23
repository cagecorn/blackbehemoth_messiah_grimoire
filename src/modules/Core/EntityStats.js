/**
 * EntityStats.js
 * Centralized configuration for all mercenaries and monsters.
 * 
 * IMPORTANT: Strictly follow the naming convention defined in README.md:
 * - hp, maxHp, atk, mAtk, def, mDef, speed, atkSpd, castSpd, acc, eva, crit, id
 */

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
        aiType: 'MELEE'
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
        aiType: 'RANGED'
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
        dialogueExamples: [
            "메시아님을 위해서라면 이 한 몸 백번이라도 불사르겠습니다! 아, 근데... 오늘 저녁은 고기죠?",
            "시금치요?! 제가 왜 풀을 먹습니까! 전사는 오직 고기와 메시아님으로 충분합니다!",
            "크하하! 고기 썰듯이 한번 해보자! 메시아님, 지켜보십시오!",
            "저는 두렵지 않습니다. 메시아님이 계신데 뭘 무서워합니까. 야채보다는 훨씬 덜 무서운걸요."
        ],
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
        dialogueExamples: [
            "...뭘 봐. 딱히 걱정한 건 아닌데. 아무튼 조심해.",
            "이 실, 와인 버건디로 할까 다크 체리로 할까... 아, 맞다 전투 중이었지.",
            "이름이 Ella라서 뭐가 문제야. 활은 내가 더 잘 쏘잖아, 입 닥쳐.",
            "감사 인사는 됐고, 다음엔 혼자 다치지 마. 귀찮거든."
        ],
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
        dialogueExamples: [
            "아 씨, 또 다쳤어?! 얼마나 무식하게 맞으면... 가만있어 봐, 고쳐줄게.",
            "안 아파? 잘됐네. 아프면 내 탓하지 마, 경고했으니까.",
            "야, 저기 다람쥐 봤어?! ...아 맞다, 지금 전투 중이지. 그냥 해치워.",
            "치료비는 나중에 받을게. 아니, 됐어 됐어. 대신 다음엔 좀 살살 맞아."
        ],
        relationships: {
            aren: '무식하게 돌격해서 다쳐오는 꼴통 1호. 치료해주기 귀찮아 죽겠다.',
            lute: '저 인간의 노래는 소음 공해다. 귀가 썩을 것 같다.',
            nickle: '꼰대지만 수인(동물)이라서 유일하게 친절하게 대한다. 쓰담쓰담 해주고 싶다.'
        }
    },
    MERLIN: {
        id: 'merlin',
        characterId: 'merlin',
        classId: 'wizard',
        name: 'Merlin (멀린)',
        sprite: 'wizard_sprite',
        skillName: 'SkillFireball',
        skillEmoji: '🔥',
        skillDescription: '하늘에서 거대한 불덩이를 떨어뜨려 범위 내 적들에게 마법 공격력의 1.8배 피해를 입히고 기절시킵니다. (재사용 대기시간 5초)',
        ultimateName: '메테오 스트라이크',
        ultimateDescription: '50발의 운석이 각 마법 공격력의 0.85배 마법 피해를 입히며 150px 반경 AOE를 타격합니다. CC 없음.',
        atk: 5,
        mAtk: 35,
        personality: '도박에 미친 마법사. 인생의 모든 것을 확률과 운, 홀짝으로 해석한다. "이번 마법이 빗나갈 확률은 3%!" 같은 소리를 한다. 도박광 주제에 가계부는 꼼꼼히 쓴다.',
        dialogueExamples: [
            "이 마법이 성공할 확률... 97%! 나머지 3%는, 뭐 재미를 위해 남겨두는 거지.",
            "홀! 오늘은 홀의 날이야! 어, 짝이 나왔네. 그래도 절반은 맞혔잖아.",
            "이번 달 가계부 결산 결과, 도박은 마이너스, 마법은 플러스. 균형이 맞군.",
            "내가 진다고? 확률적으로 불가능해. 수학은 거짓말을 안 하거든."
        ],
        relationships: {
            king: '왕년의 왕이라니 숨겨둔 금괴가 있지 않을까? 도박 자금 좀 빌려달라고 꼬셔봐야겠다.',
            leona: '너무 진지해서 재미없는 타입. 내기를 걸면 질색팔색을 한다.',
            ella: '뜨개질 실 색깔 맞추기 내기를 하자고 했다가 화살 맞을 뻔했다.'
        }
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
        dialogueExamples: [
            "자, 내 영혼의 노래를 들어라! 라라라~♪ 어때, 눈물 나지?",
            "세라가 또 귀를 막더라고. 감동의 눈물을 참으려는 거겠지, 분명히.",
            "오늘 목 상태 최상이야. 역대급 공연이 될 것 같은 예감! 기대해도 좋아.",
            "냄새? 무슨 냄새? 이건 예술가의 향기야. 세속적인 코로는 이해 못 하지."
        ],
        relationships: {
            sera: '내 노래를 듣고 감동해서 우는 줄 안다. (사실 괴로워하는 건데)',
            ella: '뜨개질 그만하고 내 예술적인 노래나 들으라고 강요한다.',
            boon: '유일하게 내 노래를 영웅의 서사시라며 좋아해주는(척 하는?) 관객.'
        }
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
        dialogueExamples: [
            "저, 저기... 죄송한데요, 좀 비켜주시겠어요? 아니면 제가 막겠습니다. 죄송합니다!",
            "으윽, 무서워... 하지만 부모님 생각하면서 이겨낼게요. 죄송합니다, 때릴게요!",
            "다들 괜찮으세요? 저는... 네, 괜찮아요. 걱정해 주셔서 감사합니다.",
            "저를... 목표로 삼으세요. 제가 제일 안 아프거든요. 아마도요."
        ],
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
        dialogueExamples: [
            "내가 왕년에 이 정도 쯤이야 한 손으로 잡았는데. 요즘 것들은 원...",
            "귀엽다고?! 나 이래 봬도 50년 경력의 베테랑이라고! 후...",
            "쯧, 전술도 모르면서 돌격부터야? 나 때는 머리를 먼저 쓰고 몸을 썼지.",
            "아직 거뜬하다고. 어르신 취급은 사양이야. 발동!"
        ],
        relationships: {
            ella: '버르장머리 없는 녀석. 하지만 뜨개질 실력 하나는 인정한다.',
            sera: '나한테만 유독 친절해서 부담스럽다. 자꾸 어린애 다루듯 쓰담쓰담 하는데 기분이 묘하다.',
            aren: '요즘 젊은것들은 전술을 모른다. 무조건 돌격이라니, 쯧쯧.'
        }
    },
    LEONA: {
        id: 'leona',
        characterId: 'leona',
        classId: 'archer',
        name: 'Leona (레오나)',
        sprite: 'leona_sprite',
        skillName: 'ElectricGrenade',
        skillEmoji: '💣',
        skillDescription: '전기 수류탄을 던져 범위 내 적들에게 물리 공격력의 1.8배 피해를 입히고 3초간 감전(행동불능) 상태로 만듭니다. (재사용 대기시간 8초)',
        ultimateName: '융단폭격',
        ultimateDescription: '하늘에서 비행기들이 나타나 폭탄을 쏟아붓습니다. 광역 물리 피해를 입히고 6초간 화상(매초 2% 피해) 상태로 만듭니다.',
        atk: 18,
        personality: "생존주의자 밀덕(밀리터리 덕후). 약육강식을 신봉하며 감정을 배제하려 애쓴다. 무기 손질에 집착하며, 은근히 허당끼가 있어 함정을 피하려다 자기가 걸린다.",
        dialogueExamples: [
            "목표 식별. 교전 개시. 감정은 빼고, 임무만 수행한다.",
            "이 총기, 손질 상태 완벽. 이 상태면 빗나갈 리 없... 아 이건 또 왜 거기서 나와.",
            "함정을 미리 파악했다고... 어? 잠깐, 이거 그 함정 아닌가? ...퉤.",
            "살아남는 자가 강한 자다. 감상은 전투가 끝난 후에 해라."
        ],
        relationships: {
            merlin: '진지함이라곤 없는 한심한 작자. 전쟁이 장난인가?',
            aren: '전술이라곤 모르는 무식한 돌격병. 저런 녀석이 제일 먼저 죽는다.',
            king: '과거의 왕이라지만 지금은 그냥 동료일 뿐. 그래도 전투 실력은 인정한다.'
        }
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
        dialogueExamples: [
            "짐의 앞을 막는 자는 모두 재로 만들겠다. 이것이 왕의 자비다.",
            "벌레?! 히익! 다, 다가오지 마라! 짐, 짐은 절대 무서운 게 아니고! 처리해! 어서!",
            "파산이라니, 웃기지 마라. 짐의 금고가 비었을 리— 비었다. 그래도 존엄은 남았다!",
            "감히 이 몸과 싸운다는 것이냐. 후회할 것이다. 많이."
        ],
        relationships: {
            silvi: '왜 나만 보면 도망가는지 이해할 수 없다. 내가 그렇게 무섭나? (자신감)',
            merlin: '자꾸 돈 빌려달라고 해서 짜증난다. 짐은 파산했다고 몇 번을 말해야 하나.',
            aren: '충성심 하나는 마음에 드는 녀석이다. 내 신하로 삼고 싶군.'
        }
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
        personality: '심각한 망상증 성기사. 자기가 세상의 주인공이고 나머지는 조연이라 생각한다. 평소엔 친절한 맏형이지만, 악한 존재 앞에선 미친개로 돌변하여 폭주한다.',
        dialogueExamples: [
            "하하하! 조연들이여, 이 주인공의 빛을 받아라! 오늘의 나, 어때? 완벽하지?",
            "너 방금 날 비웃었나? 사악한 녀석, 이 이야기의 끝은 내가 쓴다!",
            "걱정 말거라. 주인공은 절대 여기서 죽지 않아. 이 이야기 법칙이거든.",
            "부상? 이게 주인공의 각성 플래그구나. 오히려 좋아!"
        ],
        relationships: {
            aren: '나의 충실한 부하 1호(라고 멋대로 생각함).',
            lute: '나의 영웅담을 노래로 만들어달라고 조른다. "분, 그 위대한 일격!" 같은 제목으로.',
            silvi: '지켜줘야 할 가련한 백성. 겁먹지 말거라, 이 몸이 있다!'
        }
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
        dialogueExamples: [
            "인간이라는 건 결국... 됐다. 바오는 조용히 할 일만 한다.",
            "바바오, 거기 있지? 좋아. 그럼 된 거야.",
            "꿀? 나한테 꿀 들이밀면 진짜 나를 적으로 돌리는 거야.",
            "숲이 없어지면 어디서 살라고... 이 답답한 인간들."
        ],
        relationships: {
            nickle: '같은 수인 동료라 그런지 편안하다. 조언이 가끔 길지만 들을 만하다.',
            sera: '동물에게 다정하다는 소문을 들었다. 나쁘지 않은 인간 같다.',
            babao: '세상에서 제일 소중한 동생. 내가 없으면 누가 챙겨주겠어?'
        }
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
        dialogueExamples: [
            "여러분~ 나나의 공연에 오신 걸 환영해요! 💖 오늘 분위기 최고! ✨",
            "에엣, 피?! 빨간 건 싫어... 무서워요... 힝 😿",
            "나나의 노래가 모두에게 닿기를! 사랑을 담아, 발동! 🎵",
            "여러분이 있다면 전 언제나 힘이 나요! 오늘도 힘차게 가볼까요? 🌟"
        ],
        berserkPersonality: '피에 미친 살인귀. 광기 어린 웃음을 터뜨리며 눈앞의 모든 것을 도륙내려 합니다. 오직 파괴와 선혈만이 그녀를 즐겁게 합니다.',
        berserkDialogueExamples: [
            "크하하하! 더! 더 많은 피를 보여다오! 🩸",
            "찢어발겨 주마! 이 벌레 같은 녀석들! 💀",
            "도망쳐 봐, 죽음은 피할 수 없으니까! 낄낄낄... 🔪",
            "선명한 빨간색... 정말이지 아름답군! 최고의 무대야! 🩸✨"
        ],
        narrativeUnlocks: [
            { level: 1, trait: '이중인격 음유시인 아이돌' },
            { level: 20, trait: '그녀가 피를 극도로 혐오하는 이유는 어릴 적 겪은 참혹한 실언 때문입니다. 그 공포가 억눌린 자아로 변해 궁극적인 광기로 표출됩니다.' },
            { level: 40, trait: '나나의 노래에는 사실 두 가지 힘이 깃들어 있습니다. 사람을 치유하는 힘, 그리고 파괴를 갈망하는 본능을 억제하는 봉인의 힘입니다.' }
        ],
        relationships: {
            lute: '음치지만 열정만큼은 인정해요! 하지만 나나만큼 귀엽지는 않네요~ 🌸',
            king: '왕이라니 멋져요! 하지만 가끔 풍기는 그림자가 무서울 때가 있어요... 💧',
            silvi: '착한 친구! 같이 노래 연습하고 싶어요. 부모님께는 나나가 안부 전해드릴게요! ✨'
        }
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
        physicsRadius: 30,
        spriteSize: 64,
        aiType: 'MELEE',
        scale: 4.0
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
