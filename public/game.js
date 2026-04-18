const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let players = {};
let bullets = [];
let enemies = [];
let myId = null;

// CONFIGURAÇÃO DOS DOIS JOYSTICKS
const joyL = { active: false, id: -1, baseX: 100, baseY: 0, currX: 100, currY: 0, vx: 0, vy: 0 }; // Movimento
const joyR = { active: false, id: -1, baseX: 0, baseY: 0, currX: 0, currY: 0, vx: 0, vy: 0 };     // Tiro

const JOY_SIZE = 80;
const JOY_LIMIT = 70;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joyL.baseY = canvas.height - 120;
    joyR.baseX = canvas.width - 100;
    joyR.baseY = canvas.height - 120;
    resetJoysticks();
}

function resetJoysticks() {
    joyL.currX = joyL.baseX; joyL.currY = joyL.baseY;
    joyR.currX = joyR.baseX; joyR.currY = joyR.baseY;
}

window.addEventListener('resize', resize);
resize();

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => {
    players = data.players;
    bullets = data.bullets;
    enemies = data.enemies || [];
});

// LÓGICA MULTI-TOUCH CORRIGIDA
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        
        // Se tocou no lado esquerdo e o joystick L está livre
        if (t.clientX < canvas.width / 2 && !joyL.active) {
            joyL.active = true;
            joyL.id = t.identifier;
            joyL.baseX = t.clientX; joyL.baseY = t.clientY;
            joyL.currX = t.clientX; joyL.currY = t.clientY;
        } 
        // Se tocou no lado direito e o joystick R está livre
        else if (t.clientX >= canvas.width / 2 && !joyR.active) {
            joyR.active = true;
            joyR.id = t.identifier;
            joyR.baseX = t.clientX; joyR.baseY = t.clientY;
            joyR.currX = t.clientX; joyR.currY = t.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];

        if (joyL.active && t.identifier === joyL.id) {
            let dx = t.clientX - joyL.baseX;
            let dy = t.clientY - joyL.baseY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > JOY_LIMIT) { dx = (dx/dist)*JOY_LIMIT; dy = (dy/dist)*JOY_LIMIT; }
            joyL.currX = joyL.baseX + dx; joyL.currY = joyL.baseY + dy;
            joyL.vx = dx/JOY_LIMIT; joyL.vy = dy/JOY_LIMIT;
        }

        if (joyR.active && t.identifier === joyR.id) {
            let dx = t.clientX - joyR.baseX;
            let dy = t.clientY - joyR.baseY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > JOY_LIMIT) { dx = (dx/dist)*JOY_LIMIT; dy = (dy/dist)*JOY_LIMIT; }
            joyR.currX = joyR.baseX + dx; joyR.currY = joyR.baseY + dy;
            joyR.vx = dx/JOY_LIMIT; joyR.vy = dy/JOY_LIMIT;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (joyL.id === t.identifier) { joyL.active = false; joyL.id = -1; joyL.vx = 0; joyL.vy = 0; joyL.currX = joyL.baseX; joyL.currY = joyL.baseY; }
        if (joyR.id === t.identifier) { joyR.active = false; joyR.id = -1; joyR.vx = 0; joyR.vy = 0; joyR.currX = joyR.baseX; joyR.currY = joyR.baseY; }
    }
});

// LOOP DE COMANDOS (Movimento e Tiro Automático se o Joy Direito estiver ativo)
setInterval(() => {
    if (!myId || !players[myId]) return;

    // Envia Movimento
    if (joyL.vx !== 0 || joyL.vy !== 0) {
        socket.emit('player_movement', { 
            x: players[myId].x + joyL.vx * 12, 
            y: players[myId].y + joyL.vy * 12 
        });
    }

    // Atira se estiver usando o analógico direito
    if (joyR.vx !== 0 || joyR.vy !== 0) {
        socket.emit('shoot', { 
            x: players[myId].x, 
            y: players[myId].y, 
            vX: joyR.vx, 
            vY: joyR.vy 
        });
    }
}, 30);

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha Inimigos, Balas e Players (mesma lógica anterior)
    enemies.forEach(en => {
        ctx.fillStyle = '#ff3333'; ctx.beginPath();
        ctx.moveTo(en.x, en.y-15); ctx.lineTo(en.x+15, en.y+15); ctx.lineTo(en.x-15, en.y+15);
        ctx.fill();
    });

    bullets.forEach(b => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    });

    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
        if (id === myId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    }

    // DESENHA OS DOIS JOYSTICKS
    [joyL, joyR].forEach(j => {
        if (j.active) {
            ctx.beginPath(); ctx.arc(j.baseX, j.baseY, JOY_SIZE, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)'; ctx.stroke();
            ctx.beginPath(); ctx.arc(j.currX, j.currY, 35, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0, 242, 255, 0.5)'; ctx.fill();
        }
    });

    requestAnimationFrame(draw);
}
draw();
            
