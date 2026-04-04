export const appCopy = {
  brand: {
    eyebrow: "Organiser",
    title: "Badminton Session Planner",
  },
  renameDialog: {
    eyebrow: "Rename Session",
    title: "Update the session name",
    fieldLabel: "Session name",
    cancel: "Cancel",
    submit: "Save Name",
    submitLoading: "Saving...",
  },
  planner: {
    eyebrow: "Planner",
    title: "Build the next session from scratch",
    description:
      "Add players, configure the format, generate the roster, and start a new session.",
    badges: [
      "Player-first setup",
      "Fast roster generation",
      "History-aware sessions",
    ],
  },
  organizerDialog: {
    eyebrow: "Organizer Check",
    title: "Enter organizer token to start a session",
    description:
      "This is a temporary safeguard until login exists. The token is remembered on this device so organizers do not need to re-enter it every time.",
    fieldLabel: "Organizer token",
    fieldPlaceholder: "Enter ADMIN_RECOVERY_TOKEN",
    cancel: "Cancel",
    submit: "Start Session",
    submitLoading: "Checking...",
  },
};

export const activeSessionsPageCopy = {
  hero: {
    eyebrow: "Active Sessions",
    title: "Resume, share, and manage ongoing sessions",
    description:
      "Completed sessions move to History once results are locked in.",
  },
  section: {
    eyebrow: "Ongoing Work",
    title: "Sessions that are ready or in progress",
    description: "Existing sessions.",
    refresh: "Refresh Sessions",
    accessScorer: "Scorer access available on this device",
    accessViewOnly: "View-only link available",
    updatedPrefix: "Updated",
    openScorer: "Open Scorer View",
    openView: "Open View Link",
    copyView: "Copy View",
    copyScorer: "Copy Scorer",
    rename: "Rename",
    delete: "Delete",
    emptyTitle: "No active sessions right now",
    emptyDescription: "Create one from the Planner when you are ready to score.",
  },
};

export const playerInputCopy = {
  sessionPlayers: {
    title: "Session Players",
    description:
      "Pick players from the registry for this session. Using the directory avoids typos and keeps names consistent.",
    countSuffix: "selected",
    manage: "Manage Players",
    emptyTitle: "No session players yet",
    emptyDescription: "Add players from the directory to start building this session roster.",
    pairPromptPrefix: "Select a partner for",
    pairPromptSuffix: "or tap the same player again to cancel.",
    pairedWith: "paired with",
    remove: "Remove",
  },
  directory: {
    title: "Player Directory",
    description: "Search by full name, short name, or player ID.",
    countSuffix: "total",
    searchPlaceholder: "Search players...",
    add: "Add",
    noMatchTitle: "No players match this search",
    noMatchDescription: "Try a different name, short name, or player ID.",
    emptyTitle: "No players in the directory yet",
    emptyDescription: "Create players first, then come back here to build a session.",
  },
  fixedPairs: {
    title: "Fixed Pairs",
    description: "Current locked partnerships for this session.",
    countSuffix: "pairs",
  },
};

export const playersPageCopy = {
  hero: {
    eyebrow: "Players",
    title: "Build a clean player directory once",
    description:
      "Register full names and short names here, then reuse them in Planner without retyping.",
    },
  addPlayer: {
    eyebrow: "Add Player",
    title: "Player details",
    description: "Full name is for the directory. Short name is what shows up in the roster and scoring flow.",
    fullName: "Full Name",
    fullNamePlaceholder: "Arijit Mukherjee",
    shortName: "Short Name",
    shortNamePlaceholder: "Arijit",
    submit: "Create Player",
  },
  editPlayer: {
    eyebrow: "Edit Player",
    title: "Update player details",
    description:
      "This keeps the player ID stable while updating how the player appears in Planner, scoring, and the directory.",
    submit: "Save Changes",
    submitLoading: "Saving...",
  },
  directory: {
    eyebrow: "Directory",
    title: "Registered players",
    description:
      "Registered Players in the club.",
    refresh: "Refresh Players",
    refreshLoading: "Refreshing...",
    emptyTitle: "No players yet",
    emptyDescription: "Add the first player from the form on the left, then they will appear here for quick management.",
    aliasesPrefix: "Also matched from older names:",
    edit: "Edit",
    delete: "Delete",
  },
  deletePlayer: {
    eyebrow: "Delete Player",
    title: "This action is intentionally strict",
    descriptionLead: "You are deleting",
    descriptionMiddle: "from the player directory.",
    descriptionOne: "This hides the player from Planner and Player Management. Existing sessions are not removed automatically.",
    descriptionTwo:
      "If you also tick the historical option below, player analytics records will be deleted as well. Use that only if you truly want to remove the player from historical stats.",
    tokenLabel: "Admin token",
    tokenPlaceholder: "Enter DELETE token to confirm",
    deleteHistory: "Also delete historical player records",
    cancel: "Cancel",
    submit: "Delete Player",
    submitLoading: "Deleting...",
  },
};

export const historyPageCopy = {
  hero: {
    eyebrow: "History",
    title: "Completed sessions and final results",
    description:
      "Finished sessions. Open any result to review the final tables and bracket, or delete it if you still have scorer access.",
  },
  section: {
    eyebrow: "Completed Sessions",
    title: "Historical results",
    refresh: "Refresh History",
    refreshLoading: "Refreshing...",
    completed: "Completed",
    open: "Open Results",
    delete: "Delete",
    championPrefix: "Champion:",
    emptyTitle: "No completed sessions yet",
    emptyDescription:
      "Once a session is fully finished, it will appear here automatically with its final results.",
  },
};

export const playerStatsPageCopy = {
  hero: {
    eyebrow: "Player Stats",
    title: "League and knockout performance in one place",
    description:
      "Browse all-time player results from completed sessions, with a simpler summary of activity, titles, and strongest partnerships.",
  },
  leaderboard: {
    eyebrow: "Players",
    title: "Leaderboard",
    refresh: "Refresh",
    refreshLoading: "Refreshing...",
    sessionsSuffix: "sessions",
    matchesSuffix: "matches",
    titlesSuffix: "titles",
    emptyTitle: "No player stats yet",
    emptyDescription:
      "Complete some sessions first, then player performance will appear here automatically.",
  },
  profile: {
    eyebrow: "Profile",
    lastSessionPrefix: "Last completed session:",
    noSessions: "No completed sessions yet",
    loading: "Loading player details...",
    emptyTitle: "Select a player",
    emptyDescription: "Choose someone from the leaderboard to view their league and knockout performance.",
  },
  metrics: {
    sessions: "Sessions",
    matches: "Matches",
    winRate: "Win Rate",
    championships: "Championships",
  },
  partners: {
    eyebrow: "Top Partners",
    titlePrefix: "Best-performing partners for",
    matchesTogetherSuffix: "matches together",
    winsSuffix: "wins",
    winRateSuffix: "win rate",
    emptyTitle: "No ranked partners yet",
    emptyDescription:
      "Once enough completed matches are available, the strongest partnerships will show up here.",
  },
};
