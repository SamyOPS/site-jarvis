/**
 * Banque de questions du quiz. SERVEUR SEULEMENT : seul le moteur (src/lib/multiplayer-
 * engines.ts) l'importe. Elle porte les bonnes réponses : importée par un composant, elle
 * finirait dans le JavaScript envoyé au navigateur et n'importe quel joueur les y lirait.
 *
 * `answer` : rang de la bonne réponse dans `choices`. L'ordre des choix est mélangé à
 * chaque question posée, la position de la bonne réponse ne se devine donc pas.
 */

export type QuizBankEntry = {
  category: string;
  text: string;
  choices: string[];
  answer: number;
};

export const QUIZ_BANK: QuizBankEntry[] = [
  { category: "Géographie", text: "Quelle est la capitale de l'Australie ?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
  { category: "Géographie", text: "Quel est le plus long fleuve de France ?", choices: ["La Seine", "La Loire", "Le Rhône", "La Garonne"], answer: 1 },
  { category: "Géographie", text: "Combien de pays partagent une frontière terrestre avec la France métropolitaine ?", choices: ["6", "7", "8", "9"], answer: 2 },
  { category: "Géographie", text: "Quel est le plus haut sommet d'Afrique ?", choices: ["Mont Kenya", "Kilimandjaro", "Mont Stanley", "Ras Dashen"], answer: 1 },
  { category: "Géographie", text: "Dans quel pays se trouve la ville de Marrakech ?", choices: ["Algérie", "Tunisie", "Maroc", "Égypte"], answer: 2 },
  { category: "Géographie", text: "Quel océan borde la côte ouest des États-Unis ?", choices: ["Atlantique", "Pacifique", "Indien", "Arctique"], answer: 1 },
  { category: "Géographie", text: "Quelle est la capitale du Canada ?", choices: ["Toronto", "Montréal", "Vancouver", "Ottawa"], answer: 3 },
  { category: "Géographie", text: "Quel est le plus grand désert chaud du monde ?", choices: ["Kalahari", "Sahara", "Gobi", "Atacama"], answer: 1 },
  { category: "Géographie", text: "Combien de régions compte la France métropolitaine depuis 2016 ?", choices: ["12", "13", "18", "22"], answer: 1 },
  { category: "Géographie", text: "Quelle mer sépare l'Europe de l'Afrique ?", choices: ["Mer Noire", "Mer Rouge", "Mer Méditerranée", "Mer Caspienne"], answer: 2 },
  { category: "Histoire", text: "En quelle année a eu lieu la prise de la Bastille ?", choices: ["1776", "1789", "1799", "1815"], answer: 1 },
  { category: "Histoire", text: "Qui a été le premier président de la Ve République ?", choices: ["Georges Pompidou", "Charles de Gaulle", "René Coty", "Vincent Auriol"], answer: 1 },
  { category: "Histoire", text: "En quelle année le mur de Berlin est-il tombé ?", choices: ["1987", "1989", "1991", "1993"], answer: 1 },
  { category: "Histoire", text: "Quel empereur a été sacré à Notre-Dame en 1804 ?", choices: ["Louis XVIII", "Charlemagne", "Napoléon Ier", "Napoléon III"], answer: 2 },
  { category: "Histoire", text: "Quelle civilisation a construit le Machu Picchu ?", choices: ["Les Aztèques", "Les Mayas", "Les Incas", "Les Olmèques"], answer: 2 },
  { category: "Histoire", text: "En quelle année l'euro est-il entré en circulation sous forme de billets et pièces ?", choices: ["1999", "2000", "2002", "2004"], answer: 2 },
  { category: "Histoire", text: "Qui a écrit le « Manifeste du parti communiste » avec Karl Marx ?", choices: ["Lénine", "Friedrich Engels", "Trotski", "Proudhon"], answer: 1 },
  { category: "Histoire", text: "Quel navire a coulé lors de son voyage inaugural en 1912 ?", choices: ["Le Lusitania", "Le Titanic", "Le Britannic", "Le Normandie"], answer: 1 },
  { category: "Histoire", text: "Quelle reine de France était surnommée « l'Autrichienne » ?", choices: ["Catherine de Médicis", "Marie-Antoinette", "Anne d'Autriche", "Marie de Médicis"], answer: 1 },
  { category: "Histoire", text: "En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?", choices: ["1965", "1967", "1969", "1972"], answer: 2 },
  { category: "Sciences", text: "Quel est le symbole chimique de l'or ?", choices: ["Or", "Ag", "Au", "Go"], answer: 2 },
  { category: "Sciences", text: "Quelle planète est la plus proche du Soleil ?", choices: ["Vénus", "Mercure", "Mars", "Terre"], answer: 1 },
  { category: "Sciences", text: "Combien d'os compte le squelette humain adulte ?", choices: ["186", "206", "226", "256"], answer: 1 },
  { category: "Sciences", text: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?", choices: ["Oxygène", "Azote", "Dioxyde de carbone", "Hélium"], answer: 2 },
  { category: "Sciences", text: "À quelle température l'eau bout-elle au niveau de la mer ?", choices: ["90 °C", "100 °C", "110 °C", "120 °C"], answer: 1 },
  { category: "Sciences", text: "Qui a formulé la théorie de la relativité ?", choices: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"], answer: 2 },
  { category: "Sciences", text: "Quelle est la plus grosse planète du système solaire ?", choices: ["Saturne", "Jupiter", "Neptune", "Uranus"], answer: 1 },
  { category: "Sciences", text: "Quel organe produit l'insuline ?", choices: ["Le foie", "Le pancréas", "Les reins", "La rate"], answer: 1 },
  { category: "Sciences", text: "Quelle est la vitesse approximative de la lumière dans le vide ?", choices: ["300 000 km/s", "150 000 km/s", "30 000 km/s", "1 000 000 km/s"], answer: 0 },
  { category: "Sciences", text: "Combien de chromosomes possède une cellule humaine ordinaire ?", choices: ["23", "44", "46", "48"], answer: 2 },
  { category: "Arts & lettres", text: "Qui a peint « La Joconde » ?", choices: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], answer: 2 },
  { category: "Arts & lettres", text: "Qui a écrit « Les Misérables » ?", choices: ["Émile Zola", "Victor Hugo", "Gustave Flaubert", "Honoré de Balzac"], answer: 1 },
  { category: "Arts & lettres", text: "Quel compositeur est devenu sourd à la fin de sa vie ?", choices: ["Mozart", "Bach", "Beethoven", "Chopin"], answer: 2 },
  { category: "Arts & lettres", text: "Dans quel musée est exposée la Vénus de Milo ?", choices: ["Musée d'Orsay", "Le Louvre", "British Museum", "Musée du Prado"], answer: 1 },
  { category: "Arts & lettres", text: "Qui est l'auteur du « Petit Prince » ?", choices: ["Jules Verne", "Antoine de Saint-Exupéry", "Albert Camus", "Marcel Pagnol"], answer: 1 },
  { category: "Arts & lettres", text: "Quel peintre a coupé une partie de son oreille ?", choices: ["Paul Gauguin", "Claude Monet", "Vincent van Gogh", "Paul Cézanne"], answer: 2 },
  { category: "Arts & lettres", text: "Qui a écrit « Roméo et Juliette » ?", choices: ["Molière", "William Shakespeare", "Jean Racine", "Goethe"], answer: 1 },
  { category: "Arts & lettres", text: "Quel mouvement artistique Claude Monet a-t-il fondé ?", choices: ["Le cubisme", "Le surréalisme", "L'impressionnisme", "Le fauvisme"], answer: 2 },
  { category: "Sport", text: "Combien de joueurs compte une équipe de football sur le terrain ?", choices: ["9", "10", "11", "12"], answer: 2 },
  { category: "Sport", text: "Dans quelle ville se sont tenus les Jeux olympiques d'été de 2024 ?", choices: ["Tokyo", "Los Angeles", "Paris", "Londres"], answer: 2 },
  { category: "Sport", text: "Combien de sets faut-il gagner pour remporter un match masculin en Grand Chelem ?", choices: ["2", "3", "4", "5"], answer: 1 },
  { category: "Sport", text: "Quelle est la distance officielle d'un marathon ?", choices: ["40 km", "42,195 km", "45 km", "50 km"], answer: 1 },
  { category: "Sport", text: "Quel pays a remporté la Coupe du monde de football 2018 ?", choices: ["Croatie", "Allemagne", "France", "Brésil"], answer: 2 },
  { category: "Sport", text: "Dans quel sport utilise-t-on un volant ?", choices: ["Le squash", "Le badminton", "Le tennis de table", "Le padel"], answer: 1 },
  { category: "Sport", text: "Combien de points vaut un essai au rugby à XV ?", choices: ["3", "4", "5", "7"], answer: 2 },
  { category: "Cinéma & musique", text: "Qui a réalisé « Le Fabuleux Destin d'Amélie Poulain » ?", choices: ["Luc Besson", "Jean-Pierre Jeunet", "Jacques Audiard", "Michel Gondry"], answer: 1 },
  { category: "Cinéma & musique", text: "Quel groupe a chanté « Bohemian Rhapsody » ?", choices: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], answer: 1 },
  { category: "Cinéma & musique", text: "Quel film a remporté le premier Oscar du meilleur film d'animation ?", choices: ["Toy Story", "Shrek", "Le Roi lion", "Monstres et Cie"], answer: 1 },
  { category: "Cinéma & musique", text: "Quelle chanteuse est surnommée « la Môme » ?", choices: ["Dalida", "Édith Piaf", "Barbara", "Juliette Gréco"], answer: 1 },
  { category: "Cinéma & musique", text: "Dans quelle ville se déroule le festival de cinéma le plus célèbre de France ?", choices: ["Deauville", "Cannes", "Annecy", "Nice"], answer: 1 },
  { category: "Cinéma & musique", text: "Combien de cordes possède une guitare classique ?", choices: ["4", "5", "6", "7"], answer: 2 },
  { category: "Vie de bureau", text: "Que signifie l'acronyme « CRA » dans le conseil en informatique ?", choices: ["Compte rendu d'activité", "Contrat de recrutement annuel", "Calendrier des ressources affectées", "Charte de responsabilité"], answer: 0 },
  { category: "Vie de bureau", text: "Combien de jours ouvrés de congés payés un salarié à temps plein acquiert-il par an en France ?", choices: ["20", "25", "30", "35"], answer: 1 },
  { category: "Vie de bureau", text: "Que signifie « ESN » ?", choices: ["Entreprise de services du numérique", "École supérieure du numérique", "Ensemble de solutions numériques", "Entreprise de support réseau"], answer: 0 },
  { category: "Vie de bureau", text: "Quel raccourci clavier annule la dernière action dans la plupart des logiciels ?", choices: ["Ctrl + Y", "Ctrl + Z", "Ctrl + X", "Ctrl + U"], answer: 1 },
  { category: "Vie de bureau", text: "Que désigne « RTT » ?", choices: ["Réduction du temps de travail", "Repos temporaire total", "Rémunération du travail tardif", "Règlement du télétravail"], answer: 0 },
  { category: "Informatique", text: "Que signifie « HTML » ?", choices: ["HyperText Markup Language", "High Transfer Machine Language", "Hyperlink Text Management Logic", "Home Tool Markup Language"], answer: 0 },
  { category: "Informatique", text: "Qui a fondé Microsoft avec Bill Gates ?", choices: ["Steve Jobs", "Paul Allen", "Steve Wozniak", "Larry Page"], answer: 1 },
  { category: "Informatique", text: "Combien de bits contient un octet ?", choices: ["4", "8", "16", "32"], answer: 1 },
  { category: "Informatique", text: "Quel langage est principalement utilisé pour styliser les pages web ?", choices: ["Python", "CSS", "SQL", "Java"], answer: 1 },
  { category: "Informatique", text: "En quelle année le premier iPhone a-t-il été présenté ?", choices: ["2005", "2007", "2009", "2010"], answer: 1 },
  { category: "Informatique", text: "Que signifie « RGPD » ?", choices: ["Règlement général sur la protection des données", "Registre général des paiements dématérialisés", "Réseau global de partage de documents", "Règle générale de prévention des défaillances"], answer: 0 },
  { category: "Cuisine", text: "De quelle région vient la quiche lorraine ?", choices: ["Alsace", "Lorraine", "Bourgogne", "Champagne"], answer: 1 },
  { category: "Cuisine", text: "Quel fromage est traditionnellement utilisé dans une tartiflette ?", choices: ["Le comté", "Le reblochon", "Le beaufort", "La raclette"], answer: 1 },
  { category: "Cuisine", text: "Quel pays est à l'origine des sushis ?", choices: ["Chine", "Corée", "Japon", "Thaïlande"], answer: 2 },
  { category: "Cuisine", text: "Quel est l'ingrédient principal du guacamole ?", choices: ["La tomate", "L'avocat", "Le concombre", "Le poivron"], answer: 1 },
];
