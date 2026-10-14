import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { ANIMALS, type AnimalId } from './model.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
const io = new Server(app.server, { cors: { origin: true } });

const dbPath = resolve(process.env.DB_PATH ?? './data/animal-kingdom.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, platform_user_id TEXT UNIQUE, username TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS follow_rewards (
    campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    user_id TEXT NOT NULL REFERENCES users(id), award_id TEXT NOT NULL,
    created_at TEXT NOT NULL, PRIMARY KEY(campaign_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS animal_awards (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    user_id TEXT NOT NULL REFERENCES users(id), animal_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('follow','gift')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pending_choices (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    user_id TEXT NOT NULL REFERENCES users(id), gift_event_id TEXT NOT NULL UNIQUE,
    gift_name TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, created_at TEXT NOT NULL
  );
`);
const now = () => new Date().toISOString();
const campaignId = 'default-campaign';
db.prepare(`INSERT OR IGNORE INTO campaigns(id,name,active,created_at) VALUES(?,?,1,?)`)
  .run(campaignId, 'Campaña principal', now());

type AwardRow = { id: string; username: string; animalId: string; animalName: string; emoji: string; source: 'follow'|'gift'; createdAt: string };
function getOrCreateUser(platformUserId: string, username: string) {
  const cleanName = username.replace(/^@/, '').trim().slice(0, 32) || 'espectador';
  const existing = db.prepare('SELECT * FROM users WHERE platform_user_id = ?').get(platformUserId) as {id:string; username:string}|undefined;
  if (existing) {
    db.prepare('UPDATE users SET username=? WHERE id=?').run(cleanName, existing.id);
    return { id: existing.id, username: cleanName };
  }
  const user = { id: randomUUID(), username: cleanName };
  db.prepare('INSERT INTO users(id,platform_user_id,username,created_at) VALUES(?,?,?,?)')
    .run(user.id, platformUserId, cleanName, now());
  return user;
}
function awardAnimal(userId: string, animalId: AnimalId, source: 'follow'|'gift') {
  const id = randomUUID();
  db.prepare('INSERT INTO animal_awards(id,campaign_id,user_id,animal_id,source,created_at) VALUES(?,?,?,?,?,?)')
    .run(id, campaignId, userId, animalId, source, now());
  return id;
}
function randomAnimal() { return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]!; }

function snapshot() {
  const followers = db.prepare(`
    SELECT aa.id, u.username, aa.animal_id AS animalId, aa.source, aa.created_at AS createdAt,
           a.name AS animalName, a.emoji
    FROM animal_awards aa JOIN users u ON u.id=aa.user_id
    JOIN (SELECT 'fox' id,'Zorro' name,'🦊' emoji UNION ALL SELECT 'panda','Panda','🐼'
      UNION ALL SELECT 'lion','León','🦁' UNION ALL SELECT 'wolf','Lobo','🐺'
      UNION ALL SELECT 'frog','Rana','🐸' UNION ALL SELECT 'cat','Gato','🐱'
      UNION ALL SELECT 'bear','Oso','🐻' UNION ALL SELECT 'rabbit','Conejo','🐰'
      UNION ALL SELECT 'penguin','Pingüino','🐧' UNION ALL SELECT 'tiger','Tigre','🐯'
      UNION ALL SELECT 'unicorn','Unicornio','🦄' UNION ALL SELECT 'dragon','Dragón','🐲') a ON a.id=aa.animal_id
    WHERE aa.campaign_id=? ORDER BY aa.created_at DESC LIMIT 100
  `).all(campaignId) as Array<{id:string;username:string;animalId:string;source:'follow'|'gift';createdAt:string;animalName:string;emoji:string}>;
  const countsRows = db.prepare('SELECT animal_id AS id, COUNT(*) AS count FROM animal_awards WHERE campaign_id=? GROUP BY animal_id').all(campaignId) as Array<{id:string;count:number}>;
  const counts = new Map(countsRows.map(r => [r.id, r.count]));
  const top10 = ANIMALS.map(a => ({ ...a, count: counts.get(a.id) ?? 0 }))
    .sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)).slice(0,10);
  const totalFollowers = (db.prepare("SELECT COUNT(*) c FROM animal_awards WHERE campaign_id=? AND source='follow'").get(campaignId) as {c:number}).c;
  const totalGifts = (db.prepare("SELECT COUNT(*) c FROM pending_choices WHERE campaign_id=?").get(campaignId) as {c:number}).c;
  const totalAnimals = (db.prepare('SELECT COUNT(*) c FROM animal_awards WHERE campaign_id=?').get(campaignId) as {c:number}).c;
  const pendingChoices = (db.prepare(`
    SELECT pc.id, u.username, pc.gift_name AS giftName, pc.created_at AS createdAt
    FROM pending_choices pc JOIN users u ON u.id=pc.user_id
    WHERE pc.campaign_id=? AND pc.consumed_at IS NULL ORDER BY pc.created_at ASC LIMIT 50
  `).all(campaignId));
  return { followers: followers.map(f=>({...f, animalId:f.animalId})), top10, totalFollowers, totalGifts, totalAnimals, pendingChoices };
}
function emitState(kind: string, message: string) {
  io.emit('kingdom:state', snapshot());
  io.emit('kingdom:event', { kind, message });
}
function processFollow(platformUserId: string, username: string, eventId: string) {
  const tx = db.transaction(() => {
    if (db.prepare('SELECT 1 FROM processed_events WHERE event_id=?').get(eventId)) return { duplicate: true, rewarded: false };
    db.prepare('INSERT INTO processed_events(event_id,event_type,created_at) VALUES(?,?,?)').run(eventId,'follow',now());
    const user = getOrCreateUser(platformUserId, username);
    if (db.prepare('SELECT 1 FROM follow_rewards WHERE campaign_id=? AND user_id=?').get(campaignId,user.id)) return { duplicate: false, rewarded: false, username: user.username };
    const animal = randomAnimal();
    const awardId = awardAnimal(user.id, animal.id, 'follow');
    db.prepare('INSERT INTO follow_rewards(campaign_id,user_id,award_id,created_at) VALUES(?,?,?,?)').run(campaignId,user.id,awardId,now());
    return { duplicate: false, rewarded: true, username: user.username, animal };
  });
  const result = tx();
  if (result.duplicate) return { ...result, state: snapshot() };
  if ('rewarded' in result && result.rewarded) {
    emitState('follow', `@${result.username} recibió ${result.animal.name} por seguir la cuenta`);
  } else if ('username' in result) {
    emitState('system', `@${result.username} ya recibió su recompensa de seguimiento`);
  }
  return { ...result, state: snapshot() };
}
function processGift(platformUserId: string, username: string, eventId: string, giftName: string) {
  const tx = db.transaction(() => {
    if (db.prepare('SELECT 1 FROM processed_events WHERE event_id=?').get(eventId)) return { duplicate: true };
    db.prepare('INSERT INTO processed_events(event_id,event_type,created_at) VALUES(?,?,?)').run(eventId,'gift',now());
    const user = getOrCreateUser(platformUserId, username);
    db.prepare('INSERT INTO pending_choices(id,campaign_id,user_id,gift_event_id,gift_name,created_at) VALUES(?,?,?,?,?,?)')
      .run(randomUUID(),campaignId,user.id,eventId,giftName,now());
    return { duplicate: false, username: user.username };
  });
  const result = tx();
  if (result.duplicate) return { ...result, state: snapshot() };
  emitState('gift', `@${result.username} envió una rosa: tiene una elección pendiente`);
  return { ...result, state: snapshot() };
}
function processChoice(platformUserId: string, username: string, animalId: string, eventId: string) {
  const animal = ANIMALS.find(a => a.id === animalId || a.name.toLowerCase() === animalId.toLowerCase());
  if (!animal) return { error: 'Animal no válido. Consulta el catálogo /api/animals.' };
  const tx = db.transaction(() => {
    if (db.prepare('SELECT 1 FROM processed_events WHERE event_id=?').get(eventId)) return { duplicate: true };
    db.prepare('INSERT INTO processed_events(event_id,event_type,created_at) VALUES(?,?,?)').run(eventId,'chat-choice',now());
    const user = getOrCreateUser(platformUserId, username);
    const pending = db.prepare('SELECT id FROM pending_choices WHERE campaign_id=? AND user_id=? AND consumed_at IS NULL ORDER BY created_at ASC LIMIT 1')
      .get(campaignId,user.id) as {id:string}|undefined;
    if (!pending) return { duplicate: false, noPending: true, username: user.username };
    db.prepare('UPDATE pending_choices SET consumed_at=? WHERE id=?').run(now(),pending.id);
    awardAnimal(user.id, animal.id as AnimalId, 'gift');
    return { duplicate: false, noPending: false, username: user.username, animal };
  });
  const result = tx();
  if (result.duplicate) return { ...result, state: snapshot() };
  if (result.noPending) return { ...result, state: snapshot() };
  if ('animal' in result) emitState('gift', `@${result.username} eligió ${result.animal.name}`);
  return { ...result, state: snapshot() };
}

app.get('/health', async () => ({ ok:true, service:'animal-kingdom-server', mode:'demo-persistent', database:dbPath, timestamp:now() }));
app.get('/api/state', async () => snapshot());
app.get('/api/animals', async () => ANIMALS);

const followSchema = z.object({ username:z.string().min(1).max(64).default('nuevo_seguidor'), userId:z.string().min(1).max(128).optional(), eventId:z.string().min(1).max(128).optional() });
app.post('/demo/follow', async (request,reply) => {
  const p=followSchema.safeParse(request.body ?? {});
  if(!p.success) return reply.code(400).send({error:p.error.flatten()});
  const username=p.data.username;
  return processFollow(p.data.userId ?? `demo:${username.toLowerCase()}`,username,p.data.eventId ?? randomUUID());
});
const giftSchema = z.object({ username:z.string().min(1).max(64).default('fan_del_reino'), userId:z.string().min(1).max(128).optional(), giftName:z.string().max(64).default('Rose'), eventId:z.string().min(1).max(128).optional() });
app.post('/demo/gift', async (request,reply) => {
  const p=giftSchema.safeParse(request.body ?? {});
  if(!p.success) return reply.code(400).send({error:p.error.flatten()});
  return processGift(p.data.userId ?? `demo:${p.data.username.toLowerCase()}`,p.data.username,p.data.eventId ?? randomUUID(),p.data.giftName);
});
const chatSchema = z.object({ username:z.string().min(1).max(64).default('fan_del_reino'), userId:z.string().min(1).max(128).optional(), message:z.string().min(1).max(200), eventId:z.string().min(1).max(128).optional() });
app.post('/demo/chat', async (request,reply) => {
  const p=chatSchema.safeParse(request.body ?? {});
  if(!p.success) return reply.code(400).send({error:p.error.flatten()});
  const match=p.data.message.trim().match(/^!animal\s+([a-záéíóúñ]+)$/i);
  if(!match) return reply.code(400).send({error:'Usa el formato !animal panda'});
  const userId=p.data.userId ?? `demo:${p.data.username.toLowerCase()}`;
  const result=processChoice(userId,p.data.username,match[1]!,p.data.eventId ?? randomUUID());
  if ('error' in result) return reply.code(400).send(result);
  return result;
});
app.post('/demo/reset', async () => {
  const tx=db.transaction(()=>{
    db.prepare('DELETE FROM processed_events').run();
    db.prepare('DELETE FROM pending_choices').run();
    db.prepare('DELETE FROM follow_rewards').run();
    db.prepare('DELETE FROM animal_awards').run();
    db.prepare('DELETE FROM users').run();
  });
  tx();
  emitState('system','Demo reiniciada; la campaña vuelve a estar vacía');
  return { ok:true, state:snapshot() };
});
io.on('connection', socket => {
  socket.emit('kingdom:state',snapshot());
  socket.emit('kingdom:event',{kind:'system',message:'Conectado al reino de animales'});
});
const port=Number(process.env.PORT ?? 3001);
await app.listen({port,host:'0.0.0.0'});
