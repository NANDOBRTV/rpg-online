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

function newPlayer(id) {
    return {
        id,
        x: Math.floor(Math.random() * 300),
        y: Math.floor(Math.random() * 500),
        color: "lime"
    };
}

io.on("connection", (socket) => {
    console.log("Player conectado:", socket.id);

    players[socket.id] = newPlayer(socket.id);

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

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

const PORT = process.env.PORT;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor rodando na porta " + PORT);
});
