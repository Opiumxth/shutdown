import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { PUZZLE_DEADLINE_MS } from "@/lib/constants";

const MODEL = "gemini-2.5-flash";
const GENERATION_TIMEOUT_MS = 6000;

type PuzzleSide = {
  title: string;
  items_in_correct_order: string[];
};

type GeneratedContent = {
  attack: PuzzleSide;
  defense: PuzzleSide;
};

type GeneratedPuzzle = {
  puzzleId: string;
  title: string;
  scrambledItems: string[];
  correctOrder: string[];
  deadline: number;
};

type PuzzleApiResponse = {
  attack: GeneratedPuzzle;
  defense: GeneratedPuzzle;
};

const puzzleSideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    items_in_correct_order: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: "4",
      maxItems: "4",
    },
  },
  required: ["title", "items_in_correct_order"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    attack: puzzleSideSchema,
    defense: puzzleSideSchema,
  },
  required: ["attack", "defense"],
};

const FALLBACK_CONTENT: GeneratedContent = {
  attack: {
    title: "Reordena la secuencia",
    items_in_correct_order: [
      "Diagnosticar el objetivo",
      "Preparar el exploit",
      "Ejecutar el ataque",
      "Confirmar el impacto",
    ],
  },
  defense: {
    title: "Reordena la secuencia",
    items_in_correct_order: [
      "Detectar la intrusión",
      "Aislar el sistema",
      "Aplicar el parche",
      "Restaurar el servicio",
    ],
  },
};

// Fisher-Yates: sort(() => Math.random() - 0.5) biases toward certain permutations.
function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildPuzzle(side: PuzzleSide): GeneratedPuzzle {
  const correctOrder = side.items_in_correct_order;
  return {
    puzzleId: randomUUID(),
    title: side.title,
    scrambledItems: shuffle(correctOrder),
    correctOrder,
    deadline: Date.now() + PUZZLE_DEADLINE_MS,
  };
}

function isPuzzleSide(value: unknown): value is PuzzleSide {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    Array.isArray(v.items_in_correct_order) &&
    v.items_in_correct_order.length > 0 &&
    v.items_in_correct_order.every((item) => typeof item === "string")
  );
}

function isGeneratedContent(value: unknown): value is GeneratedContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return isPuzzleSide(v.attack) && isPuzzleSide(v.defense);
}

async function generateContent(theme: string): Promise<GeneratedContent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await Promise.race([
    ai.models.generateContent({
      model: MODEL,
      contents: `Tema: "${theme}".

Genera contenido narrativo para un minijuego de hacking. Necesito dos secuencias
distintas de exactamente 4 pasos cortos cada una, ya en su orden lógico correcto:

- "attack": 4 pasos cortos y lógicos de un proceso de ataque relacionado con el tema.
- "defense": 4 pasos cortos y lógicos de un proceso de defensa relacionado con el tema.

Cada paso es una frase corta (menos de 8 palabras). Incluí también un título breve
de flavor para cada secuencia.`,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timed out")), GENERATION_TIMEOUT_MS),
    ),
  ]);

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed: unknown = JSON.parse(text);
  if (!isGeneratedContent(parsed)) {
    throw new Error("Gemini response did not match the expected schema");
  }
  return parsed;
}

export async function POST(request: Request) {
  let theme = "hacking genérico";
  try {
    const body: unknown = await request.json();
    if (
      body &&
      typeof body === "object" &&
      typeof (body as Record<string, unknown>).theme === "string" &&
      (body as { theme: string }).theme.trim()
    ) {
      theme = (body as { theme: string }).theme.trim();
    }
  } catch {
    // Malformed body: fall back to the default theme instead of failing the request.
  }

  let content: GeneratedContent;
  try {
    content = await generateContent(theme);
  } catch {
    // Gemini failed, timed out, or didn't match the schema — never break the demo.
    content = FALLBACK_CONTENT;
  }

  const body: PuzzleApiResponse = {
    attack: buildPuzzle(content.attack),
    defense: buildPuzzle(content.defense),
  };

  return NextResponse.json(body);
}
