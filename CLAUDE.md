# shutdown — Instrucciones del proyecto

## Qué es
Duelo de hacking 1v1 en tiempo real. Ataca la app de tu rival con minijuegos
generados por IA contrarreloj; defiéndete antes de que la tuya se apague
primero. Hackathon de Portal, 39 horas. Prioriza código funcional simple
sobre abstracciones. Este documento es la fuente de verdad del scope — ver
fase-1.md (qué se construye) y fase-2.md (qué está cortado). Si algo pedido
contradice cualquiera de los dos, pregunta antes de implementarlo.

## Reglas de arquitectura (no negociables)
- Toda sincronización en tiempo real pasa por @portalsdk/react y
  @portalsdk/core. Prohibido WebSockets propios, Socket.io, Pusher, o
  cualquier otra dependencia de tiempo real.
- @portalsdk/core y @portalsdk/react son SOLO de cliente. Nunca se importan
  en un API route de Next.js ni en ningún código de servidor.
- IA: usar @google/genai (modelo gemini-2.5-flash) directamente. Prohibido
  LangChain, LangGraph o cualquier framework de orquestación — es un solo
  prompt, no un pipeline multi-paso.
- Un solo tipo de minijuego reutilizable: reordenar N elementos contrarreloj,
  reskinneado con distinto flavor text. Se presenta como un popup chico en
  posición aleatoria del escritorio; al hacer click se expande a un modal
  centrado con fondo oscurecido para resolverlo. No se agregan tipos de
  minijuego adicionales sin discutirlo antes.
- El LLM SOLO genera contenido narrativo (título, los ítems en el orden
  correcto). NUNCA valida una respuesta ni calcula un número exacto — la
  comparación es determinística, array contra array.
- UI: usar la librería `xp.css` (npm) para toda la estética de ventanas,
  barras de título y botones. No reconstruir esos estilos desde cero con
  Tailwind.
- Gestor de paquetes: npm únicamente. No usar pnpm ni yarn en ningún comando.
- Fuera de scope: ver fase-2.md completo.

## Constantes del juego
- MAX_HP = 100
- BASE_DAMAGE = 25
- PUZZLE_DEADLINE_MS = 8000
- ATTACK_COOLDOWN_MS = 15000
- Fórmula de daño (función pura, idéntica en ambos clientes):
  dañoPotencial = BASE_DAMAGE * (1 - tiempoUsadoAtacante / PUZZLE_DEADLINE_MS)
  dañoFinal = defensorRespondió
    ? dañoPotencial * (tiempoUsadoDefensor / PUZZLE_DEADLINE_MS)
    : dañoPotencial   // timeout del defensor = daño completo
  tiempoUsado se calcula con los timestamps que Portal pone en cada mensaje
  (evento de resultado − evento de ataque), nunca con lo que reporta el
  cliente.

## Arquitectura de datos y autoridad (client-only)
- Todo lo que se publica a un canal de Portal lo hace el navegador, con
  channel.send(...) — nunca un API route.
- ÚNICA API route: /app/api/puzzle/route.ts. Sin estado, sin base de datos,
  sin memoria entre llamadas. Recibe {theme}, llama a Gemini UNA vez pidiendo
  contenido para ataque Y defensa en la misma respuesta, arma la versión
  mezclada de cada uno, y devuelve todo junto en un solo JSON. El cliente
  que ataca la llama, y luego transmite el contenido completo al canal con
  channel.send (ephemeral: true) para que el rival lo reciba.
- Esquema exacto que Gemini debe devolver (pedir JSON estricto, sin texto
  extra alrededor):
  {
    "attack": { "title": "string", "items_in_correct_order": ["string", "string", "string"] },
    "defense": { "title": "string", "items_in_correct_order": ["string", "string", "string"] }
  }
  El route toma items_in_correct_order de cada uno, guarda ESA MISMA copia
  como correctOrder, y genera una versión mezclada (shuffle) para mostrar —
  todo dentro de la misma función, en la misma respuesta HTTP.
- NO existe /api/damage. El daño se calcula con la función pura de arriba,
  exactamente igual en ambos clientes.
- Idempotencia: cada puzzle tiene un puzzleId. Portal entrega eventos
  "at-least-once", así que un resultado duplicado para el mismo puzzleId se
  ignora — es esperable, no un bug.

## Cursores en vivo (invasión durante el ataque)
- Seguir el patrón oficial de la guía "Live cursors" de Portal: ephemeral
  send en cada pointermove + setMetadata throttleado cada ~250ms como
  respaldo de posición para quien recién se conecta.
- El cliente rival, SOLO mientras dura una ventana de ataque activa contra
  él, renderiza esa posición como un cursor superpuesto sobre su propia
  pantalla. Fuera de una ventana de ataque, no se muestra.

## Contrato de datos
```typescript
type Player = {
  id: string;
  hp: number; // max 100
  isConnected: boolean;
};

type MatchState = {
  matchId: string;
  players: Player[];
  status: "waiting" | "active" | "finished";
};

type PuzzleEvent = {
  type: "attack" | "defense";
  puzzleId: string;
  title: string;
  scrambledItems: string[];
  correctOrder: string[];
  deadline: number; // Date.now() + PUZZLE_DEADLINE_MS, calculado al generar
};

type ResultEvent = {
  puzzleId: string;
  success: boolean;
};

type CursorEvent = {
  playerId: string;
  x: number; // 0 a 1
  y: number; // 0 a 1
};
```

## Estructura de carpetas
- /app/api/puzzle/route.ts   → única API route, sin estado (Gemini + mezcla)
- /components/xp-ui/         → wrappers sobre xp.css (Window, TitleBar, ErrorPopup)
- /components/minigame/      → único componente de minijuego (ataque/defensa)
- /components/cursor/        → cursor invasivo del rival
- /hooks/usePortalMatch.ts   → toda la conexión a Portal aislada de la UI

## Estética
xp.css para ventanas/botones/barra de título. Framer Motion para los popups
de error y la desaturación progresiva según % de salud. Fondo tipo wallpaper
"Bliss" desaturado. Estado final: BSOD real para quien pierde, con un código
de error personalizado en pantalla (ej. ERR_RIVAL_TOO_GOOD).