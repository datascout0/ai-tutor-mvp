import type { Lang } from "./types";

export const LANG_LABEL: Record<Lang, string> = { en: "English", fr: "Français", es: "Español" };
export const LANG_SHORT: Record<Lang, string> = { en: "EN", fr: "FR", es: "ES" };

type Strings = {
  lesson: string;
  of: string;
  next: string;
  back: string;
  startQuiz: string;
  quiz: string;
  question: string;
  levelNames: [string, string, string];
  check: string;
  correct: string;
  notQuite: string;
  continue: string;
  seeResult: string;
  fromProcedure: string;
  readyTitle: string;
  readyBody: string;
  reviewTitle: string;
  reviewBody: string;
  reviewCards: string;
  retake: string;
  restart: string;
  score: string;
};

export const UI: Record<Lang, Strings> = {
  en: {
    lesson: "Lesson",
    of: "of",
    next: "Next",
    back: "Back",
    startQuiz: "Start the quiz",
    quiz: "Quick check",
    question: "Question",
    levelNames: ["Recall", "Apply", "Judgement"],
    check: "Check",
    correct: "Correct",
    notQuite: "Not quite",
    continue: "Continue",
    seeResult: "See my result",
    fromProcedure: "From the procedure",
    readyTitle: "Shift-ready",
    readyBody: "You know this procedure well enough to use it on the floor.",
    reviewTitle: "Almost there",
    reviewBody: "Review these cards, then try the quick check again:",
    reviewCards: "Review cards",
    retake: "Retake the quiz",
    restart: "Start over",
    score: "Score",
  },
  fr: {
    lesson: "Leçon",
    of: "sur",
    next: "Suivant",
    back: "Retour",
    startQuiz: "Commencer le quiz",
    quiz: "Vérification rapide",
    question: "Question",
    levelNames: ["Mémoriser", "Appliquer", "Juger"],
    check: "Valider",
    correct: "Correct",
    notQuite: "Pas tout à fait",
    continue: "Continuer",
    seeResult: "Voir mon résultat",
    fromProcedure: "Extrait de la procédure",
    readyTitle: "Prêt pour le service",
    readyBody: "Vous maîtrisez assez cette procédure pour l'appliquer en magasin.",
    reviewTitle: "Presque",
    reviewBody: "Revoyez ces cartes, puis refaites la vérification :",
    reviewCards: "Revoir les cartes",
    retake: "Refaire le quiz",
    restart: "Recommencer",
    score: "Score",
  },
  es: {
    lesson: "Lección",
    of: "de",
    next: "Siguiente",
    back: "Atrás",
    startQuiz: "Empezar el quiz",
    quiz: "Comprobación rápida",
    question: "Pregunta",
    levelNames: ["Recordar", "Aplicar", "Decidir"],
    check: "Comprobar",
    correct: "Correcto",
    notQuite: "No del todo",
    continue: "Continuar",
    seeResult: "Ver mi resultado",
    fromProcedure: "Del procedimiento",
    readyTitle: "Listo para el turno",
    readyBody: "Conoces este procedimiento lo suficiente para aplicarlo en tienda.",
    reviewTitle: "Casi",
    reviewBody: "Repasa estas tarjetas y vuelve a hacer la comprobación:",
    reviewCards: "Repasar tarjetas",
    retake: "Repetir el quiz",
    restart: "Empezar de nuevo",
    score: "Puntuación",
  },
};
