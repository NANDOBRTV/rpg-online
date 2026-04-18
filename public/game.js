const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png";

let players = {}, myId = null;
let lastDir = 1;
let lastTs = 0;
let lastEmitTime = 0;
const EMIT_INTERVAL = 50;

// Posição local do jogador (atualizada imediatamente, sem esperar servidor)
let localX = 0, localY = 0;

const animState = {};
function getAnim(id) {
    if (!animState[id]) animState[id] = { frame: 0, frameDelay: 0 };
    return animState[id];
}

const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };

socket.on('connect', () => { myId = socket.id; });

socket.on('update_world', data => {
    players = data.players;
    // Sincroniza posição local com o servidor só se houver diferença grande (anti-cheat / correção)
    if (myId && players[myId]) {
        const me = players[myId];
        const dx = me.x - localX, dy = me.y - localY;
        if (Math.sqrt(dx*dx + dy*dy) > 100) {
            localX = me.x;
            localY = me.y;
        }
    }
});

// --- CONTROLES TOUCH ---
canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    if (t.clientX < canvas.width / 2) {
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.targetTouches[0];
    if (joy.active) {
        let dx = t.clientX - joy.baseX, dy = t.clientY - joy.baseY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
        joy.vx = dx / 50;
        joy.vy = dy / 50;
        if (Math.abs(joy.vx) > 0.1) lastDir = joy.vx > 0 ? 1 : -1;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
});

// --- DESENHO ---
function drawPlayer(p) {
    if (!spriteSheet.complete) return;

    const cols = 4, rows = 7;
    const fw = spriteSheet.width / cols;
    const fh = spriteSheet.height / rows;

    const isMe = (p.id === myId);

    // Usa posição local para o próprio jogador (movimento imediato)
    const drawX = isMe ? localX : p.x;
    const drawY = isMe ? localY : p.y;

    const moving = isMe
        ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1)
        : (Math.abs(p.vx ?? 0) > 0.1 || Math.abs(p.vy ?? 0) > 0.1);

    const anim = getAnim(p.id);
    const currentRow = moving ? 1 : 0;

    if (moving) {
        anim.frameDelay++;
        if (anim.frameDelay > 8) {
            anim.frame = (anim.frame + 1) % cols;
            anim.frameDelay = 0;
        }
    } else {
        anim.frame = 0;
    }

    const dir = isMe ? lastDir : (p.dir ?? 1);

    ctx.save();
    ctx.translate(drawX, drawY);
    if (dir === -1) ctx.scale(-1, 1);

    ctx.drawImage(
        spriteSheet,
        anim.frame * fw, currentRow * fh,
        fw, fh,
        -fw/2, -fh/2,
        fw, fh
    );

    ctx.restore();
}

function gameLoop(ts) {
    const dt = lastTs === 0 ? 1 : (ts - lastTs) / 16.67;
    lastTs = ts;

    ctx.fillStyle = "#2d8a45";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        const me = players[myId];

        if (joy.active) {
            // CORREÇÃO PRINCIPAL: atualiza posição local imediatamente, sem esperar servidor
            localX += joy.vx * 5 * dt;
            localY += joy.vy * 5 * dt;

            // Clamp dentro do mundo
            const WORLD_SIZE = 10000;
            localX = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, localX));
            localY = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, localY));

            // Envia ao servidor na taxa limitada
            if (ts - lastEmitTime >= EMIT_INTERVAL) {
                socket.emit('player_movement', {
                    x: localX,
                    y: localY,
                    dir: lastDir,
                    vx: joy.vx,
                    vy: joy.vy
                });
                lastEmitTime = ts;
            }
        }

        // Câmera segue posição local (sem delay)
        ctx.save();
        ctx.translate(canvas.width/2 - localX, canvas.height/2 - localY);

        for (let id in players) {
            const p = players[id];
            // Interpolação suave para jogadores remotos
            if (id !== myId) {
                p.x += (( p.targetX ?? p.x) - p.x) * 0.2;
                p.y += (( p.targetY ?? p.y) - p.y) * 0.2;
            }
            drawPlayer(p);
        }

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

spriteSheet.onload = () => { requestAnimationFrame(gameLoop); };
spriteSheet.onerror = () => { console.error("Falha ao carregar spriteSheet:", spriteSheet.src); };
