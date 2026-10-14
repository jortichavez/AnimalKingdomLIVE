# Animal Kingdom LIVE — MVP 0.1

Aplicación local para un overlay de TikTok LIVE: lista de seguidores, colección de animales y Top 10 por especie. Esta primera entrega incluye **modo demo** para validar la experiencia visual sin conectar todavía una cuenta real.

## Requisitos
- Node.js 20 o superior
- npm 10 o superior

## Arranque
Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/health
- Overlay para OBS: agrega una fuente **Navegador** con URL `http://localhost:5173` y resolución 1080 × 1920 para vertical.

## Modo demo
Pulsa **Simular seguidor** o **Simular rosa** en el panel de control. También puedes enviar eventos desde otra terminal:

```bash
curl -X POST http://localhost:3001/demo/follow \
  -H "Content-Type: application/json" \
  -d '{"username":"luna23"}'

curl -X POST http://localhost:3001/demo/gift \
  -H "Content-Type: application/json" \
  -d '{"username":"luna23","giftName":"Rose","animalId":"fox"}'
```

## Qué incluye esta entrega
- Backend Fastify + Socket.IO con eventos en tiempo real.
- Catálogo de especies y asignación aleatoria al seguir.
- Lista de seguidores recientes y ranking Top 10 por cantidad de animales.
- Rosa de demo que permite seleccionar una especie.
- Deduplicación básica por ID de evento en memoria.
- Interfaz vertical y adaptable para OBS.

## Qué no incluye todavía
- La conexión real a TikTok LIVE.
- Persistencia en SQLite (por ahora el estado se reinicia al reiniciar el backend).
- Modelos 3D finales; la interfaz usa avatares emoji provisionales para probar el flujo.

## Siguiente hito
Validar el flujo de juego, luego agregar persistencia y un adaptador de eventos de TikTok desacoplado. Las bibliotecas no oficiales pueden romperse si TikTok cambia su protocolo; antes de usarlo en directo hay que comprobar compatibilidad, condiciones de uso y funcionamiento con la cuenta objetivo.
