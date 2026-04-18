const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let spriteLoaded = false;
spriteSheet.onload = () => { spriteLoaded = true; };

let players = {};
let myId = null;

// Joystick e Animação
const joy = { active: false, vx: 0, vy: 0 };
let frame = 0;
let frameDelay = 0;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// CONTROLES SIMPLIFICADOS (Para não bugar)
canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (t.clientX < canvas.width / 2) {
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.targetTouches[0];
    if (joy.active) {
        let dx = t.clientX - joy.baseX;
        let dy = t.clientY - joy.baseY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 50) { dx *= 50/dist; dy *= 50/dist; }
        joy.vx = dx/50;
        joy.vy = dy/50;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { joy.active = false; joy.vx = 0; joy.vy = 0; });

function drawPlayer(p) {
    if (!spriteLoaded) return;

    // Ajuste de frames baseado no SpriteSheet que você enviou
    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    // Verifica se está se movendo para trocar a linha da imagem
    let isMoving = (p.id === myId) ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;
    let row = isMoving ? 1 : 0; 

    if (isMoving) {
        frameDelay++;
        if (frameDelay > 10) { frame = (frame + 1) % 4; frameDelay = 0; }
    } else { frame = 0; }

    ctx.save();
    // MOVE para a posição exata
    ctx.translate(p.x, p.y);
    
    // DESENHA SEM GIRAR (Fixo para frente para evitar o erro de pião)
    ctx.drawImage(
        spriteSheet,
        frame * frameW, row * frameH,
        frameW, frameH,
        -24, -24, // Centraliza o boneco no ponto
        48, 48
    );
    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = "#2d8a45"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        // ENVIAR MOVIMENTO (Se o joystick estiver ativo, ele caminha)
        if (joy.active) {
            socket.emit('player_movement', {
                x: me.x + joy.vx * 4,
                y: me.y + joy.vy * 4
            });
        }

        ctx.save();
        // CÂMERA: Mantém o jogador no centro e move o mundo
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);
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
            
