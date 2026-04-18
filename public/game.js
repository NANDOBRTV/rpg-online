const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png";

let players = {}, myId = null;
let lastDir = 1; // 1 = Direita, -1 = Esquerda

// --- CORREÇÃO 1: Estado de animação por jogador (não mais global) ---
const animState = {}; // { [id]: { frame, frameDelay } }

function getAnim(id) {
    if (!animState[id]) animState[id] = { frame: 0, frameDelay: 0 };
    return animState[id];
}

// --- CORREÇÃO 2: Delta time para movimento independente de framerate ---
let lastTs = 0;

const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };

// --- CORREÇÃO 3: Rate limiting do socket (20x/s em vez de 60x/s) ---
let lastEmitTime = 0;
const EMIT_INTERVAL = 50; // ms → 20 vezes por segundo

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', data => { players = data.players; });

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
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50) { dx *= 50 / dist; dy *= 50 / dist; }
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

// --- LÓGICA DE DESENHO ---
function drawPlayer(p) {
    // CORREÇÃO 1: spriteSheet.complete verificado apenas aqui como fallback
    // (o gameLoop só inicia após onload, então raramente será false)
    if (!spriteSheet.complete) return;

    const cols = 4;
    const rows = 7;
    const fw = spriteSheet.width / cols;
    const fh = spriteSheet.height / rows;

    const isMe = (p.id === myId);
    const moving = isMe
        ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1)
        : (Math.abs(p.vx ?? 0) > 0.1 || Math.abs(p.vy ?? 0) > 0.1);

    // CORREÇÃO 1: Animação isolada por jogador
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

    // CORREÇÃO 4: Direção vinda do servidor para jogadores remotos
    const dir = isMe ? lastDir : (p.dir ?? 1);

    ctx.save();
    ctx.translate(p.x, p.y);

    if (dir === -1) {
        ctx.scale(-1, 1);
    }

    ctx.drawImage(
        spriteSheet,
        anim.frame * fw, currentRow * fh,
        fw, fh,
        -fw / 2, -fh / 2,
        fw, fh
    );

    ctx.restore();
}

function gameLoop(ts) {
    // CORREÇÃO 2: Delta time — normalizado para 60fps como base
    const dt = lastTs === 0 ? 1 : (ts - lastTs) / 16.67;
    lastTs = ts;

    ctx.fillStyle = "#2d8a45";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        if (joy.active) {
            const newX = me.x + joy.vx * 5 * dt;
            const newY = me.y + joy.vy * 5 * dt;

            // CORREÇÃO 3: Emite apenas na taxa limitada (20x/s)
            if (ts - lastEmitTime >= EMIT_INTERVAL) {
                socket.emit('player_movement', {
                    x: newX,
                    y: newY,
                    dir: lastDir,   // CORREÇÃO 4: Envia direção ao servidor
                    vx: joy.vx,     // CORREÇÃO 5: Envia velocidade para animação remota
                    vy: joy.vy
                });
                lastEmitTime = ts;
            }
        }

        ctx.save();
        ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

        // CORREÇÃO 5: Interpolação de posição para jogadores remotos
        for (let id in players) {
            const p = players[id];
            if (id !== myId && p.targetX !== undefined) {
                p.x += (p.targetX - p.x) * 0.2;
                p.y += (p.targetY - p.y) * 0.2;
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

// CORREÇÃO 6: Game loop só inicia após o sprite carregar
spriteSheet.onload = () => {
    requestAnimationFrame(gameLoop);
};

spriteSheet.onerror = () => {
    console.error("Falha ao carregar spriteSheet:", spriteSheet.src);
};
