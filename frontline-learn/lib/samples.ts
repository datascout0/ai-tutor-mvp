import type { Course, Lang, Sample } from "./types";

/**
 * Two realistic, fictional source documents and pre-generated outputs.
 * Demo mode uses these so the prototype works end to end without an API key.
 * Each demo output contains one deliberate failure so the checks have something to catch:
 *  - opening-procedure (EN): a quiz question with a rule that is NOT in the procedure
 *  - aero-run-launch (ES): a translated price that changed (129 → 192)
 */

export const SAMPLES: Sample[] = [
  {
    id: "opening-procedure",
    label: "Store opening procedure",
    role: "Sales associate · opening shift",
    sourceTitle: "Store opening procedure (fashion boutique)",
    sourceText: `STORE OPENING PROCEDURE — Maison Rue boutiques (all stores)
Applies to: opening shift team. Store opens at 10:00.

1. Arrive at 9:30, 30 minutes before opening. Enter through the staff door only.
2. Disarm the alarm within 60 seconds of opening the staff door. If the alarm sounds, call the security line shown on the staff board before doing anything else.
3. Count the cash float in the till. It must be exactly €150. Record the amount in the opening checklist in the app. If it does not match, inform the store manager before opening.
4. Walk the shop floor: refold tables, fill empty sizes from the stockroom, and make sure every fitting room is empty and clean.
5. Steam the garments on the window mannequins. Check that every price tag is visible.
6. Join the 5-minute morning huddle at 9:50. The store manager shares today's sales target and the two priority products to recommend.
7. Unlock the main doors at exactly 10:00 and greet the first customers at the entrance.
8. Report any damaged stock, missing items or safety issues in the app before 10:30.`,
  },
  {
    id: "aero-run-launch",
    label: "New product launch sheet",
    role: "Sales associate",
    sourceTitle: "Product launch sheet: Aero Run 3 running shoe",
    sourceText: `PRODUCT LAUNCH SHEET — Aero Run 3 road running shoe
In stores from Monday 24 November. Retail price: €129.
Who it is for: runners who train 2 to 4 times a week on roads and want one comfortable shoe for easy runs and longer runs.
What is new compared with Aero Run 2:
- 15 g lighter: 245 g in a men's size 42.
- New foam midsole that keeps its cushioning for up to 800 km.
- Upper made with 60% recycled materials.
Key facts to share with customers:
- Heel-to-toe drop is 8 mm.
- Available in standard and wide fit.
- Customers can return the shoes within 30 days, even if they have run in them.
How to sell it:
- Ask how often and where the customer runs before showing the shoe.
- Offer a fitting on the treadmill if the store has one.
- Recommend the Aero running socks (€15) with every pair.
Do not say the shoe prevents injuries. We do not make medical claims.`,
  },
];

