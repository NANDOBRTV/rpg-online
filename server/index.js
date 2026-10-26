require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');
const itemSystem = require('./items');
const enemySystem = require('./enemies');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        // Same-origin funciona sem CORS; domínios externos devem ser configurados
        // explicitamente em SOCKET_ALLOWED_ORIGINS, separados por vírgula.
        origin: allowedOrigins.length ? allowedOrigins : false,
        methods: ["GET", "POST"],
        credentials: true
    },
    // CORS não restringe WebSocket por si só: valide a origem no handshake.
    allowRequest: (req, callback) => {
        const origin = req.headers.origin;
        if (!origin) return callback(null, true);

        let originHost;
        try {
            originHost = new URL(origin).host;
        } catch (_) {
            return callback(null, false);
        }

        const sameOrigin = originHost === req.headers.host;
        callback(null, sameOrigin || allowedOrigins.includes(origin));
    },
    transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, '../public')));

// Configurações do jogo
const MAPS = {
    'vila': { next: 'floresta', prev: null },
    'floresta': { next: 'caverna_sombria', prev: 'vila' },
    'caverna_sombria': { next: null, prev: 'floresta' }
};

const CLASSES = {
    ninja: {
        hp: 120, damage: 25, speed: 8, range: 110, attackCD: 10,
        color: "#81ecec", skills: ["Corte Sombrio", "Passo de Vento", "Invisibilidade"]
    },
    guerreiro: {
        hp: 280, damage: 35, speed: 5, range: 140, attackCD: 18,
        color: "#ff4444", skills: ["Impacto Terrestre", "Escudo de Ferro", "Grito de Guerra"]
    },
    mago: {
        hp: 110, damage: 60, speed: 6, range: 500, attackCD: 25,
        color: "#aa88ff", skills: ["Explosão Arcana", "Barreira Mágica", "Teleporte"]
    }
};

const QUESTS = [
    { id: 'kill_slimes', title: 'Caçador de Slimes', goal: 5, reward: { xp: 200, gold: 100 } },
    { id: 'kill_goblins', title: 'Exterminador de Goblins', goal: 10, reward: { xp: 400, gold: 250 } },
    { id: 'collect_gold', title: 'Ganancioso', goal: 500, reward: { xp: 300, gold: 0 } },
    { id: 'reach_level_10', title: 'Ascensão', goal: 10, reward: { xp: 500, gold: 500 } }
];

let players = {};
let clans = {};
let worldTime = 0;
let gameState = { enemies: [] };

// ========== FUNÇÕES AUXILIARES ==========

async function loadUserData(user) {
    if (!user || !Number.isInteger(user.id)) {
        throw new Error('Usuário inválido ao carregar dados do jogo');
    }

    // As tabelas relacionadas usam users.id (ID numérico), não username.
    const [inventory, quests, bestiary, skills] = await Promise.all([
        db.getInventory(user.id),
        db.getQuests(user.id),
        db.getBestiary(user.id),
        db.getSkills(user.id)
    ]);

    return { ...user, inventory, quests, bestiary, skills };
}

async function savePlayerData(player) {
    try {
        await db.updateUser(player.userId, {
            level: player.level,
            xp: player.xp,
            gold: player.gold,
            stats_str: player.stats.str,
            stats_agi: player.stats.agi,
            stats_int: player.stats.int,
            stats_vit: player.stats.vit,
            stat_points: player.statPoints,
            last_map: player.room
        });
    } catch (err) {
        console.error('Erro ao salvar dados do jogador:', err);
    }
}

function grantRewards(playerId, xp, gold, enemyName) {
    const player = players[playerId];
    if (!player) return;

    player.xp += xp;
    player.gold += gold;

    // Atualizar bestiário
    db.recordKill(player.userId, enemyName).catch(console.error);

    // Atualizar quests
    player.quests.forEach(q => {
        if (q.quest_id === 'kill_slimes' && enemyName === 'Slime' && q.current_progress < q.goal) {
            q.current_progress++;
            db.updateQuestProgress(player.userId, q.quest_id, q.current_progress).catch(console.error);
        }
        if (q.quest_id === 'kill_goblins' && enemyName === 'Goblin' && q.current_progress < q.goal) {
            q.current_progress++;
            db.updateQuestProgress(player.userId, q.quest_id, q.current_progress).catch(console.error);
        }
    });

    // Level up
    if (player.xp >= player.level * 300) {
        player.level++;
        player.xp = 0;
        player.statPoints += 3;
        player.maxHp += 20;
        player.hp = player.maxHp;

        io.to(player.room).emit('newChat', {
            name: "⭐ SISTEMA",
            msg: `${player.name} subiu para o Nível ${player.level}!`,
            color: "#f1c40f"
        });
    }

    savePlayerData(player).catch(console.error);
    io.to(playerId).emit('updateUI');
}

