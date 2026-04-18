const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const socket = io();

let players = {};
let bullets = [];
let myId = null;

// Joystick Fixo
const joy = {
    active: false,
    baseX: 100,
    baseY: 0,
    currX: 100,
    currY: 0,
    size: 80,
    limit: 70,
    vx: 0,
    vy: 0
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joy.baseY = canvas.height - 120;
    joy.currX = joy.baseX;
    joy.currY = joy.baseY;
}
window.addEventListener('resize', resize);
resize();

socket.on('connect', () => {
    myId = socket.id;
    statusDisplay.innerText = "ONLINE";
});

// Recebe o estado completo do mundo (players + balas)
socket.on('update_world', (data) => {
    players = data.players;
    bullets = data.bullets;
});

// GESTÃO DE MULTI-TOQUE (Joystick + Tiro)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        
        // LADO ESQUERDO: Ativa o Joystick
        if (t.clientX < canvas.width / 2) {
            const dist = Math.sqrt(Math.pow(t.clientX - joy.baseX, 2) + Math.pow(t.clientY - joy.baseY, 2));
            if (dist < joy.size + 50) joy.active = true;
        } 
        // LADO DIREITO: Atira
        else {
            if (myId && players[myId]) {
                const p = players[myId];
                const dx = t.clientX - p.x;
                const dy = t.clientY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Envia o comando de tiro para o servidor
                socket.emit('shoot', {
                    x: p.x,
                    y: p.y,
                    vX: dx / dist,
                    vY: dy / dist
                });
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (joy.active && t.clientX < canvas.width / 2) {
            let dx = t.clientX - joy.baseX;
            let dy = t.clientY - joy.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > joy.limit) {
                dx = (dx / dist) * joy.limit;
                dy = (dy / dist) * joy.limit;
            }

            joy.currX = joy.baseX + dx;
            joy.currY = joy.baseY + dy;
            joy.vx = dx / joy.limit;
            joy.vy = dy / joy.limit;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 || Array.from(e.touches).every(t => t.clientX >= canvas.width / 2)) {
        joy.active = false;
        joy.currX = joy.baseX;
        joy.currY = joy.baseY;
        joy.vx = 0;
        joy.vy = 0;
    }
});

// Loop de Movimento
setInterval(() => {
    if (myId && players[myId] && (joy.vx !== 0 || joy.vy !== 0)) {
        socket.emit('player_movement', {
            x: players[myId].x + joy.vx * 12,
            y: players[myId].y + joy.vy * 12
        });
    }
}, 20);

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha Balas
    bullets.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 2. Desenha Joystick
    ctx.beginPath();
    ctx.arc(joy.baseX, joy.baseY, joy.size, 0, Math.PI * 2);
    ctx.strokeStyle = joy.active ? '#00f2ff' : '#004444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(joy.currX, joy.currY, 35, 0, Math.PI * 2);
    ctx.fillStyle = joy.active ? 'rgba(0, 242, 255, 0.5)' : 'rgba(0, 242, 255, 0.2)';
    ctx.fill();

    // 3. Desenha Players e Barra de Vida
    for (let id in players) {
        const p = players[id];
        
        // Corpo do Player
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Barra de Vida
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(p.x - 20, p.y - 30, 40, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(p.x - 20, p.y - 30, (p.health / 100) * 40, 5);

        if (id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
    requestAnimationFrame(draw);
}
draw();
