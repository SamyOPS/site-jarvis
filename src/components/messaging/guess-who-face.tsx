import type { GuessWhoCharacter } from "@/lib/guess-who-game";

/*
  Portrait d'un personnage, dessiné à partir de ses traits : c'est ce qui garantit que
  l'image et les réponses du serveur disent toujours la même chose. Un portrait dessiné
  à la main pourrait montrer des lunettes à un personnage qui n'en a pas.
*/

const SKIN = ["#f6d5bd", "#e3b08a", "#b67b53", "#7b4b2f"];
const HAIR: Record<string, string> = {
  brun: "#6b4226",
  blond: "#e6bf62",
  roux: "#c2562b",
  noir: "#1f1a17",
  gris: "#a8a29e",
  chauve: "transparent",
};
const EYES: Record<string, string> = { marron: "#5b3a1e", bleu: "#2563eb", vert: "#15803d" };
const BACKGROUNDS = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#ede9fe", "#ffedd5", "#e0f2fe", "#f1f5f9"];
const CLOTHES = ["#2563eb", "#db2777", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#475569"];

/** Choix stable d'une couleur à partir de l'identifiant. */
function pick<T>(list: T[], id: string, salt = 0) {
  let hash = salt;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

export function GuessWhoFace({ character }: { character: GuessWhoCharacter }) {
  const skin = SKIN[character.skin];
  const hair = HAIR[character.hair];
  const bald = character.hair === "chauve";

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <rect width="100" height="100" fill={pick(BACKGROUNDS, character.id)} />
      {/* Épaules */}
      <path d="M14 100 Q16 79 50 79 Q84 79 86 100 Z" fill={pick(CLOTHES, character.id, 7)} />
      <rect x="43" y="70" width="14" height="12" fill={skin} />

      {/* Cheveux longs, derrière la tête */}
      {character.longHair && !bald && (
        <path d="M25 50 Q24 22 50 20 Q76 22 75 50 L78 84 Q64 90 50 88 Q36 90 22 84 Z" fill={hair} />
      )}

      {/* Tête et oreilles */}
      <circle cx="28" cy="54" r="5" fill={skin} />
      <circle cx="72" cy="54" r="5" fill={skin} />
      {character.earrings && (
        <>
          <circle cx="28" cy="61" r="2.6" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="72" cy="61" r="2.6" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
        </>
      )}
      <ellipse cx="50" cy="52" rx="22" ry="25" fill={skin} />

      {/* Cheveux courts, ou frange des cheveux longs */}
      {!bald && (
        <path d="M27 50 Q26 24 50 23 Q74 24 73 50 Q68 35 50 34 Q32 35 27 50 Z" fill={hair} />
      )}

      {/* Sourcils, yeux, nez, bouche */}
      <path d="M36 44 Q41 41 46 44" stroke={bald ? "#57534e" : hair} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M54 44 Q59 41 64 44" stroke={bald ? "#57534e" : hair} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="41" cy="51" rx="4.2" ry="3.2" fill="#fff" />
      <ellipse cx="59" cy="51" rx="4.2" ry="3.2" fill="#fff" />
      <circle cx="41" cy="51" r="2.3" fill={EYES[character.eyes]} />
      <circle cx="59" cy="51" r="2.3" fill={EYES[character.eyes]} />
      <circle cx="41" cy="51" r="0.9" fill="#111" />
      <circle cx="59" cy="51" r="0.9" fill="#111" />
      <path d="M50 54 Q47.5 61 51 61.5" stroke="#00000033" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {character.beard && (
        <path d="M28 56 Q29 84 50 85 Q71 84 72 56 Q68 71 50 72 Q32 71 28 56 Z" fill={bald ? "#57534e" : hair} />
      )}
      <path d="M43 67 Q50 72 57 67" stroke="#7f1d1d" strokeWidth="2" fill="none" strokeLinecap="round" />
      {character.moustache && (
        <path d="M41 65.5 Q50 60 59 65.5 Q50 64 41 65.5 Z" fill={bald ? "#57534e" : hair} stroke={bald ? "#57534e" : hair} strokeWidth="2" strokeLinejoin="round" />
      )}

      {character.glasses && (
        <g stroke="#111827" strokeWidth="1.8" fill="#ffffff22">
          <circle cx="41" cy="51" r="7" />
          <circle cx="59" cy="51" r="7" />
          <path d="M48 51 Q50 49 52 51" fill="none" />
        </g>
      )}

      {character.hat && (
        <g>
          {/* Mèches sur les tempes : sous le chapeau, la couleur des cheveux doit rester lisible. */}
          {!bald && (
            <>
              <path d="M26 52 Q25 36 32 32 L37 32 Q30 40 30.5 51 Z" fill={hair} />
              <path d="M74 52 Q75 36 68 32 L63 32 Q70 40 69.5 51 Z" fill={hair} />
            </>
          )}
          <ellipse cx="50" cy="32" rx="31" ry="6" fill={pick(CLOTHES, character.id, 3)} />
          <path d="M33 32 Q33 12 50 12 Q67 12 67 32 Z" fill={pick(CLOTHES, character.id, 3)} />
          <rect x="33" y="26" width="34" height="4" fill="#00000040" />
        </g>
      )}
    </svg>
  );
}
