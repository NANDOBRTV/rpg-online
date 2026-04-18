const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let players = {}, bullets = [], enemies = [], damageTexts = [];
let myId = null, isDead = false;

const joyL = { active: false, id: -1, baseX: 100, baseY: 0, currX: 100, currY: 0, vx: 0, vy: 0 };
const joyR = { active: false, id: -1, baseX: 0, baseY: 0, currX: 0, currY: 0, vx: 0, vy: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joyL.baseY = canvas.height - 120;
    joyR.baseX = canvas.width - 100;
    joyR.baseY = canvas.height - 120;
}
window.addEventListener('resize', resize);
resize();

socket.on('connect', () => { myId = socket.id; });
socket.on('game_over', () => { isDead = true; });
socket.on('damage_effect', (data) => {
    damageTexts.push({ x: data.x, y: data.y, text: data.dmg, life: 40, color: data.color || 'white' });
});
socket.on('update_world', (data) => {
    players = data.players; bullets = data.bullets; enemies = data.enemies;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isDead) {
        isDead = false;
        socket.emit('respawn_request');
        return;
    }
    for (let t of e.changedTouches) {
        if (t.clientX < canvas.width / 2) {
            joyL.active = true; joyL.id = t.identifier;
            joyL.baseX = t.clientX; joyL.baseY = t.clientY;
        } else {
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
            if (d > 70) { dx=(dx/d)*70; dy=(dy/d)*70; }
            joyL.currX = joyL.baseX + dx; joyL.currY = joyL.baseY + dy;
            joyL.vx = dx/70; joyL.vy = dy/70;
        }
        if (joyR.active && t.identifier === joyR.id) {
            let dx = t.clientX - joyR.baseX, dy = t.clientY - joyR.baseY;
            let d = Math.sqrt(dx*dx+dy*dy);
            if (d > 70) { dx=(dx/d)*70; dy=(dy/d)*70; }
            joyR.currX = joyR.baseX + dx; joyR.currY = joyR.baseY + dy;
            joyR.vx = dx/70; joyR.vy = dy/70;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (joyL.id === t.identifier) { joyL.active = false; joyL.vx = 0; joyL.vy = 0; }
        if (joyR.id === t.identifier) { joyR.active = false; joyR.vx = 0; joyR.vy = 0; }
    }
});

setInterval(() => {
    if (isDead || !players[myId]) return;
    if (joyL.vx !== 0 || joyL.vy !== 0) {
        socket.emit('player_movement', { x: players[myId].x + joyL.vx * 10, y: players[myId].y + joyL.vy * 10 });
    }
    if (joyR.vx !== 0 || joyR.vy !== 0) {
        socket.emit('shoot', { x: players[myId].x, y: players[myId].y, vX: joyR.vx, vY: joyR.vy });
    }
}, 30);

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isDead) {
        ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
        ctx.font = '20px Arial'; ctx.fillText("Toca para Renascer", canvas.width/2, canvas.height/2 + 60);
        requestAnimationFrame(draw); return;
    }

    enemies.forEach(en => {
        ctx.fillStyle = en.color; 
        if(en.type === 'shooter') ctx.fillRect(en.x-15, en.y-15, 30, 30);
        else { ctx.beginPath(); ctx.moveTo(en.x, en.y-20); ctx.lineTo(en.x+15, en.y+10); ctx.lineTo(en.x-15, en.y+10); ctx.fill(); }
        ctx.fillStyle = 'red'; ctx.fillRect(en.x-15, en.y-30, (en.health/en.maxHealth)*30, 5);
    });

    bullets.forEach(b => {
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill();
    });

    for (let id in players) {
        const p = players[id]; if (p.dead) continue;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
        ctx.fillStyle = 'green'; ctx.fillRect(p.x-20, p.y-40, (p.health/100)*40, 6);
        if(id === myId) { ctx.strokeStyle = 'white'; ctx.stroke(); }
    }

    damageTexts.forEach((d, i) => {
        ctx.fillStyle = d.color; ctx.font = '20px Arial'; ctx.fillText("-"+d.text, d.x, d.y - (40-d.life));
        d.life--; if(d.life <= 0) damageTexts.splice(i, 1);
    });

    [joyL, joyR].forEach(j => {
        if(j.active) {
            ctx.beginPath(); ctx.arc(j.baseX, j.baseY, 70, 0, 7); ctx.strokeStyle = 'white'; ctx.stroke();
            ctx.beginPath(); ctx.arc(j.currX, j.currY, 30, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
        }
    });

    requestAnimationFrame(draw);
}
draw();
