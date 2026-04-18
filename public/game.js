const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Carregando o seu arquivo SpriteSheet
const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let spriteLoaded = false;
spriteSheet.onload = () => { spriteLoaded = true; };

let players = {}, myId = null;
let lastDirection = 1; 
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// --- CONTROLES (Mantidos para o movimento funcionar) ---
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

// --- DESENHO SEM ANIMAÇÃO (ESTÁTICO) ---
function drawPlayer(p) {
    if (!spriteLoaded) return;

    let isMe = (p.id === myId);
    
    // Calculamos o tamanho de um boneco apenas uma vez
    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    ctx.save();
    ctx.translate(p.x, p.y);
    
    // Inverte para a esquerda se necessário
    if (isMe && lastDirection === -1) ctx.scale(-1, 1);

    // Desenha SEMPRE o primeiro frame (parado) da primeira linha
    ctx.drawImage(
        spriteSheet,
        0, 0,           // Sempre corta a posição (0,0) da imagem
        frameW, frameH, // Tamanho do corte de um único boneco
        -24, -24,       // Centraliza
        48, 48          // Tamanho na tela
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
        
