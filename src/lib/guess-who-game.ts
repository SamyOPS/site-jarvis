import {
  otherSeat,
  type GameSeat,
  type GuessWhoQuestion,
  type GuessWhoState,
} from "@/domain/games";

/**
 * Qui est-ce ? — personnages, questions et règles, partagés entre l'API et la planche.
 *
 * Les questions portent sur des traits VISIBLES et neutres (cheveux, lunettes, chapeau...),
 * jamais sur le genre ou la couleur de peau : la teinte de peau varie d'un personnage à
 * l'autre pour la diversité de la planche, mais n'est pas un critère de jeu.
 *
 * Le serveur répond à chaque question d'après le personnage secret de l'adversaire : on
 * ne peut ni mentir ni se tromper en répondant.
 */

export type HairColor = "brun" | "blond" | "roux" | "noir" | "gris" | "chauve";
export type EyeColor = "marron" | "bleu" | "vert";

export type GuessWhoCharacter = {
  id: string;
  name: string;
  hair: HairColor;
  longHair: boolean;
  eyes: EyeColor;
  glasses: boolean;
  hat: boolean;
  beard: boolean;
  moustache: boolean;
  earrings: boolean;
  /** Teinte de peau, purement graphique. */
  skin: 0 | 1 | 2 | 3;
};

const c = (
  id: string,
  name: string,
  hair: HairColor,
  eyes: EyeColor,
  traits: string,
  skin: GuessWhoCharacter["skin"],
): GuessWhoCharacter => ({
  id,
  name,
  hair,
  eyes,
  skin,
  longHair: traits.includes("L"),
  glasses: traits.includes("G"),
  hat: traits.includes("H"),
  beard: traits.includes("B"),
  moustache: traits.includes("M"),
  earrings: traits.includes("E"),
});

/*
  Traits : L cheveux longs, G lunettes, H chapeau, B barbe, M moustache, E boucles
  d'oreilles. La planche est équilibrée pour qu'aucune question ne soit décisive à elle
  seule : chaque trait et chaque couleur d'yeux concernent 6 à 8 personnages sur 24,
  chaque couleur de cheveux 3 à 5. Deux personnages ne partagent jamais tous leurs traits.
*/
export const GUESS_WHO_CHARACTERS: GuessWhoCharacter[] = [
  c("alex", "Alex", "brun", "marron", "G", 0),
  c("camille", "Camille", "blond", "bleu", "LE", 1),
  c("sacha", "Sacha", "roux", "vert", "B", 0),
  c("lou", "Lou", "noir", "marron", "LH", 3),
  c("noa", "Noa", "gris", "bleu", "GM", 1),
  c("eden", "Eden", "chauve", "marron", "BG", 2),
  c("maxime", "Maxime", "brun", "vert", "H", 2),
  c("charlie", "Charlie", "blond", "marron", "M", 0),
  c("robin", "Robin", "noir", "bleu", "LGE", 2),
  c("andrea", "Andréa", "roux", "bleu", "L", 1),
  c("jules", "Jules", "gris", "marron", "HB", 3),
  c("dominique", "Dominique", "chauve", "vert", "E", 1),
  c("morgan", "Morgan", "brun", "bleu", "LE", 3),
  c("yael", "Yaël", "noir", "vert", "BM", 0),
  c("sasha", "Sasha", "blond", "vert", "GH", 2),
  c("elie", "Élie", "brun", "marron", "BMH", 1),
  c("ange", "Ange", "gris", "vert", "LE", 0),
  c("louison", "Louison", "roux", "marron", "GE", 3),
  c("claude", "Claude", "chauve", "bleu", "M", 0),
  c("kim", "Kim", "noir", "marron", "G", 1),
  c("leslie", "Leslie", "blond", "bleu", "LH", 3),
  c("jessy", "Jessy", "brun", "vert", "M", 2),
  c("marion", "Marion", "roux", "vert", "HE", 2),
  c("stephane", "Stéphane", "gris", "bleu", "B", 2),
];

export type GuessWhoQuestionDef = {
  id: string;
  label: string;
  test: (character: GuessWhoCharacter) => boolean;
};

const HAIR_LABELS: Record<Exclude<HairColor, "chauve">, string> = {
  brun: "bruns",
  blond: "blonds",
  roux: "roux",
  noir: "noirs",
  gris: "gris",
};

