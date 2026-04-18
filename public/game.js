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
            
            joy.vx = dx/50;
            joy.vy = dy/50;

            // Envia a posição nova para o servidor
            if (myId && players[myId]) {
                socket.emit('player_movement', {
                    x: players[myId].x + joy.vx * 6,
                    y: players[myId].y + joy.vy * 6
                });
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false; joy.vx = 0; joy.vy = 0; moveTouchId = null;
});

// --- DESENHO FIXO (SEM GIRAR) ---
function drawPlayer(p) {
    if (!spriteLoaded) return;

    // Tamanho do recorte (baseado no seu SpriteSheet 4x7)
    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    ctx.save();
    
    // Move o "pincel" para a posição do boneco no mapa
    ctx.translate(p.x, p.y);
    
    // REMOVI O SCALE: O boneco agora vai ficar sempre virado para frente
    // assim ele para de girar como um pião.

    ctx.drawImage(
        spriteSheet,
        0, 0,           // Pega o primeiro boneco da folha
        frameW, frameH, // Tamanho do corte
        -24, -24,       // Centraliza no ponto do jogador
        48, 48          // Tamanho final na tela
    );

    ctx.restore();
}

function gameLoop() {
    // Fundo Verde (Grama)
    ctx.fillStyle = "#2d8a45"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        let me = players[myId];

        ctx.save();
        // A CÂMERA: Segue o jogador para ele caminhar pelo mapa
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);

        // Desenha todos os jogadores
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
