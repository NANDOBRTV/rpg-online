const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let players = {}, myId = null;
let frame = 0, frameDelay = 0;
let lastDir = 1; // 1 = Direita, -1 = Esquerda

const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', data => { players = data.players; });

// --- CONTROLES TOUCH ---
canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    if (t.clientX < canvas.width / 2) {
        joy.active = true; joy.baseX = t.clientX; joy.baseY = t.clientY;
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.targetTouches[0];
    if (joy.active) {
        let dx = t.clientX - joy.baseX, dy = t.clientY - joy.baseY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
        joy.vx = dx/50; joy.vy = dy/50;
        // Define a direção apenas se houver movimento horizontal claro
        if (Math.abs(joy.vx) > 0.1) lastDir = joy.vx > 0 ? 1 : -1;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { joy.active = false; joy.vx = 0; joy.vy = 0; });

// --- LÓGICA DE DESENHO BASEADA NA SUA IMAGEM ---
function drawPlayer(p) {
    if (!spriteSheet.complete) return;

    // Dados Exatos da sua Imagem: 4 colunas, 7 linhas
    const cols = 4;
    const rows = 7;
    const fw = spriteSheet.width / cols;
    const fh = spriteSheet.height / rows;

    const isMe = (p.id === myId);
    const moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;

    // Linha 0: Idle | Linha 1: Walk
    let currentRow = moving ? 1 : 0;

    if (moving) {
        frameDelay++;
        if (frameDelay > 8) {
            frame = (frame + 1) % cols;
            frameDelay = 0;
        }
    } else {
        frame = 0; // Para no primeiro frame da linha Idle
    }

    ctx.save();
    // 1. Move para a posição do player
    ctx.translate(p.x, p.y);
    
    // 2. Espelhamento (apenas inverte no eixo X, sem girar o contexto)
    if (isMe && lastDir === -1) {
        ctx.scale(-1, 1);
    }

    // 3. Desenha o recorte exato
    ctx.drawImage(
        spriteSheet,
        frame * fw, currentRow * fh, // Corte X e Y
        fw, fh,                      // Tamanho do corte
        -fw/2, -fh/2,                // Centraliza no ponto (p.x, p.y)
        fw, fh                       // Mantém o tamanho original do sprite
    );

    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = "#2d8a45"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        if (joy.active) {
            socket.emit('player_movement', { x: me.x + joy.vx * 5, y: me.y + joy.vy * 5 });
        }

        ctx.save();
        // Câmera segue o jogador
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);
        for (let id in players) drawPlayer(players[id]);
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
gameLoop();