/** Libellés rédigés sur « votre personnage », au masculin grammatical du mot. */
export const GUESS_WHO_QUESTIONS: GuessWhoQuestionDef[] = [
  ...(Object.keys(HAIR_LABELS) as (keyof typeof HAIR_LABELS)[]).map((hair) => ({
    id: `hair_${hair}`,
    label: `A-t-il les cheveux ${HAIR_LABELS[hair]} ?`,
    test: (character: GuessWhoCharacter) => character.hair === hair,
  })),
  { id: "bald", label: "Est-il chauve ?", test: (character) => character.hair === "chauve" },
  { id: "long_hair", label: "A-t-il les cheveux longs ?", test: (character) => character.longHair },
  { id: "eyes_bleu", label: "A-t-il les yeux bleus ?", test: (character) => character.eyes === "bleu" },
  { id: "eyes_vert", label: "A-t-il les yeux verts ?", test: (character) => character.eyes === "vert" },
  { id: "eyes_marron", label: "A-t-il les yeux marron ?", test: (character) => character.eyes === "marron" },
  { id: "glasses", label: "Porte-t-il des lunettes ?", test: (character) => character.glasses },
  { id: "hat", label: "Porte-t-il un chapeau ?", test: (character) => character.hat },
  { id: "beard", label: "A-t-il une barbe ?", test: (character) => character.beard },
  { id: "moustache", label: "A-t-il une moustache ?", test: (character) => character.moustache },
  { id: "earrings", label: "Porte-t-il des boucles d'oreilles ?", test: (character) => character.earrings },
];

export const guessWhoCharacter = (id: string) =>
  GUESS_WHO_CHARACTERS.find((character) => character.id === id) ?? null;
export const guessWhoQuestion = (id: string) =>
  GUESS_WHO_QUESTIONS.find((question) => question.id === id) ?? null;

export function initialGuessWhoState(): GuessWhoState {
  return { questions: [], guesses: [], turn: "player_one" };
}

/** Personnages que les réponses obtenues par `seat` n'ont pas encore écartés. */
export function remainingCandidates(questions: GuessWhoQuestion[], seat: GameSeat) {
  const mine = questions.filter((question) => question.by === seat);
  return GUESS_WHO_CHARACTERS.filter((character) =>
    mine.every((asked) => guessWhoQuestion(asked.questionId)?.test(character) === asked.answer),
  );
}

/** Tirage des deux personnages secrets, distincts. */
export function drawGuessWhoCharacters(): [string, string] {
  const first = Math.floor(Math.random() * GUESS_WHO_CHARACTERS.length);
  let second = Math.floor(Math.random() * (GUESS_WHO_CHARACTERS.length - 1));
  if (second >= first) second += 1;
  return [GUESS_WHO_CHARACTERS[first].id, GUESS_WHO_CHARACTERS[second].id];
}

/** Pose une question sur le personnage secret de l'adversaire. */
export function askQuestion(
  state: GuessWhoState,
  seat: GameSeat,
  questionId: string,
  opponentCharacterId: string,
): GuessWhoState {
  const question = guessWhoQuestion(questionId);
  const target = guessWhoCharacter(opponentCharacterId);
  if (!question || !target) throw new Error("Question inconnue.");
  if (state.questions.some((asked) => asked.by === seat && asked.questionId === questionId)) {
    throw new Error("Question déjà posée.");
  }
  return {
    ...state,
    questions: [...state.questions, { by: seat, questionId, answer: question.test(target) }],
    turn: otherSeat(seat),
  };
}

/** Désigne un personnage : juste, on gagne ; faux, on perd — c'est la règle du jeu. */
export function guessCharacter(
  state: GuessWhoState,
  seat: GameSeat,
  characterId: string,
  opponentCharacterId: string,
) {
  if (!guessWhoCharacter(characterId)) throw new Error("Personnage inconnu.");
  const correct = characterId === opponentCharacterId;
  return {
    state: { ...state, guesses: [...state.guesses, { by: seat, characterId, correct }] },
    winner: correct ? seat : otherSeat(seat),
    reason: correct ? ("guessed" as const) : ("wrong_guess" as const),
  };
}
