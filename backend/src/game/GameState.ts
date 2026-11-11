
export interface PatientState {
  healing: number;
  trust: number;
}

export type PatientId = "A" | "B" | "C";

export type MBTIDimension =
  | "E" | "I"
  | "S" | "N"
  | "T" | "F"
  | "J" | "P";

export type MBTIScores = Record<MBTIDimension, number>;

export interface GameState {
  day: number;
  ap: number;
  mbti: MBTIScores;
  mbtiLocked: boolean;
  patients: Record<PatientId, PatientState>;
  flags: string[];
  history: string[];
}

export function createInitialGameState(): GameState {
  return {
    day: 1,
    ap: 5,

    mbti: {
      E: 0, I: 0,
      S: 0, N: 0,
      T: 0, F: 0,
      J: 0, P: 0
    },

    mbtiLocked: false,

    patients: {
      A: { healing: 0, trust: 0 },
      B: { healing: 0, trust: 0 },
      C: { healing: 0, trust: 0 }
    },

    flags: [],
    history: []
  };
}
