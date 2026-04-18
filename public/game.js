const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const debugDisplay = document.getElementById('debug');
const socket = io();

let players = {};
let bullets = [];
let enemies = []; // Nova lista de inimigos
let myId = null;

// JOYSTICK FIXO
const joy = { active: false, baseX: 100, baseY: 0, currX: 100, currY: 0, size: 80, limit: 70, vx: 0, vy: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joy.baseY = canvas.height - 120;
    joy.currX = joy.baseX; joy.currY = joy.baseY;
}
window.addEventListener('resize', resize);
resize();

socket.on('connect', () => {
    myId = socket.id;
    statusDisplay.innerText = "ONLINE";
});

// Sincronização Total com o Mundo
socket.on('update_world', (data) => {
    players = data.players;
    bullets = data.bullets;
    enemies = data.enemies || []; // Recebe os bots do servidor

    if (myId && players[myId]) {
        debugDisplay.innerText = `X:${Math.round(players[myId].x)} Y:${Math.round(players[myId].y)}`;
    }
});

// CONTROLES MOBILE (Lado Esquerdo: Joystick / Lado Direito: Tiro)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let t of e.touches) {
        const distJoy = Math.sqrt(Math.pow(t.clientX - joy.baseX, 2) + Math.pow(t.clientY - joy.baseY, 2));
        if (t.clientX < canvas.width / 2 && distJoy < joy.size + 50) {
            joy.active = true;
        } else if (t.clientX >= canvas.width / 2) {
            if (myId && players[myId]) {
                const p = players[myId];
                const dx = t.clientX - p.x;
                const dy = t.clientY - p.y;
                const d = Math.sqrt(dx*dx + dy*dy);
                if (d > 1) socket.emit('shoot', { x: p.x, y: p.y, vX: dx/d, vY: dy/d });
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.touches) {
        if (joy.active && t.clientX < canvas.width / 2) {
            let dx = t.clientX - joy.baseX;
            let dy = t.clientY - joy.baseY;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d > joy.limit) { dx = (dx/d)*joy.limit; dy = (dy/d)*joy.limit; }
            joy.currX = joy.baseX + dx; joy.currY = joy.baseY + dy;
            joy.vx = dx/joy.limit; joy.vy = dy/joy.limit;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { joy.active = false; joy.vx = 0; joy.vy = 0; joy.currX = joy.baseX; joy.currY = joy.baseY; });

// LOOP DE MOVIMENTO
setInterval(() => {
    if (myId && players[myId] && (joy.vx !== 0 || joy.vy !== 0)) {
        socket.emit('player_movement', { x: players[myId].x + joy.vx * 12, y: players[myId].y + joy.vy * 12 });
    }
}, 20);

// RENDERIZAÇÃO
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. DESENHAR INIMIGOS (Bots Vermelhos)
    enemies.forEach(en => {
        ctx.fillStyle = '#ff3333';
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff3333';
        
        // Forma de Triângulo para o inimigo
        ctx.beginPath();
        ctx.moveTo(en.x, en.y - 15);
        ctx.lineTo(en.x + 15, en.y + 15);
        ctx.lineTo(en.x - 15, en.y + 15);
        ctx.closePath();
        ctx.fill();

        // Vida do Inimigo
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#440000'; ctx.fillRect(en.x - 15, en.y - 25, 30, 4);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(en.x - 15, en.y - 25, (en.health/50)*30, 4);
    });

    // 2. DESENHAR BALAS
    bullets.forEach(b => {
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    });

    // 3. DESENHAR JOGADORES
    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color; ctx.shadowBlur = 15; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
        
        // Vida do Player
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333'; ctx.fillRect(p.x - 20, p.y - 35, 40, 6);
        ctx.fillStyle = p.health > 50 ? '#0f0' : '#f00';
        ctx.fillRect(p.x - 20, p.y - 35, (p.health/100)*40, 6);

        if (id === myId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    }

    // 4. JOYSTICK
    ctx.beginPath(); ctx.arc(joy.baseX, joy.baseY, joy.size, 0, Math.PI*2);
    ctx.strokeStyle = joy.active ? '#00f2ff' : '#004444'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(joy.currX, joy.currY, 35, 0, Math.PI*2);
    ctx.fillStyle = joy.active ? 'rgba(0, 242, 255, 0.5)' : 'rgba(0, 242, 255, 0.2)'; ctx.fill();

    requestAnimationFrame(draw);
}
draw();
            
