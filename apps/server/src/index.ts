import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ANIMALS, type AnimalId } from './model.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: ['http://localhost:5173'] });
const io = new Server(app.server, { cors: { origin: 'http://localhost:5173' } });

interface Follower { id: string; username: string; animalId: AnimalId; animalName: string; emoji: string; source: 'follow' | 'gift'; createdAt: string }
interface State { followers: Follower[]; counts: Record<string, number>; totalFollowers: number; totalGifts: number }
const state: State = { followers: [], counts: Object.fromEntries(ANIMALS.map(a => [a.id, 0])), totalFollowers: 0, totalGifts: 0 };
const processedEventIds = new Set<string>();

function snapshot() {
  const top10 = ANIMALS.map(a => ({ ...a, count: state.counts[a.id] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);
  return { followers: state.followers.slice(0, 12), top10, totalFollowers: state.totalFollowers, totalGifts: state.totalGifts, totalAnimals: Object.values(state.counts).reduce((sum, n) => sum + n, 0) };
}
function emitState(event: { kind: string; message: string; follower?: Follower }) {
  io.emit('kingdom:state', snapshot());
  io.emit('kingdom:event', event);
}
function getAnimal(id?: string) {
  if (id) {
    const chosen = ANIMALS.find(a => a.id === id);
    if (chosen) return chosen;
  }
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]!;
}
function addFollower(username: string, source: 'follow' | 'gift', animalId?: string, eventId = randomUUID()) {
  if (processedEventIds.has(eventId)) return { duplicate: true as const, state: snapshot() };
  processedEventIds.add(eventId);
  // Keep the demo process bounded. A persistent store will replace this in the next milestone.
  if (processedEventIds.size > 5000) processedEventIds.clear();
  const animal = getAnimal(animalId);
  const follower: Follower = { id: randomUUID(), username: username.replace(/^@/, '').slice(0, 32), animalId: animal.id, animalName: animal.name, emoji: animal.emoji, source, createdAt: new Date().toISOString() };
  state.counts[animal.id] = (state.counts[animal.id] ?? 0) + 1;
  if (source === 'follow') state.totalFollowers += 1; else state.totalGifts += 1;
  state.followers.unshift(follower);
  state.followers = state.followers.slice(0, 100);
  emitState({ kind: source, message: source === 'follow' ? `@${follower.username} se unió al reino` : `@${follower.username} eligió ${animal.name}`, follower });
  return { duplicate: false as const, follower, state: snapshot() };
}

app.get('/health', async () => ({ ok: true, service: 'animal-kingdom-server', mode: 'demo', timestamp: new Date().toISOString() }));
app.get('/api/state', async () => snapshot());
app.get('/api/animals', async () => ANIMALS);

const followSchema = z.object({ username: z.string().min(1).max(64).default('nuevo_seguidor'), eventId: z.string().max(128).optional() });
app.post('/demo/follow', async (request, reply) => {
  const parsed = followSchema.safeParse(request.body ?? {});
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
  return addFollower(parsed.data.username, 'follow', undefined, parsed.data.eventId);
});
const giftSchema = z.object({ username: z.string().min(1).max(64).default('fan_del_reino'), giftName: z.string().max(64).default('Rose'), animalId: z.string().optional(), eventId: z.string().max(128).optional() });
app.post('/demo/gift', async (request, reply) => {
  const parsed = giftSchema.safeParse(request.body ?? {});
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
  if (parsed.data.animalId && !ANIMALS.some(a => a.id === parsed.data.animalId)) return reply.code(400).send({ error: 'animalId no existe en el catálogo' });
  return addFollower(parsed.data.username, 'gift', parsed.data.animalId, parsed.data.eventId);
});

io.on('connection', socket => {
  socket.emit('kingdom:state', snapshot());
  socket.emit('kingdom:event', { kind: 'system', message: 'Conectado al reino de animales' });
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
