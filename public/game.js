const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const debugDisplay = document.getElementById('debug');
const socket = io();

let players = {};
let myId = null;

// Configurações do Joystick
const joy = {
    active: false,
    baseX: 0,
    baseY: 0,
    currX: 0,
    currY: 0,
    size: 60,
    limit: 50,
    vx: 0, // Velocidade X calculada
    vy: 0  // Velocidade Y calculada
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

socket.on('connect', () => {
    myId = socket.id;
    statusDisplay.innerText = "ONLINE";
});

socket.on('update_players', (serverPlayers) => {
    players = serverPlayers;
});

// EVENTOS DE TOQUE (MOBILE)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    
    // Ativa o joystick onde você tocar (lado esquerdo)
    if (t.clientX < canvas.width / 2) {
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
        joy.currX = t.clientX;
        joy.currY = t.clientY;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!joy.active) return;
    e.preventDefault();
    const t = e.touches[0];

    // Cálculo de distância do centro do analógico
    let dx = t.clientX - joy.baseX;
    let dy = t.clientY - joy.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joy.limit) {
        dx = (dx / dist) * joy.limit;
        dy = (dy / dist) * joy.limit;
    }

    joy.currX = joy.baseX + dx;
    joy.currY = joy.baseY + dy;

    // Transforma a posição do analógico em velocidade (-1 a 1)
    joy.vx = dx / joy.limit;
    joy.vy = dy / joy.limit;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
});

// LOOP DE ATUALIZAÇÃO (Envia movimento constante para o servidor)
setInterval(() => {
    if (myId && players[myId] && (joy.vx !== 0 || joy.vy !== 0)) {
        const speed = 7; // Velocidade de movimento
        const newX = players[myId].x + joy.vx * speed;
        const newY = players[myId].y + joy.vy * speed;

        // Envia a nova posição calculada, não a posição do dedo
        socket.emit('player_movement', { x: newX, y: newY });
        debugDisplay.innerText = `MOVING: ${Math.round(joy.vx * 100)}%`;
    }
}, 30); // 30ms para um movimento suave

// MOTOR DE DESENHO
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa tela

    // Desenha o Grid
    ctx.strokeStyle = '#111';
    for(let x=0; x<canvas.width; x+=40) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=40) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }

    // Desenha Joystick
    if (joy.active) {
        // Base
        ctx.beginPath();
        ctx.arc(joy.baseX, joy.baseY, joy.size, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Alavanca (Stick)
        ctx.beginPath();
        ctx.arc(joy.currX, joy.currY, 25, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0, 242, 255, 0.6)';
        ctx.fill();
    }

    // Desenha Jogadores
    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI*2);
        ctx.fill();

        if (id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
}
draw();
