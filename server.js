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
const MAX_ENEMIES = 20;

// Função para criar inimigos com barra de vida
function spawnEnemy() {
    return {
        id: 'bot_' + Math.random(),
        x: Math.random() * 1600 - 800,
        y: Math.random() * 1600 - 800,
        health: 50,
        maxHealth: 50,
        color: '#ff3333'
    };
}

// Inicializa a horda de 20
for (let i = 0; i < MAX_ENEMIES; i++) {
    enemies.push(spawnEnemy());
}

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 400, y: 400,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100,
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
        // CADÊNCIA DE TIRO: 400ms (Mais lento e estratégico)
        if (p && now - p.lastShot > 400) {
            bullets.push({
                id: Math.random(),
                owner: socket.id,
                x: data.x, y: data.y,
                vX: data.vX * 18,
                vY: data.vY * 18,
                life: 60
            });
            p.lastShot = now;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    // IA dos Inimigos (Perseguição)
    enemies.forEach(en => {
        let nearestPlayer = null;
        let minDist = 1500;
        for (let id in players) {
            let p = players[id];
            let d = Math.sqrt(Math.pow(en.x - p.x, 2) + Math.pow(en.y - p.y, 2));
            if (d < minDist) { minDist = d; nearestPlayer = p; }
        }
        if (nearestPlayer && minDist < 800) {
            let dx = nearestPlayer.x - en.x;
            let dy = nearestPlayer.y - en.y;
            en.x += (dx / minDist) * 3.5;
            en.y += (dy / minDist) * 3.5;
            if (minDist < 25) nearestPlayer.health -= 0.5;
        }
    });

    // Colisões e Respawn Instantâneo
    bullets.forEach((b, bIdx) => {
        b.x += b.vX; b.y += b.vY; b.life--;
        enemies.forEach((en, eIdx) => {
            let d = Math.sqrt(Math.pow(b.x - en.x, 2) + Math.pow(b.y - en.y, 2));
            if (d < 30) {
                en.health -= 10;
                bullets.splice(bIdx, 1);
                if (en.health <= 0) { enemies[eIdx] = spawnEnemy(); } // Respawn
            }
        });
        if (b.life <= 0) bullets.splice(bIdx, 1);
    });

    io.emit('update_world', { players, bullets, enemies });
}, 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0');
