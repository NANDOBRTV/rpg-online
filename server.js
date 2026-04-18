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

// Função para criar uma horda de 20 inimigos
function spawnHorde() {
    enemies = []; // Limpa antes de criar
    for (let i = 0; i < 20; i++) {
        enemies.push({
            id: 'bot_' + Math.random(),
            x: Math.random() * 2000 - 1000, // Espalhados em um mapa maior
            y: Math.random() * 2000 - 1000,
            health: 50,
            color: '#ff3333'
        });
    }
}
spawnHorde();

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 300,
        y: 300,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100
    };

    socket.on('player_movement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    socket.on('shoot', (data) => {
        bullets.push({
            id: Math.random(),
            owner: socket.id,
            x: data.x, y: data.y,
            vX: data.vX * 15, vY: data.vY * 15,
            life: 80
        });
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// LOOP DE LÓGICA (30 FPS)
setInterval(() => {
    enemies.forEach(en => {
        let nearestPlayer = null;
        let minDist = 1500;

        for (let id in players) {
            let p = players[id];
            let d = Math.sqrt(Math.pow(en.x - p.x, 2) + Math.pow(en.y - p.y, 2));
            if (d < minDist) { minDist = d; nearestPlayer = p; }
        }

        // Perseguição
        if (nearestPlayer && minDist < 600) {
            let dx = nearestPlayer.x - en.x;
            let dy = nearestPlayer.y - en.y;
            en.x += (dx / minDist) * 3.5; // Inimigos levemente mais rápidos
            en.y += (dy / minDist) * 3.5;

            // Dano de contato
            if (minDist < 25) {
                nearestPlayer.health -= 0.8;
                if (nearestPlayer.health <= 0) {
                    nearestPlayer.x = 300; nearestPlayer.y = 300; nearestPlayer.health = 100;
                }
            }
        }
    });

    // Balas e colisões
    bullets.forEach((b, bIdx) => {
        b.x += b.vX; b.y += b.vY; b.life--;

        enemies.forEach((en) => {
            let d = Math.sqrt(Math.pow(b.x - en.x, 2) + Math.pow(b.y - en.y, 2));
            if (d < 25) {
                en.health -= 25; // 2 tiros para matar
                bullets.splice(bIdx, 1);
                if (en.health <= 0) {
                    // Respawn instantâneo em posição aleatória
                    en.x = Math.random() * 1200 - 600;
                    en.y = Math.random() * 1200 - 600;
                    en.health = 50;
                }
            }
        });
        if (b.life <= 0) bullets.splice(bIdx, 1);
    });

    io.emit('update_world', { players, bullets, enemies });
}, 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0');
