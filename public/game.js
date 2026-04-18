const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CAMINHO DOS ASSETS
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
// 📱 CONTROLE TOUCH
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
// 🧠 DETECTA SPRITE AUTOMATICO
// ===============================
function getSpriteData(img) {

    let w = img.width;
    let h = img.height;

    let sizes = [16, 24, 32, 48, 64, 96, 128];

    for (let s of sizes) {
        let cols = Math.floor(w / s);
        let rows = Math.floor(h / s);

        if (cols * s === w && rows * s === h) {
            return {
                frameW: s,
                frameH: s,
                cols: cols,
                rows: rows,
                total: cols * rows
            };
        }
    }

    // fallback
    let s = h;
    let cols = Math.floor(w / s);

    return {
        frameW: s,
        frameH: s,
        cols: cols,
        rows: 1,
        total: cols
    };
}

// ===============================
// 🎨 DESENHAR PLAYER
// ===============================
function drawPlayer(p) {

    // 🔥 DETECTA SE ESTÁ ANDANDO DE VERDADE
    let moving = Math.abs(joy.vx) > 0.15 || Math.abs(joy.vy) > 0.15;

    let img;

    if (attacking) {
        img = attack;
    } else if (moving) {
        img = walk;
    } else {
        img = idle;
    }

    if (!img.complete) return;

    const sprite = getSpriteData(img);

    // anima só quando precisa
    if (moving || attacking) {
        frameDelay++;
        if (frameDelay > 8) {
            frame++;
            frameDelay = 0;
        }
    } else {
        frame = 0;
    }

    if (frame >= sprite.total) frame = 0;

    let col = frame % sprite.cols;
    let row = Math.floor(frame / sprite.cols);

    let sx = col * sprite.frameW;
    let sy = row * sprite.frameH;

    ctx.save();

    if (joy.vx < 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(
            img,
            sx, sy,
            sprite.frameW, sprite.frameH,
            -(p.x + 32), p.y - 32,
            64, 64
        );
    } else {
        ctx.drawImage(
            img,
            sx, sy,
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
// 📐 RESPONSIVO
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
