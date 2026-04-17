const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = {};

io.on("connection", (socket) => {
    players[socket.id] = { x: 100, y: 100 };

    socket.on("move", (data) => {
        players[socket.id].x += data.x;
        players[socket.id].y += data.y;
        io.emit("updatePlayers", players);
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

http.listen(3000);
