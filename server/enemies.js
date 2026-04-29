// Sistema de Inimigos com Múltiplos Tipos

const ENEMY_TYPES = {
    slime: {
        name: 'Slime',
        hp: 100,
        damage: 5,
        speed: 1.5,
        range: 30,
        xp: 60,
        gold: { min: 10, max: 30 },
        color: '#2ecc71',
        spawnRooms: ['vila', 'floresta']
    },
    goblin: {
        name: 'Goblin',
        hp: 150,
        damage: 12,
        speed: 3,
        range: 50,
        xp: 120,
        gold: { min: 30, max: 60 },
        color: '#27ae60',
        spawnRooms: ['floresta']
    },
    orc: {
        name: 'Orc',
        hp: 250,
        damage: 20,
        speed: 2,
        range: 60,
        xp: 200,
        gold: { min: 60, max: 120 },
        color: '#16a085',
        spawnRooms: ['floresta']
    },
    lobo_sombrio: {
        name: 'Lobo Sombrio',
        hp: 180,
        damage: 18,
        speed: 4,
        range: 40,
        xp: 150,
        gold: { min: 50, max: 100 },
        color: '#34495e',
        spawnRooms: ['floresta']
    },
    mago_negro: {
        name: 'Mago Negro',
        hp: 120,
        damage: 30,
        speed: 2.5,
        range: 200,
        xp: 180,
        gold: { min: 80, max: 150 },
        color: '#8e44ad',
        spawnRooms: ['floresta']
    },
    dragao_menor: {
        name: 'Dragão Menor',
        hp: 400,
        damage: 40,
        speed: 2,
        range: 100,
        xp: 500,
        gold: { min: 200, max: 400 },
        color: '#e74c3c',
        spawnRooms: ['floresta'],
        boss: true
    }
};

class EnemySystem {
    constructor() {
        this.types = ENEMY_TYPES;
        this.activeEnemies = [];
    }

    /**
     * Cria uma instância de inimigo
     */
    createEnemy(typeKey, x = 1300, y = 420, room = 'floresta') {
        const type = ENEMY_TYPES[typeKey];
        if (!type) return null;

        return {
            id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: typeKey,
            name: type.name,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            hp: type.hp,
            maxHp: type.hp,
            damage: type.damage,
            speed: type.speed,
            range: type.range,
            color: type.color,
            room: room,
            xp: type.xp,
            gold: type.gold,
            isBoss: type.boss || false,
            lastAttackTime: 0,
            attackCooldown: 30,
            targetId: null
        };
    }

    /**
     * Gera inimigos aleatórios para uma sala
     */
    spawnRandomEnemy(room) {
        const validTypes = Object.keys(ENEMY_TYPES).filter(
            key => ENEMY_TYPES[key].spawnRooms.includes(room)
        );

        if (validTypes.length === 0) return null;

        // Bosses têm 5% de chance
        let typeKey;
        if (Math.random() < 0.05) {
            const bosses = validTypes.filter(k => ENEMY_TYPES[k].boss);
            typeKey = bosses.length > 0 ? bosses[0] : validTypes[0];
        } else {
            typeKey = validTypes[Math.floor(Math.random() * validTypes.length)];
        }

        const x = Math.random() < 0.5 ? 1300 : 100;
        return this.createEnemy(typeKey, x, 420, room);
    }

    /**
     * Atualiza o comportamento de um inimigo
     */
    updateEnemy(enemy, players) {
        // Encontrar alvo mais próximo
        let closestPlayer = null;
        let closestDistance = Infinity;

        for (const player of players) {
            if (player.room !== enemy.room || player.dead) continue;

            const distance = Math.abs(player.x - enemy.x);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPlayer = player;
            }
        }

        if (closestPlayer) {
            // Mover em direção ao alvo
            const direction = closestPlayer.x > enemy.x ? 1 : -1;
            enemy.vx = direction * enemy.speed;
            enemy.targetId = closestPlayer.id;

            // Aplicar gravidade
            enemy.vy += 0.8;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            // Colisão com chão
            if (enemy.y > 420) {
                enemy.y = 420;
                enemy.vy = 0;
            }

            // Pulo ocasional para evitar obstáculos
            if (Math.random() < 0.02 && enemy.y >= 420) {
                enemy.vy = -12;
            }
        } else {
            // Patrulhar
            enemy.vx *= 0.95;
            enemy.vy += 0.8;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            if (enemy.y > 420) {
                enemy.y = 420;
                enemy.vy = 0;
            }

            // Mudar direção aleatoriamente
            if (Math.random() < 0.01) {
                enemy.vx = (Math.random() - 0.5) * enemy.speed;
            }
        }

        // Limitar movimento horizontal
        if (enemy.x < 0) enemy.x = 0;
        if (enemy.x > 1500) enemy.x = 1500;

        // Atualizar cooldown de ataque
        if (enemy.lastAttackTime > 0) {
            enemy.lastAttackTime--;
        }
    }

    /**
     * Calcula dano do inimigo considerando stats do jogador
     */
    calculateDamage(enemy, player) {
        const baseDamage = enemy.damage;
        const playerDefense = (player.stats?.vit || 0) * 0.5;
        const variance = (Math.random() - 0.5) * 10;

        return Math.max(1, baseDamage - playerDefense + variance);
    }

    /**
     * Verifica se inimigo pode atacar
     */
    canAttack(enemy) {
        return enemy.lastAttackTime <= 0;
    }

    /**
     * Executa ataque do inimigo
     */
    attack(enemy) {
        if (this.canAttack(enemy)) {
            enemy.lastAttackTime = enemy.attackCooldown;
            return true;
        }
        return false;
    }

    /**
     * Aplica dano ao inimigo
     */
    takeDamage(enemy, damage) {
        enemy.hp -= damage;
        return enemy.hp <= 0;
    }

    /**
     * Retorna informações do inimigo para o cliente
     */
    getEnemyData(enemy) {
        return {
            id: enemy.id,
            type: enemy.type,
            name: enemy.name,
            x: enemy.x,
            y: enemy.y,
            hp: Math.max(0, enemy.hp),
            maxHp: enemy.maxHp,
            color: enemy.color,
            isBoss: enemy.isBoss
        };
    }

    /**
     * Gera recompensas ao matar um inimigo
     */
    getRewards(enemy) {
        const gold = Math.floor(
            Math.random() * (enemy.gold.max - enemy.gold.min + 1) + enemy.gold.min
        );

        return {
            xp: enemy.xp,
            gold: gold,
            enemyName: enemy.name,
            isBoss: enemy.isBoss
        };
    }
}

module.exports = new EnemySystem();
