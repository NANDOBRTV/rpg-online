const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let bullets = [];
let enemies = [];
let xpOrbs = [];
const MAX_ENEMIES = 40; // Aumentei a quantidade para o mapa não parecer vazio
const WORLD_SIZE = 10000;

const ENEMY_TYPES = {
    SHOOTER: { health: 40, maxHealth: 40, color: '#00f2ff', speed: 2.5, range: 450, fireRate: 1500, type: 'shooter', xp: 25 },
    MELEE: { health: 70, maxHealth: 70, color: '#ff3333', speed: 4, range: 40, attackDamage: 12, type: 'melee', xp: 40 }
};

function spawnEnemy() {
    const isMelee = Math.random() > 0.4;
    const config = isMelee ? ENEMY_TYPES.MELEE : ENEMY_TYPES.SHOOTER;
    return {
        id: 'bot_' + Math.random(),
        // Spawn em qualquer lugar do mapa 10kx10k (de -5000 a 5000)
        x: Math.random() * WORLD_SIZE - WORLD_SIZE / 2,
        y: Math.random() * WORLD_SIZE - WORLD_SIZE / 2,
        health: config.health,
        maxHealth: config.maxHealth,
        color: config.color,
        speed: config.speed,
        range: config.range,
        attackDamage: config.attackDamage || 0,
        type: config.type,
        lastShot: 0,
        fireRate: config.fireRate || 0,
        xpValue: config.xp
    };
}

// Inicializa horda maior
for (let i = 0; i < MAX_ENEMIES; i++) { enemies.push(spawnEnemy()); }

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 0, y: 0, // Começa no centro do mapa
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100, maxHealth: 100,
        level: 1, xp: 0, nextLevelXp: 100,
        damage: 15, lastShot: 0, dead: false
    };

    socket.on('player_movement', (data) => {
        if (players[socket.id] && !players[socket.id].dead) {
            // Limita o movimento dentro das bordas do mapa
            players[socket.id].x = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, data.x));
            players[socket.id].y = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, data.y));
        }
    });

    socket.on('respawn_request', () => {
        if (players[socket.id]) {
            players[socket.id].health = players[socket.id].maxHealth;
            players[socket.id].x = 0; players[socket.id].y = 0;
            players[socket.id].dead = false;
        }
    });

    socket.on('shoot', (data) => {
        const p = players[socket.id];
        if (p && !p.dead && Date.now() - p.lastShot > 400) {
            bullets.push({
                id: Math.random(), owner: socket.id,
                x: data.x, y: data.y,
                vX: data.vX * 18, vY: data.vY * 18,
                life: 80, damage: p.damage 
            });
            p.lastShot = Date.now();
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    const now = Date.now();

    // IA e Movimentação
    enemies.forEach(en => {
        let nearestP = null; let minDist = 2000; // Só persegue se estiver perto
        for (let id in players) {
            let p = players[id]; if (p.dead) continue;
            let d = Math.sqrt(Math.pow(en.x - p.x, 2) + Math.pow(en.y - p.y, 2));
            if (d < minDist) { minDist = d; nearestP = p; }
        }
        if (nearestP) {
            let dx = nearestP.x - en.x, dy = nearestP.y - en.y;
            if (en.type === 'shooter') {
                if (minDist > 350) { en.x += (dx/minDist)*en.speed; en.y += (dy/minDist)*en.speed; }
                if (minDist < 500 && now - en.lastShot > en.fireRate) {
                    bullets.push({ id: Math.random(), owner: en.id, x: en.x, y: en.y, vX: (dx/minDist)*12, vY: (dy/minDist)*12, life: 90, damage: 10 });
                    en.lastShot = now;
                }
            } else {
                en.x += (dx/minDist)*en.speed; en.y += (dy/minDist)*en.speed;
                if (minDist < 30) { 
                    nearestP.health -= 0.6; 
                    if(nearestP.health <= 0) { nearestP.dead = true; io.to(nearestP.id).emit('game_over'); } 
                }
            }
        }
    });

    // Balas, Colisões e Drop de XP
    bullets.forEach((b, bIdx) => {
        b.x += b.vX; b.y += b.vY; b.life--;
        enemies.forEach((en, eIdx) => {
            let d = Math.sqrt(Math.pow(b.x - en.x, 2) + Math.pow(b.y - en.y, 2));
            if (b.owner !== en.id && d < 35) {
                en.health -= b.damage;
                io.emit('damage_effect', { x: en.x, y: en.y, dmg: b.damage });
                bullets.splice(bIdx, 1);
                if (en.health <= 0) {
                    xpOrbs.push({ x: en.x, y: en.y, value: en.xpValue });
                    enemies[eIdx] = spawnEnemy();
                }
            }
        });
        // Dano no Player
        for (let id in players) {
            let p = players[id];
            if (!p.dead && b.owner !== id) {
                let d = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
                if (d < 25) {
                    p.health -= b.damage;
                    io.emit('damage_effect', { x: p.x, y: p.y, dmg: b.damage, color: 'red' });
                    bullets.splice(bIdx, 1);
                    if (p.health <= 0) { p.dead = true; io.to(id).emit('game_over'); }
                }
            }
        }
        if (b.life <= 0) bullets.splice(bIdx, 1);
    });

    // Coleta de XP e Level Up
    xpOrbs.forEach((orb, oIdx) => {
        for (let id in players) {
            let p = players[id];
            if (p.dead) continue;
            let d = Math.sqrt(Math.pow(orb.x - p.x, 2) + Math.pow(orb.y - p.y, 2));
            if (d < 50) {
                p.xp += orb.value;
                xpOrbs.splice(oIdx, 1);
                if (p.xp >= p.nextLevelXp) {
                    p.level++; p.xp = 0; p.nextLevelXp = Math.floor(p.nextLevelXp * 1.6);
                    p.maxHealth += 25; p.health = p.maxHealth; p.damage += 7;
                    io.to(id).emit('level_up', { level: p.level });
                }
            }
        }
    });

    io.emit('update_world', { players, bullets, enemies, xpOrbs });
}, 30);

server.listen(process.env.PORT || 3000, '0.0.0.0');
    
