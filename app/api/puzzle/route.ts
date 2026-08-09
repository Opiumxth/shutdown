import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { PUZZLE_DEADLINE_MS } from "@/lib/constants";

const MODEL = "gemini-2.5-flash";
const GENERATION_TIMEOUT_MS = 6000;
const PUZZLE_TYPES = [
  "sequence",
  "intruder",
  "synergy",
  "debug",
  "upgrade",
] as const;

type PuzzleType = (typeof PUZZLE_TYPES)[number];

type GeneratedPuzzleContent = {
  type: PuzzleType;
  theme: string;
  title: string;
  instruction: string;
  context: string;
  options: string[];
  correctAnswer: string[];
};

type GeneratedContent = {
  attack: GeneratedPuzzleContent;
  defense: GeneratedPuzzleContent;
};

type GeneratedPuzzle = GeneratedPuzzleContent & {
  puzzleId: string;
  deadline: number;
};

type PuzzleApiResponse = {
  attack: GeneratedPuzzle;
  defense: GeneratedPuzzle;
};

const puzzleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      format: "enum",
      enum: [...PUZZLE_TYPES],
    },
    theme: { type: Type.STRING },
    title: { type: Type.STRING },
    instruction: { type: Type.STRING },
    context: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: "4",
      maxItems: "5",
    },
    correctAnswer: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: "1",
      maxItems: "4",
    },
  },
  required: [
    "type",
    "theme",
    "title",
    "instruction",
    "context",
    "options",
    "correctAnswer",
  ],
};

const FALLBACK_CONTENT: GeneratedContent = {
  attack: {
    type: "sequence",
    theme: "hacking genérico",
    title: "OPERACIÓN: BRECHA FANTASMA",
    instruction: "Ordena la cadena de intrusión antes del bloqueo corporativo.",
    context: "",
    options: [
      "Escanear la superficie expuesta",
      "Identificar el servicio vulnerable",
      "Desplegar el exploit validado",
      "Confirmar acceso al objetivo",
    ],
    correctAnswer: [
      "Escanear la superficie expuesta",
      "Identificar el servicio vulnerable",
      "Desplegar el exploit validado",
      "Confirmar acceso al objetivo",
    ],
  },
  defense: {
    type: "sequence",
    theme: "hacking genérico",
    title: "PROTOCOLO: MURO NEGRO",
    instruction: "Ordena la contención para neutralizar la brecha activa.",
    context: "",
    options: [
      "Detectar la actividad anómala",
      "Aislar el nodo comprometido",
      "Cerrar el vector de entrada",
      "Restaurar el servicio verificado",
    ],
    correctAnswer: [
      "Detectar la actividad anómala",
      "Aislar el nodo comprometido",
      "Cerrar el vector de entrada",
      "Restaurar el servicio verificado",
    ],
  },
};