const openingEN: Course = {
  title: "Opening the store, step by step",
  role: "Sales associate · opening shift",
  language: "en",
  cards: [
    {
      id: "c1",
      title: "Arrive at 9:30",
      body: "The opening shift starts 30 minutes before the 10:00 opening. Always come in through the staff door.",
      sourceQuote: "Arrive at 9:30, 30 minutes before opening.",
    },
    {
      id: "c2",
      title: "Alarm: you have 60 seconds",
      body: "Disarm the alarm within 60 seconds of opening the staff door. If it sounds, call the security line on the staff board before anything else.",
      sourceQuote: "Disarm the alarm within 60 seconds of opening the staff door.",
    },
    {
      id: "c3",
      title: "Count the float: €150",
      body: "The till float must be exactly €150. Log it in the opening checklist in the app. If it doesn't match, tell the store manager before opening.",
      sourceQuote: "It must be exactly €150.",
    },
    {
      id: "c4",
      title: "Floor, fitting rooms, window",
      body: "Refold tables, refill empty sizes, check every fitting room is empty and clean, then steam the window garments and make sure price tags show.",
      sourceQuote:
        "Walk the shop floor: refold tables, fill empty sizes from the stockroom, and make sure every fitting room is empty and clean.",
    },
    {
      id: "c5",
      title: "Huddle at 9:50, doors at 10:00",
      body: "Join the 5-minute huddle for today's target and the two priority products. Unlock at exactly 10:00 and greet customers at the entrance.",
      sourceQuote: "Join the 5-minute morning huddle at 9:50.",
    },
  ],
  questions: [
    {
      id: "q1",
      level: 1,
      prompt: "What time should the opening team arrive?",
      options: ["9:30", "9:50", "10:00", "9:00"],
      answerIndex: 0,
      explanation: "Arrive at 9:30, 30 minutes before the 10:00 opening.",
      sourceQuote: "Arrive at 9:30, 30 minutes before opening.",
      cardId: "c1",
    },
    {
      id: "q2",
      level: 1,
      prompt: "When is the morning huddle?",
      options: ["9:30", "9:50", "10:00", "10:30"],
      answerIndex: 1,
      explanation: "The 5-minute huddle starts at 9:50, ten minutes before the doors open.",
      sourceQuote: "Join the 5-minute morning huddle at 9:50.",
      cardId: "c5",
    },
    {
      id: "q3",
      level: 2,
      prompt: "The alarm starts sounding as you come in. What do you do first?",
      options: [
        "Text the store manager and keep setting up",
        "Call the security line shown on the staff board",
        "Open the main doors to let air in",
        "Wait. It usually stops by itself",
      ],
      answerIndex: 1,
      explanation: "If the alarm sounds, call the security line before doing anything else.",
      sourceQuote:
        "If the alarm sounds, call the security line shown on the staff board before doing anything else.",
      cardId: "c2",
    },
    {
      id: "q4",
      level: 2,
      prompt: "Which of these is part of the floor walk before opening?",
      options: [
        "Change the window display theme",
        "Reprice items that are on sale",
        "Check every fitting room is empty and clean",
        "Update the store music playlist",
      ],
      answerIndex: 2,
      explanation: "The floor walk covers tables, empty sizes and making sure every fitting room is empty and clean.",
      sourceQuote:
        "Walk the shop floor: refold tables, fill empty sizes from the stockroom, and make sure every fitting room is empty and clean.",
      cardId: "c4",
    },
    {
      id: "q5",
      level: 3,
      prompt: "How many team members must be in the store before you can open?",
      options: ["At least 1", "At least 2", "At least 3", "There's no minimum"],
      answerIndex: 1,
      explanation: "For safety, two team members must be present before opening.",
      sourceQuote: "Two team members must be present before the store opens.",
      cardId: "c1",
    },
    {
      id: "q6",
      level: 3,
      prompt: "It's 9:58, a customer is waiting outside and the float is €20 short. What's right?",
      options: [
        "Unlock at 10:00 and sort the float out later",
        "Keep the doors closed until you've found the money",
        "Tell the store manager before you unlock the doors",
        "Take the missing amount from tomorrow's float",
      ],
      answerIndex: 2,
      explanation: "If the float doesn't match, the store manager must know before the store opens.",
      sourceQuote: "If it does not match, inform the store manager before opening.",
      cardId: "c3",
    },
  ],
};

