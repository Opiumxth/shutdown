export type PuzzleData = {
  title: string;
  scrambledItems: string[];
  correctOrder: string[];
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