// Fisher-Yates: sort(() => Math.random() - 0.5) biases some permutations.
function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleSequence(options: string[], correctAnswer: string[]): string[] {
  const shuffled = shuffle(options);
  const stayedSolved = shuffled.every((option, index) => option === correctAnswer[index]);
  if (stayedSolved && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

function buildPuzzle(
  content: GeneratedPuzzleContent,
  selectedTheme: string,
): GeneratedPuzzle {
  return {
    ...content,
    puzzleId: randomUUID(),
    theme: selectedTheme,
    options:
      content.type === "sequence"
        ? shuffleSequence(content.options, content.correctAnswer)
        : [...content.options],
    correctAnswer: [...content.correctAnswer],
    deadline: Date.now() + PUZZLE_DEADLINE_MS,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isGeneratedPuzzleContent(value: unknown): value is GeneratedPuzzleContent {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as Record<string, unknown>;
  if (
    typeof puzzle.type !== "string" ||
    !PUZZLE_TYPES.includes(puzzle.type as PuzzleType) ||
    typeof puzzle.theme !== "string" ||
    typeof puzzle.title !== "string" ||
    typeof puzzle.instruction !== "string" ||
    typeof puzzle.context !== "string" ||
    !isStringArray(puzzle.options) ||
    !isStringArray(puzzle.correctAnswer)
  ) {
    return false;
  }

  const type = puzzle.type as PuzzleType;
  const options = puzzle.options;
  const correctAnswer = puzzle.correctAnswer;
  const expectedOptions = type === "synergy" ? 5 : 4;
  const expectedAnswers = type === "sequence" ? 4 : type === "synergy" ? 3 : 1;

  return (
    options.length === expectedOptions &&
    correctAnswer.length === expectedAnswers &&
    new Set(options).size === options.length &&
    new Set(correctAnswer).size === correctAnswer.length &&
    correctAnswer.every((answer) => options.includes(answer))
  );
}

async function generatePuzzle(
  ai: GoogleGenAI,
  selectedTheme: string,
  role: "ofensivo" | "defensivo",
): Promise<GeneratedPuzzleContent> {
  const systemPrompt = `
Eres el motor de IA de un simulador de hacking estratégico. Tu objetivo es generar un minijuego (puzzle) altamente adictivo y técnico para que el jugador lo resuelva bajo extrema presión de tiempo.

TEMÁTICA ASIGNADA: ${selectedTheme}

TIPO DE TAREA A GENERAR (Elige UNO al azar):
1. "sequence" (Secuencia): 4 pasos de un proceso técnico que deben ordenarse cronológicamente.
2. "intruder" (Intruso): 4 conceptos. 3 son de la temática, 1 es un término inventado o trampa. (Objetivo: identificar la trampa).
3. "synergy" (Sinergia - Estilo armar un combo): Presenta un OBJETIVO (ej. "Desplegar un pipeline de datos en tiempo real"). Da 5 tecnologías. El jugador debe elegir exactamente las 3 que forman el stack perfecto.
4. "debug" (Depuración): Muestra un breve log de error o línea de código rota en el contexto. Da 4 posibles comandos para solucionarlo. Solo 1 es correcto.
5. "upgrade" (Multiplicador): Muestra una tecnología base. Da 4 opciones de "mejoras" (upgrades). El jugador debe elegir la que optimice mejor un cuello de botella específico mencionado en la instrucción.

REGLAS CRÍTICAS:
- Idioma: Español.
- Tono: Cyberpunk, corporativo, directo.
- Formato de salida: ÚNICAMENTE un JSON válido, sin bloques de código markdown, sin texto fuera del JSON.

ESTRUCTURA JSON REQUERIDA:
{
  "type": "sequence" | "intruder" | "synergy" | "debug" | "upgrade",
  "theme": "${selectedTheme}",
  "title": "Nombre en clave del reto (ej. OPERACIÓN: RED CLOUD)",
  "instruction": "Instrucción clara y directa de lo que debe hacer el jugador",
  "context": "Opcional: Fragmento de código, log de error, o escenario base (déjalo vacío si no aplica)",
  "options": ["Opcion 1", "Opcion 2", "Opcion 3", "Opcion 4", "Opcion 5"], // 5 opciones SOLO para synergy, 4 para el resto.
  "correctAnswer": [] // Array de strings exactos: 4 elementos para 'sequence', 3 elementos para 'synergy', 1 elemento para el resto.
}
`;

  const response = await Promise.race([
    ai.models.generateContent({
      model: MODEL,
      contents: `Genera ahora un reto ${role}. Respeta exactamente el contrato indicado.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: puzzleSchema,
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timed out")), GENERATION_TIMEOUT_MS),
    ),
  ]);

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed: unknown = JSON.parse(text);
  if (!isGeneratedPuzzleContent(parsed)) {
    throw new Error("Gemini response did not match the expected schema");
  }
  return parsed;
}

async function generateContent(selectedTheme: string): Promise<GeneratedContent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const [attack, defense] = await Promise.all([
    generatePuzzle(ai, selectedTheme, "ofensivo"),
    generatePuzzle(ai, selectedTheme, "defensivo"),
  ]);
  return { attack, defense };
}

export async function POST(request: Request) {
  let selectedTheme = "hacking genérico";
  try {
    const body: unknown = await request.json();
    if (
      body &&
      typeof body === "object" &&
      typeof (body as Record<string, unknown>).theme === "string" &&
      (body as { theme: string }).theme.trim()
    ) {
      selectedTheme = (body as { theme: string }).theme.trim();
    }
  } catch {
    // Malformed body: use the default theme instead of breaking the match.
  }

  let content: GeneratedContent;
  try {
    content = await generateContent(selectedTheme);
  } catch {
    // Gemini failed, timed out, or returned an invalid puzzle: keep the demo playable.
    content = FALLBACK_CONTENT;
  }

  const body: PuzzleApiResponse = {
    attack: buildPuzzle(content.attack, selectedTheme),
    defense: buildPuzzle(content.defense, selectedTheme),
  };

  return NextResponse.json(body);
}
