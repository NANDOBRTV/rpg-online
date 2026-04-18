const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Carregando o arquivo que você mandou
const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let spriteLoaded = false;
spriteSheet.onload = () => { spriteLoaded = true; };

let players = {}, myId = null, frame = 0, frameDelay = 0;
let lastDirection = 1; 
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// --- CONTROLES ---
canvas.addEventListener('touchstart', (e) => {
    let t = e.changedTouches[0];
    if (t.clientX < canvas.width / 2) {
        moveTouchId = t.identifier;
        joy.active = true; joy.baseX = t.clientX; joy.baseY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            let dx = t.clientX - joy.baseX, dy = t.clientY - joy.baseY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
            joy.vx = dx/50; joy.vy = dy/50;
            if (joy.vx > 0.1) lastDirection = 1;
            if (joy.vx < -0.1) lastDirection = -1;
            if (myId && players[myId]) {
                socket.emit('player_movement', { x: players[myId].x + joy.vx * 6, y: players[myId].y + joy.vy * 6 });
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { joy.active = false; joy.vx = 0; joy.vy = 0; moveTouchId = null; });

// --- DESENHO CORRIGIDO PARA O SEU ARQUIVO ---
function drawPlayer(p) {
    if (!spriteLoaded) return;

    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;

    // Medidas baseadas no arquivo SpriteSheet.png
    // Ele tem 4 frames de largura e 7 linhas de animação
    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    // Linha 0: Parado | Linha 1: Andando
    let row = moving ? 1 : 0; 

    if (moving) {
        frameDelay++;
        if (frameDelay > 8) { frame = (frame + 1) % 4; frameDelay = 0; }
    } else {
        frame = 0;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    
    // Inverte o boneco para a esquerda
    if (isMe && lastDirection === -1) ctx.scale(-1, 1);

    // O segredo está aqui: frameW e frameH recortam o boneco sozinho
    ctx.drawImage(
        spriteSheet,
        frame * frameW, row * frameH, // Local do corte
        frameW, frameH,               // Tamanho do corte
        -24, -24,                     // Centraliza no mapa
        48, 48                        // Tamanho na tela
    );

    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = "#2d8a45"; 
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
    
