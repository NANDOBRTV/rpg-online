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
const MAX_ENEMIES = 15;

const ENEMY_TYPES = {
    SHOOTER: { 
        health: 40, maxHealth: 40, color: '#00f2ff', 
        speed: 2, range: 450, fireRate: 1500, type: 'shooter' 
    },
    MELEE: { 
        health: 70, maxHealth: 70, color: '#ff3333', 
        speed: 3.5, range: 40, attackDamage: 12, type: 'melee' 
    }
};

function spawnEnemy() {
    const isMelee = Math.random() > 0.4;
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

for (let i = 0; i < MAX_ENEMIES; i++) { enemies.push(spawnEnemy()); }

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 300, y: 300,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100,
        lastShot: 0,
        dead: false
    };

    socket.on('player_movement', (data) => {
        if (players[socket.id] && !players[socket.id].dead) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    socket.on('respawn_request', () => {
        if (players[socket.id]) {
            players[socket.id].health = 100;
            players[socket.id].x = 300;
            players[socket.id].y = 300;
            players[socket.id].dead = false;
        }
    });

    socket.on('shoot', (data) => {
        const now = Date.now();
        const p = players[socket.id];
        if (p && !p.dead && now - p.lastShot > 400) {
            bullets.push({
                id: Math.random(),
                owner: socket.id,
                x: data.x, y: data.y,
                vX: data.vX * 18, vY: data.vY * 18,
                life: 60, damage: 15
            });
            p.lastShot = now;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    const now = Date.now();

    enemies.forEach(en => {
        let nearestPlayer = null;
        let minDist = 1500;
        for (let id in players) {
            let p = players[id];
            if (p.dead) continue;
            let d = Math.sqrt(Math.pow(en.x - p.x, 2) + Math.pow(en.y - p.y, 2));
            if (d < minDist) { minDist = d; nearestPlayer = p; }
        }

        if (nearestPlayer) {
            let dx = nearestPlayer.x - en.x;
            let dy = nearestPlayer.y - en.y;

            if (en.type === 'shooter') {
                if (minDist > 300) {
                    en.x += (dx / minDist) * en.speed; en.y += (dy / minDist) * en.speed;
                }
                if (minDist < 500 && now - en.lastShot > en.fireRate) {
                    bullets.push({
                        id: Math.random(), owner: en.id,
                        x: en.x, y: en.y,
                        vX: (dx / minDist) * 10, vY: (dy / minDist) * 10,
                        life: 80, damage: 10
                    });
                    en.lastShot = now;
                }
            } else {
                en.x += (dx / minDist) * en.speed; en.y += (dy / minDist) * en.speed;
                if (minDist < 30) { 
                    nearestPlayer.health -= 0.5; 
                    if(nearestPlayer.health <= 0) {
                        nearestPlayer.dead = true;
                        io.to(nearestPlayer.id).emit('game_over');
                    }
                }
            }
        }
    });

    bullets.forEach((b, bIdx) => {
        b.x += b.vX; b.y += b.vY; b.life--;
        
        enemies.forEach((en, eIdx) => {
            let d = Math.sqrt(Math.pow(b.x - en.x, 2) + Math.pow(b.y - en.y, 2));
            if (b.owner !== en.id && d < 30) {
                en.health -= b.damage;
                io.emit('damage_effect', { x: en.x, y: en.y, dmg: b.damage });
                bullets.splice(bIdx, 1);
                if (en.health <= 0) enemies[eIdx] = spawnEnemy();
            }
        });

        for (let id in players) {
            let p = players[id];
            if (p.dead) continue;
            let d = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
            if (b.owner !== id && d < 25) {
                p.health -= b.damage;
                io.emit('damage_effect', { x: p.x, y: p.y, dmg: b.damage, color: 'red' });
                bullets.splice(bIdx, 1);
                if (p.health <= 0) {
                    p.dead = true;
                    io.to(id).emit('game_over');
                }
            }
        }
        if (b.life <= 0) bullets.splice(bIdx, 1);
    });

    io.emit('update_world', { players, bullets, enemies });
}, 30);

server.listen(process.env.PORT || 3000, '0.0.0.0');
            
