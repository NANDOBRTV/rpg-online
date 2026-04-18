const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const WORLD_W    = 4000;
const GRAVITY    = 0.55;
const JUMP_FORCE = -13;
const SPD        = 4;

const PLATFORMS = [
  { x: 0,    y: 520, w: WORLD_W, h: 20 },
  { x: 200,  y: 400, w: 200, h: 16 },
  { x: 550,  y: 320, w: 180, h: 16 },
  { x: 850,  y: 400, w: 200, h: 16 },
  { x: 1100, y: 300, w: 160, h: 16 },
  { x: 1380, y: 400, w: 200, h: 16 },
  { x: 1650, y: 320, w: 180, h: 16 },
  { x: 1900, y: 420, w: 200, h: 16 },
  { x: 2150, y: 310, w: 160, h: 16 },
  { x: 2400, y: 400, w: 200, h: 16 },
  { x: 2650, y: 280, w: 180, h: 16 },
  { x: 2900, y: 380, w: 200, h: 16 },
  { x: 3150, y: 300, w: 160, h: 16 },
  { x: 3400, y: 420, w: 200, h: 16 },
  { x: 3650, y: 330, w: 180, h: 16 },
  { x: 3820, y: 410, w: 160, h: 16 },
];

let enemies = [];
let eid = 0;
const ETYPES = [
  { name:'skull',  hp:30, spd:1.2, dmg:8,  xp:20 },
  { name:'slime',  hp:50, spd:0.8, dmg:5,  xp:15 },
  { name:'dragon', hp:80, spd:1.5, dmg:15, xp:40 },
];

function spawnEnemy() {
  const t = ETYPES[Math.floor(Math.random() * ETYPES.length)];
  const pl = PLATFORMS[1 + Math.floor(Math.random() * (PLATFORMS.length - 1))];
  return {
    id: 'e' + (eid++), type: t.name,
    x: pl.x + 10 + Math.random() * Math.max(0, pl.w - 42),
    y: pl.y - 32,
    vx: (Math.random() > 0.5 ? 1 : -1) * t.spd,
    vy: 0, dir: 1, onGround: true,
    hp: t.hp, maxHp: t.hp,
    spd: t.spd, dmg: t.dmg, xp: t.xp,
    w: 32, h: 32, attackCd: 0,
    platX: pl.x, platW: pl.w,
  };
}
for (let i = 0; i < 20; i++) enemies.push(spawnEnemy());

let players = {};

function newPlayer(id) {
  return {
    id, x: 100 + Math.random() * 200, y: 460,
    vx: 0, vy: 0, dir: 1, onGround: false,
    anim: 'idle',
    hp: 100, maxHp: 100,
    level: 1, xp: 0, nextXp: 100, dmg: 20,
    dead: false, attackCd: 0,
    name: 'Ninja',
  };
}

function physics(e) {
  e.vy += GRAVITY;
  e.x  += e.vx;
  e.y  += e.vy;
  e.onGround = false;
  for (const p of PLATFORMS) {
    const prevB = e.y + e.h - e.vy;
    if (e.x + e.w > p.x && e.x < p.x + p.w &&
        e.y + e.h >= p.y && prevB <= p.y + 4 && e.vy >= 0) {
      e.y = p.y - e.h; e.vy = 0; e.onGround = true;
    }
  }
  if (e.x < 0)             { e.x = 0; e.vx = 0; }
  if (e.x + e.w > WORLD_W) { e.x = WORLD_W - e.w; e.vx = 0; }
  if (e.y > 700)            { e.y = 460; e.vy = 0; }
}

setInterval(() => {
  for (const id in players) {
    const p = players[id];
    if (!p.dead) {
      physics(p);
      if (p.attackCd > 0) p.attackCd--;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    if (en.attackCd > 0) en.attackCd--;

    let nearest = null, minD = 500;
    for (const id in players) {
      const p = players[id];
      if (p.dead) continue;
      const d = Math.hypot(en.x - p.x, en.y - p.y);
      if (d < minD) { minD = d; nearest = p; }
    }

    if (nearest) {
      const dx = nearest.x - en.x;
      en.dir = dx > 0 ? 1 : -1;
      en.vx = minD > 60 ? en.dir * en.spd : 0;
      if (minD < 40 && en.attackCd <= 0) {
        nearest.hp -= en.dmg;
        en.attackCd = 60;
        if (nearest.hp <= 0) {
          nearest.hp = 0; nearest.dead = true;
          io.to(nearest.id).emit('game_over');
        }
      }
    } else {
      en.vx = en.dir * en.spd;
    }

    physics(en);

    // patrulha na plataforma
    if (en.onGround) {
      if (en.x < en.platX || en.x + en.w > en.platX + en.platW) en.dir *= -1;
    }
    if (en.x <= 2 || en.x + en.w >= WORLD_W - 2) en.dir *= -1;
  }

  io.emit('world', { players, enemies });
}, 33);

io.on('connection', socket => {
  console.log('Conectou:', socket.id);
  players[socket.id] = newPlayer(socket.id);
  socket.emit('init', { platforms: PLATFORMS, worldW: WORLD_W, id: socket.id });

  socket.on('input', data => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    p.vx = (data.vx || 0) * SPD;
    if (data.jump && p.onGround) { p.vy = JUMP_FORCE; p.onGround = false; }
    if (data.dir !== undefined) p.dir = data.dir;
    p.anim = data.anim || 'idle';

    if (data.attack && p.attackCd <= 0) {
      p.attackCd = 25;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const dx = en.x - p.x;
        if (Math.abs(dx) < 55 && Math.abs(en.y - p.y) < 45 && dx * p.dir >= 0) {
          en.hp -= p.dmg;
          if (en.hp <= 0) {
            p.xp += en.xp;
            enemies.splice(i, 1);
            enemies.push(spawnEnemy());
            if (p.xp >= p.nextXp) {
              p.level++; p.xp -= p.nextXp;
              p.nextXp = Math.floor(p.nextXp * 1.5);
              p.maxHp += 20; p.hp = p.maxHp; p.dmg += 5;
              io.to(socket.id).emit('level_up', { level: p.level });
            }
          }
        }
      }
    }
  });

  socket.on('respawn', () => {
    const p = players[socket.id];
    if (!p) return;
    p.x = 100 + Math.random() * 200; p.y = 460;
    p.vx = 0; p.vy = 0; p.hp = p.maxHp; p.dead = false;
  });

  socket.on('set_name', name => {
    if (players[socket.id]) players[socket.id].name = String(name).slice(0, 12);
  });

  socket.on('disconnect', () => { delete players[socket.id]; });
});

server.listen(process.env.PORT || 3000, '0.0.0.0', () =>
  console.log('Servidor na porta 3000'));
