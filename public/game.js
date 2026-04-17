const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};

socket.on("currentPlayers", (data) => {
    players = data;
});

socket.on("updatePlayers", (data) => {
    players = data;
});

document.addEventListener("keydown", (e) => {
    let move = { x: 0, y: 0 };

    if (e.key === "w") move.y = -5;
    if (e.key === "s") move.y = 5;
    if (e.key === "a") move.x = -5;
    if (e.key === "d") move.x = 5;

    socket.emit("move", move);
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let id in players) {
        ctx.fillStyle = "green";
        ctx.fillRect(players[id].x, players[id].y, 30, 30);
    }

    requestAnimationFrame(draw);
}

draw();
