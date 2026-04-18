const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let players = {};
let bullets = [];
let enemies = [];
let myId = null;

const joyL = { active: false, id: -1, baseX: 100, baseY: 0, currX: 100, currY: 0, vx: 0, vy: 0 };
const joyR = { active: false, id: -1, baseX: 0, baseY: 0, currX: 0, currY: 0, vx: 0, vy: 0 };
const JOY_SIZE = 80;
const JOY_LIMIT = 70;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joyL.baseY = canvas.height - 120;
    joyR.baseX = canvas.width - 100;
    joyR.baseY = canvas.height - 120;
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

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (t.clientX < canvas.width / 2 && !joyL.active) {
            joyL.active = true; joyL.id = t.identifier;
            joyL.baseX = t.clientX; joyL.baseY = t.clientY;
        } else if (t.clientX >= canvas.width / 2 && !joyR.active) {
            joyR.active = true; joyR.id = t.identifier;
            joyR.baseX = t.clientX; joyR.baseY = t.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.touches) {
        if (joyL.active && t.identifier === joyL.id) {
            let dx = t.clientX - joyL.baseX, dy = t.clientY - joyL.baseY;
            let d = Math.sqrt(dx*dx+dy*dy);
            if (d > JOY_LIMIT) { dx=(dx/d)*JOY_LIMIT; dy=(dy/d)*JOY_LIMIT; }
            joyL.currX = joyL.baseX + dx; joyL.currY = joyL.baseY + dy;
            joyL.vx = dx/JOY_LIMIT; joyL.vy = dy/JOY_LIMIT;
        }
        if (joyR.active && t.identifier === joyR.id) {
            let dx = t.clientX - joyR.baseX, dy = t.clientY - joyR.baseY;
            let d = Math.sqrt(dx*dx+dy*dy);
            if (d > JOY_LIMIT) { dx=(dx/d)*JOY_LIMIT; dy=(dy/d)*JOY_LIMIT; }
            joyR.currX = joyR.baseX + dx; joyR.currY = joyR.baseY + dy;
            joyR.vx = dx/JOY_LIMIT; joyR.vy = dy/JOY_LIMIT;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (joyL.id === t.identifier) { joyL.active = false; joyL.vx = 0; joyL.vy = 0; joyL.currX = joyL.baseX; joyL.currY = joyL.baseY; }
        if (joyR.id === t.identifier) { joyR.active = false; joyR.vx = 0; joyR.vy = 0; joyR.currX = joyR.baseX; joyR.currY = joyR.baseY; }
    }
});

setInterval(() => {
    if (!myId || !players[myId]) return;
    if (joyL.vx !== 0 || joyL.vy !== 0) {
        socket.emit('player_movement', { x: players[myId].x + joyL.vx * 12, y: players[myId].y + joyL.vy * 12 });
    }
    if (joyR.vx !== 0 || joyR.vy !== 0) {
        socket.emit('shoot', { x: players[myId].x, y: players[myId].y, vX: joyR.vx, vY: joyR.vy });
    }
}, 30);

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    enemies.forEach(en => {
        ctx.fillStyle = '#ff3333'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff3333';
        ctx.beginPath(); ctx.moveTo(en.x, en.y-15); ctx.lineTo(en.x+15, en.y+15); ctx.lineTo(en.x-15, en.y+15); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#440000'; ctx.fillRect(en.x-15, en.y-25, 30, 5);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(en.x-15, en.y-25, (en.health/en.maxHealth)*30, 5);
    });

    bullets.forEach(b => {
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#00f2ff';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    });

    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color; ctx.shadowBlur = 15; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#333'; ctx.fillRect(p.x-20, p.y-35, 40, 6);
        ctx.fillStyle = p.health > 50 ? '#0f0' : '#f00'; ctx.fillRect(p.x-20, p.y-35, (p.health/100)*40, 6);
        if (id === myId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    }

    [joyL, joyR].forEach(j => {
        ctx.beginPath(); ctx.arc(j.baseX, j.baseY, JOY_SIZE, 0, Math.PI*2);
        ctx.strokeStyle = j.active ? 'cyan' : 'rgba(255,255,255,0.1)'; ctx.stroke();
        ctx.beginPath(); ctx.arc(j.currX, j.currY, 30, 0, Math.PI*2);
        ctx.fillStyle = j.active ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.05)'; ctx.fill();
    });
    requestAnimationFrame(draw);
}
draw();
