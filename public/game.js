const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// SpriteSheet do Boy
const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let spriteLoaded = false;
spriteSheet.onload = () => { spriteLoaded = true; };

let players = {};
let myId = null;

// Controle de Animação e Joystick
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;
let frame = 0;
let frameDelay = 0;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// --- CONTROLES (Toque) ---
canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (t.clientX < canvas.width / 2) {
        moveTouchId = t.identifier;
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            let dx = t.clientX - joy.baseX;
            let dy = t.clientY - joy.baseY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
            joy.vx = dx/50;
            joy.vy = dy/50;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (t.identifier === moveTouchId) {
            joy.active = false; joy.vx = 0; joy.vy = 0; moveTouchId = null;
        }
    }
});

// --- FUNÇÃO PARA DESENHAR O MAPA (REFERÊNCIA VISUAL) ---
function drawMap(camX, camY) {
    const tileSize = 64;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"; // Linhas da grama
    
    // Desenha um grid para você VER o movimento
    for (let x = -1000; x < 1000; x += tileSize) {
        for (let y = -1000; y < 1000; y += tileSize) {
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }
}

// --- DESENHO DO JOGADOR ---
function drawPlayer(p) {
    if (!spriteLoaded) return;

    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;

    // Linha 1 do SpriteSheet é caminhada
    let row = moving ? 1 : 0; 

    if (moving) {
        frameDelay++;
        if (frameDelay > 10) {
            frame = (frame + 1) % 4;
            frameDelay = 0;
        }
    } else {
        frame = 0;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    // Desenha o boneco fixo (sem girar)
    ctx.drawImage(
        spriteSheet,
        frame * frameW, row * frameH,
        frameW, frameH,
        -24, -24,
        48, 48
    );
    ctx.restore();
}

// --- LOOP PRINCIPAL ---
function gameLoop() {
    // Fundo Verde
    ctx.fillStyle = "#2d8a45"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        // Atualiza posição no servidor
        if (joy.active) {
            socket.emit('player_movement', {
                x: me.x + joy.vx * 5,
                y: me.y + joy.vy * 5
            });
        }

        ctx.save();
        // A CÂMERA É O QUE FAZ PARECER QUE ANDA
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);
        
        drawMap(); // Desenha o grid de referência
        
        for (let id in players) {
            drawPlayer(players[id]);
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
gameLoop();
