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
