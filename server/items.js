// Sistema de Itens com Raridades e Estatísticas

const RARITIES = {
    comum: { color: '#95a5a6', dropChance: 0.60 },
    incomum: { color: '#2ecc71', dropChance: 0.25 },
    raro: { color: '#3498db', dropChance: 0.10 },
    epico: { color: '#9b59b6', dropChance: 0.04 },
    lendario: { color: '#f39c12', dropChance: 0.01 }
};

const ITEM_TEMPLATES = {
    // Armas
    espada_ferrugem: {
        name: 'Espada Enferrujada',
        type: 'weapon',
        baseStats: { str: 5, agi: 0, int: 0, vit: 0 },
        rarities: ['comum', 'incomum']
    },
    espada_aco: {
        name: 'Espada de Aço',
        type: 'weapon',
        baseStats: { str: 12, agi: 0, int: 0, vit: 0 },
        rarities: ['incomum', 'raro', 'epico']
    },
    katana_vento: {
        name: 'Katana do Vento',
        type: 'weapon',
        baseStats: { str: 10, agi: 15, int: 0, vit: 0 },
        rarities: ['raro', 'epico', 'lendario']
    },
    cajado_arcano: {
        name: 'Cajado Arcano',
        type: 'weapon',
        baseStats: { str: 0, agi: 0, int: 20, vit: 0 },
        rarities: ['raro', 'epico']
    },
    machado_guerra: {
        name: 'Machado de Guerra',
        type: 'weapon',
        baseStats: { str: 25, agi: -5, int: 0, vit: 5 },
        rarities: ['epico', 'lendario']
    },

    // Armaduras
    peitoral_couro: {
        name: 'Peitoral de Couro',
        type: 'armor',
        baseStats: { str: 0, agi: 5, int: 0, vit: 8 },
        rarities: ['comum', 'incomum']
    },
    peitoral_ferro: {
        name: 'Peitoral de Ferro',
        type: 'armor',
        baseStats: { str: 5, agi: -2, int: 0, vit: 15 },
        rarities: ['incomum', 'raro']
    },
    armadura_dragao: {
        name: 'Armadura do Dragão',
        type: 'armor',
        baseStats: { str: 10, agi: 0, int: 0, vit: 30 },
        rarities: ['epico', 'lendario']
    },

    // Acessórios
    anel_fogo: {
        name: 'Anel de Fogo',
        type: 'accessory',
        baseStats: { str: 3, agi: 0, int: 8, vit: 0 },
        rarities: ['raro', 'epico']
    },
    anel_velocidade: {
        name: 'Anel da Velocidade',
        type: 'accessory',
        baseStats: { str: 0, agi: 12, int: 0, vit: 0 },
        rarities: ['raro', 'epico']
    },
    colar_vitalidade: {
        name: 'Colar da Vitalidade',
        type: 'accessory',
        baseStats: { str: 0, agi: 0, int: 0, vit: 20 },
        rarities: ['epico', 'lendario']
    },

    // Consumíveis
    pocao_vida: {
        name: 'Poção de Vida',
        type: 'consumable',
        effect: 'heal',
        value: 50,
        rarities: ['comum', 'incomum', 'raro']
    },
    pocao_mana: {
        name: 'Poção de Mana',
        type: 'consumable',
        effect: 'restore_mana',
        value: 30,
        rarities: ['comum', 'incomum']
    },
    elixir_forca: {
        name: 'Elixir da Força',
        type: 'consumable',
        effect: 'buff_str',
        value: 5,
        duration: 60,
        rarities: ['raro', 'epico']
    }
};

class ItemSystem {
    constructor() {
        this.templates = ITEM_TEMPLATES;
        this.rarities = RARITIES;
    }

    /**
     * Gera um item aleatório baseado em raridade
     */
    generateRandomItem() {
        const rarity = this.selectRarity();
        const templateKey = Object.keys(ITEM_TEMPLATES)[
            Math.floor(Math.random() * Object.keys(ITEM_TEMPLATES).length)
        ];
        const template = ITEM_TEMPLATES[templateKey];

        // Verificar se o template suporta essa raridade
        if (!template.rarities.includes(rarity)) {
            return this.generateRandomItem(); // Tentar novamente
        }

        return this.createItem(templateKey, template, rarity);
    }

