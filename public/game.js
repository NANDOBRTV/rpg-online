const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CAMINHO DAS IMAGENS (Baseado no seu código)
// ===============================
const PATH = "./actor/character/boy/separateanim"; // Certifique-se que no GitHub as pastas estão minúsculas

const idle = new Image();
const walk = new Image();
const attack = new Image();

idle.src = `${PATH}/Idle.png`;
walk.src = `${PATH}/Walk.png`;
attack.src = `${PATH}/Attack.png`;

// ===============================
// 🎮 DADOS DO JOGO
// ===============================
let players = {};
let myId = null;
let frame = 0;
let frameDelay = 0;
let attacking = false;
let lastDirection = 1; // 1 direita, -1 esquerda

// Joystick
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;
let attackTouchId = null;

// ===============================
// 🌐 CONEXÃO
// ===============================
socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// ===============================
// 📱 CONTROLES TOUCH (CORRIGIDOS)
// ===============================
canvas.addEventListener('touchstart', (e) => {
    for (let t of e.changedTouches) {
        // Lado esquerdo: Movimento
        if (t.clientX < canvas.width / 2 && moveTouchId === null) {
            moveTouchId = t.identifier;
            joy.active = true;
            joy.baseX = t.clientX;
            joy.baseY = t.clientY;
        } 
        // Lado direito: Ataque
        else if (t.clientX >= canvas.width / 2 && attackTouchId === null) {
            attackTouchId = t.identifier;
            attacking = true;
        }
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            let dx = t.clientX - joy.baseX;
            let dy = t.clientY - joy.baseY;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                dx = (dx / dist) * 50;
                dy = (dy / dist) * 50;
            }

            joy.vx = dx / 50;
            joy.vy = dy / 50;

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
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            moveTouchId = null;
            joy.active = false;
            joy.vx = 0; joy.vy = 0;
        }
        if (t.identifier === attackTouchId) {
            attackTouchId = null;
            attacking = false;
        }
    }
});

// ===============================
// 🧠 FUNÇÃO DE ANIMAÇÃO (LÓGICA PROFISSIONAL)
// ===============================
function getFrameData(img) {
    let frameSize = img.height; // O pack Ninja Adventure usa frames quadrados
    let total = Math.floor(img.width / frameSize);
    return { frameW: frameSize, frameH: frameSize, total: total };
}

function drawPlayer(p) {
    // Verifica se este jogador sou EU ou outro player se movendo
    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.15 || Math.abs(joy.vy) > 0.15) : false;

    let img;
    if (attacking && isMe) img = attack;
    else if (moving) img = walk;
    else img = idle;

    if (!img.complete || img.width === 0) return;

    let sprite = getFrameData(img);

    // Controle de frames
    if (moving || (attacking && isMe)) {
        frameDelay++;
        if (frameDelay > 6) { // Velocidade da animação
            frame++;
            frameDelay = 0;
        }
    } else {
        frame = 0;
    }

    if (frame >= sprite.total) frame = 0;

    ctx.save();
    // 1. Vai até a posição do player
    ctx.translate(p.x, p.y);

    // 2. Inverte se estiver olhando para a esquerda
    if (isMe && lastDirection === -1) {
        ctx.scale(-1, 1);
    }

    // 3. Desenha centralizado (64x64 pixels)
    ctx.drawImage(
        img,
        frame * sprite.frameW, 0,
        sprite.frameW, sprite.frameH,
        -32, -32,
        64, 64
    );
    ctx.restore();
}

// ===============================
// 🎨 LOOP PRINCIPAL
// ===============================
function gameLoop() {
    // Fundo Verde Grama
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
        
        // Desenha o joystick visual para ajudar no teste
        if (joy.active) {
            ctx.beginPath();
            ctx.arc(joy.baseX, joy.baseY, 50, 0, Math.PI*2);
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.stroke();
        }
    }
    requestAnimationFrame(gameLoop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();
gameLoop();
