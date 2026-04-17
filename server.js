const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

let players = {};

function createPlayer(id) {
    return {
        id,
        x: Math.floor(Math.random() * 300),
        y: Math.floor(Math.random() * 500),
        hp: 100
    };
}

io.on("connection", (socket) => {
    players[socket.id] = createPlayer(socket.id);

    io.emit("updatePlayers", players);

    socket.on("move", (dir) => {
        let p = players[socket.id];
        if (!p) return;

        const speed = 6;

        if (dir.up) p.y -= speed;
        if (dir.down) p.y += speed;
        if (dir.left) p.x -= speed;
        if (dir.right) p.x += speed;

        io.emit("updatePlayers", players);
    });

    socket.on("attack", () => {
        let attacker = players[socket.id];
        if (!attacker) return;

        for (let id in players) {
            if (id !== socket.id) {
                let target = players[id];

                let dx = attacker.x - target.x;
                let dy = attacker.y - target.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 60) {
                    target.hp -= 20;
                }

                if (target.hp <= 0) {
                    players[id] = createPlayer(id);
                }
            }
        }

        io.emit("updatePlayers", players);
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

const PORT = process.env.PORT;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor rodando na porta " + PORT);
});
