# Fase 1 — MVP (esto se construye este fin de semana)

## Objetivo
Duelo 1v1 en tiempo real, jugable de punta a punta, demostrable en menos de
90 segundos sin explicación previa.

## Núcleo intocable
- Duelo 1v1, un solo tipo de minijuego reutilizable (reordenar contrarreloj)
  con distintos disfraces narrativos según ataque/tema.
- Generación de puzzle vía Gemini (@google/genai) — el LLM genera contenido,
  nunca valida. La validación es determinística por comparación de arrays.
- Popups de error chicos en posiciones aleatorias que se expanden a un modal
  centrado al hacer click, para resolver el minijuego.
- Escritorio dividido, cada app como ventana estilo Windows XP (xp.css).
- Corrupción visual progresiva según daño recibido (más popups, desaturación).
- Pantalla de victoria/derrota (BSOD con código de error personalizado).
- Sincronización de salud y presencia vía canal de Portal.
- Daño calculado como función pura, idéntica en ambos clientes, usando los
  timestamps que Portal pone en cada mensaje — no un backend con estado.

## Extras baratos (solo si el núcleo ya funciona)
- Cursor invasivo del rival durante un ataque (patrón oficial de Portal).
- Evento único de apagón (10-15s sin poder atacar/defender, una sola vez).
- Selección de tema de repositorio (IA/Cloud/Blockchain/Quantum) como flavor
  visual del minijuego, sin cambiar la lógica de validación.

## Stack
Next.js (App Router) + @portalsdk/react / @portalsdk/core + xp.css +
@google/genai (modelo gemini-2.5-flash) + npm. Deploy en Vercel. Una sola
API route, sin estado (/api/puzzle).

## Entregables del reglamento oficial
- Nombre del equipo y de todos los integrantes.
- Usuario de Discord de contacto.
- Pitch de máximo 280 caracteres.
- URL del producto desplegado (Vercel).
- URL de demo grabada, máximo 1:30.
- URL del repositorio público de GitHub.
- Explicación de cómo se usó Portal.
- Todo entregado antes del domingo 9 de agosto, 10:00 (hora Lima).