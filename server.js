const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.static("public"));

let players = {};

io.on("connection", (socket) => {
    console.log("Jogador conectado:", socket.id);

    players[socket.id] = { x: 100, y: 100 };

    // manda todos os jogadores para quem entrou
    socket.emit("currentPlayers", players);

    // atualiza geral
    io.emit("updatePlayers", players);

    socket.on("move", (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x += data.x;
        players[socket.id].y += data.y;

        io.emit("updatePlayers", players);
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
