const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// ===============================
// 📦 CARREGAMENTO DE IMAGENS
// ===============================
const spriteSheet = new Image();
spriteSheet.src = "./assets/Actor/Character/Boy/SpriteSheet.png"; 

const groundImg = new Image();
// Usando o Tileset padrão de grama do pack Ninja Adventure
groundImg.src = "./assets/Backgrounds/Tilesets/TilesetGround.png"; 

let assetsLoaded = 0;
const onAssetLoad = () => { assetsLoaded++; };
spriteSheet.onload = onAssetLoad;
groundImg.onload = onAssetLoad;

// ===============================
// 🎮 VARIÁVEIS DE ESTADO
// ===============================
let players = {};
let myId = null;
let frame = 0;
let frameDelay = 0;

const joy = { active: false, baseX: 0, baseY: 0, vx: 0, vy: 0 };
let moveTouchId = null;

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// ===============================
// 📱 CONTROLES TOUCH
// ===============================
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

// ===============================
// 🗺️ DESENHO DO MAPA (CHÃO)
// ===============================
function drawMap(me) {
    if (groundImg.width === 0) return;
    
    const tileSize = 64; // Tamanho que a grama aparecerá
    // Desenha a grama em volta do jogador para parecer um mapa infinito
    let startX = Math.floor((me.x - canvas.width) / tileSize) * tileSize;
    let startY = Math.floor((me.y - canvas.height) / tileSize) * tileSize;
    
    for (let x = startX; x < me.x + canvas.width; x += tileSize) {
        for (let y = startY; y < me.y + canvas.height; y += tileSize) {
            // Desenha o primeiro tile (grama) do Tileset
            ctx.drawImage(groundImg, 0, 0, 16, 16, x, y, tileSize, tileSize);
        }
    }
}

// ===============================
// 🎨 DESENHO DO PLAYER
// ===============================
function drawPlayer(p) {
    if (spriteSheet.width === 0) return;

    let frameW = spriteSheet.width / 4;
    let frameH = spriteSheet.height / 7;

    let isMe = (p.id === myId);
    let moving = isMe ? (Math.abs(joy.vx) > 0.1 || Math.abs(joy.vy) > 0.1) : false;

    let row = moving ? 1 : 0; 

    if (moving) {
        frameDelay++;
        if (frameDelay > 10) {
            frame = (frame + 1) % 4;
            frameDelay = 0;
        }
    } else { frame = 0; }

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

// ===============================
// 🔄 LOOP PRINCIPAL
// ===============================
function gameLoop() {
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
        // CÂMERA
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);
        
        drawMap(me); // Desenha o chão antes dos players
        
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