const openingFR: Course = {
  title: "Ouvrir la boutique, étape par étape",
  role: "Conseiller de vente · équipe d'ouverture",
  language: "fr",
  cards: [
    {
      id: "c1",
      title: "Arrivée à 9 h 30",
      body: "L'équipe d'ouverture commence 30 minutes avant l'ouverture de 10 h 00. Entrez toujours par la porte du personnel.",
      sourceQuote: openingEN.cards[0].sourceQuote,
    },
    {
      id: "c2",
      title: "Alarme : vous avez 60 secondes",
      body: "Désactivez l'alarme dans les 60 secondes après avoir ouvert la porte du personnel. Si elle se déclenche, appelez d'abord le numéro de sécurité affiché sur le tableau du personnel.",
      sourceQuote: openingEN.cards[1].sourceQuote,
    },
    {
      id: "c3",
      title: "Comptez le fond de caisse : 150 €",
      body: "Le fond de caisse doit être exactement de 150 €. Notez-le dans la checklist d'ouverture de l'appli. S'il ne correspond pas, prévenez le responsable avant d'ouvrir.",
      sourceQuote: openingEN.cards[2].sourceQuote,
    },
    {
      id: "c4",
      title: "Surface de vente, cabines, vitrine",
      body: "Repliez les tables, réassortissez les tailles manquantes, vérifiez que chaque cabine est vide et propre, puis défroissez la vitrine et vérifiez que les étiquettes de prix sont visibles.",
      sourceQuote: openingEN.cards[3].sourceQuote,
    },
    {
      id: "c5",
      title: "Brief à 9 h 50, ouverture à 10 h 00",
      body: "Participez au brief de 5 minutes : objectif du jour et les deux produits prioritaires. Ouvrez à 10 h 00 précises et accueillez les clients à l'entrée.",
      sourceQuote: openingEN.cards[4].sourceQuote,
    },
  ],
  questions: [
    {
      ...openingEN.questions[0],
      prompt: "À quelle heure l'équipe d'ouverture doit-elle arriver ?",
      options: ["9 h 30", "9 h 50", "10 h 00", "9 h 00"],
      explanation: "Arrivez à 9 h 30, 30 minutes avant l'ouverture de 10 h 00.",
    },
    {
      ...openingEN.questions[1],
      prompt: "À quelle heure a lieu le brief du matin ?",
      options: ["9 h 30", "9 h 50", "10 h 00", "10 h 30"],
      explanation: "Le brief de 5 minutes commence à 9 h 50, dix minutes avant l'ouverture des portes.",
    },
    {
      ...openingEN.questions[2],
      prompt: "L'alarme se déclenche quand vous entrez. Que faites-vous en premier ?",
      options: [
        "Envoyer un message au responsable et continuer la mise en place",
        "Appeler le numéro de sécurité affiché sur le tableau du personnel",
        "Ouvrir les portes principales pour aérer",
        "Attendre. Elle s'arrête souvent toute seule",
      ],
      explanation: "Si l'alarme se déclenche, appelez le numéro de sécurité avant toute autre chose.",
    },
    {
      ...openingEN.questions[3],
      prompt: "Laquelle de ces tâches fait partie du tour de la surface de vente avant l'ouverture ?",
      options: [
        "Changer le thème de la vitrine",
        "Réétiqueter les articles en promotion",
        "Vérifier que chaque cabine est vide et propre",
        "Mettre à jour la playlist de la boutique",
      ],
      explanation: "Le tour couvre les tables, les tailles manquantes et la vérification que chaque cabine est vide et propre.",
    },
    {
      ...openingEN.questions[4],
      prompt: "Combien de membres de l'équipe doivent être présents avant d'ouvrir ?",
      options: ["Au moins 1", "Au moins 2", "Au moins 3", "Aucun minimum"],
      explanation: "Pour des raisons de sécurité, deux membres de l'équipe doivent être présents avant l'ouverture.",
    },
    {
      ...openingEN.questions[5],
      prompt: "Il est 9 h 58, un client attend dehors et il manque 20 € dans le fond de caisse. Que faites-vous ?",
      options: [
        "Ouvrir à 10 h 00 et régler la caisse plus tard",
        "Garder les portes fermées jusqu'à retrouver l'argent",
        "Prévenir le responsable avant d'ouvrir les portes",
        "Prendre la somme manquante sur le fond de caisse de demain",
      ],
      explanation: "Si le fond de caisse ne correspond pas, le responsable doit être prévenu avant l'ouverture.",
    },
  ],
};

