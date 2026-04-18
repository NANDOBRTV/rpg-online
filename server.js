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

io.on('connection', (socket) => {
    console.log('Player conectado:', socket.id);

    // Inicializa o player com vida (health)
    players[socket.id] = {
        id: socket.id,
        x: 300,
        y: 300,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        health: 100
    };

    // Envia dados iniciais
    io.emit('update_world', { players, bullets });

    // Atualiza movimento enviado pelo cliente
    socket.on('player_movement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    // Escuta quando o jogador atira
    socket.on('shoot', (data) => {
        bullets.push({
            id: Math.random(),
            owner: socket.id,
            x: data.x,
            y: data.y,
            vX: data.vX * 15, // Velocidade do projétil
            vY: data.vY * 15,
            life: 100 // Tempo de duração da bala antes de sumir
        });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update_world', { players, bullets });
    });
});

// LOOP DO SERVIDOR (Roda a 30 FPS para processar a física das balas)
setInterval(() => {
    // Move as balas
    bullets.forEach((b, index) => {
        b.x += b.vX;
        b.y += b.vY;
        b.life--;

        // Remove balas que "morreram" por tempo
        if (b.life <= 0) {
            bullets.splice(index, 1);
            return;
        }

        // Colisão simples: Verifica se a bala atingiu algum jogador
        for (let id in players) {
            if (id !== b.owner) { // Não acertar a si mesmo
                const p = players[id];
                const dist = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
                
                if (dist < 20) { // Se a bala encostar no raio do player
                    p.health -= 10; // Tira vida
                    bullets.splice(index, 1); // Remove a bala
                    if (p.health <= 0) {
                        p.x = 300; p.y = 300; p.health = 100; // Respawna
                    }
                }
            }
        }
    });
    
    // Envia o estado de todo o mundo para todos os jogadores
    io.emit('update_world', { players, bullets });
}, 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Combate Online na porta ${PORT}`);
});
