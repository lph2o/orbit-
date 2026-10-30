export type Locale = 'fr' | 'it' | 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'FR · Français',
  it: 'IT · Italiano',
  en: 'EN · English',
};

export const SHORT_LOCALE_LABELS: Record<Locale, string> = {
  fr: 'FR',
  it: 'IT',
  en: 'EN',
};

export interface Dictionary {
  nav: {
    capabilities: string;
    cloudVm: string;
    routines: string;
    marketplace: string;
    openWorkspace: string;
  };
  landing: {
    eyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaCreate: string;
    ctaGoogle: string;
    activeAgentsTitle: string;
    sandboxReady: string;
    connectedTools: string;
    chatLink: string;
    demoNoteTitle: string;
    demoNoteBody: string;
    stat1Value: string;
    stat1Desc: string;
    stat2Value: string;
    stat2Desc: string;
    stat3Value: string;
    stat3Desc: string;
    stat4Value: string;
    stat4Desc: string;
    sec1Title: string;
    sec1Sub: string;
    cap1Title: string;
    cap1Body: string;
    cap2Title: string;
    cap2Body: string;
    cap3Title: string;
    cap3Body: string;
    sec2Title: string;
    sec2Sub: string;
    openMarketplaceBtn: string;
    footerBrand: string;
    footerEnter: string;
  };
  sidebar: {
    overview: string;
    createAgent: string;
    yourAgents: string;
    toolsCount: string;
    toolMarketplace: string;
    signInGoogle: string;
    signOut: string;
  };
  workspace: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptySub: string;
    active: string;
    paused: string;
    routinesCount: string;
    runsCount: string;
    openAgent: string;
  };
  createAgent: {
    title: string;
    subtitle: string;
    back: string;
    avatarTitle: string;
    avatarDesc: string;
    shuffleBtn: string;
    nameLabel: string;
    namePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    cancel: string;
    submit: string;
    creating: string;
    errorNameRequired: string;
  };
  marketplace: {
    title: string;
    subtitle: string;
    targetAgent: string;
    searchPlaceholder: string;
    catAll: string;
    connectedTitle: string;
    sessionId: string;
    noConnectedMatch: string;
    connectedStatus: string;
    disconnectBtn: string;
    availableTitle: string;
    connectBtn: string;
    connectingBtn: string;
  };
  vm: {
    running: string;
    paused: string;
    inactive: string;
    autoPauseIn: string;
    pauseSandbox: string;
    resumeSandbox: string;
    chromeTab: string;
    terminalTab: string;
    filesTab: string;
    presetNews: string;
    presetCourses: string;
    pausedDesc: string;
    activateBtn: string;
    navigateBtn: string;
    liveSession: string;
    actionTraceTitle: string;
    actionTraceSub: string;
  };
  chat: {
    activeAgent: string;
    pausedAgent: string;
    cloudVmLive: string;
    cloudVmOpen: string;
    resetChat: string;
    editingBannerPrefix: string;
    editingBannerHint: string;
    cancelEdit: string;
    thinking: string;
    inputPlaceholder: string;
    editPlaceholder: string;
    sendBtn: string;
    quickPrompts: string[];
    clarificationTitle: string;
    inspectLiveVm: string;
    vmTraceTitle: string;
  };
  routineCard: {
    updateHeader: string;
    proposalHeader: string;
    instructionsLabel: string;
    cadence: string;
    scheduledTime: string;
    timezone: string;
    targetChannel: string;
    scheduledDays: string;
    requiredTools: string;
    connectToolsWarning: string;
    allToolsReady: string;
    createdBadge: string;
    updatedBadge: string;
    createBtn: string;
    updateBtn: string;
    savingBtn: string;
  };
  toolCard: {
    connected: string;
    required: string;
    disconnect: string;
    connect: string;
    connecting: string;
  };
  config: {
    headerTitle: string;
    saveBtn: string;
    savingBtn: string;
    shuffleAvatar: string;
    tabSettings: string;
    tabTools: string;
    tabSchedule: string;
    tabHistory: string;
    vmTitle: string;
    vmActive: string;
    vmPaused: string;
    vmInactive: string;
    vmLiveStream: string;
    vmSessionNote: string;
    vmClickFull: string;
    vmAutoPauseNote: string;
    vmReactivate: string;
    vmStart: string;
    vmOpenFullBtn: string;
    vmPauseBtn: string;
    instructionsLabel: string;
    instructionsSub: string;
    managementTitle: string;
    agentStatusLabel: string;
    agentStatusSub: string;
    pauseAgentBtn: string;
    activateAgentBtn: string;
    dangerZone: string;
    deleteAgentBtn: string;
    deleteConfirmPrompt: string;
    confirmDeleteBtn: string;
    cancelBtn: string;
    connectedToolsTitle: string;
    addToolBtn: string;
    noToolsTitle: string;
    noToolsSub: string;
    browseMarketplaceBtn: string;
    activeMcpAccess: string;
    scheduledRoutinesTitle: string;
    inngestSub: string;
    invokeCronBtn: string;
    runNowPrompt: string;
    runNowSub: string;
    runBtn: string;
    runNowBtn: string;
    runningInngest: string;
    noRoutinesTitle: string;
    noRoutinesSub: string;
    editInChat: string;
    deactivateRoutine: string;
    activateRoutine: string;
    deleteRoutine: string;
    confirmBtn: string;
    nextLabel: string;
    historyTitle: string;
    historySub: string;
    noHistory: string;
    pipelineLabel: string;
  };
  toasts: {
    signedInTitle: string;
    signedInDesc: string;
    demoModeTitle: string;
    demoModeDesc: string;
    signedOutTitle: string;
    signedOutDesc: string;
    agentCreatedTitle: string;
    agentSavedTitle: string;
    agentSavedDesc: string;
    agentDeletedTitle: string;
    agentDeletedDesc: string;
    routineCreatedTitle: string;
    routineUpdatedTitle: string;
    routineActiveTitle: string;
    routinePausedTitle: string;
    routineDeletedTitle: string;
    routineCompletedTitle: string;
    routineFailedTitle: string;
    cronCheckEmptyTitle: string;
    cronCheckEmptyDesc: string;
  };
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  fr: {
    nav: {
      capabilities: 'Fonctionnalités',
      cloudVm: 'Cloud VM',
      routines: 'Routines',
      marketplace: 'Marketplace',
      openWorkspace: 'Ouvrir l’espace',
    },
    landing: {
      eyebrow: 'SaaS d’Agents IA Autonomes · Cloud VM Persistant · Planificateur Inngest',
      heroTitle: 'Déployez des agents IA dotés de leur propre bureau Cloud et de routines récurrentes.',
      heroSubtitle:
        'Créez des agents sur mesure connectés à Gmail, Slack, GitHub et Notion via Composio, exécutez des planifications récurrentes en arrière-plan avec Inngest et pilotez un navigateur Cloud VM E2B en direct.',
      ctaPrimary: 'Lancer l’espace Agent',
      ctaCreate: 'Créer un nouvel agent',
      ctaGoogle: 'Continuer avec Google',
      activeAgentsTitle: 'Agents actifs dans l’espace',
      sandboxReady: 'Sandbox E2B Prêt',
      connectedTools: 'outils connectés',
      chatLink: 'Discuter →',
      demoNoteTitle: 'Routine de démonstration opérationnelle incluse',
      demoNoteBody:
        'Cliquez sur un agent ci-dessus pour tester les résumés quotidiens Gmail vers Slack, les exécutions manuelles Inngest et la navigation Google News en direct sur le Cloud VM.',
      stat1Value: '12+ Outils MCP',
      stat1Desc: 'Sessions OAuth2 gérées pour Gmail, Slack, GitHub, Notion, Calendar & Reddit',
      stat2Value: 'Cron 60m',
      stat2Desc: 'Exécution durable Inngest en 5 étapes avec reprise automatique et journaux',
      stat3Value: 'Pause Auto 120s',
      stat3Desc: 'Bureaux virtuels Cloud E2B dédiés par agent avec sessions navigateur persistantes',
      stat4Value: 'Journal 72h',
      stat4Desc: 'Historique glissant de 3 jours des exécutions et conversations synchronisé',
      sec1Title: '01. Capacités Agentiques Fondamentales',
      sec1Sub:
        'Chaque agent combine instructions personnalisées, outils OAuth, planification durable et bureau Cloud.',
      cap1Title: 'Bureau Cloud VM E2B Persistant',
      cap1Body:
        'Chaque agent dispose de son propre bureau Linux isolé et d’un navigateur Chrome. Demandez-lui d’extraire Google News ou d’inspecter des tableaux de bord en direct.',
      cap2Title: 'Planificateur de Routines Inngest',
      cap2Body:
        'Décrivez votre planification en français, italien ou anglais. Votre agent vérifie les canaux, génère une carte Routine et exécute 5 étapes en arrière-plan.',
      cap3Title: 'Sessions Multi-Outils Composio',
      cap3Body:
        'Associez Gmail, Slack, GitHub, Notion, Google Docs et Linear à un identifiant de session unique par agent.',
      sec2Title: '02. Marketplace d’Outils Intégrée',
      sec2Sub: 'Intégrations MCP Composio pré-configurées prêtes à être attachées à tout agent.',
      openMarketplaceBtn: 'Ouvrir toute la Marketplace',
      footerBrand: 'Plateforme d’Automatisation d’Agents IA Orbit',
      footerEnter: 'Entrer dans l’espace →',
    },
    sidebar: {
      overview: 'Accueil',
      createAgent: 'Créer un agent',
      yourAgents: 'Vos Agents',
      toolsCount: 'outils',
      toolMarketplace: 'Outils MCP',
      signInGoogle: 'Se connecter avec Google',
      signOut: 'Se déconnecter',
    },
    workspace: {
      title: 'Espace de travail des Agents',
      subtitle:
        'Gérez vos agents IA autonomes, outils Composio connectés, planifications Inngest et bureaux Cloud VM E2B.',
      emptyTitle: 'Créez votre premier Agent IA',
      emptySub:
        'Configurez des instructions personnalisées, connectez Gmail et Slack, et lancez un sandbox Cloud VM dédié.',
      active: 'Actif',
      paused: 'En pause',
      routinesCount: 'routines',
      runsCount: 'exécutions',
      openAgent: 'Ouvrir l’agent',
    },
    createAgent: {
      title: 'Créer un nouvel Agent IA',
      subtitle: 'Chaque agent reçoit sa propre session d’outils Composio et son bureau Cloud VM E2B.',
      back: 'Retour',
      avatarTitle: 'Avatar de l’agent',
      avatarDesc: 'Généré avec le style DiceBear Glass. Mélangez pour choisir une identité unique.',
      shuffleBtn: 'Mélanger l’avatar',
      nameLabel: 'Nom de l’agent',
      namePlaceholder: 'ex. Mickey, Brief Quotidien, Analyseur YouTube',
      descLabel: 'Instructions & Description (Optionnel)',
      descPlaceholder:
        'Décrivez comment votre agent doit agir, quels outils privilégier ou les canaux Slack par défaut...',
      cancel: 'Annuler',
      submit: 'Créer l’agent',
      creating: 'Création en cours...',
      errorNameRequired: 'Veuillez saisir un nom d’agent avant de créer.',
    },
    marketplace: {
      title: 'Marketplace d’outils Composio & MCP',
      subtitle:
        'Connectez des outils OAuth2 et MCP directement à la session Composio persistante de votre agent.',
      targetAgent: 'Agent cible :',
      searchPlaceholder: 'Rechercher Gmail, Slack, GitHub, Notion, Calendar...',
      catAll: 'Tous',
      connectedTitle: 'Outils connectés',
      sessionId: 'ID de session',
      noConnectedMatch: 'Aucun outil connecté ne correspond à ce filtre.',
      connectedStatus: 'Connecté',
      disconnectBtn: 'Déconnecter',
      availableTitle: 'Outils disponibles',
      connectBtn: 'Connecter',
      connectingBtn: 'Connexion...',
    },
    vm: {
      running: 'En cours (Bureau Ubuntu 24.04)',
      paused: 'En pause (Session préservée)',
      inactive: 'Inactif',
      autoPauseIn: 'Pause auto dans',
      pauseSandbox: 'Mettre en pause',
      resumeSandbox: 'Reprendre la session VM',
      chromeTab: 'Google Chrome',
      terminalTab: 'Terminal Bash Agent',
      filesTab: 'Explorateur (/home/user)',
      presetNews: 'Exemple : Google News IA',
      presetCourses: 'Exemple : Cours TubeGuruji',
      pausedDesc:
        'Vos onglets de navigateur, cookies authentifiés et fichiers de travail sont préservés. Cliquez ci-dessous pour reprendre le flux du bureau immédiatement.',
      activateBtn: 'Activer le bureau Cloud VM',
      navigateBtn: 'Naviguer',
      liveSession: 'Session authentifiée en direct',
      actionTraceTitle: 'Trace d’actions Computer-Use de l’Agent',
      actionTraceSub: 'Actions de navigation autonomes exécutées dans le sandbox E2B.',
    },
    chat: {
      activeAgent: 'Agent actif',
      pausedAgent: 'En pause',
      cloudVmLive: 'Cloud VM (En direct)',
      cloudVmOpen: 'Cloud VM (Ouvrir)',
      resetChat: 'Réinitialiser la conversation',
      editingBannerPrefix: 'Modification de la routine',
      editingBannerHint: 'Indiquez le nouvel horaire ou canal (ex. "Changer l’heure à 9:00 AM").',
      cancelEdit: 'Annuler',
      thinking: 'réfléchit et planifie l’exécution des outils...',
      inputPlaceholder:
        'Demandez d’automatiser vos e-mails, planifier une routine Slack ou parcourir Google News sur le Cloud VM...',
      editPlaceholder: 'Mettre à jour la routine (ex. "Changer l’horaire à 9:00 AM")...',
      sendBtn: 'Envoyer',
      quickPrompts: [
        'Envoie un résumé des 5 e-mails non lus sur #new-channel dans Slack tous les jours à 8:00 AM',
        'Donne-moi les 5 dernières actualités IA de Google News via le Cloud VM',
        'Connecter Gmail et Slack',
        'Liste tous mes canaux Slack',
      ],
      clarificationTitle: 'Précision requise',
      inspectLiveVm: 'Inspecter le VM en direct',
      vmTraceTitle: 'Trace Navigateur Cloud VM E2B',
    },
    routineCard: {
      updateHeader: 'Mettre à jour la routine planifiée',
      proposalHeader: 'Proposition de routine automatisée',
      instructionsLabel: 'Instructions d’exécution de l’agent',
      cadence: 'Fréquence',
      scheduledTime: 'Heure planifiée',
      timezone: 'Fuseau horaire',
      targetChannel: 'Canal cible',
      scheduledDays: 'Jours planifiés',
      requiredTools: 'Outils requis',
      connectToolsWarning: 'Connectez les outils ci-dessus pour activer la création de la routine.',
      allToolsReady: 'Tous les outils requis sont connectés et prêts pour l’exécution en arrière-plan.',
      createdBadge: 'Routine créée',
      updatedBadge: 'Routine mise à jour',
      createBtn: 'Créer la routine',
      updateBtn: 'Mettre à jour la routine',
      savingBtn: 'Enregistrement...',
    },
    toolCard: {
      connected: 'Connecté',
      required: 'Connexion requise',
      disconnect: 'Déconnecter',
      connect: 'Connecter',
      connecting: 'Connexion...',
    },
    config: {
      headerTitle: 'Configuration de l’Agent',
      saveBtn: 'Enregistrer',
      savingBtn: 'Enregistrement...',
      shuffleAvatar: 'Mélanger l’avatar',
      tabSettings: 'Réglages',
      tabTools: 'Outils',
      tabSchedule: 'Planning',
      tabHistory: 'Historique',
      vmTitle: 'Bureau Cloud VM',
      vmActive: 'Actif',
      vmPaused: 'En pause',
      vmInactive: 'Inactif',
      vmLiveStream: 'FLUX DIRECT',
      vmSessionNote: 'Cookies de session & onglets actifs conservés sur le sandbox E2B.',
      vmClickFull: 'Cliquer pour ouvrir en plein écran',
      vmAutoPauseNote: 'Pause auto après 2 min d’inactivité',
      vmReactivate: 'Réactiver la VM',
      vmStart: 'Démarrer le Cloud VM',
      vmOpenFullBtn: 'Plein écran',
      vmPauseBtn: 'Pause',
      instructionsLabel: 'Description & Instructions',
      instructionsSub: 'Règles globales de comportement, ton et canaux par défaut.',
      managementTitle: 'Gestion de l’Agent',
      agentStatusLabel: 'Statut de l’agent',
      agentStatusSub: 'Mettez l’agent en pause pour suspendre les routines.',
      pauseAgentBtn: 'Mettre en pause',
      activateAgentBtn: 'Activer l’agent',
      dangerZone: 'Zone de danger',
      deleteAgentBtn: 'Supprimer l’agent',
      deleteConfirmPrompt: 'Supprimer définitivement cet agent et toutes ses routines ?',
      confirmDeleteBtn: 'Confirmer la suppression',
      cancelBtn: 'Annuler',
      connectedToolsTitle: 'Outils connectés',
      addToolBtn: 'Ajouter un outil',
      noToolsTitle: 'Aucun outil connecté',
      noToolsSub:
        'Connectez Gmail, Slack, GitHub, Notion ou Reddit depuis la marketplace ou directement via le chat.',
      browseMarketplaceBtn: 'Parcourir la Marketplace',
      activeMcpAccess: 'Connecté · Accès MCP actif',
      scheduledRoutinesTitle: 'Routines planifiées',
      inngestSub: 'La file Inngest vérifie les tâches toutes les 60 minutes.',
      invokeCronBtn: 'Lancer Cron 60m',
      runNowPrompt: 'Exécuter maintenant',
      runNowSub: 'Ceci déclenchera immédiatement le workflow Inngest en 5 étapes vers',
      runBtn: 'Exécuter',
      runNowBtn: 'Exécuter',
      runningInngest: 'Exécution Inngest...',
      noRoutinesTitle: 'Aucune routine planifiée',
      noRoutinesSub: 'Demandez à l’agent dans le chat de planifier un résumé quotidien.',
      editInChat: 'Modifier dans le chat',
      deactivateRoutine: 'Désactiver',
      activateRoutine: 'Activer',
      deleteRoutine: 'Supprimer',
      confirmBtn: 'Confirmer',
      nextLabel: 'Prochain',
      historyTitle: 'Historique d’exécution',
      historySub: 'Exécutions Inngest étape par étape des 3 derniers jours.',
      noHistory: 'Aucune exécution enregistrée au cours des 3 derniers jours.',
      pipelineLabel: 'Pipeline Inngest étape par étape',
    },
    toasts: {
      signedInTitle: 'Connecté avec Google',
      signedInDesc: 'Votre espace Orbit est synchronisé avec Firebase Auth & Firestore.',
      demoModeTitle: 'Session Espace Démo Active',
      demoModeDesc: 'La fenêtre OAuth a été fermée ; utilisation de la session Orbit locale.',
      signedOutTitle: 'Déconnecté',
      signedOutDesc: 'Retour à l’espace de démonstration.',
      agentCreatedTitle: 'Agent créé',
      agentSavedTitle: 'Configuration enregistrée',
      agentSavedDesc: 'Profil, instructions et statut mis à jour.',
      agentDeletedTitle: 'Agent supprimé',
      agentDeletedDesc: 'L’agent et ses routines associées ont été supprimés.',
      routineCreatedTitle: 'Routine planifiée',
      routineUpdatedTitle: 'Routine mise à jour',
      routineActiveTitle: 'Routine activée',
      routinePausedTitle: 'Routine désactivée',
      routineDeletedTitle: 'Routine supprimée',
      routineCompletedTitle: 'Exécution de la routine terminée',
      routineFailedTitle: 'Échec de l’exécution de la routine',
      cronCheckEmptyTitle: 'Vérification Cron 60m terminée',
      cronCheckEmptyDesc: 'Aucune routine active dans la fenêtre à venir.',
    },
  },
  it: {
    nav: {
      capabilities: 'Funzionalità',
      cloudVm: 'Cloud VM',
      routines: 'Routine',
      marketplace: 'Marketplace',
      openWorkspace: 'Apri Workspace',
    },
    landing: {
      eyebrow: 'SaaS di Agenti IA Autonomi · Cloud VM Persistente · Scheduler Inngest',
      heroTitle: 'Distribuisci agenti IA con il proprio desktop Cloud e routine ricorrenti.',
      heroSubtitle:
        'Crea agenti personalizzati connessi a Gmail, Slack, GitHub e Notion tramite Composio, esegui pianificazioni ricorrenti in background con Inngest e gestisci un browser Cloud VM E2B dal vivo.',
      ctaPrimary: 'Avvia Workspace Agente',
      ctaCreate: 'Crea Nuovo Agente',
      ctaGoogle: 'Continua con Google',
      activeAgentsTitle: 'Agenti attivi nel Workspace',
      sandboxReady: 'Sandbox E2B Pronto',
      connectedTools: 'strumenti connessi',
      chatLink: 'Chat →',
      demoNoteTitle: 'Routine dimostrativa operativa inclusa',
      demoNoteBody:
        'Clicca su un agente qui sopra per testare i riepiloghi giornalieri da Gmail a Slack, le esecuzioni manuali Inngest e la navigazione Google News dal vivo sul Cloud VM.',
      stat1Value: '12+ Strumenti MCP',
      stat1Desc: 'Sessioni OAuth2 gestite per Gmail, Slack, GitHub, Notion, Calendar e Reddit',
      stat2Value: 'Cron 60m',
      stat2Desc: 'Esecuzione durevole Inngest in 5 fasi con tentativi automatici e log',
      stat3Value: 'Pausa Auto 120s',
      stat3Desc: 'Desktop virtuali Cloud E2B dedicati per agente con sessioni browser persistenti',
      stat4Value: 'Log 72h',
      stat4Desc: 'Cronologia di 3 giorni delle esecuzioni e delle chat sincronizzata per agente',
      sec1Title: '01. Capacità Agentiche Fondamentali',
      sec1Sub:
        'Ogni agente combina istruzioni personalizzate, toolkit OAuth, pianificazione durevole e un desktop Cloud.',
      cap1Title: 'Desktop Cloud VM E2B Persistente',
      cap1Body:
        'Ogni agente ottiene il proprio desktop Linux isolato e browser Chrome. Chiedigli di analizzare Google News o ispezionare dashboard autenticate in tempo reale.',
      cap2Title: 'Scheduler di Routine Ricorrenti Inngest',
      cap2Body:
        'Descrivi la tua pianificazione in italiano, francese o inglese. Il tuo agente verifica i canali, crea una scheda Routine ed esegue job in 5 passaggi.',
      cap3Title: 'Sessioni Multi-Strumento Composio',
      cap3Body:
        'Collega Gmail, Slack, GitHub, Notion, Google Docs e Linear a un singolo ID di sessione per agente.',
      sec2Title: '02. Marketplace Strumenti Integrato',
      sec2Sub: 'Integrazioni MCP Composio preconfigurate pronte per essere collegate a qualsiasi agente.',
      openMarketplaceBtn: 'Apri tutto il Marketplace',
      footerBrand: 'Piattaforma di Automazione Agenti IA Orbit',
      footerEnter: 'Entra nel Workspace →',
    },
    sidebar: {
      overview: 'Panoramica',
      createAgent: 'Crea Agente',
      yourAgents: 'I Tuoi Agenti',
      toolsCount: 'strumenti',
      toolMarketplace: 'Strumenti MCP',
      signInGoogle: 'Accedi con Google',
      signOut: 'Disconnetti',
    },
    workspace: {
      title: 'Workspace degli Agenti',
      subtitle:
        'Gestisci i tuoi agenti IA autonomi, gli strumenti Composio connessi, le pianificazioni Inngest e i desktop Cloud VM E2B.',
      emptyTitle: 'Crea il tuo primo Agente IA',
      emptySub:
        'Configura istruzioni personalizzate, connetti Gmail e Slack e avvia un sandbox desktop Cloud VM dedicato.',
      active: 'Attivo',
      paused: 'In pausa',
      routinesCount: 'routine',
      runsCount: 'esecuzioni',
      openAgent: 'Apri Agente',
    },
    createAgent: {
      title: 'Crea Nuovo Agente IA',
      subtitle: 'Ogni agente riceve la propria sessione Composio e un desktop Cloud VM E2B dedicato.',
      back: 'Indietro',
      avatarTitle: 'Avatar dell’Agente',
      avatarDesc: 'Generato con lo stile DiceBear Glass. Mescola per scegliere un’identità unica.',
      shuffleBtn: 'Cambia Avatar',
      nameLabel: 'Nome Agente',
      namePlaceholder: 'es. Mickey, Briefing Giornaliero, Analizzatore YouTube',
      descLabel: 'Istruzioni e Descrizione (Opzionale)',
      descPlaceholder:
        'Descrivi come deve comportarsi il tuo agente, quali strumenti privilegiare o i canali Slack predefiniti...',
      cancel: 'Annulla',
      submit: 'Crea Agente',
      creating: 'Creazione in corso...',
      errorNameRequired: 'Inserisci un nome per l’agente prima di procedere.',
    },
    marketplace: {
      title: 'Marketplace Strumenti Composio & MCP',
      subtitle:
        'Connetti toolkit OAuth2 e MCP direttamente alla sessione Composio persistente del tuo agente.',
      targetAgent: 'Agente di destinazione:',
      searchPlaceholder: 'Cerca Gmail, Slack, GitHub, Notion, Calendar...',
      catAll: 'Tutti',
      connectedTitle: 'Strumenti connessi',
      sessionId: 'ID Sessione',
      noConnectedMatch: 'Nessuno strumento connesso corrisponde a questo filtro.',
      connectedStatus: 'Connesso',
      disconnectBtn: 'Disconnetti',
      availableTitle: 'Strumenti disponibili',
      connectBtn: 'Connetti',
      connectingBtn: 'Connessione...',
    },
    vm: {
      running: 'In esecuzione (Desktop Ubuntu 24.04)',
      paused: 'In pausa (Sessione preservata)',
      inactive: 'Inattivo',
      autoPauseIn: 'Pausa auto tra',
      pauseSandbox: 'Metti in pausa',
      resumeSandbox: 'Riprendi sessione VM',
      chromeTab: 'Google Chrome',
      terminalTab: 'Terminale Bash Agente',
      filesTab: 'Esplora File (/home/user)',
      presetNews: 'Preset: Google News IA',
      presetCourses: 'Preset: Corsi TubeGuruji',
      pausedDesc:
        'Le schede del browser, i cookie autenticati e i file di lavoro sono preservati. Clicca qui sotto per riprendere immediatamente lo streaming del desktop.',
      activateBtn: 'Attiva Desktop Cloud VM',
      navigateBtn: 'Naviga',
      liveSession: 'Sessione autenticata dal vivo',
      actionTraceTitle: 'Traccia Azioni Computer-Use dell’Agente',
      actionTraceSub: 'Azioni browser autonome eseguite all’interno del sandbox E2B.',
    },
    chat: {
      activeAgent: 'Agente attivo',
      pausedAgent: 'In pausa',
      cloudVmLive: 'Cloud VM (Live)',
      cloudVmOpen: 'Cloud VM (Apri)',
      resetChat: 'Reimposta conversazione',
      editingBannerPrefix: 'Modifica Routine',
      editingBannerHint: 'Indica il nuovo orario o canale (es. "Cambia l’orario alle 9:00 AM").',
      cancelEdit: 'Annulla',
      thinking: 'sta elaborando e pianificando l’esecuzione degli strumenti...',
      inputPlaceholder:
        'Chiedi di automatizzare le email, pianificare una routine Slack o navigare su Google News con il Cloud VM...',
      editPlaceholder: 'Aggiorna la routine (es. "Cambia l’orario alle 9:00 AM")...',
      sendBtn: 'Invia',
      quickPrompts: [
        'Invia un riepilogo delle prime 5 email non lette su #new-channel in Slack ogni giorno alle 8:00 AM',
        'Dammi le prime 5 notizie IA da Google News usando il Cloud VM',
        'Connetti Gmail e Slack',
        'Mostrami tutti i canali Slack',
      ],
      clarificationTitle: 'Chiarimento necessario',
      inspectLiveVm: 'Ispeziona VM dal vivo',
      vmTraceTitle: 'Traccia Browser Cloud VM E2B',
    },
    routineCard: {
      updateHeader: 'Aggiorna routine pianificata',
      proposalHeader: 'Proposta di routine automatizzata',
      instructionsLabel: 'Istruzioni di esecuzione dell’agente',
      cadence: 'Frequenza',
      scheduledTime: 'Orario pianificato',
      timezone: 'Fuso orario',
      targetChannel: 'Canale di destinazione',
      scheduledDays: 'Giorni pianificati',
      requiredTools: 'Strumenti richiesti',
      connectToolsWarning: 'Connetti gli strumenti qui sopra per abilitare la creazione della routine.',
      allToolsReady: 'Tutti gli strumenti richiesti sono connessi e pronti per l’esecuzione in background.',
      createdBadge: 'Routine creata',
      updatedBadge: 'Routine aggiornata',
      createBtn: 'Crea routine',
      updateBtn: 'Aggiorna routine',
      savingBtn: 'Salvataggio...',
    },
    toolCard: {
      connected: 'Connesso',
      required: 'Connessione richiesta',
      disconnect: 'Disconnetti',
      connect: 'Connetti',
      connecting: 'Connessione...',
    },
    config: {
      headerTitle: 'Configurazione Agente',
      saveBtn: 'Salva',
      savingBtn: 'Salvataggio...',
      shuffleAvatar: 'Cambia Avatar',
      tabSettings: 'Impostazioni',
      tabTools: 'Strumenti',
      tabSchedule: 'Routine',
      tabHistory: 'Cronologia',
      vmTitle: 'Desktop Cloud VM',
      vmActive: 'Attivo',
      vmPaused: 'In pausa',
      vmInactive: 'Inattivo',
      vmLiveStream: 'LIVE STREAM',
      vmSessionNote: 'Cookie di sessione e schede attive preservati sul sandbox E2B.',
      vmClickFull: 'Clicca per aprire a schermo intero',
      vmAutoPauseNote: 'Pausa auto dopo 2 min di inattività',
      vmReactivate: 'Riattiva VM',
      vmStart: 'Avvia Cloud VM',
      vmOpenFullBtn: 'Schermo intero',
      vmPauseBtn: 'Pausa',
      instructionsLabel: 'Descrizione e Istruzioni',
      instructionsSub: 'Regole di comportamento globali, tono e canali predefiniti.',
      managementTitle: 'Gestione Agente',
      agentStatusLabel: 'Stato Agente',
      agentStatusSub: 'Metti in pausa l’agente per sospendere le routine.',
      pauseAgentBtn: 'Metti in pausa',
      activateAgentBtn: 'Attiva Agente',
      dangerZone: 'Zona pericolosa',
      deleteAgentBtn: 'Elimina Agente',
      deleteConfirmPrompt: 'Eliminare definitivamente questo agente e tutte le sue routine?',
      confirmDeleteBtn: 'Conferma eliminazione',
      cancelBtn: 'Annulla',
      connectedToolsTitle: 'Strumenti connessi',
      addToolBtn: 'Aggiungi strumento',
      noToolsTitle: 'Nessuno strumento connesso',
      noToolsSub:
        'Connetti Gmail, Slack, GitHub, Notion o Reddit dal marketplace o direttamente tramite chat.',
      browseMarketplaceBtn: 'Sfoglia Marketplace',
      activeMcpAccess: 'Connesso · Accesso MCP attivo',
      scheduledRoutinesTitle: 'Routine pianificate',
      inngestSub: 'La coda Inngest controlla i job ogni 60 minuti.',
      invokeCronBtn: 'Avvia Cron 60m',
      runNowPrompt: 'Eseguire ora',
      runNowSub: 'Questo avvierà immediatamente il workflow Inngest in 5 passaggi verso',
      runBtn: 'Esegui',
      runNowBtn: 'Esegui ora',
      runningInngest: 'Esecuzione Inngest...',
      noRoutinesTitle: 'Nessuna routine pianificata',
      noRoutinesSub: 'Chiedi all’agente in chat di pianificare un riepilogo giornaliero.',
      editInChat: 'Modifica in chat',
      deactivateRoutine: 'Disattiva',
      activateRoutine: 'Attiva',
      deleteRoutine: 'Elimina',
      confirmBtn: 'Conferma',
      nextLabel: 'Prossima',
      historyTitle: 'Cronologia esecuzioni',
      historySub: 'Esecuzioni Inngest passo dopo passo degli ultimi 3 giorni.',
      noHistory: 'Nessuna esecuzione registrata negli ultimi 3 giorni.',
      pipelineLabel: 'Pipeline Inngest passo dopo passo',
    },
    toasts: {
      signedInTitle: 'Accesso effettuato con Google',
      signedInDesc: 'Il tuo workspace Orbit è sincronizzato con Firebase Auth & Firestore.',
      demoModeTitle: 'Sessione Demo Workspace attiva',
      demoModeDesc: 'La finestra OAuth è stata chiusa; utilizzo della sessione Orbit locale.',
      signedOutTitle: 'Disconnesso',
      signedOutDesc: 'Ritorno al workspace dimostrativo.',
      agentCreatedTitle: 'Agente creato',
      agentSavedTitle: 'Configurazione salvata',
      agentSavedDesc: 'Profilo, istruzioni e stato aggiornati.',
      agentDeletedTitle: 'Agente eliminato',
      agentDeletedDesc: 'L’agente e le relative pianificazioni sono stati rimossi.',
      routineCreatedTitle: 'Routine pianificata',
      routineUpdatedTitle: 'Routine aggiornata',
      routineActiveTitle: 'Routine attivata',
      routinePausedTitle: 'Routine disattivata',
      routineDeletedTitle: 'Routine eliminata',
      routineCompletedTitle: 'Esecuzione routine completata',
      routineFailedTitle: 'Esecuzione routine fallita',
      cronCheckEmptyTitle: 'Controllo Cron 60m completato',
      cronCheckEmptyDesc: 'Nessuna routine attiva nella finestra imminente.',
    },
  },
  en: {
    nav: {
      capabilities: 'Capabilities',
      cloudVm: 'Cloud VM',
      routines: 'Routines',
      marketplace: 'Marketplace',
      openWorkspace: 'Open Workspace',
    },
    landing: {
      eyebrow: 'Autonomous AI Agent SaaS · Persistent Cloud VM · Inngest Scheduler',
      heroTitle: 'Deploy AI Agents with Their Own Cloud Desktop and Recurring Routines.',
      heroSubtitle:
        'Create custom agents that connect to Gmail, Slack, GitHub, and Notion via Composio, execute recurring schedules in the background with Inngest, and operate a live E2B Cloud VM browser on your behalf.',
      ctaPrimary: 'Launch Agent Workspace',
      ctaCreate: 'Create New Agent',
      ctaGoogle: 'Continue with Google',
      activeAgentsTitle: 'Active Workspace Agents',
      sandboxReady: 'E2B Sandbox Ready',
      connectedTools: 'connected tools',
      chatLink: 'Chat →',
      demoNoteTitle: 'Instant Demo Routine Included',
      demoNoteBody:
        'Click any agent above to test daily unread Gmail-to-Slack summaries, manual Inngest runs, and live Google News browsing on the Cloud VM.',
      stat1Value: '12+ MCP Tools',
      stat1Desc: 'Managed OAuth2 sessions for Gmail, Slack, GitHub, Notion, Calendar & Reddit',
      stat2Value: '60m Cron Queue',
      stat2Desc: '5-step durable Inngest workflow execution with automatic retry & step logs',
      stat3Value: '120s Auto-Pause',
      stat3Desc: 'Per-agent E2B Cloud VM desktop sandboxes with persistent browser sessions',
      stat4Value: '72h Audit Log',
      stat4Desc: 'Rolling 3-day execution trace and chat history synchronized per agent',
      sec1Title: '01. Core Agentic Capabilities',
      sec1Sub:
        'Every agent combines custom instructions, OAuth toolkits, durable scheduling, and a cloud desktop.',
      cap1Title: 'Persistent E2B Cloud VM Desktop',
      cap1Body:
        'Each agent gets its own isolated Linux desktop and Chrome browser. Ask your agent to scrape Google News or inspect authenticated dashboards in real time.',
      cap2Title: 'Inngest Recurring Routine Scheduler',
      cap2Body:
        'Describe your schedule in French, Italian, or English. Your agent clarifies target channels, builds a structured Routine Card, and executes 5-step background jobs.',
      cap3Title: 'Composio Multi-Tool Sessions',
      cap3Body:
        'Bind Gmail, Slack, GitHub, Notion, Google Docs, and Linear to a single per-agent session ID.',
      sec2Title: '02. Integrated Tool Marketplace',
      sec2Sub: 'Pre-configured Composio MCP integrations ready to attach to any agent.',
      openMarketplaceBtn: 'Open Full Marketplace',
      footerBrand: 'Orbit AI Agent Automation Platform',
      footerEnter: 'Enter Workspace →',
    },
    sidebar: {
      overview: 'Overview',
      createAgent: 'Create Agent',
      yourAgents: 'Your Agents',
      toolsCount: 'tools',
      toolMarketplace: 'Tool Marketplace',
      signInGoogle: 'Sign in with Google',
      signOut: 'Sign out',
    },
    workspace: {
      title: 'Agent Workspace',
      subtitle:
        'Manage your autonomous AI agents, connected Composio tools, Inngest schedules, and E2B Cloud VM desktops.',
      emptyTitle: 'Create your first AI Agent',
      emptySub:
        'Configure custom instructions, connect Gmail and Slack, and spin up a dedicated Cloud VM desktop sandbox.',
      active: 'Active',
      paused: 'Paused',
      routinesCount: 'routines',
      runsCount: 'runs',
      openAgent: 'Open Agent',
    },
    createAgent: {
      title: 'Create New AI Agent',
      subtitle: 'Each agent gets its own Composio tool session and E2B Cloud VM desktop.',
      back: 'Back',
      avatarTitle: 'Agent Avatar',
      avatarDesc: 'Generated with DiceBear Glass style. Shuffle to pick a unique visual identity.',
      shuffleBtn: 'Shuffle Avatar',
      nameLabel: 'Agent Name',
      namePlaceholder: 'e.g., Mickey, Daily Briefer, YouTube Analyzer',
      descLabel: 'Instructions & Description (Optional)',
      descPlaceholder:
        'Describe how your agent should behave, what tools it should prioritize, or default Slack channels...',
      cancel: 'Cancel',
      submit: 'Create Agent',
      creating: 'Creating Agent...',
      errorNameRequired: 'Please enter an Agent Name before creating.',
    },
    marketplace: {
      title: 'Composio Tool & MCP Marketplace',
      subtitle:
        'Connect OAuth2 and MCP toolkits directly to your agent’s persistent Composio session.',
      targetAgent: 'Target Agent:',
      searchPlaceholder: 'Search Gmail, Slack, GitHub, Notion, Calendar...',
      catAll: 'All',
      connectedTitle: 'Connected Tools',
      sessionId: 'Session ID',
      noConnectedMatch: 'No connected tools match this filter.',
      connectedStatus: 'Connected',
      disconnectBtn: 'Disconnect',
      availableTitle: 'Available Tools',
      connectBtn: 'Connect',
      connectingBtn: 'Connecting...',
    },
    vm: {
      running: 'Running (Ubuntu 24.04 Desktop)',
      paused: 'Paused (Session Preserved)',
      inactive: 'Inactive',
      autoPauseIn: 'Auto-pause in',
      pauseSandbox: 'Pause Sandbox',
      resumeSandbox: 'Resume VM Session',
      chromeTab: 'Google Chrome',
      terminalTab: 'Agent Bash Terminal',
      filesTab: 'File Explorer (/home/user)',
      presetNews: 'Preset: Google News AI',
      presetCourses: 'Preset: TubeGuruji Courses',
      pausedDesc:
        'Your previous browser tabs, logged-in cookies, and workspace files are preserved. Click below to resume the desktop stream immediately.',
      activateBtn: 'Activate Cloud VM Desktop',
      navigateBtn: 'Navigate',
      liveSession: 'Live Authenticated Session',
      actionTraceTitle: 'Agent Computer-Use Action Trace',
      actionTraceSub: 'Autonomous browser actions executed inside E2B sandbox.',
    },
    chat: {
      activeAgent: 'Active Agent',
      pausedAgent: 'Paused',
      cloudVmLive: 'Cloud VM (Live)',
      cloudVmOpen: 'Cloud VM (Open)',
      resetChat: 'Reset conversation',
      editingBannerPrefix: 'Editing Routine',
      editingBannerHint: 'Tell the agent what schedule or channel to update (e.g. "Change time to 9:00 AM").',
      cancelEdit: 'Cancel',
      thinking: 'is thinking and planning tool execution...',
      inputPlaceholder:
        'Ask to automate emails, schedule a Slack routine, or browse Google News on the Cloud VM...',
      editPlaceholder: 'Update routine (e.g. "Change schedule time to 9:00 AM")...',
      sendBtn: 'Send',
      quickPrompts: [
        'Send email summary of top 5 unread emails to #new-channel on Slack every day at 8:00 AM',
        'Give me top 5 AI news from Google News using VM desktop',
        'Connect to Gmail and Slack',
        'Give me all Slack channel list',
      ],
      clarificationTitle: 'Clarification Needed',
      inspectLiveVm: 'Inspect Live VM',
      vmTraceTitle: 'E2B Cloud VM Browser Trace',
    },
    routineCard: {
      updateHeader: 'Update Scheduled Routine',
      proposalHeader: 'Automated Routine Proposal',
      instructionsLabel: 'Agent Execution Instructions',
      cadence: 'Start Cadence',
      scheduledTime: 'Scheduled Time',
      timezone: 'Time Zone',
      targetChannel: 'Target Channel',
      scheduledDays: 'Scheduled Days',
      requiredTools: 'Required Tools',
      connectToolsWarning: 'Connect required tools above to enable routine creation.',
      allToolsReady: 'All required tools are connected and ready for background execution.',
      createdBadge: 'Routine Created',
      updatedBadge: 'Routine Updated',
      createBtn: 'Create Routine',
      updateBtn: 'Update Routine',
      savingBtn: 'Saving...',
    },
    toolCard: {
      connected: 'Connected',
      required: 'Connection Required',
      disconnect: 'Disconnect',
      connect: 'Connect',
      connecting: 'Connecting...',
    },
    config: {
      headerTitle: 'Agent Configuration',
      saveBtn: 'Save',
      savingBtn: 'Saving...',
      shuffleAvatar: 'Shuffle Avatar',
      tabSettings: 'Settings',
      tabTools: 'Tools',
      tabSchedule: 'Schedule',
      tabHistory: 'History',
      vmTitle: 'Cloud VM Desktop',
      vmActive: 'Active',
      vmPaused: 'Paused',
      vmInactive: 'Inactive',
      vmLiveStream: 'LIVE STREAM',
      vmSessionNote: 'Session cookies & active browser tabs persisted on E2B sandbox.',
      vmClickFull: 'Click to open full desktop',
      vmAutoPauseNote: 'Auto-pauses after 2m of inactivity',
      vmReactivate: 'Reactivate VM',
      vmStart: 'Start Cloud VM',
      vmOpenFullBtn: 'Open Full Screen',
      vmPauseBtn: 'Pause',
      instructionsLabel: 'Description & Instructions',
      instructionsSub: 'Global behavior rules, tone, and default channels.',
      managementTitle: 'Agent Management',
      agentStatusLabel: 'Agent Status',
      agentStatusSub: 'Pause agent to suspend all background routines.',
      pauseAgentBtn: 'Pause Agent',
      activateAgentBtn: 'Activate Agent',
      dangerZone: 'Danger Zone',
      deleteAgentBtn: 'Delete Agent',
      deleteConfirmPrompt: 'Permanently delete this agent and all routines?',
      confirmDeleteBtn: 'Confirm Delete',
      cancelBtn: 'Cancel',
      connectedToolsTitle: 'Connected Tools',
      addToolBtn: 'Add Tool',
      noToolsTitle: 'No tools connected yet',
      noToolsSub:
        'Connect Gmail, Slack, GitHub, Notion, or Reddit from the marketplace or directly via chat.',
      browseMarketplaceBtn: 'Browse Marketplace',
      activeMcpAccess: 'Connected · Active MCP Access',
      scheduledRoutinesTitle: 'Scheduled Routines',
      inngestSub: 'Inngest background queue checks every 60 minutes.',
      invokeCronBtn: 'Invoke 60m Cron',
      runNowPrompt: 'Run now',
      runNowSub: 'This will immediately trigger the 5-step Inngest workflow and deliver output to',
      runBtn: 'Run',
      runNowBtn: 'Run Now',
      runningInngest: 'Running Inngest...',
      noRoutinesTitle: 'No routines scheduled yet',
      noRoutinesSub: 'Ask the agent in chat to schedule a daily email summary or Slack briefing.',
      editInChat: 'Edit in Chat',
      deactivateRoutine: 'Deactivate',
      activateRoutine: 'Activate',
      deleteRoutine: 'Delete',
      confirmBtn: 'Confirm',
      nextLabel: 'Next',
      historyTitle: 'Routine Execution History',
      historySub: 'Showing step-by-step Inngest runs from the past 3 days.',
      noHistory: 'No routine executions recorded in the last 3 days.',
      pipelineLabel: 'Inngest Step-by-Step Pipeline',
    },
    toasts: {
      signedInTitle: 'Signed in with Google',
      signedInDesc: 'Your Orbit workspace is now synced with Firebase Auth & Firestore.',
      demoModeTitle: 'Continuing in Demo Workspace',
      demoModeDesc: 'Google OAuth popup was closed; using active Orbit workspace session.',
      signedOutTitle: 'Signed out',
      signedOutDesc: 'Switched back to local demo workspace.',
      agentCreatedTitle: 'Agent Created',
      agentSavedTitle: 'Agent Configuration Saved',
      agentSavedDesc: 'Updated profile, instructions, and state.',
      agentDeletedTitle: 'Agent Deleted',
      agentDeletedDesc: 'Agent and its associated schedules have been removed.',
      routineCreatedTitle: 'Routine Scheduled',
      routineUpdatedTitle: 'Routine Updated',
      routineActiveTitle: 'Routine Activated',
      routinePausedTitle: 'Routine Deactivated',
      routineDeletedTitle: 'Routine Deleted',
      routineCompletedTitle: 'Routine Execution Completed',
      routineFailedTitle: 'Routine Execution Failed',
      cronCheckEmptyTitle: '60-Minute Cron Check Complete',
      cronCheckEmptyDesc: 'No active routines found in the upcoming 60-minute window.',
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] || DICTIONARIES.fr;
}
