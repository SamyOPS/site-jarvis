import {
  BATTLESHIP_FLEET,
  BATTLESHIP_SIZE,
  otherSeat,
  type BattleshipShip,
  type BattleshipState,
  type GameSeat,
} from "@/domain/games";

/**
 * Règles de la bataille navale, partagées entre l'API et la grille.
 *
 * Comme aux échecs, le serveur est seul juge. Il l'est ici doublement : lui seul connaît
 * les deux flottes, donc lui seul peut dire si un tir touche.
 */

const CELL_COUNT = BATTLESHIP_SIZE * BATTLESHIP_SIZE;

export function initialBattleshipState(): BattleshipState {
  return {
    phase: "placement",
    ready: { player_one: false, player_two: false },
    shotsAt: { player_one: [], player_two: [] },
    sunkShips: { player_one: [], player_two: [] },
    turn: "player_one",
    lastShot: null,
  };
}

/** Cases d'un bateau posé à partir de `start`, ou null s'il déborde de la grille. */
export function shipCells(start: number, size: number, vertical: boolean): BattleshipShip | null {
  const row = Math.floor(start / BATTLESHIP_SIZE);
  const col = start % BATTLESHIP_SIZE;
  if (vertical ? row + size > BATTLESHIP_SIZE : col + size > BATTLESHIP_SIZE) return null;
  return Array.from({ length: size }, (_, index) =>
    vertical ? start + index * BATTLESHIP_SIZE : start + index,
  );
}

/**
 * Vérifie une flotte envoyée par un client : les bons bateaux, dans l'ordre de la flotte,
 * chacun droit et d'un seul tenant, dans la grille, sans chevauchement. Les bateaux
 * peuvent se toucher, comme dans la règle la plus répandue.
 */
export function isValidFleet(ships: unknown): ships is BattleshipShip[] {
  if (!Array.isArray(ships) || ships.length !== BATTLESHIP_FLEET.length) return false;
  const used = new Set<number>();

  return ships.every((ship, index) => {
    if (!Array.isArray(ship) || ship.length !== BATTLESHIP_FLEET[index].size) return false;
    if (!ship.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT)) {
      return false;
    }
    const sorted = [...(ship as number[])].sort((a, b) => a - b);
    const horizontal = shipCells(sorted[0], sorted.length, false);
    const vertical = shipCells(sorted[0], sorted.length, true);
    const straight =
      (horizontal && horizontal.every((cell, i) => cell === sorted[i])) ||
      (vertical && vertical.every((cell, i) => cell === sorted[i]));
    if (!straight) return false;
    return sorted.every((cell) => !used.has(cell) && used.add(cell));
  });
}

/** Flotte tirée au hasard, pour le bouton « Placement aléatoire ». */
export function randomFleet(): BattleshipShip[] {
  // Réessais bornés : avec 17 cases sur 100, un placement valide se trouve en quelques
  // tirages, la borne ne sert qu'à exclure toute boucle infinie.
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const used = new Set<number>();
    const ships: BattleshipShip[] = [];
    for (const { size } of BATTLESHIP_FLEET) {
      let placed: BattleshipShip | null = null;
      for (let tries = 0; tries < 100 && !placed; tries += 1) {
        const cells = shipCells(
          Math.floor(Math.random() * CELL_COUNT),
          size,
          Math.random() < 0.5,
        );
        if (cells && cells.every((cell) => !used.has(cell))) placed = cells;
      }
      if (!placed) break;
      placed.forEach((cell) => used.add(cell));
      ships.push(placed);
    }
    if (ships.length === BATTLESHIP_FLEET.length) return ships;
  }
  throw new Error("Placement aléatoire impossible.");
}

/** Enregistre qu'un joueur a validé sa flotte ; la bataille commence quand les deux l'ont fait. */
export function markReady(state: BattleshipState, seat: GameSeat): BattleshipState {
  const ready = { ...state.ready, [seat]: true };
  return {
    ...state,
    ready,
    phase: ready.player_one && ready.player_two ? "battle" : "placement",
  };
}

export type BattleshipShotOutcome = {
  state: BattleshipState;
  finished: boolean;
  winner: GameSeat | null;
};

/**
 * Tire sur la grille adverse. `targetShips` est la flotte SECRÈTE de l'adversaire, lue
 * par le serveur. Lève une erreur si la case a déjà été visée.
 *
 * Les tours alternent, touché ou non : c'est la variante la plus courante et la seule qui
 * garde les parties équilibrées en durée.
 */
export function applyShot(
  state: BattleshipState,
  shooter: GameSeat,
  cell: number,
  targetShips: BattleshipShip[],
): BattleshipShotOutcome {
  const target = otherSeat(shooter);
  const previous = state.shotsAt[target];
  if (previous.some((shot) => shot.cell === cell)) {
    throw new Error("Case déjà visée.");
  }

  const hit = targetShips.some((ship) => ship.includes(cell));
  const shots = [...previous, { cell, hit }];
  const hitCells = new Set(shots.filter((shot) => shot.hit).map((shot) => shot.cell));

  // Coulé : le bateau touché a désormais toutes ses cases atteintes.
  const struck = hit ? targetShips.find((ship) => ship.includes(cell)) ?? null : null;
  const sunk = !!struck && struck.every((part) => hitCells.has(part));
  const sunkShips = sunk ? [...state.sunkShips[target], struck!] : state.sunkShips[target];

  const finished = targetShips.every((ship) => ship.every((part) => hitCells.has(part)));

  return {
    state: {
      ...state,
      shotsAt: { ...state.shotsAt, [target]: shots },
      sunkShips: { ...state.sunkShips, [target]: sunkShips },
      // Touché : le tireur rejoue. Dans l'eau : la main passe à l'adversaire.
      turn: hit ? shooter : target,
      lastShot: { by: shooter, cell, hit, sunk },
    },
    finished,
    winner: finished ? shooter : null,
  };
}

/** Coordonnée lisible d'une case : « A1 » en haut à gauche, « J10 » en bas à droite. */
export function cellLabel(cell: number) {
  const row = Math.floor(cell / BATTLESHIP_SIZE);
  const col = cell % BATTLESHIP_SIZE;
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}
