require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const DB_FILE = path.join(__dirname, 'database.json');
const MAPS = { 
    'vila': { next: 'floresta', prev: null }, 
    'floresta': { next: null, prev: 'vila' } 
};

const CLASSES = {
    ninja: { hp: 120, damage: 25, speed: 8, range: 110, attackCD: 10, color: "#81ecec", skills: ["Corte Sombrio", "Passo de Vento"] },
    guerreiro: { hp: 280, damage: 35, speed: 5, range: 140, attackCD: 18, color: "#ff4444", skills: ["Impacto Terrestre", "Escudo de Ferro"] },
    mago: { hp: 110, damage: 60, speed: 6, range: 500, attackCD: 25, color: "#aa88ff", skills: ["Explosão Arcana", "Barreira Mágica"] }
};

let db = { users: {} };
let players = {}, enemies = [], worldTime = 0;

// Persistência
async function loadDB() { 
    try { const d = await fs.readFile(DB_FILE, 'utf8'); db = JSON.parse(d); } 
    catch (e) { db = { users: {} }; await saveDB(); } 
}

async function saveDB() { 
    try { await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) { console.error("Erro DB"); } 
}

function syncUser(p) {
    if (db.users[p.name]) {
        Object.assign(db.users[p.name], { 
            level: p.level, xp: p.xp, gold: p.gold, stats: p.stats, 
            statPoints: p.statPoints, inventory: p.inventory, 
            quests: p.quests, codex: p.codex, lastMap: p.room 
        });
        saveDB();
    }
}

function grantRewards(pid, xp, gold, enemyName) {
    const p = players[pid]; if (!p) return;
    p.xp += xp; p.gold += gold;
    
    if (!p.codex) p.codex = {};
    if (!p.codex[enemyName]) p.codex[enemyName] = 0;
    p.codex[enemyName]++;

    p.quests.forEach(q => { if (q.id === 'kill_monsters' && q.current < q.goal) q.current++; });

    if (p.xp >= p.level * 300) {
        p.level++; p.xp = 0; p.statPoints += 3;
        io.to(p.room).emit('newChat', { name: "SISTEMA", msg: `⭐ ${p.name} subiu para o Nível ${p.level}!`, color: "#f1c40f" });
    }
    syncUser(p);
    io.to(pid).emit('updateUI');
}

io.on('connection', (socket) => {
    socket.on('register', async (d) => {
        if (!d.user || d.user.length < 3) return socket.emit('msg', 'Nome curto');
        if (db.users[d.user]) return socket.emit('msg', 'Usuário existe');
        db.users[d.user] = { 
            pass: await bcrypt.hash(d.pass, 10), level: 1, xp: 0, gold: 100, lastMap: 'vila',
            stats: {str: 0, agi: 0, int: 0, vit: 0}, statPoints: 0, inventory: [], quests: [], codex: {}
        };
        await saveDB(); socket.emit('msg', 'Criado!');
    });

    socket.on('login', async (d) => {
        const u = db.users[d.user];
        if (u && await bcrypt.compare(d.pass, u.pass)) {
            const base = CLASSES[d.charClass || 'ninja'];
            players[socket.id] = { 
                ...base, id: socket.id, name: d.user, room: u.lastMap, x: 500, y: 420, vx: 0, vy: 0,
                level: u.level, xp: u.xp, gold: u.gold, stats: u.stats, statPoints: u.statPoints, 
                inventory: u.inventory, quests: u.quests || [], codex: u.codex || {},
                attackCD: 0, dead: false, class: d.charClass || 'ninja'
            };
            const p = players[socket.id];
            p.maxHp = base.hp + (p.level * 20) + (p.stats.vit * 15); p.hp = p.maxHp;
            socket.join(p.room); socket.emit('loginSuccess');
        } else socket.emit('msg', 'Falha no Login');
    });

    socket.on('addStat', (stat) => {
        const p = players[socket.id];
        if (p && p.statPoints > 0) { 
            p.stats[stat]++; p.statPoints--; 
            if (stat === 'vit') { p.maxHp += 15; p.hp += 15; }
            syncUser(p); socket.emit('updateUI'); 
        }
    });

    socket.on('acceptQuest', () => {
        const p = players[socket.id];
        if (p && p.quests.length === 0) {
            p.quests.push({ id: 'kill_monsters', title: 'Caçador de Slimes', current: 0, goal: 5 });
            syncUser(p); socket.emit('updateUI');
        }
    });

    socket.on('chat', (msg) => {
        const p = players[socket.id];
        if (p) io.to(p.room).emit('newChat', { name: p.name, msg: msg.substring(0, 50), color: p.color });
    });

    socket.on('input', (d) => {
        const p = players[socket.id]; if (!p || p.dead) return;
        if (d.vx !== undefined) p.vx = d.vx * (p.speed + (p.stats.agi * 0.3));
        if (d.jump && p.y >= 420) p.vy = -16;
        if (d.attack && p.attackCD <= 0) {
            const dmg = p.damage + (p.stats.str * 2);
            enemies.forEach(e => { 
                if (e.room === p.room && Math.abs(p.x - e.x) < p.range) { 
                    e.hp -= dmg; if (e.hp <= 0) grantRewards(socket.id, 60, 25, "Slime"); 
                } 
            });
            p.attackCD = 15;
        }
    });

    socket.on('disconnect', () => { if(players[socket.id]) syncUser(players[socket.id]); delete players[socket.id]; });
});

setInterval(() => {
    worldTime = (worldTime + 1) % 2400;
    for (let id in players) {
        let p = players[id];
        p.vy += 0.8; p.x += p.vx; p.y += p.vy;
        if (p.y > 420) { p.y = 420; p.vy = 0; }
        if (p.attackCD > 0) p.attackCD--;
        
        if (p.x > 1500 && MAPS[p.room].next) {
            const old = p.room; p.room = MAPS[old].next; p.x = 50;
            const s = io.sockets.sockets.get(id); if(s){ s.leave(old); s.join(p.room); }
        } else if (p.x < 0 && MAPS[p.room].prev) {
            const old = p.room; p.room = MAPS[old].prev; p.x = 1450;
            const s = io.sockets.sockets.get(id); if(s){ s.leave(old); s.join(p.room); }
        }
    }
    enemies.forEach(e => {
        let targets = Object.values(players).filter(p => p.room === e.room && !p.dead);
        if (targets.length > 0) {
            let t = targets[0]; e.x += (t.x > e.x ? e.speed : -e.speed);
            if (Math.abs(t.x - e.x) < 30) t.hp -= 0.8;
        }
    });
    enemies = enemies.filter(e => e.hp > 0);
    if (enemies.length < 5) enemies.push({id: Math.random(), x: 1300, y: 420, hp: 100, maxHp: 100, speed: 2, room: 'floresta'});
    
    Object.keys(MAPS).forEach(r => {
        io.to(r).emit('world', { 
            players: Object.fromEntries(Object.entries(players).filter(([id, p]) => p.room === r)), 
            enemies: enemies.filter(e => e.room === r), worldTime 
        });
    });
}, 33);

loadDB().then(() => server.listen(3000));
