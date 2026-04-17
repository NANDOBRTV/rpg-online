const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let myId = null;

socket.on("connect", () => {
    myId = socket.id;
});

socket.on("updatePlayers", (data) => {
    players = data;
});

// 🎮 movimento mobile
function sendMove(up, down, left, right) {
    socket.emit("move", {
        up,
        down,
        left,
        right
    });
}

// BOTÕES TOUCH
document.getElementById("up").ontouchstart = () => sendMove(true, false, false, false);
document.getElementById("down").ontouchstart = () => sendMove(false, true, false, false);
document.getElementById("left").ontouchstart = () => sendMove(false, false, true, false);
document.getElementById("right").ontouchstart = () => sendMove(false, false, false, true);

document.getElementById("attack").ontouchstart = () => {
    console.log("Ataque!");
};

// parar movimento ao soltar
document.querySelectorAll(".btn").forEach(btn => {
    btn.ontouchend = () => sendMove(false, false, false, false);
});

// 🎨 desenhar jogo
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "lime" : "red";
        ctx.fillRect(p.x, p.y, 30, 30);
    }

    requestAnimationFrame(draw);
}

draw();
