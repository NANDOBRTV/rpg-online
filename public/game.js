const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Configuração do caminho das pastas conforme seu GitHub
const PATH = "./assets/Actor/Character/Boy/SeparateAnim";

const idle = new Image(); idle.src = `${PATH}/Idle.png`;
const walk = new Image(); walk.src = `${PATH}/Walk.png`;
const attack = new Image(); attack.src = `${PATH}/Attack.png`;

let players = {}, myId = null, frame = 0, frameDelay = 0;
let attacking = false, lastDirection = 1;
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', data => { players = data.players; });

// Controles corrigidos para celular
canvas.addEventListener('touchstart', e => {
    for (let t of e.changedTouches) {
        if (t.clientX < canvas.width / 2) {
            moveTouchId = t.identifier; joy.active = true;
            joy.baseX = t.clientX; joy.baseY = t.clientY;
        } else { attacking = true; }
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            let dx = t.clientX - joy.baseX, dy = t.clientY - joy.baseY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
            joy.vx = dx/50; joy.vy = dy/50;
            lastDirection = joy.vx > 0.1 ? 1 : (joy.vx < -0.1 ? -1 : lastDirection);
            if (myId && players[myId]) {
                socket.emit('player_movement', { x: players[myId].x + joy.vx*6, y: players[myId].y + joy.vy*6 });
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) { moveTouchId = null; joy.active = false; joy.vx = 0; joy.vy = 0; }
        else { attacking = false; }
    }
});

function drawPlayer(p) {
    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;
    let img = (attacking && isMe) ? attack : (moving ? walk : idle);

    if (!img.complete || img.width === 0) return;

    // CORREÇÃO CRÍTICA: Divide a imagem em 4 frames
    let frameW = img.width / 4;
    let frameH = img.height;

    if (moving || (attacking && isMe)) {
        frameDelay++;
        if (frameDelay > 7) { frame = (frame + 1) % 4; frameDelay = 0; }
    } else { frame = 0; }

    ctx.save();
    ctx.translate(p.x, p.y);
    if (isMe && lastDirection === -1) ctx.scale(-1, 1);

    // Desenha apenas 1/4 da imagem (um único boneco)
    ctx.drawImage(img, frame * frameW, 0, frameW, frameH, -24, -32, 48, 48);
    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = "#2d8a45"; // Cor da grama
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (myId && players[myId]) {
        let me = players[myId];
        ctx.save();
        ctx.translate(-me.x + canvas.width/2, -me.y + canvas.height/2);
        for (let id in players) drawPlayer(players[id]);
        ctx.restore();
    }
    requestAnimationFrame(gameLoop);
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener("resize", resize);
resize(); gameLoop();
