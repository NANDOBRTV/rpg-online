const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let players = {}, bullets = [], enemies = [], xpOrbs = [], damageTexts = [];
let myId = null, isDead = false;
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 10000;

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
socket.on('level_up', (data) => { console.log("Level UP!"); });
socket.on('damage_effect', (data) => {
    damageTexts.push({ x: data.x, y: data.y, text: data.dmg, life: 40, color: data.color || 'white' });
});
socket.on('update_world', (data) => {
    players = data.players; bullets = data.bullets; enemies = data.enemies; xpOrbs = data.xpOrbs || [];
});

// EVENTOS DE TOQUE (Mesma lógica multi-touch)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isDead) { isDead = false; socket.emit('respawn_request'); return; }
    for (let t of e.changedTouches) {
        if (t.clientX < canvas.width / 2) {
            joyL.active = true; joyL.id = t.identifier; joyL.baseX = t.clientX; joyL.baseY = t.clientY;
        } else {
            joyR.active = true; joyR.id = t.identifier; joyR.baseX = t.clientX; joyR.baseY = t.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let t of e.touches) {
        if (joyL.active && t.identifier === joyL.id) {
            let dx = t.clientX - joyL.baseX, dy = t.clientY - joyL.baseY;
            let d = Math.sqrt(dx*dx+dy*dy); if (d > 70) { dx=(dx/d)*70; dy=(dy/d)*70; }
            joyL.currX = joyL.baseX + dx; joyL.currY = joyL.baseY + dy;
            joyL.vx = dx/70; joyL.vy = dy/70;
        }
        if (joyR.active && t.identifier === joyR.id) {
            let dx = t.clientX - joyR.baseX, dy = t.clientY - joyR.baseY;
            let d = Math.sqrt(dx*dx+dy*dy); if (d > 70) { dx=(dx/d)*70; dy=(dy/d)*70; }
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
    const me = players[myId];
    if (joyL.vx !== 0 || joyL.vy !== 0) {
        socket.emit('player_movement', { x: me.x + joyL.vx * 12, y: me.y + joyL.vy * 12 });
    }
    if (joyR.vx !== 0 || joyR.vy !== 0) {
        socket.emit('shoot', { x: me.x, y: me.y, vX: joyR.vx, vY: joyR.vy });
    }
}, 30);

function draw() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!myId || !players[myId]) { requestAnimationFrame(draw); return; }

    const me = players[myId];

    // ATUALIZA CÂMERA
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;

    if (isDead) {
        ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
        ctx.font = '20px Arial'; ctx.fillText("Toca para Renascer", canvas.width/2, canvas.height/2 + 60);
        requestAnimationFrame(draw); return;
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // DESENHAR LIMITES DO MAPA
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 10;
    ctx.strokeRect(-WORLD_SIZE/2, -WORLD_SIZE/2, WORLD_SIZE, WORLD_SIZE);

    // DESENHAR GRADE (GRID)
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
    for (let i = -WORLD_SIZE/2; i <= WORLD_SIZE/2; i += 200) {
        ctx.beginPath(); ctx.moveTo(i, -WORLD_SIZE/2); ctx.lineTo(i, WORLD_SIZE/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-WORLD_SIZE/2, i); ctx.lineTo(WORLD_SIZE/2, i); ctx.stroke();
    }

    // DESENHAR XP ORBS
    xpOrbs.forEach(orb => {
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(orb.x, orb.y, 6, 0, 7); ctx.fill();
    });

    // DESENHAR INIMIGOS
    enemies.forEach(en => {
        ctx.fillStyle = en.color; 
        if(en.type === 'shooter') ctx.fillRect(en.x-15, en.y-15, 30, 30);
        else { ctx.beginPath(); ctx.moveTo(en.x, en.y-20); ctx.lineTo(en.x+15, en.y+10); ctx.lineTo(en.x-15, en.y+10); ctx.fill(); }
        ctx.fillStyle = '#300'; ctx.fillRect(en.x-15, en.y-30, 30, 5);
        ctx.fillStyle = 'red'; ctx.fillRect(en.x-15, en.y-30, (en.health/en.maxHealth)*30, 5);
    });

    // DESENHAR BALAS
    bullets.forEach(b => {
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill();
    });

    // DESENHAR PLAYERS
    for (let id in players) {
        const p = players[id]; if (p.dead) continue;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, 7); ctx.fill();
        ctx.fillStyle = '#030'; ctx.fillRect(p.x-20, p.y-40, 40, 6);
        ctx.fillStyle = '#0f0'; ctx.fillRect(p.x-20, p.y-40, (p.health/p.maxHealth)*40, 6);
    }

    // NÚMEROS DE DANO
    damageTexts.forEach((d, i) => {
        ctx.fillStyle = d.color; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
        ctx.fillText("-"+Math.round(d.text), d.x, d.y - (40-d.life));
        d.life--; if(d.life <= 0) damageTexts.splice(i, 1);
    });

    ctx.restore();

    // INTERFACE FIXA (HUD)
    if (players[myId]) {
        const p = players[myId];
        const barW = canvas.width * 0.6;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fillRect((canvas.width-barW)/2, 25, barW, 12);
        ctx.fillStyle = '#ffff00'; ctx.fillRect((canvas.width-barW)/2, 25, (p.xp / p.nextLevelXp) * barW, 12);
        ctx.fillStyle = 'white'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`NÍVEL ${p.level}`, canvas.width / 2, 55);
    }

    // JOYSTICKS
    [joyL, joyR].forEach(j => {
        if(j.active) {
            ctx.beginPath(); ctx.arc(j.baseX, j.baseY, 75, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
            ctx.beginPath(); ctx.arc(j.currX, j.currY, 35, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
        }
    });

    requestAnimationFrame(draw);
}
draw();
                   
