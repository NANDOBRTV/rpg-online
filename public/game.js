const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// Carregando o SpriteSheet
const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

let spriteLoaded = false;
spriteSheet.onload = () => { spriteLoaded = true; };

let players = {};
let myId = null;

// Animação
let frame = 0;
let frameDelay = 0;

// Joystick
const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// --- CONTROLES TOUCH ---
canvas.addEventListener('touchstart', (e) => {
    let t = e.changedTouches[0];
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
            
            // vx e vy controlam a direção (entre -1 e 1)
            joy.vx = dx/50;
            joy.vy = dy/50;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false; joy.vx = 0; joy.vy = 0; moveTouchId = null;
});

// --- DESENHO DO PERSONAGEM ---
function drawPlayer(p) {
    if (!spriteLoaded) return;

    // Detecta se ESSE jogador específico está se movendo
    // Se for o meu jogador, uso o joystick. Se for outro, comparo a posição anterior (lógica simples)
    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;

    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    let row = moving ? 1 : 0; 

    if (moving) {
        frameDelay++;
        if (frameDelay > 8) {
            frame = (frame + 1) % 4;
            frameDelay = 0;
        }
    } else {
        frame = 0;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.drawImage(
        spriteSheet,
        frame * frameW, row * frameH,
        frameW, frameH,
        -24, -24,
        48, 48
    );
    ctx.restore();
}

// --- LOOP PRINCIPAL (ONDE O MOVIMENTO ACONTECE) ---
function gameLoop() {
    // 1. Limpa a tela
    ctx.fillStyle = "#2d8a45"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        // 2. ENVIAR MOVIMENTO PARA O SERVIDOR CONSTANTEMENTE
        if (joy.active) {
            socket.emit('player_movement', {
                x: me.x + joy.vx * 5, // 5 é a velocidade de caminhada
                y: me.y + joy.vy * 5
            });
        }

        // 3. A CÂMERA SEGUE O JOGADOR
        ctx.save();
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
