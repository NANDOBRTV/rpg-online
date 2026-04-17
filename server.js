const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = {};

io.on("connection", (socket) => {
    console.log("Jogador conectado:", socket.id);

    players[socket.id] = { x: 100, y: 100 };

    socket.emit("currentPlayers", players);
    io.emit("updatePlayers", players);

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x += data.x;
            players[socket.id].y += data.y;

            io.emit("updatePlayers", players);
        }
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
