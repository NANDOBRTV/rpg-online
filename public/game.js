const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CAMINHO DO SEU PERSONAGEM
// ===============================

const path = "./assets/Actor/Character/Boy/SeparateAnim";

// ===============================
// 📦 IMAGENS
// ===============================

const idle = new Image();
const walk = new Image();
const attack = new Image();

idle.src = `${path}/Idle.png`;
walk.src = `${path}/Walk.png`;
attack.src = `${path}/Attack.png`;

// ===============================
// 🎮 DADOS
// ===============================

let players = {};
let myId = null;

let frame = 0;
let frameDelay = 0;
let attacking = false;

// ===============================
// 🕹️ JOYSTICK
// ===============================

const joy = { active:false, baseX:0, baseY:0, vx:0, vy:0 };

// ===============================
// 🌐 SOCKET
// ===============================

socket.on('connect', () => myId = socket.id);
socket.on('update_world', data => players = data.players);

// ===============================
// 📱 CONTROLE
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
// 🎨 DESENHAR PLAYER (SIMPLES)
// ===============================

function drawPlayer(p) {

    let img = idle;

    if (attacking) img = attack;
    else if (joy.vx !== 0 || joy.vy !== 0) img = walk;

    // pega tamanho correto automaticamente
    let frameSize = img.height;
    let totalFrames = Math.floor(img.width / frameSize);

    // animação
    frameDelay++;
    if (frameDelay > 10) {
        frame++;
        frameDelay = 0;
    }

    if (frame >= totalFrames) frame = 0;

    ctx.save();

    // virar esquerda
    if (joy.vx < 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(
            img,
            frame * frameSize, 0,
            frameSize, frameSize,
            -(p.x + 32), p.y - 32,
            64, 64
        );
    } else {
        ctx.drawImage(
            img,
            frame * frameSize, 0,
            frameSize, frameSize,
            p.x - 32, p.y - 32,
            64, 64
        );
    }

    ctx.restore();
}

// ===============================
// 🎮 LOOP
// ===============================

function gameLoop() {

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
// 📐 TELA
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
