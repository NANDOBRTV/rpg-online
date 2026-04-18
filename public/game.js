const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CAMINHO
// ===============================
const PATH = "./assets/Actor/Character/Boy/SeparateAnim";

// ===============================
// 📦 IMAGENS
// ===============================
const idle = new Image();
const walk = new Image();
const attack = new Image();

idle.src = `${PATH}/Idle.png`;
walk.src = `${PATH}/Walk.png`;
attack.src = `${PATH}/Attack.png`;

// ===============================
// 🎮 DADOS
// ===============================
let players = {};
let myId = null;

let frame = 0;
let frameDelay = 0;
let attacking = false;

let lastDirection = 1; // 1 direita, -1 esquerda

// ===============================
// 🕹️ JOYSTICK
// ===============================
const joy = { active:false, baseX:0, baseY:0, vx:0, vy:0 };

// multitouch IDs
let moveTouchId = null;
let attackTouchId = null;

// ===============================
// 🌐 SOCKET
// ===============================
socket.on('connect', () => myId = socket.id);
socket.on('update_world', data => players = data.players);

// ===============================
// 📱 TOUCH (SEM BUG)
// ===============================
canvas.addEventListener('touchstart', (e) => {

    for (let t of e.changedTouches) {

        if (t.clientX < canvas.width / 2 && moveTouchId === null) {
            moveTouchId = t.identifier;
            joy.active = true;
            joy.baseX = t.clientX;
            joy.baseY = t.clientY;
        }

        else if (t.clientX >= canvas.width / 2 && attackTouchId === null) {
            attackTouchId = t.identifier;
            attacking = true;
        }
    }
});

canvas.addEventListener('touchmove', (e) => {

    for (let t of e.changedTouches) {

        if (t.identifier === moveTouchId) {

            let dx = t.clientX - joy.baseX;
            let dy = t.clientY - joy.baseY;

            let dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 50) {
                dx = (dx/dist)*50;
                dy = (dy/dist)*50;
            }

            joy.vx = dx / 50;
            joy.vy = dy / 50;

            // salva direção
            if (joy.vx > 0.1) lastDirection = 1;
            if (joy.vx < -0.1) lastDirection = -1;

            if (myId && players[myId]) {
                socket.emit('player_movement', {
                    x: players[myId].x + joy.vx * 6,
                    y: players[myId].y + joy.vy * 6
                });
            }
        }
    }

}, { passive:false });

canvas.addEventListener('touchend', (e) => {

    for (let t of e.changedTouches) {

        if (t.identifier === moveTouchId) {
            moveTouchId = null;
            joy.active = false;
            joy.vx = 0;
            joy.vy = 0;
        }

        if (t.identifier === attackTouchId) {
            attackTouchId = null;
            attacking = false;
        }
    }
});

// ===============================
// 🧠 SPRITE SIMPLES (FUNCIONA)
// ===============================
function getFrameData(img) {
    let frameSize = img.height; // padrão desse pack
    let total = Math.floor(img.width / frameSize);

    return {
        frameW: frameSize,
        frameH: frameSize,
        total: total
    };
}

// ===============================
// 🎨 PLAYER
// ===============================
function drawPlayer(p) {

    let moving = Math.abs(joy.vx) > 0.15 || Math.abs(joy.vy) > 0.15;

    let img;

    if (attacking) img = attack;
    else if (moving) img = walk;
    else img = idle;

    if (!img.complete) return;

    let sprite = getFrameData(img);

    // animação só quando precisa
    if (moving || attacking) {
        frameDelay++;
        if (frameDelay > 10) {
            frame++;
            frameDelay = 0;
        }
    } else {
        frame = 0;
    }

    if (frame >= sprite.total) frame = 0;

    let sx = frame * sprite.frameW;

    ctx.save();

    if (lastDirection === -1) {
        ctx.scale(-1, 1);
        ctx.drawImage(
            img,
            sx, 0,
            sprite.frameW, sprite.frameH,
            -(p.x + 32), p.y - 32,
            64, 64
        );
    } else {
        ctx.drawImage(
            img,
            sx, 0,
            sprite.frameW, sprite.frameH,
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