// ========== EVENTOS SOCKET.IO ==========

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] Novo jogador conectado: ${socket.id}`);

    socket.on('register', async (data) => {
        try {
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                return socket.emit('msg', '❌ Dados de cadastro inválidos');
            }

            const username = typeof data.user === 'string' ? data.user.trim() : '';
            const password = typeof data.pass === 'string' ? data.pass : '';
            const charClass = typeof data.charClass === 'string' ? data.charClass : 'ninja';

            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                return socket.emit('msg', '❌ Use um nome de 3 a 20 caracteres: letras, números ou _');
            }
            if (password.length < 8 || password.length > 72) {
                return socket.emit('msg', '❌ A senha deve ter entre 8 e 72 caracteres');
            }
            if (!Object.prototype.hasOwnProperty.call(CLASSES, charClass)) {
                return socket.emit('msg', '❌ Classe de personagem inválida');
            }

            const existingUser = await db.getUser(username);
            if (existingUser) {
                return socket.emit('msg', '❌ Usuário já existe');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = await db.createUser(username, hashedPassword, charClass);

            // Criar skills iniciais
            const classSkills = CLASSES[charClass].skills;
            for (const skill of classSkills) {
                await db.addSkill(userId, skill);
            }

            // Aceitar primeira quest
            await db.addQuest(userId, 'kill_slimes', 'Caçador de Slimes', 5);

            socket.emit('msg', '✓ Conta criada com sucesso! Faça login.');
        } catch (err) {
            console.error('Erro no registro:', err);
            socket.emit('msg', '❌ Erro ao criar conta');
        }
    });

    socket.on('login', async (data) => {
        try {
            if (!data || typeof data !== 'object' || Array.isArray(data) ||
                typeof data.user !== 'string' || typeof data.pass !== 'string') {
                return socket.emit('msg', '❌ Usuário ou senha inválidos');
            }

            const username = data.user.trim();
            const user = await db.getUser(username);
            if (!user || !(await bcrypt.compare(data.pass, user.password))) {
                return socket.emit('msg', '❌ Usuário ou senha inválidos');
            }

            // A classe persistida é a fonte confiável; não permita trocar de classe
            // apenas enviando outro valor pelo cliente no login.
            const charClass = Object.prototype.hasOwnProperty.call(CLASSES, user.class)
                ? user.class
                : 'ninja';
            const classData = CLASSES[charClass];

            const player = {
                id: socket.id,
                userId: user.id,
                name: username,
                class: charClass,
                room: user.last_map || 'vila',
                x: 500,
                y: 420,
                vx: 0,
                vy: 0,
                level: user.level,
                xp: user.xp,
                gold: user.gold,
                stats: {
                    str: user.stats_str,
                    agi: user.stats_agi,
                    int: user.stats_int,
                    vit: user.stats_vit
                },
                statPoints: user.stat_points,
                ...classData,
                attackCD: 0,
                dead: false,
                color: classData.color
            };

            // Calcular HP máximo
            player.maxHp = classData.hp + (player.level * 20) + (player.stats.vit * 15);
            player.hp = player.maxHp;

            // Carregar dados adicionais
            const fullData = await loadUserData(user);
            player.inventory = fullData.inventory || [];
            player.quests = fullData.quests || [];
            player.bestiary = fullData.bestiary || [];
            player.skills = fullData.skills || [];

            players[socket.id] = player;
            socket.join(player.room);
            socket.emit('loginSuccess');
            socket.emit('updateUI');

            io.to(player.room).emit('newChat', {
                name: '🎮 SISTEMA',
                msg: `${player.name} entrou no jogo!`,
                color: '#95a5a6'
            });

            console.log(`✓ ${player.name} fez login (Nível ${player.level})`);
        } catch (err) {
            console.error('Erro no login:', err);
            socket.emit('msg', '❌ Erro ao fazer login');
        }
    });

    socket.on('addStat', async (stat) => {
        const player = players[socket.id];
        const allowedStats = ['str', 'agi', 'int', 'vit'];
        if (!player || player.statPoints <= 0 || !allowedStats.includes(stat)) return;

        player.stats[stat]++;
        player.statPoints--;

        if (stat === 'vit') {
            player.maxHp += 15;
            player.hp += 15;
        }

        await savePlayerData(player);
        socket.emit('updateUI');
    });

    socket.on('acceptQuest', async (questId) => {
        const player = players[socket.id];
        if (!player) return;

        const quest = QUESTS.find(q => q.id === questId);
        if (!quest) return;

        // Verificar se já tem a quest
        const hasQuest = player.quests.some(q => q.quest_id === questId);
        if (hasQuest) return;

        await db.addQuest(player.userId, questId, quest.title, quest.goal);
        player.quests.push({
            quest_id: questId,
            title: quest.title,
            current_progress: 0,
            goal: quest.goal
        });

        socket.emit('updateUI');
    });

    socket.on('createClan', async (data) => {
        const player = players[socket.id];
        if (!player) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return socket.emit('msg', '❌ Dados do clã inválidos');
        }

        const clanName = typeof data.clanName === 'string' ? data.clanName.trim() : '';
        const description = typeof data.description === 'string' ? data.description.trim().slice(0, 300) : '';
        if (clanName.length < 3 || clanName.length > 30) {
            return socket.emit('msg', '❌ O nome do clã deve ter entre 3 e 30 caracteres');
        }

        const clanId = uuidv4().substring(0, 8);
        try {
            await db.createClan(clanId, clanName, player.userId, description);
            await db.addClanMember(clanId, player.userId, 'lider');

            clans[clanId] = {
                id: clanId,
                name: clanName,
                leader: player.name,
                members: [player.name],
                level: 1,
                treasury: 0
            };

            player.clan = clanId;
            socket.emit('msg', `✓ Clã "${clanName}" criado com sucesso!`);
            socket.emit('updateUI');
        } catch (err) {
            console.error('Erro ao criar clã:', err);
            socket.emit('msg', '❌ Erro ao criar clã');
        }
    });

    socket.on('joinClan', async (clanId) => {
        const player = players[socket.id];
        if (!player) return;
        if (typeof clanId !== 'string' || !/^[a-f0-9-]{1,64}$/i.test(clanId)) {
            return socket.emit('msg', '❌ ID do clã inválido');
        }

        try {
            const clan = await db.getClan(clanId);
            if (!clan) return socket.emit('msg', '❌ Clã não encontrado');

            await db.addClanMember(clanId, player.userId, 'membro');
            player.clan = clanId;

            socket.emit('msg', `✓ Você entrou no clã ${clan.clan_name}!`);
            socket.emit('updateUI');
        } catch (err) {
            console.error('Erro ao entrar no clã:', err);
            socket.emit('msg', '❌ Erro ao entrar no clã');
        }
    });

    socket.on('chat', (msg) => {
        const player = players[socket.id];
        if (!player || typeof msg !== 'string') return;

        const cleanMsg = msg.substring(0, 100).trim();
        if (cleanMsg.length === 0) return;

        io.to(player.room).emit('newChat', {
            name: player.name,
            msg: cleanMsg,
            color: player.color
        });
    });

    socket.on('input', (data) => {
        const player = players[socket.id];
        if (!player || player.dead || !data || typeof data !== 'object' || Array.isArray(data)) return;

        if (data.vx !== undefined && typeof data.vx === 'number' && Number.isFinite(data.vx)) {
            const direction = Math.max(-1, Math.min(1, data.vx));
            player.vx = direction * (player.speed + (player.stats.agi * 0.3));
        }

        if (data.jump === true && player.y >= 420) {
            player.vy = -16;
        }

        if (data.attack === true && player.attackCD <= 0) {
            const dmg = player.damage + (player.stats.str * 2);

            gameState.enemies.forEach(enemy => {
                if (enemy.room === player.room && Math.abs(player.x - enemy.x) < player.range) {
                    if (enemySystem.takeDamage(enemy, dmg)) {
                        const rewards = enemySystem.getRewards(enemy);
                        grantRewards(socket.id, rewards.xp, rewards.gold, rewards.enemyName);

                        // Remover inimigo
                        gameState.enemies = gameState.enemies.filter(e => e.id !== enemy.id);
                    }
                }
            });

            player.attackCD = 15;
        }
    });

    socket.on('disconnect', async () => {
        const player = players[socket.id];
        if (player) {
            await savePlayerData(player);
            delete players[socket.id];

            io.to(player.room).emit('newChat', {
                name: '👋 SISTEMA',
                msg: `${player.name} saiu do jogo`,
                color: '#e74c3c'
            });

            console.log(`✗ ${player.name} desconectou`);
        }
    });
});

// ========== GAME LOOP ==========

setInterval(() => {
    worldTime = (worldTime + 1) % 2400;

    // Atualizar jogadores
    for (let id in players) {
        const player = players[id];

        // Física
        player.vy += 0.8;
        player.x += player.vx;
        player.y += player.vy;

        // Colisão com chão
        if (player.y > 420) {
            player.y = 420;
            player.vy = 0;
        }

        // Limitar movimento horizontal
        if (player.x < 0) player.x = 0;
        if (player.x > 1500) player.x = 1500;

        // Cooldown de ataque
        if (player.attackCD > 0) player.attackCD--;

        // Transição entre mapas
        if (player.x > 1500 && MAPS[player.room].next) {
            const oldRoom = player.room;
            player.room = MAPS[oldRoom].next;
            player.x = 50;
            const socket = io.sockets.sockets.get(id);
            if (socket) {
                socket.leave(oldRoom);
                socket.join(player.room);
            }
        } else if (player.x < 0 && MAPS[player.room].prev) {
            const oldRoom = player.room;
            player.room = MAPS[oldRoom].prev;
            player.x = 1450;
            const socket = io.sockets.sockets.get(id);
            if (socket) {
                socket.leave(oldRoom);
                socket.join(player.room);
            }
        }

        // Dano de inimigos
        gameState.enemies.forEach(enemy => {
            if (enemy.room === player.room && Math.abs(player.x - enemy.x) < 50) {
                if (enemySystem.attack(enemy)) {
                    const damage = enemySystem.calculateDamage(enemy, player);
                    player.hp -= damage;

                    if (player.hp <= 0) {
                        player.dead = true;
                        player.hp = 0;
                        io.to(player.room).emit('newChat', {
                            name: '💀 SISTEMA',
                            msg: `${player.name} foi derrotado!`,
                            color: '#e74c3c'
                        });

                        // Reviver após 10 segundos
                        setTimeout(() => {
                            player.dead = false;
                            player.hp = player.maxHp;
                            player.x = 500;
                            player.y = 420;
                        }, 10000);
                    }
                }
            }
        });
    }

    // Atualizar inimigos
    const playerList = Object.values(players);
    gameState.enemies.forEach(enemy => {
        enemySystem.updateEnemy(enemy, playerList);
    });

    // Spawn de novos inimigos
    Object.keys(MAPS).forEach(room => {
        const roomEnemies = gameState.enemies.filter(e => e.room === room);
        const maxEnemies = room === 'floresta' ? 8 : room === 'caverna_sombria' ? 12 : 3;

        while (roomEnemies.length < maxEnemies) {
            const newEnemy = enemySystem.spawnRandomEnemy(room);
            if (newEnemy) {
                gameState.enemies.push(newEnemy);
                roomEnemies.push(newEnemy);
            }
        }
    });

    // Remover inimigos mortos
    gameState.enemies = gameState.enemies.filter(e => e.hp > 0);

    // Enviar estado do mundo
    Object.keys(MAPS).forEach(room => {
        const roomPlayers = Object.fromEntries(
            Object.entries(players).filter(([_, p]) => p.room === room)
        );
        const roomEnemies = gameState.enemies
            .filter(e => e.room === room)
            .map(e => enemySystem.getEnemyData(e));

        io.to(room).emit('world', {
            players: roomPlayers,
            enemies: roomEnemies,
            worldTime: worldTime
        });
    });
}, 33);

// ========== INICIALIZAÇÃO ==========

const PORT = process.env.PORT || 3000;
db.db.serialize(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🎮 ========== HERDEIRO DO VENTO RPG ==========`);
        console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
        console.log(`✓ Banco de dados SQLite inicializado`);
        console.log(`✓ Sistema de itens, inimigos e clãs ativo`);
        console.log(`✓ Mapas: Vila, Floresta, Caverna Sombria`);
        console.log(`==========================================\n`);
    });
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await db.close();
    process.exit(0);
});