const openingES: Course = {
  title: "Abrir la tienda, paso a paso",
  role: "Asesor de ventas · turno de apertura",
  language: "es",
  cards: [
    {
      id: "c1",
      title: "Llega a las 9:30",
      body: "El turno de apertura empieza 30 minutos antes de abrir a las 10:00. Entra siempre por la puerta del personal.",
      sourceQuote: openingEN.cards[0].sourceQuote,
    },
    {
      id: "c2",
      title: "Alarma: tienes 60 segundos",
      body: "Desactiva la alarma en los 60 segundos siguientes a abrir la puerta del personal. Si suena, llama primero a la línea de seguridad del tablón del personal.",
      sourceQuote: openingEN.cards[1].sourceQuote,
    },
    {
      id: "c3",
      title: "Cuenta el fondo de caja: 150 €",
      body: "El fondo de caja debe ser exactamente 150 €. Regístralo en la checklist de apertura de la app. Si no cuadra, avisa al encargado antes de abrir.",
      sourceQuote: openingEN.cards[2].sourceQuote,
    },
    {
      id: "c4",
      title: "Sala, probadores, escaparate",
      body: "Dobla las mesas, repón las tallas que falten, comprueba que cada probador esté vacío y limpio, plancha la ropa del escaparate y revisa que se vean las etiquetas de precio.",
      sourceQuote: openingEN.cards[3].sourceQuote,
    },
    {
      id: "c5",
      title: "Reunión a las 9:50, apertura a las 10:00",
      body: "Únete a la reunión de 5 minutos: objetivo del día y los dos productos prioritarios. Abre a las 10:00 en punto y recibe a los clientes en la entrada.",
      sourceQuote: openingEN.cards[4].sourceQuote,
    },
  ],
  questions: [
    {
      ...openingEN.questions[0],
      prompt: "¿A qué hora debe llegar el equipo de apertura?",
      options: ["9:30", "9:50", "10:00", "9:00"],
      explanation: "Llega a las 9:30, 30 minutos antes de abrir a las 10:00.",
    },
    {
      ...openingEN.questions[1],
      prompt: "¿A qué hora es la reunión de la mañana?",
      options: ["9:30", "9:50", "10:00", "10:30"],
      explanation: "La reunión de 5 minutos empieza a las 9:50, diez minutos antes de abrir las puertas.",
    },
    {
      ...openingEN.questions[2],
      prompt: "La alarma suena al entrar. ¿Qué haces primero?",
      options: [
        "Escribir al encargado y seguir preparando la tienda",
        "Llamar a la línea de seguridad del tablón del personal",
        "Abrir las puertas principales para ventilar",
        "Esperar. Suele parar sola",
      ],
      explanation: "Si suena la alarma, llama a la línea de seguridad antes de hacer cualquier otra cosa.",
    },
    {
      ...openingEN.questions[3],
      prompt: "¿Cuál de estas tareas forma parte del repaso de la sala antes de abrir?",
      options: [
        "Cambiar la temática del escaparate",
        "Cambiar los precios de los artículos en oferta",
        "Comprobar que cada probador esté vacío y limpio",
        "Actualizar la música de la tienda",
      ],
      explanation: "El repaso incluye las mesas, las tallas que faltan y comprobar que cada probador esté vacío y limpio.",
    },
    {
      ...openingEN.questions[4],
      prompt: "¿Cuántos miembros del equipo deben estar en la tienda antes de abrir?",
      options: ["Al menos 1", "Al menos 2", "Al menos 3", "No hay mínimo"],
      explanation: "Por seguridad, deben estar presentes dos miembros del equipo antes de abrir.",
    },
    {
      ...openingEN.questions[5],
      prompt: "Son las 9:58, un cliente espera fuera y faltan 20 € en el fondo de caja. ¿Qué es lo correcto?",
      options: [
        "Abrir a las 10:00 y arreglar la caja después",
        "Mantener las puertas cerradas hasta encontrar el dinero",
        "Avisar al encargado antes de abrir las puertas",
        "Coger lo que falta del fondo de caja de mañana",
      ],
      explanation: "Si el fondo de caja no cuadra, el encargado debe saberlo antes de abrir la tienda.",
    },
  ],
};

