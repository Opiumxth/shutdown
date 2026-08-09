export type PuzzleType =
  | "sequence"
  | "intruder"
  | "synergy"
  | "debug"
  | "upgrade";

export type PuzzleData = {
  type: PuzzleType;
  theme: string;
  title: string;
  instruction: string;
  context: string;
  options: string[];
  correctAnswer: string[];
  deadline: number;
};

export type PuzzleResult = {
  success: boolean;
  elapsed: number;
};

export type PuzzleWithId = PuzzleData & { puzzleId: string };

export type PuzzleApiResponse = {
  attack: PuzzleWithId;
  defense: PuzzleWithId;
};
