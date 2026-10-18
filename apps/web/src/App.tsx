import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { Heart, PawPrint, Radio, Sparkles, Trophy, Users, Wifi, WifiOff } from 'lucide-react';

type Follower = { id: string; username: string; animalId: string; animalName: string; emoji: string; source: 'follow' | 'gift' | 'chat'; createdAt: string };
type Animal = { id: string; name: string; emoji: string; rarity: string; count: number };
type Snapshot = { followers: Follower[]; top10: Animal[]; totalFollowers: number; totalGifts: number; totalAnimals: number; pendingChoices: Array<{id:string;username:string;giftName:string;createdAt:string}> };
type EventMessage = { kind: string; message: string };
type TikTokStatus = { status: 'disconnected'|'connecting'|'connected'|'error'; username?: string; message: string };
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const overlayParams = new URLSearchParams(window.location.search);
const overlayMode = overlayParams.get('overlay') === '1';
const overlayPart = overlayParams.get('part') === 'guide' ? 'guide' : overlayParams.get('part') === 'top' ? 'top' : 'all';
const SPECIES = [
  { id: 'fox', name: 'Zorro', emoji: '🦊' }, { id: 'panda', name: 'Panda', emoji: '🐼' }, { id: 'lion', name: 'León', emoji: '🦁' },
  { id: 'wolf', name: 'Lobo', emoji: '🐺' }, { id: 'frog', name: 'Rana', emoji: '🐸' }, { id: 'cat', name: 'Gato', emoji: '🐱' },
  { id: 'bear', name: 'Oso', emoji: '🐻' }, { id: 'rabbit', name: 'Conejo', emoji: '🐰' }, { id: 'penguin', name: 'Pingüino', emoji: '🐧' },
  { id: 'tiger', name: 'Tigre', emoji: '🐯' }, { id: 'unicorn', name: 'Unicornio', emoji: '🦄' }, { id: 'dragon', name: 'Dragón', emoji: '🐲' },
  { id: 'elephant', name: 'Elefante', emoji: '🐘' }, { id: 'monkey', name: 'Mono', emoji: '🐵' }, { id: 'koala', name: 'Koala', emoji: '🐨' },
  { id: 'pug', name: 'Perro', emoji: '🐶' }, { id: 'hamster', name: 'Hámster', emoji: '🐹' }, { id: 'chick', name: 'Pollito', emoji: '🐤' },
  { id: 'octopus', name: 'Pulpo', emoji: '🐙' }, { id: 'whale', name: 'Ballena', emoji: '🐳' }
];
const empty: Snapshot = { followers: [], top10: [], totalFollowers: 0, totalGifts: 0, totalAnimals: 0, pendingChoices: [] };

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<EventMessage[]>([{ kind: 'system', message: 'Iniciando conexión con el reino…' }]);
  const [username, setUsername] = useState('luna23');
  const [chatCommand, setChatCommand] = useState('panda');
  const [busy, setBusy] = useState(false);
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokStatus, setTiktokStatus] = useState<TikTokStatus>({ status: 'disconnected', message: 'TikTok no conectado' });
  const [tiktokBusy, setTiktokBusy] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/state`).then(r => r.json()).then(setSnapshot).catch(() => undefined);
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('kingdom:state', (s: Snapshot) => setSnapshot(s));
    socket.on('kingdom:event', (e: EventMessage) => setEvents(old => [e, ...old].slice(0, 5)));
    socket.on('tiktok:status', (status: TikTokStatus) => setTiktokStatus(status));
    fetch(`${API}/api/tiktok/status`).then(r => r.json()).then(setTiktokStatus).catch(() => undefined);
    return () => { socket.disconnect(); };
  }, []);
  const maxCount = Math.max(1, ...snapshot.top10.map(a => a.count));
  const groups = useMemo(() => SPECIES.map(a => ({ ...a, count: snapshot.top10.find(t => t.id === a.id)?.count ?? 0 })).filter(a => a.count > 0).sort((a,b) => b.count-a.count), [snapshot.top10]);
  const overlayActivity = useMemo(() => snapshot.followers
    .map(f => ({
      key: `award-${f.id}`,
      username: f.username,
      animalName: f.animalName,
      emoji: f.emoji,
      kind: f.source,
      createdAt: f.createdAt
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 8), [snapshot.followers]);
  async function connectTikTok() {
    setTiktokBusy(true);
    try {
      const response = await fetch(`${API}/api/tiktok/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: tiktokUsername.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'No se pudo conectar con TikTok');
      setTiktokStatus(result.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar con TikTok';
      setTiktokStatus({ status: 'error', message });
      setEvents(old => [{ kind: 'error', message: `TikTok: ${message}` }, ...old].slice(0, 5));
    } finally { setTiktokBusy(false); }
  }
  async function disconnectTikTok() {
    setTiktokBusy(true);
    try {
      const response = await fetch(`${API}/api/tiktok/disconnect`, { method: 'POST' });
      const result = await response.json();
      setTiktokStatus(result.status);
    } catch { setTiktokStatus({ status: 'error', message: 'No se pudo detener la conexión' }); }
    finally { setTiktokBusy(false); }
  }
  async function sendCommand() {
    setBusy(true);
    try {
      const response = await fetch(`${API}/demo/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim() || 'fan_del_reino', message: chatCommand }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'No se pudo procesar el comentario');
      setEvents(old => [{kind:'system',message:result.reply ?? (result.ignored ? `Comentario ignorado: ${chatCommand}` : `Comentario aceptado: ${chatCommand}`)}, ...old].slice(0,5));
    } catch (error) {
      setEvents(old => [{kind:'error',message:error instanceof Error ? error.message : 'No se pudo procesar el comentario'}, ...old].slice(0,5));
    } finally { setBusy(false); }
  }
  if (overlayMode) return <main className={`kingdom-overlay overlay-part-${overlayPart}`}>
    <header className="overlay-header">
      <div className="overlay-brand"><span className="overlay-brand-icon">🐾</span><div><strong>ANIMAL KINGDOM <em>LIVE</em></strong><small>¡Un reino que crece contigo!</small></div></div>
      <span className={`overlay-status ${connected ? 'online' : ''}`}><i />{connected ? 'EN VIVO' : 'CONECTANDO'}</span>
    </header>
    {(overlayPart === 'all' || overlayPart === 'guide') && <section className="overlay-panel overlay-guide overlay-guide-source">
      <div className="overlay-section-title"><span>🌿 ¿CÓMO PARTICIPAR?</span><small>¡Solo necesitas escribir en el chat!</small></div>
      <div className="overlay-instructions">
        <div className="overlay-instruction"><b>1</b><span><strong>ELIGE TU FAVORITO</strong><small>Busca uno de los 20 animales disponibles.</small></span></div>
        <div className="overlay-instruction"><b>2</b><span><strong>ESCRIBE SU NOMBRE</strong><small>Comenta solo el nombre: panda, león, tigre…</small></span></div>
        <div className="overlay-instruction"><b>3</b><span><strong>¡VOTA Y CAMBIA EL TOP 3!</strong><small>Cada comentario válido suma un voto y aparece en actividad.</small></span></div>
      </div>
    </section>}
    {(overlayPart === 'all' || overlayPart === 'top') && <section className="overlay-panel overlay-ranking overlay-ranking-featured">
      <div className="overlay-section-title"><span>🏆 TOP 3 DEL REINO</span><small>Los animales más elegidos por la comunidad</small></div>
      {snapshot.top10.length ? <div className="overlay-top-list">{snapshot.top10.slice(0, 3).map((a, i) => <div className={`overlay-top-row featured-rank featured-rank-${i + 1}`} key={a.id}>
        <span className={`overlay-rank overlay-rank-${i + 1}`}>{i + 1}</span><span className="overlay-animal-emoji">{a.emoji}</span><span className="overlay-animal-name">{a.name}</span><strong>{a.count}</strong>
      </div>)}</div> : <p className="overlay-empty">¡El Top 3 se llenará con las primeras elecciones!</p>}
    </section>}
    {(overlayPart === 'all' || overlayPart === 'top') && <section className="overlay-panel overlay-activity">
      <div className="overlay-section-title"><span>✨ ACTIVIDAD RECIENTE</span><small>¡Cada comentario válido aparece aquí en tiempo real!</small></div>
      {overlayActivity.length ? <div className="overlay-activity-list">{overlayActivity.slice(0, 4).map(item => <div className="overlay-activity-row" key={item.key}>
        <span className={`overlay-activity-icon ${item.kind === 'chat' ? 'chat' : item.kind === 'gift' ? 'gift' : ''}`}>{item.kind === 'chat' ? item.emoji : '🐾'}</span>
        <div className="overlay-activity-copy"><strong>@{item.username}</strong><small>{item.kind === 'chat' ? `Votó por ${item.emoji} ${item.animalName}` : `Eligió ${item.emoji} ${item.animalName}`}</small></div>
      </div>)}</div> : <p className="overlay-empty">¡Sé el primero en votar! Escribe el nombre de tu animal favorito.</p>}
    </section>}
    {(overlayPart === 'all' || overlayPart === 'guide') && <section className="overlay-panel overlay-catalog-panel">
      <div className="overlay-catalog-title">🐾 ANIMALES DISPONIBLES <small>Comenta el nombre de tu favorito para darle un voto</small></div>
      <div className="overlay-catalog">{SPECIES.map(a => <span className="overlay-catalog-item" key={a.id}><i>{a.emoji}</i><b>{a.name}</b></span>)}</div>
      <footer className="overlay-footer">💬 UN COMENTARIO = UN VOTO · ¡HAZ SUBIR A TU FAVORITO!</footer>
    </section>}
  </main>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark"><PawPrint size={25}/></div><div className="brand-copy"><h1>ANIMAL KINGDOM <span>LIVE</span></h1><p>Tu comunidad se convierte en un reino</p></div><div className={`live-pill ${connected ? 'online' : ''}`}><span className="pulse"/>{connected ? 'SISTEMA ONLINE' : 'CONECTANDO'}</div></header>
    <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> CADA COMENTARIO CUENTA</div><h2>Un reino que <em>crece contigo.</em></h2><p>Comenta tu animal favorito y ayuda a cambiar el Top 3.</p></div><div className="hero-orbit"><span className="orb orb-one">🦊</span><span className="orb orb-two">🐼</span><span className="orb orb-three">🦁</span><span className="orb orb-four">🐸</span><span className="orb-center">🐾</span></div></section>
    <section className="how-to-play" aria-label="Cómo participar">
      <div className="how-to-title"><span className="how-to-rose">💬</span><div><strong>¿Quieres votar por tu animal?</strong><span>Un comentario válido = un voto</span></div></div>
      <div className="how-to-step"><b>1</b><span>Elige tu favorito</span></div>
      <div className="how-to-arrow">→</div>
      <div className="how-to-step"><b>2</b><span>Escribe su nombre, por ejemplo <code>panda</code></span></div>
      <div className="how-to-note">No necesitas tildes: leon también funciona. ¡Cada comentario válido suma al ranking!</div>
    </section>
    <section className="stats-grid"><Stat icon={<Users size={17}/>} label="VOTOS" value={snapshot.totalAnimals}/><Stat icon={<PawPrint size={17}/>} label="ESPECIES VOTADAS" value={groups.length}/><Stat icon={<Heart size={17}/>} label="COMENTARIOS VÁLIDOS" value={snapshot.totalAnimals}/></section>
    <section className="content-grid"><div className="panel kingdom-panel"><div className="section-heading"><div><span className="section-kicker">LA COMUNIDAD</span><h3>Habitantes del reino</h3></div><span className="count-tag">{groups.length} especies</span></div><div className="animal-groups">{groups.length ? groups.map((a,i)=><div className={`animal-card animal-card-${i%4}`} key={a.id}><div className="animal-glow"/><span className="animal-emoji">{a.emoji}</span><span className="animal-name">{a.name}</span><strong>×{a.count}</strong></div>) : <div className="empty-kingdom"><div className="empty-paw">🐾</div><strong>Tu reino está esperando</strong><span>Los nuevos seguidores aparecerán aquí.</span></div>}</div><div className="event-feed"><div className="feed-heading"><Radio size={14}/> ACTIVIDAD RECIENTE</div>{events.slice(0,3).map((e,i)=><div className="event-line" key={`${e.message}-${i}`}><span className={`event-dot ${e.kind}`}/><span>{e.message}</span></div>)}</div></div>
    <aside className="panel leaderboard-panel"><div className="section-heading"><div><span className="section-kicker">LA COMPETENCIA</span><h3><Trophy size={19}/> Top 10 animales</h3></div><span className="live-mini"><span/> LIVE</span></div><div className="leader-list">{snapshot.top10.map((a,i)=><div className="leader-row" key={a.id}><span className={`rank rank-${i+1}`}>{String(i+1).padStart(2,'0')}</span><span className="leader-emoji">{a.emoji}</span><div className="leader-main"><div className="leader-label"><span>{a.name}</span><b>{a.count}</b></div><div className="progress-track"><div className="progress-value" style={{width:`${a.count/maxCount*100}%`}}/></div></div></div>)}{snapshot.top10.length===0 && <div className="leader-empty">El ranking se llenará con cada nuevo animal.</div>}</div><div className="leader-footer"><Sparkles size={14}/> Cada animal cuenta para su especie</div></aside></section>
    <section className="panel recent-panel"><div className="section-heading"><div><span className="section-kicker">EL CHAT MUEVE EL REINO</span><h3>Últimos votos</h3></div><span className="count-tag">EN VIVO <span className="tiny-dot"/></span></div><div className="recent-list">{snapshot.followers.slice(0,8).map(f=><div className="recent-item" key={f.id}><span className="recent-animal">{f.emoji}</span><div className="recent-person"><strong>@{f.username}</strong><span>{f.source==='chat'?'Votó por':'Eligió'} {f.emoji} {f.animalName}</span></div><span className={`source-tag ${f.source}`}>{f.source==='chat'?'VOTO':f.source==='gift'?'ROSA':'FOLLOW'}</span></div>)}{snapshot.followers.length===0 && <div className="recent-empty">Los comentarios con nombres de animales aparecerán aquí.</div>}</div></section>
    {!overlayMode && <section className="panel demo-panel"><div className="demo-title"><div className="demo-icon"><Radio size={18}/></div><div><span className="section-kicker">CONEXIÓN REAL</span><h3>Conectar TikTok LIVE</h3><p>Escribe el usuario que está transmitiendo (sin @). Conecta cuando el LIVE ya esté iniciado.</p></div></div><div className="demo-controls"><label>Usuario de TikTok<input value={tiktokUsername} onChange={e=>setTiktokUsername(e.target.value)} placeholder="ej. tu_usuario" maxLength={64}/></label><div className="event-line"><span className={`event-dot ${tiktokStatus.status === 'connected' ? 'success' : tiktokStatus.status === 'error' ? 'error' : 'system'}`}/><span><strong>{tiktokStatus.status.toUpperCase()}</strong> — {tiktokStatus.message}</span></div><button disabled={tiktokBusy || !tiktokUsername.trim() || tiktokStatus.status === 'connected'} className="primary-button" onClick={connectTikTok}><Wifi size={16}/> {tiktokBusy ? 'Conectando…' : 'Conectar con TikTok'}</button><button disabled={tiktokBusy || tiktokStatus.status === 'disconnected'} className="gift-button" onClick={disconnectTikTok}><WifiOff size={16}/> Desconectar</button><p>Conector comunitario no oficial. Esta versión recibe eventos; no publica respuestas automáticas en el chat.</p></div></section>}
    {!overlayMode && <section className="panel demo-panel"><div className="demo-title"><div className="demo-icon"><Sparkles size={18}/></div><div><span className="section-kicker">MODO DE PRUEBA</span><h3>Prueba el reino</h3><p>Simula comentarios de animales. Cada comentario válido suma un voto al ranking y aparece en actividad.</p></div></div><div className="demo-controls"><label>Nombre del espectador<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="ej. luna23" maxLength={32}/></label><label>Animal que quieres elegir<input value={chatCommand} onChange={e=>setChatCommand(e.target.value)} placeholder="panda, leon, tigre..."/></label><button disabled={busy} className="primary-button" onClick={sendCommand}><PawPrint size={16}/> Enviar comentario</button></div></section>}
    {!overlayMode && <section className="panel recent-panel"><div className="section-heading"><div><span className="section-kicker">DINÁMICA ACTUAL</span><h3>Vota por tu animal favorito</h3></div><span className="count-tag">Solo comentarios</span></div><div className="recent-list"><div className="recent-empty">No necesitas seguir ni enviar regalos. Escribe el nombre de un animal en el chat para sumar un voto.</div></div></section>}
    {!overlayMode && <footer><div className="footer-brand"><PawPrint size={16}/> ANIMAL KINGDOM LIVE</div><span><Wifi size={13}/> Tiempo real mediante Socket.IO</span><span className="footer-demo">{tiktokStatus.status === 'connected' ? <Wifi size={13}/> : <WifiOff size={13}/>} TikTok: {tiktokStatus.status}</span></footer>}
  </main>;
}
function Stat({icon,label,value}:{icon:ReactNode;label:string;value:number}) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value.toLocaleString('es-PE')}</strong></div></div>; }