const aeroEN: Course = {
  title: "Launch day: Aero Run 3",
  role: "Sales associate",
  language: "en",
  cards: [
    {
      id: "c1",
      title: "Meet Aero Run 3",
      body: "A road running shoe at €129, in stores from Monday 24 November. Made for runners who train 2 to 4 times a week.",
      sourceQuote: "Retail price: €129.",
    },
    {
      id: "c2",
      title: "What's new",
      body: "15 g lighter (245 g in a size 42), a foam midsole that keeps its cushioning for up to 800 km, and an upper with 60% recycled materials.",
      sourceQuote: "15 g lighter: 245 g in a men's size 42.",
    },
    {
      id: "c3",
      title: "Facts customers ask about",
      body: "8 mm heel-to-toe drop. Standard and wide fit. Returns within 30 days, even after running in them.",
      sourceQuote: "Customers can return the shoes within 30 days, even if they have run in them.",
    },
    {
      id: "c4",
      title: "How to sell it",
      body: "Ask how often and where they run before showing the shoe. Offer a treadmill fitting if your store has one. Recommend the Aero running socks (€15).",
      sourceQuote: "Ask how often and where the customer runs before showing the shoe.",
    },
    {
      id: "c5",
      title: "What never to say",
      body: "Never say the shoe prevents injuries. We don't make medical claims.",
      sourceQuote: "Do not say the shoe prevents injuries.",
    },
  ],
  questions: [
    {
      id: "q1",
      level: 1,
      prompt: "What is the retail price of Aero Run 3?",
      options: ["€119", "€129", "€139", "€149"],
      answerIndex: 1,
      explanation: "Aero Run 3 retails at €129.",
      sourceQuote: "Retail price: €129.",
      cardId: "c1",
    },
    {
      id: "q2",
      level: 1,
      prompt: "What is the heel-to-toe drop?",
      options: ["6 mm", "10 mm", "8 mm", "12 mm"],
      answerIndex: 2,
      explanation: "The heel-to-toe drop is 8 mm.",
      sourceQuote: "Heel-to-toe drop is 8 mm.",
      cardId: "c3",
    },
    {
      id: "q3",
      level: 2,
      prompt: "A customer asks what changed from Aero Run 2. Which answer is accurate?",
      options: [
        "It's fully waterproof now",
        "It's 15 g lighter and the upper uses 60% recycled materials",
        "It has a carbon plate for racing",
        "It now only comes in wide fit",
      ],
      answerIndex: 1,
      explanation: "It's 15 g lighter and the upper is made with 60% recycled materials.",
      sourceQuote: "15 g lighter: 245 g in a men's size 42.",
      cardId: "c2",
    },
    {
      id: "q4",
      level: 2,
      prompt: "A customer ran in their new pair for a week and wants to return them. What do you say?",
      options: [
        "Returns aren't possible once they've been worn outside",
        "They can only get store credit",
        "They can return them within 30 days, even after running in them",
        "They need the store manager's approval first",
      ],
      answerIndex: 2,
      explanation: "Customers can return them within 30 days, even if they've run in them.",
      sourceQuote: "Customers can return the shoes within 30 days, even if they have run in them.",
      cardId: "c3",
    },
    {
      id: "q5",
      level: 3,
      prompt: "A customer asks: \"Will this shoe stop my knee pain?\" What's the best response?",
      options: [
        "Yes, the new foam prevents injuries",
        "Explain we don't make medical claims, then ask about their running to find a comfortable fit",
        "Say the 8 mm drop fixes knee problems",
        "Suggest buying two pairs to rotate",
      ],
      answerIndex: 1,
      explanation: "Never say the shoe prevents injuries. Ask about their running instead.",
      sourceQuote: "Do not say the shoe prevents injuries.",
      cardId: "c5",
    },
    {
      id: "q6",
      level: 3,
      prompt: "A customer walks in asking for \"a good running shoe\". What's your first step?",
      options: [
        "Bring out Aero Run 3 in their size",
        "Ask how often and where they run",
        "Lead with the launch price",
        "Offer the running socks",
      ],
      answerIndex: 1,
      explanation: "Ask how often and where they run before showing the shoe.",
      sourceQuote: "Ask how often and where the customer runs before showing the shoe.",
      cardId: "c4",
    },
  ],
};

