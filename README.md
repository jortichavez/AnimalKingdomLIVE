# Animal Kingdom LIVE — MVP 0.2

Versión de desarrollo con persistencia SQLite y reglas de juego implementadas en modo demo. Todavía no conecta con TikTok LIVE.

## Requisitos
- Node.js 20 o superior (recomendado Node.js 22 LTS para compatibilidad de paquetes)
- npm 10 o superior

## Instalar y ejecutar
En la carpeta raíz:

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/health
- Estado: http://localhost:3001/api/state

## Reglas incluidas
- Un animal aleatorio por usuario la primera vez que sigue durante la campaña.
- Cada rosa crea una elección pendiente que persiste hasta que el usuario la reclame.
- El comando `!animal panda` consume una sola elección pendiente y añade un panda a la colección.
- Se permiten animales repetidos.
- Top 10 ordenado por el total de animales por especie.
- Eventos de demo con ID para evitar procesarlos dos veces.
- Persistencia SQLite en `apps/server/data/animal-kingdom.sqlite` (la carpeta se crea automáticamente).

## Probar manualmente
1. En la web escribe `luna23` como usuario y pulsa **Simular seguidor**.
2. Pulsa **Simular rosa (crear pendiente)**.
3. Deja el comando `!animal panda` y pulsa **Enviar comando de chat**.
4. Verifica que la elección pendiente desaparece y el panda se suma al reino.
5. Reinicia `npm run dev`: los datos deben seguir ahí.

También se pueden probar endpoints:
```bash
curl -X POST http://localhost:3001/demo/follow -H "Content-Type: application/json" -d '{"username":"luna23"}'
curl -X POST http://localhost:3001/demo/gift -H "Content-Type: application/json" -d '{"username":"luna23","giftName":"Rose"}'
curl -X POST http://localhost:3001/demo/chat -H "Content-Type: application/json" -d '{"username":"luna23","message":"!animal panda"}'
```

Para limpiar los datos de demo:
```bash
curl -X POST http://localhost:3001/demo/reset
```
Este endpoint es solo para desarrollo local; no debe exponerse públicamente en producción.

## OBS
Añade una fuente **Navegador** con URL `http://localhost:5173/?overlay=1` para mostrar la vista pública sin controles de prueba ni la lista de elecciones pendientes. Para un directo vertical, prueba 1080 × 1920; para un directo horizontal, 1920 × 1080. En esta versión la vista pública usa un fondo oscuro opaco: colócala en una zona reservada de tu composición de OBS o ajusta el tamaño/recorte para que no tape el contenido principal. La página de control completa sigue disponible en `http://localhost:5173`.

## Limitaciones conocidas
- La identidad demo usa el nombre normalizado; la integración real deberá usar el ID estable de TikTok.
- La recepción real de follows, regalos y chat no está implementada.
- Los eventos solo pueden deduplicarse de forma fiable cuando el adaptador dispone de un ID de evento estable.
- Los emojis son provisionales; modelos 3D se añadirán después.
