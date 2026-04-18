const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CAMINHO REAL (EXATO DO PRINT)
// ===============================

const path = "./assets/Actor/Character/Boy/SeparateAnim";

// ===============================
// 📦 ASSETS REAIS
// ===============================

const assets = {
    idle: new Image(),
    walk: new Image(),
    attack: new Image(),
    jump: new Image(),
    dead: new Image()
};

assets.idle.src   = `${path}/Idle.png`;
assets.walk.src   = `${path}/Walk.png`;
assets.attack.src = `${path}/Attack.png`;
assets.jump.src   = `${path}/Jump.png`;
assets.dead.src   = `${path}/Dead.png`;

// ===============================
// LOAD
// ===============================

let loaded = 0;
let total = Object.keys(assets).length;

Object.values(assets).forEach(img => {
    img.onload = () => loaded++;
});

// ===============================
// 🎮 DADOS
// ===============================

let players = {};
let myId = null;

let frame = 0;
let frameDelay = 0;

let attacking = false;
let jumping = false;

// ===============================
// 🕹️ JOYSTICK
// ===============================

const joy = {
    active: false,
    baseX: 100,
    baseY: 0,
    vx: 0,
    vy: 0
};

// ===============================
// 🌐 SOCKET
// ===============================

socket.on('connect', () => myId = socket.id);
socket.on('update_world', data => players = data.players);

// ===============================
// 📱 TOUCH
// ===============================

canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];

    if (t.clientX < canvas.width / 2) {
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
    } else {
        attacking = true;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joy.active) return;

    let t = e.touches[0];
    let dx = t.clientX - joy.baseX;
    let dy = t.clientY - joy.baseY;

    let dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 50) {
        dx = (dx/dist)*50;
        dy = (dy/dist)*50;
    }

    joy.vx = dx / 50;
    joy.vy = dy / 50;

    if (myId && players[myId]) {
        socket.emit('player_movement', {
            x: players[myId].x + joy.vx * 8,
            y: players[myId].y + joy.vy * 8
        });
    }

}, { passive:false });

canvas.addEventListener('touchend', () => {
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
    attacking = false;
});

// ===============================
// 🎨 PLAYER
// ===============================

function drawPlayer(p) {

    let img = assets.idle;

    if (attacking) img = assets.attack;
    else if (joy.vx !== 0 || joy.vy !== 0) img = assets.walk;

    let fw = 48;
    let fh = 48;

    frameDelay++;
    if (frameDelay > 6) {
        frame++;
        frameDelay = 0;
    }

    if (frame > 5) frame = 0;

    ctx.save();

    if (joy.vx < 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, frame*fw,0,fw,fh, -(p.x+32), p.y-32, 64,64);
    } else {
        ctx.drawImage(img, frame*fw,0,fw,fh, p.x-32, p.y-32, 64,64);
    }

    ctx.restore();
}

// ===============================
// 🎮 LOOP
// ===============================

function gameLoop() {

    if (loaded < total) {
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.fillStyle = "#2d8a45";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {

        let me = players[myId];

        let camX = me.x - canvas.width / 2;
        let camY = me.y - canvas.height / 2;

        ctx.save();
        ctx.translate(-camX, -camY);

        for (let id in players) {
            drawPlayer(players[id]);
        }

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// ===============================
// 📐 RESIZE
// ===============================

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);

// ===============================
// 🚀 START
// ===============================

resize();
gameLoop();