const aeroFR: Course = {
  title: "Lancement : Aero Run 3",
  role: "Conseiller de vente",
  language: "fr",
  cards: [
    {
      id: "c1",
      title: "Voici l'Aero Run 3",
      body: "Une chaussure de running sur route à 129 €, en magasin à partir du lundi 24 novembre. Pour les coureurs qui s'entraînent 2 à 4 fois par semaine.",
      sourceQuote: aeroEN.cards[0].sourceQuote,
    },
    {
      id: "c2",
      title: "Les nouveautés",
      body: "15 g plus légère (245 g en pointure 42), une semelle intermédiaire en mousse qui garde son amorti jusqu'à 800 km, et une tige à 60 % de matériaux recyclés.",
      sourceQuote: aeroEN.cards[1].sourceQuote,
    },
    {
      id: "c3",
      title: "Les questions fréquentes",
      body: "Drop de 8 mm. Chaussant standard et large. Retour possible sous 30 jours, même après avoir couru avec.",
      sourceQuote: aeroEN.cards[2].sourceQuote,
    },
    {
      id: "c4",
      title: "Comment la vendre",
      body: "Demandez à quelle fréquence et où le client court avant de montrer la chaussure. Proposez un essai sur tapis si votre magasin en a un. Recommandez les chaussettes Aero (15 €).",
      sourceQuote: aeroEN.cards[3].sourceQuote,
    },
    {
      id: "c5",
      title: "Ce qu'il ne faut jamais dire",
      body: "Ne dites jamais que la chaussure prévient les blessures. Nous ne faisons pas d'allégations médicales.",
      sourceQuote: aeroEN.cards[4].sourceQuote,
    },
  ],
  questions: [
    {
      ...aeroEN.questions[0],
      prompt: "Quel est le prix de vente de l'Aero Run 3 ?",
      options: ["119 €", "129 €", "139 €", "149 €"],
      explanation: "L'Aero Run 3 est vendue 129 €.",
    },
    {
      ...aeroEN.questions[1],
      prompt: "Quel est le drop talon-pointe ?",
      options: ["6 mm", "10 mm", "8 mm", "12 mm"],
      explanation: "Le drop est de 8 mm.",
    },
    {
      ...aeroEN.questions[2],
      prompt: "Un client demande ce qui a changé par rapport à l'Aero Run 2. Quelle réponse est exacte ?",
      options: [
        "Elle est maintenant totalement imperméable",
        "Elle est 15 g plus légère et la tige contient 60 % de matériaux recyclés",
        "Elle a une plaque carbone pour la compétition",
        "Elle n'existe plus qu'en chaussant large",
      ],
      explanation: "Elle est 15 g plus légère et sa tige contient 60 % de matériaux recyclés.",
    },
    {
      ...aeroEN.questions[3],
      prompt: "Un client a couru une semaine avec sa nouvelle paire et veut la rendre. Que lui dites-vous ?",
      options: [
        "Aucun retour possible une fois portée dehors",
        "Il ne peut obtenir qu'un avoir",
        "Il peut la rendre sous 30 jours, même après avoir couru avec",
        "Il faut d'abord l'accord du responsable",
      ],
      explanation: "Les clients peuvent rendre les chaussures sous 30 jours, même après avoir couru avec.",
    },
    {
      ...aeroEN.questions[4],
      prompt: "Un client demande : « Est-ce que cette chaussure va soigner mon genou ? » Quelle est la meilleure réponse ?",
      options: [
        "Oui, la nouvelle mousse prévient les blessures",
        "Expliquer que nous ne faisons pas d'allégations médicales, puis lui poser des questions sur sa pratique pour trouver un chaussant confortable",
        "Dire que le drop de 8 mm règle les problèmes de genou",
        "Lui conseiller d'acheter deux paires pour alterner",
      ],
      explanation: "Ne dites jamais que la chaussure prévient les blessures. Interrogez-le plutôt sur sa pratique.",
    },
    {
      ...aeroEN.questions[5],
      prompt: "Un client entre et demande « une bonne chaussure de running ». Quelle est votre première étape ?",
      options: [
        "Lui apporter l'Aero Run 3 à sa pointure",
        "Lui demander à quelle fréquence et où il court",
        "Commencer par le prix de lancement",
        "Lui proposer les chaussettes",
      ],
      explanation: "Demandez à quelle fréquence et où il court avant de montrer la chaussure.",
    },
  ],
};

