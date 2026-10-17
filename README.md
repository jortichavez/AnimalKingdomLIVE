# Animal Kingdom LIVE — MVP v0.9

Versión de desarrollo con SQLite, panel web, overlay para OBS y conexión experimental a TikTok LIVE. La integración usa una biblioteca comunitaria no oficial; puede dejar de funcionar si TikTok cambia sus servicios internos.

## Requisitos
- Node.js 22 o superior.
- npm 10 o superior.
- El paquete local `ttl-live` debe estar disponible en `../tiktok-signer/packages/tiktok-live` (la carpeta `tiktok-signer` debe estar al mismo nivel que `AnimalKingdomLIVE`, según la configuración actual).

## Instalar y ejecutar
En la carpeta raíz del proyecto:

```bash
npm install
npm run typecheck
npm run dev
```

- Panel web: http://localhost:5173
- API: http://localhost:3001/health
- Estado: http://localhost:3001/api/state
- Overlay para OBS: http://localhost:5173/?overlay=1

## Cómo funciona
- Un usuario recibe un animal aleatorio la primera vez que sigue la cuenta durante la campaña.
- Cada rosa válida crea un crédito de elección pendiente para ese usuario.
- Por cada rosa puede elegir un animal escribiendo únicamente el nombre en el chat, por ejemplo `panda`, `león` o `tigre`. No necesita `!animal`.
- Si envía 3 rosas, tendrá 3 elecciones pendientes y podrá canjearlas con 3 comentarios válidos, incluso eligiendo el mismo animal más de una vez.
- Las elecciones no utilizadas permanecen pendientes entre directos y reinicios, porque se guardan en SQLite.
- Los comentarios que no coinciden con un animal del catálogo se ignoran.
- Los animales repetidos están permitidos y el Top 10 se calcula por cantidad total de animales por especie.
- Los eventos con identificador se deduplican para evitar premios duplicados.

## Conectar TikTok LIVE
1. Abre un LIVE real desde la cuenta de TikTok que vas a probar. La aplicación no inicia el LIVE por ti.
2. Ejecuta `npm run dev` en la raíz del proyecto.
3. Entra a http://localhost:5173, escribe el usuario de TikTok sin `@` y pulsa **Conectar con TikTok**.
4. Cuando el estado indique conexión, prueba con una cuenta secundaria: sigue la cuenta, envía una rosa y comenta el nombre de un animal.
5. Comprueba el panel y el overlay. No uses los botones de simulación para validar eventos reales.
6. Al terminar, desconecta TikTok desde el panel.

## Prueba manual desde el panel
1. Pulsa **Simular rosa (crear pendiente)** para el usuario que aparece en el campo.
2. Escribe `panda` en el campo de animal y pulsa **Enviar comentario**.
3. Comprueba que desaparece una elección pendiente y se suma un panda al reino.
4. Simula tres rosas y envía tres comentarios de animales: cada comentario válido consume un solo crédito.

También se pueden probar los endpoints desde PowerShell o una herramienta como Postman:
```bash
curl -X POST http://localhost:3001/demo/gift -H "Content-Type: application/json" -d '{"username":"luna23","giftName":"Rose"}'
curl -X POST http://localhost:3001/demo/chat -H "Content-Type: application/json" -d '{"username":"luna23","message":"panda"}'
```

Para limpiar los datos de demo:
```bash
curl -X POST http://localhost:3001/demo/reset
```
Este endpoint es solo para desarrollo local; no debe exponerse públicamente en producción.

## OBS
Añade una fuente **Navegador** con URL `http://localhost:5173/?overlay=1`. Para un directo vertical, prueba 1080 × 1920; para uno horizontal, 1920 × 1080. El overlay muestra la colección sin controles de prueba.

## Limitaciones
- La integración depende de un paquete comunitario no oficial y no está respaldada por TikTok.
- Solo las rosas se contabilizan; otros regalos se ignoran.
- Los regalos en racha se procesan al recibir la actualización final para evitar duplicados.
- No se envían respuestas automáticas al chat de TikTok.
- Prueba primero con una cuenta secundaria y no compartas contraseñas, cookies ni tokens de sesión.
