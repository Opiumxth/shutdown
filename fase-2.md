# Fase 2 — Parking lot (NO se toca este fin de semana)

Todo lo de aquí está evaluado y descartado para el MVP. Si alguien propone
retomar algo de esta lista, la pregunta que decide es una sola: ¿el núcleo
de Fase 1 ya funciona de punta a punta? Si la respuesta es no, esto espera.

## Economía y progresión
- Economía de tokens / moneda del juego.
- Tienda / marketplace.
- Subagentes comprables (minero, atacante, defensor) y sus mejoras.
- Fase de "tiempo de gracia" con tareas largas al inicio de la partida.
- Botón de pánico / habilidades especiales compradas.

## Modos y estructura de partida
- Modos 2v2 / 4v4.
- Fase de "deathmatch" con timer de 5 minutos.
- Múltiples eventos aleatorios (más allá de un único apagón).

## Minijuegos
- Cualquier tipo de minijuego adicional al de reordenar (opción múltiple,
  conectar puntos, etc.) — un solo mecanismo, reutilizado y reskinneado.
- Cálculos numéricos exactos (fórmulas de física, probabilidad, etc.)
  validados por el LLM — riesgo de alucinación en vivo frente al jurado.

## Arquitectura
- Segundo backend (FastAPI + Redis o cualquier otro).
- Cualquier dependencia de tiempo real que no sea @portalsdk/*.
- LangChain / LangGraph u otro framework de orquestación — un solo prompt
  no lo necesita.
- Extensiones de Portal (`portal.config.ts` + `portal deploy`) para estado
  persistente por canal — mejora real, pero agrega un paso de deploy
  adicional que no compensa bajo presión de tiempo.
- Reconexión con recuperación de estado tras recargar la página.