const aeroES: Course = {
  title: "Lanzamiento: Aero Run 3",
  role: "Asesor de ventas",
  language: "es",
  cards: [
    {
      id: "c1",
      title: "Conoce las Aero Run 3",
      // Deliberate translation error for the demo: 129 → 192. The number check should flag it.
      body: "Una zapatilla de running para asfalto a 192 €, en tienda desde el lunes 24 de noviembre. Para corredores que entrenan de 2 a 4 veces por semana.",
      sourceQuote: aeroEN.cards[0].sourceQuote,
    },
    {
      id: "c2",
      title: "Qué hay de nuevo",
      body: "15 g más ligera (245 g en la talla 42), una mediasuela de espuma que mantiene la amortiguación hasta 800 km y un upper con un 60 % de materiales reciclados.",
      sourceQuote: aeroEN.cards[1].sourceQuote,
    },
    {
      id: "c3",
      title: "Lo que más preguntan",
      body: "Drop de 8 mm. Horma estándar y ancha. Devolución en 30 días, incluso después de haber corrido con ellas.",
      sourceQuote: aeroEN.cards[2].sourceQuote,
    },
    {
      id: "c4",
      title: "Cómo venderla",
      body: "Pregunta con qué frecuencia y dónde corre antes de enseñar la zapatilla. Ofrece una prueba en cinta si tu tienda tiene una. Recomienda los calcetines Aero (15 €).",
      sourceQuote: aeroEN.cards[3].sourceQuote,
    },
    {
      id: "c5",
      title: "Lo que nunca debes decir",
      body: "Nunca digas que la zapatilla previene lesiones. No hacemos afirmaciones médicas.",
      sourceQuote: aeroEN.cards[4].sourceQuote,
    },
  ],
  questions: [
    {
      ...aeroEN.questions[0],
      prompt: "¿Cuál es el precio de venta de las Aero Run 3?",
      options: ["119 €", "129 €", "139 €", "149 €"],
      explanation: "Las Aero Run 3 cuestan 129 €.",
    },
    {
      ...aeroEN.questions[1],
      prompt: "¿Cuál es el drop talón-puntera?",
      options: ["6 mm", "10 mm", "8 mm", "12 mm"],
      explanation: "El drop es de 8 mm.",
    },
    {
      ...aeroEN.questions[2],
      prompt: "Un cliente pregunta qué ha cambiado respecto a las Aero Run 2. ¿Qué respuesta es correcta?",
      options: [
        "Ahora son totalmente impermeables",
        "Son 15 g más ligeras y el upper lleva un 60 % de materiales reciclados",
        "Tienen placa de carbono para competir",
        "Ahora solo vienen en horma ancha",
      ],
      explanation: "Son 15 g más ligeras y el upper lleva un 60 % de materiales reciclados.",
    },
    {
      ...aeroEN.questions[3],
      prompt: "Un cliente ha corrido una semana con su par nuevo y quiere devolverlo. ¿Qué le dices?",
      options: [
        "No se aceptan devoluciones si se han usado fuera",
        "Solo puede recibir un vale",
        "Puede devolverlas en 30 días, incluso después de haber corrido con ellas",
        "Necesita primero la aprobación del encargado",
      ],
      explanation: "Los clientes pueden devolverlas en 30 días, aunque hayan corrido con ellas.",
    },
    {
      ...aeroEN.questions[4],
      prompt: "Un cliente pregunta: «¿Esta zapatilla me quitará el dolor de rodilla?» ¿Cuál es la mejor respuesta?",
      options: [
        "Sí, la nueva espuma previene lesiones",
        "Explicar que no hacemos afirmaciones médicas y preguntarle por cómo corre para encontrar una horma cómoda",
        "Decir que el drop de 8 mm soluciona los problemas de rodilla",
        "Sugerir que compre dos pares para alternar",
      ],
      explanation: "Nunca digas que la zapatilla previene lesiones. Pregúntale por cómo corre.",
    },
    {
      ...aeroEN.questions[5],
      prompt: "Un cliente entra pidiendo «unas buenas zapatillas para correr». ¿Cuál es tu primer paso?",
      options: [
        "Traerle las Aero Run 3 en su talla",
        "Preguntarle con qué frecuencia y dónde corre",
        "Empezar por el precio de lanzamiento",
        "Ofrecerle los calcetines",
      ],
      explanation: "Pregunta con qué frecuencia y dónde corre antes de enseñar la zapatilla.",
    },
  ],
};

export const DEMO_COURSES: Record<string, Course> = {
  "opening-procedure": openingEN,
  "aero-run-launch": aeroEN,
};

export const DEMO_TRANSLATIONS: Record<string, Partial<Record<Lang, Course>>> = {
  "opening-procedure": { fr: openingFR, es: openingES },
  "aero-run-launch": { fr: aeroFR, es: aeroES },
};

export function getSample(id: string | null | undefined): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
