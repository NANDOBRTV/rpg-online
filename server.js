const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

// ======================
// CONFIG DO JOGO
// ======================
const MAP_SIZE = 1000;
const ATTACK_RANGE = 60;
const ATTACK_DAMAGE = 20;
const COOLDOWN_TIME = 1000; // 1s

let players = {};

// ======================
// CRIAR PLAYER
// ======================
function createPlayer(id) {
    return {
        id,
        name: "Player_" + id.slice(0, 5),
        x: Math.floor(Math.random() * MAP_SIZE),
        y: Math.floor(Math.random() * MAP_SIZE),
        hp: 100,
        canAttack: true
    };
}

// ======================
// LIMITAR MAPA
// ======================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ======================
// CONEXÃO
// ======================
io.on("connection", (socket) => {
    console.log("Conectou:", socket.id);

    players[socket.id] = createPlayer(socket.id);

    io.emit("updatePlayers", players);

    // ======================
    // MOVIMENTO
    // ======================
    socket.on("move", (dir) => {
        let p = players[socket.id];
        if (!p) return;

        const speed = 5;

        if (dir.up) p.y -= speed;
        if (dir.down) p.y += speed;
        if (dir.left) p.x -= speed;
        if (dir.right) p.x += speed;

        // limitar mapa
        p.x = clamp(p.x, 0, MAP_SIZE);
        p.y = clamp(p.y, 0, MAP_SIZE);

        io.emit("updatePlayers", players);
    });

    // ======================
    // ATAQUE COM COOLDOWN
    // ======================
    socket.on("attack", () => {
        let attacker = players[socket.id];
        if (!attacker || !attacker.canAttack) return;

        attacker.canAttack = false;

        setTimeout(() => {
            if (attacker) attacker.canAttack = true;
        }, COOLDOWN_TIME);

        for (let id in players) {
            if (id === socket.id) continue;

            let target = players[id];

            let dx = attacker.x - target.x;
            let dy = attacker.y - target.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < ATTACK_RANGE) {
                target.hp -= ATTACK_DAMAGE;
            }

            // respawn
            if (target.hp <= 0) {
                players[id] = createPlayer(id);
            }
        }

        io.emit("updatePlayers", players);
    });

    // ======================
    // DESCONECTAR
    // ======================
    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

// ======================
// PORTA
// ======================
const PORT = process.env.PORT || 3000;

// ======================
// START
// ======================
server.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor rodando na porta " + PORT);
});
