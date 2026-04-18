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
const MAX_ENEMIES = 15; // Reduzi um pouco para equilibrar

// Tipos de Inimigos e suas configurações
const ENEMY_TYPES = {
    SHOOTER: { 
        health: 40, maxHealth: 40, color: '#00f2ff', // Ciano
        speed: 2, range: 450, fireRate: 1500, type: 'shooter' 
    },
    MELEE: { 
        health: 70, maxHealth: 70, color: '#ff3333', // Vermelho
        speed: 4, range: 40, attackDamage: 15, type: 'melee' // Dano de faca
    }
};

function spawnEnemy() {
    const isMelee = Math.random() > 0.4; // 60% Melee, 40% Shooter
    const config = isMelee ? ENEMY_TYPES.MELEE : ENEMY_TYPES.SHOOTER;
    return {
        id: 'bot_' + Math.random(),
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        health: config.health,
        maxHealth: config.maxHealth,
        color: config.color,
        speed: config.speed,
        range: config.range,
        attackDamage: config.attackDamage || 0,
        type: config.type,
        lastShot: 0,
        fireRate: config.fireRate || 0
    };
}

// Inicializa a horda mista
for (let i = 0; i < MAX_ENEMIES; i++) {
    enemies.push(spawnEnemy());
}

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 300, y: 300,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100, // Vida real do player
        lastShot: 0
    };

    socket.on('player_movement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    socket.on('shoot', (data) => {
        const now = Date.now();
        const p = players[socket.id];
        // CADÊNCIA DE TIRO PLAYER: 400ms (Mais estratégico)
        if (p && now - p.lastShot > 400) {
            bullets.push({
                id: Math.random(),
                owner: socket.id, // ID do player
                x: data.x, y: data.y,
                vX: data.vX * 18, vY: data.vY * 18,
                life: 60,
                damage: 10 // Dano base da bala do player
            });
            p.lastShot = now;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    const now = Date.now();

    // IA dos Inimigos (Meele e Shooter)
    enemies.forEach(en => {
        let nearestPlayer = null;
        let minDist = 1500;
        for (let id in players) {
            let p = players[id];
            let d = Math.sqrt(Math.pow(en.x - p.x, 2) + Math.pow(en.y - p.y, 2));
            if (d < minDist) { minDist = d; nearestPlayer = p; }
        }

        if (nearestPlayer && minDist < 1000) {
            let dx = nearestPlayer.x - en.x;
            let dy = nearestPlayer.y - en.y;

            // Movimento da IA
            if (en.type === 'shooter') {
                // Shooter tenta manter distância
                if (minDist > en.range - 100) {
                    en.x += (dx / minDist) * en.speed; en.y += (dy / minDist) * en.speed;
                } else if (minDist < en.range - 200) {
                    en.x -= (dx / minDist) * en.speed; en.y -= (dy / minDist) * en.speed;
                }
                
                // Tiro do inimigo
                if (minDist < en.range && now - en.lastShot > en.fireRate) {
                    bullets.push({
                        id: Math.random(),
                        owner: en.id, // Bala do inimigo
                        x: en.x, y: en.y,
                        vX: (dx / minDist) * 12, vY: (dy / minDist) * 12,
                        life: 70,
                        damage: 8 // Dano da bala do bot
                    });
                    en.lastShot = now;
                }
            } else if (en.type === 'melee') {
                // Melee corre direto pro player
                en.x += (dx / minDist) * en.speed; en.y += (dy / minDist) * en.speed;
                
                // Ataque de contato (Faca)
                if (minDist < 25) {
                    nearestPlayer.health -= en.attackDamage / 30; // Dano por frame
                }
            }

            // CORREÇÃO DE BUG: Morte do Player
            if (nearestPlayer.health <= 0) {
                // Respawn do Player
                nearestPlayer.health = 100;
                nearestPlayer.x = 300; nearestPlayer.y = 300;
                // Opcional: Notificar morte
            }
        }
    });

    // Colisões e Dano
    bullets.forEach((b, bIdx) => {
        b.x += b.vX; b.y += b.vY; b.life--;
        
        // Bala acerta Inimigo?
        enemies.forEach((en, eIdx) => {
            let d = Math.sqrt(Math.pow(b.x - en.x, 2) + Math.pow(b.y - en.y, 2));
            if (b.owner !== en.id && d < 30) {
                en.health -= b.damage;
                // NOVO: Envia o dano flutuante para o cliente
                io.emit('damage_text', { x: en.x, y: en.y, text: b.damage });
                bullets.splice(bIdx, 1);
                
                // Respawn do inimigo
                if (en.health <= 0) { enemies[eIdx] = spawnEnemy(); }
            }
        });

        // Bala acerta Player?
        for (let id in players) {
            let p = players[id];
            let d = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
            if (b.owner !== id && d < 20) {
                p.health -= b.damage;
                io.emit('damage_text', { x: p.x, y: p.y, text: b.damage, color: '#f00' });
                bullets.splice(bIdx, 1);
            }
        }
        if (b.life <= 0) bullets.splice(bIdx, 1);
    });

    io.emit('update_world', { players, bullets, enemies });
}, 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('Horda Mista Ativa'));
        