    /**
     * Seleciona uma raridade baseada em chances de drop
     */
    selectRarity() {
        const rand = Math.random();
        let cumulative = 0;

        for (const [rarity, data] of Object.entries(RARITIES)) {
            cumulative += data.dropChance;
            if (rand <= cumulative) return rarity;
        }

        return 'comum';
    }

    /**
     * Cria um item com estatísticas modificadas pela raridade
     */
    createItem(templateKey, template, rarity) {
        const rarityMultiplier = {
            comum: 1.0,
            incomum: 1.2,
            raro: 1.5,
            epico: 2.0,
            lendario: 2.5
        };

        const multiplier = rarityMultiplier[rarity] || 1.0;
        const stats = {};

        // Aplicar multiplicador às estatísticas base
        for (const [stat, value] of Object.entries(template.baseStats || {})) {
            stats[stat] = Math.round(value * multiplier);
        }

        return {
            id: `${templateKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            key: templateKey,
            name: template.name,
            type: template.type,
            rarity: rarity,
            color: RARITIES[rarity].color,
            stats: stats,
            effect: template.effect || null,
            value: template.value || 0,
            duration: template.duration || 0
        };
    }

    /**
     * Gera loot baseado no tipo de inimigo
     */
    generateLoot(enemyType, playerLevel) {
        const lootTable = {
            slime: {
                items: ['pocao_vida', 'pocao_mana'],
                gold: { min: 10, max: 30 },
                xp: 60
            },
            goblin: {
                items: ['espada_ferrugem', 'peitoral_couro', 'pocao_vida'],
                gold: { min: 30, max: 60 },
                xp: 120
            },
            orc: {
                items: ['espada_aco', 'peitoral_ferro', 'anel_fogo'],
                gold: { min: 60, max: 120 },
                xp: 200
            },
            dragao_menor: {
                items: ['katana_vento', 'armadura_dragao', 'colar_vitalidade'],
                gold: { min: 200, max: 400 },
                xp: 500
            }
        };

        const table = lootTable[enemyType] || lootTable.slime;
        const loot = {
            items: [],
            gold: Math.floor(Math.random() * (table.gold.max - table.gold.min + 1)) + table.gold.min,
            xp: table.xp + (playerLevel * 10)
        };

        // 70% de chance de dropar um item
        if (Math.random() < 0.7 && table.items.length > 0) {
            const itemKey = table.items[Math.floor(Math.random() * table.items.length)];
            const template = ITEM_TEMPLATES[itemKey];
            const rarity = this.selectRarity();

            if (template.rarities.includes(rarity)) {
                loot.items.push(this.createItem(itemKey, template, rarity));
            }
        }

        return loot;
    }

    /**
     * Calcula o valor total de venda de um item
     */
    getItemValue(item) {
        const baseValue = {
            weapon: 50,
            armor: 40,
            accessory: 30,
            consumable: 10
        };

        const rarityMultiplier = {
            comum: 1.0,
            incomum: 1.5,
            raro: 2.5,
            epico: 4.0,
            lendario: 8.0
        };

        const base = baseValue[item.type] || 10;
        const multiplier = rarityMultiplier[item.rarity] || 1.0;
        const statBonus = Object.values(item.stats || {}).reduce((a, b) => a + b, 0) * 5;

        return Math.floor((base * multiplier) + statBonus);
    }

    /**
     * Aplica os bônus de um item aos stats do jogador
     */
    applyItemBonus(playerStats, item) {
        if (!item.stats) return playerStats;

        return {
            str: (playerStats.str || 0) + (item.stats.str || 0),
            agi: (playerStats.agi || 0) + (item.stats.agi || 0),
            int: (playerStats.int || 0) + (item.stats.int || 0),
            vit: (playerStats.vit || 0) + (item.stats.vit || 0)
        };
    }
}

module.exports = new ItemSystem();
