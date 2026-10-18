# Animal Kingdom LIVE — v1.6.0

Aplicación de colección de animales para TikTok LIVE, con backend Node.js + TypeScript, frontend React + Vite, eventos en tiempo real mediante Socket.IO y persistencia SQLite.

## Cambios de la versión 1.6.0

- Overlay vertical centrado, con desplazamiento vertical normal del navegador; ya no intenta comprimir todo en la altura visible ni oculta el contenido inferior.
- Orden visual: título animado **ANIMAL KINGDOM LIVE**, instrucciones, Top 3, actividad reciente destacada y catálogo de 20 animales.
- La actividad reciente muestra los votos del chat en tiempo real y destaca el nombre del usuario y el animal elegido.
- Animaciones sutiles en el encabezado y los animales, conservando el estilo de jungla mágica verde y dorado.
- Nueva dinámica gratuita: cualquier espectador puede votar comentando el nombre de un animal; cada comentario válido cuenta como un voto.
- README actualizado y carpeta `.idea/` excluida del ZIP.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- El paquete local `ttl-live` debe estar disponible en `../tiktok-signer/packages/tiktok-live` (la carpeta `tiktok-signer` debe estar al mismo nivel que `AnimalKingdomLIVE`, según la configuración actual).

## Instalar y ejecutar

Desde la raíz del proyecto:

```bash
npm install
npm run typecheck
npm run dev
```

- Panel web: <http://localhost:5173>
- API: <http://localhost:3001/health>
- Estado: <http://localhost:3001/api/state>
- Overlay completo: <http://localhost:5173/?overlay=1>

**Importante:** ejecuta `npm run dev` una sola vez. Si el puerto 3001 ya está ocupado, detén el servidor anterior antes de volver a iniciarlo.

## Diseño del overlay v1.5

La URL recomendada para TikTok LIVE Studio es:

```text
http://localhost:5173/?overlay=1
```

El overlay se muestra centrado, mantiene una anchura máxima adecuada para formato vertical y permite desplazarse hacia abajo dentro del navegador. No se fuerza todo el contenido dentro de una sola pantalla: así se puede leer cada sección sin que se corte.

Orden de las secciones:

1. **Título:** Animal Kingdom LIVE con animación sutil.
2. **Cómo participar:** elegir un animal del catálogo y escribir su nombre directamente en el chat; cada comentario válido suma un voto.
3. **Top 3 del reino:** las tres especies con mayor cantidad de animales obtenidos.
4. **Actividad reciente:** votos recientes con el nombre del usuario y el animal elegido, en un panel más grande y llamativo.
5. **Animales disponibles:** catálogo de 20 especies.

### Capturarlo en TikTok LIVE Studio

1. Inicia el proyecto con `npm run dev`.
2. Abre la URL del overlay en una ventana independiente del navegador.
3. Maximiza la ventana y comprueba que puedes desplazarte hacia abajo para revisar las secciones inferiores.
4. En TikTok LIVE Studio, añade una fuente de captura de ventana y selecciona esa ventana del navegador.
5. Ajusta el encuadre para la transmisión vertical. Si capturas una ventana del navegador, recuerda que la barra de título y la barra de direcciones pueden ocupar parte de la imagen; puedes usar pantalla completa del navegador si te resulta más cómodo.

La página del overlay permite desplazamiento vertical; no hace falta modificar el zoom para intentar encajar todas las secciones en una sola pantalla.

## Mecánica del juego

- Cada comentario que coincide con el nombre de un animal del catálogo cuenta como un voto para esa especie.
- No es necesario seguir la cuenta ni enviar regalos para participar.
- No se requieren comandos: basta escribir `panda`, `león`, `tigre`, etc. Se aceptan nombres sin tilde, como `leon`.
- Cada comentario válido suma un voto, incluso si la misma persona vuelve a votar por el mismo animal. Los comentarios repetidos cuentan si son mensajes/eventos distintos.
- Los comentarios que no coinciden con un animal del catálogo se ignoran.
- El Top 3 se calcula por cantidad de votos y la actividad reciente se actualiza en tiempo real.
- Los eventos con identificador se deduplican para evitar contar dos veces el mismo comentario.

## Conectar TikTok LIVE

1. Inicia un LIVE real desde la cuenta de TikTok que vas a probar. La aplicación no inicia el LIVE por ti.
2. Ejecuta `npm run dev` en la raíz del proyecto.
3. Entra a <http://localhost:5173>, escribe el usuario de TikTok sin `@` y pulsa **Conectar con TikTok**.
4. Cuando el estado indique conexión, prueba desde otra cuenta comentando únicamente `panda`, `leon`, `tigre` u otro animal del catálogo.
5. Comprueba el panel y el overlay. No uses los botones de simulación para validar eventos reales.
6. Al terminar, desconecta TikTok desde el panel.

La conexión usa una biblioteca comunitaria no oficial; puede dejar de funcionar si TikTok cambia sus servicios internos.

## Prueba manual desde el panel

1. Escribe un nombre de espectador y un animal como `panda`.
2. Pulsa **Enviar comentario**.
3. Comprueba que se suma un voto al panda, aparece el comentario en actividad y cambia el ranking.
4. Repite con `leon`, `tigre` u otra especie para comprobar cómo cambia el Top 3.

También se pueden probar los endpoints desde PowerShell o una herramienta como Postman:

```bash
curl -X POST http://localhost:3001/demo/chat -H "Content-Type: application/json" -d '{"username":"luna23","message":"panda"}'
```

Para limpiar los datos de demo:

```bash
curl -X POST http://localhost:3001/demo/reset
```

Este endpoint es solo para desarrollo local; no debe exponerse públicamente en producción.

## Catálogo de animales

Zorro, Panda, León, Lobo, Rana, Gato, Oso, Conejo, Pingüino, Tigre, Unicornio, Dragón, Elefante, Mono, Koala, Perro, Hámster, Pollito, Pulpo y Ballena.

## Limitaciones y seguridad

- La integración depende de un paquete comunitario no oficial y no está respaldada por TikTok.
- Los eventos de follow y regalo no afectan al ranking en esta versión; solo se procesan comentarios válidos con nombres de animales.
- No se envían respuestas automáticas al chat de TikTok.
- Prueba primero con una cuenta secundaria y no compartas contraseñas, cookies ni tokens de sesión.

## Contenido del ZIP

El paquete no incluye `.idea/`, archivos de entorno, bases de datos locales ni carpetas `node_modules` o `dist`. La carpeta `.idea/` es configuración del IDE y se puede regenerar desde el editor.
