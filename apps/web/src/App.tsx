import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { Heart, PawPrint, Radio, Sparkles, Trophy, Users, Wifi, WifiOff } from 'lucide-react';

type Follower = { id: string; username: string; animalId: string; animalName: string; emoji: string; source: 'follow' | 'gift'; createdAt: string };
type Animal = { id: string; name: string; emoji: string; rarity: string; count: number };
type Snapshot = { followers: Follower[]; top10: Animal[]; totalFollowers: number; totalGifts: number; totalAnimals: number };
type EventMessage = { kind: string; message: string };
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const SPECIES = [
  { id: 'fox', name: 'Zorro', emoji: '🦊' }, { id: 'panda', name: 'Panda', emoji: '🐼' }, { id: 'lion', name: 'León', emoji: '🦁' },
  { id: 'wolf', name: 'Lobo', emoji: '🐺' }, { id: 'frog', name: 'Rana', emoji: '🐸' }, { id: 'cat', name: 'Gato', emoji: '🐱' },
  { id: 'bear', name: 'Oso', emoji: '🐻' }, { id: 'rabbit', name: 'Conejo', emoji: '🐰' }, { id: 'penguin', name: 'Pingüino', emoji: '🐧' },
  { id: 'tiger', name: 'Tigre', emoji: '🐯' }, { id: 'unicorn', name: 'Unicornio', emoji: '🦄' }, { id: 'dragon', name: 'Dragón', emoji: '🐲' }
];
const empty: Snapshot = { followers: [], top10: [], totalFollowers: 0, totalGifts: 0, totalAnimals: 0 };

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<EventMessage[]>([{ kind: 'system', message: 'Iniciando conexión con el reino…' }]);
  const [username, setUsername] = useState('luna23');
  const [chosenAnimal, setChosenAnimal] = useState('fox');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/state`).then(r => r.json()).then(setSnapshot).catch(() => undefined);
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('kingdom:state', (s: Snapshot) => setSnapshot(s));
    socket.on('kingdom:event', (e: EventMessage) => setEvents(old => [e, ...old].slice(0, 5)));
    return () => { socket.disconnect(); };
  }, []);
  const maxCount = Math.max(1, ...snapshot.top10.map(a => a.count));
  const groups = useMemo(() => SPECIES.map(a => ({ ...a, count: snapshot.top10.find(t => t.id === a.id)?.count ?? 0 })).filter(a => a.count > 0).sort((a,b) => b.count-a.count), [snapshot.top10]);
  async function send(kind: 'follow' | 'gift') {
    setBusy(true);
    try {
      const response = await fetch(`${API}/demo/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim() || (kind === 'follow' ? 'nuevo_seguidor' : 'fan_del_reino'), ...(kind === 'gift' ? { giftName: 'Rose', animalId: chosenAnimal } : {}) }) });
      if (!response.ok) throw new Error('El servidor rechazó el evento');
    } catch (error) { setEvents(old => [{ kind: 'error', message: error instanceof Error ? error.message : 'No se pudo enviar el evento' }, ...old].slice(0,5)); }
    finally { setBusy(false); }
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark"><PawPrint size={25}/></div><div className="brand-copy"><h1>ANIMAL KINGDOM <span>LIVE</span></h1><p>Tu comunidad se convierte en un reino</p></div><div className={`live-pill ${connected ? 'online' : ''}`}><span className="pulse"/>{connected ? 'SISTEMA ONLINE' : 'CONECTANDO'}</div></header>
    <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> CADA FOLLOW CREA UNA HISTORIA</div><h2>Un reino que <em>crece contigo.</em></h2><p>Entra, recibe tu animal y encuentra tu lugar en la manada.</p></div><div className="hero-orbit"><span className="orb orb-one">🦊</span><span className="orb orb-two">🐼</span><span className="orb orb-three">🦁</span><span className="orb orb-four">🐸</span><span className="orb-center">🐾</span></div></section>
    <section className="stats-grid"><Stat icon={<Users size={17}/>} label="SEGUIDORES" value={snapshot.totalFollowers}/><Stat icon={<PawPrint size={17}/>} label="ANIMALES" value={snapshot.totalAnimals}/><Stat icon={<Heart size={17}/>} label="REGALOS" value={snapshot.totalGifts}/></section>
    <section className="content-grid"><div className="panel kingdom-panel"><div className="section-heading"><div><span className="section-kicker">LA COMUNIDAD</span><h3>Habitantes del reino</h3></div><span className="count-tag">{groups.length} especies</span></div><div className="animal-groups">{groups.length ? groups.map((a,i)=><div className={`animal-card animal-card-${i%4}`} key={a.id}><div className="animal-glow"/><span className="animal-emoji">{a.emoji}</span><span className="animal-name">{a.name}</span><strong>×{a.count}</strong></div>) : <div className="empty-kingdom"><div className="empty-paw">🐾</div><strong>Tu reino está esperando</strong><span>Los nuevos seguidores aparecerán aquí.</span></div>}</div><div className="event-feed"><div className="feed-heading"><Radio size={14}/> ACTIVIDAD RECIENTE</div>{events.slice(0,3).map((e,i)=><div className="event-line" key={`${e.message}-${i}`}><span className={`event-dot ${e.kind}`}/><span>{e.message}</span></div>)}</div></div>
    <aside className="panel leaderboard-panel"><div className="section-heading"><div><span className="section-kicker">LA COMPETENCIA</span><h3><Trophy size={19}/> Top 10 animales</h3></div><span className="live-mini"><span/> LIVE</span></div><div className="leader-list">{snapshot.top10.map((a,i)=><div className="leader-row" key={a.id}><span className={`rank rank-${i+1}`}>{String(i+1).padStart(2,'0')}</span><span className="leader-emoji">{a.emoji}</span><div className="leader-main"><div className="leader-label"><span>{a.name}</span><b>{a.count}</b></div><div className="progress-track"><div className="progress-value" style={{width:`${a.count/maxCount*100}%`}}/></div></div></div>)}{snapshot.top10.length===0 && <div className="leader-empty">El ranking se llenará con cada nuevo animal.</div>}</div><div className="leader-footer"><Sparkles size={14}/> Cada animal cuenta para su especie</div></aside></section>
    <section className="panel recent-panel"><div className="section-heading"><div><span className="section-kicker">NUEVAS INCORPORACIONES</span><h3>Últimos habitantes</h3></div><span className="count-tag">EN VIVO <span className="tiny-dot"/></span></div><div className="recent-list">{snapshot.followers.slice(0,8).map(f=><div className="recent-item" key={f.id}><span className="recent-animal">{f.emoji}</span><div className="recent-person"><strong>@{f.username}</strong><span>{f.source==='gift'?'Eligió':'Recibió'} un {f.animalName}</span></div><span className={`source-tag ${f.source}`}>{f.source==='gift'?'ROSA':'FOLLOW'}</span></div>)}{snapshot.followers.length===0 && <div className="recent-empty">Los seguidores que entren al directo aparecerán aquí.</div>}</div></section>
    <section className="panel demo-panel"><div className="demo-title"><div className="demo-icon"><Sparkles size={18}/></div><div><span className="section-kicker">MODO DE PRUEBA</span><h3>Prueba el reino</h3><p>Estos controles simulan eventos. Todavía no conectan con TikTok.</p></div></div><div className="demo-controls"><label>Nombre del espectador<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="ej. luna23" maxLength={32}/></label><label>Animal elegido para la rosa<select value={chosenAnimal} onChange={e=>setChosenAnimal(e.target.value)}>{SPECIES.map(a=><option value={a.id} key={a.id}>{a.emoji} {a.name}</option>)}</select></label><button disabled={busy} className="primary-button" onClick={()=>send('follow')}><Users size={16}/> Simular seguidor</button><button disabled={busy} className="gift-button" onClick={()=>send('gift')}><Heart size={16}/> Simular rosa</button></div></section>
    <footer><div className="footer-brand"><PawPrint size={16}/> ANIMAL KINGDOM LIVE</div><span><Wifi size={13}/> Tiempo real mediante Socket.IO</span><span className="footer-demo"><WifiOff size={13}/> Integración TikTok pendiente</span></footer>
  </main>;
}
function Stat({icon,label,value}:{icon:ReactNode;label:string;value:number}) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value.toLocaleString('es-PE')}</strong></div></div>; }
