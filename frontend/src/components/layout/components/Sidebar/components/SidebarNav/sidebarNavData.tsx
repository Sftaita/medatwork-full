const linkTextSx = { textDecoration: "none", display: "block" };

// ── Icônes réutilisables ──────────────────────────────────────────────────────

const Icon = ({ d, d2, fill }: { d: string; d2?: string; fill?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={fill ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" width={20} height={20}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d2} />}
  </svg>
);

// Paths used in multiple places
const PATHS = {
  years:       "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  addFolder:   "M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chart:       "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
  chart2:      "M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
  clipboard:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  bell:        "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  calendar:    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z",
  clock:       "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  list:        "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  building:    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  users:       "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  userCircle:  "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  userSingle:  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  chat:        "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  doc:         "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  download:    "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  cog:         "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  cogCircle:   "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  check:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
};

// ── noAuth ────────────────────────────────────────────────────────────────────

const noAuth = [
  {
    groupTitle: "Générale",
    id: "general",
    pages: [
      { title: "Notre Service", href: "/description", disabled: false, icon: <Icon d={PATHS.building} /> },
    ],
  },
  {
    groupTitle: "Compte",
    id: "account",
    pages: [
      { title: "Se connecter",  href: "/login",      icon: <Icon d={PATHS.userCircle} /> },
      { title: "S'enregistrer", href: "/connecting", icon: <Icon d={PATHS.userSingle} /> },
    ],
  },
];

// ── manager ───────────────────────────────────────────────────────────────────

const manager = [
  {
    groupTitle: "Année(s)",
    id: "years",
    pages: [
      { title: "Année(s)", href: "/manager/years", icon: <Icon d={PATHS.years} /> },
      { title: "AJOUTER",  href: "/manager/year",  icon: <Icon d={PATHS.addFolder} /> },
    ],
  },
  {
    groupTitle: "Tableau de bord",
    id: "select-tools",
    pages: [
      { title: "Temps réel",      href: "/manager/realtime",         icon: <Icon d={PATHS.chart} d2={PATHS.chart2} /> },
      { title: "Enregistrements", href: "/manager/data-tracking",    icon: <Icon d={PATHS.clipboard} /> },
      { title: "Validations",     href: "/manager/validation-story", icon: <Icon d={PATHS.check} /> },
      { title: "Notifications",   href: "/manager/notifications", disabled: false, count: true, icon: <Icon d={PATHS.bell} /> },
    ],
  },
  {
    groupTitle: "Agenda",
    id: "agenda",
    pages: [
      { title: "Calendrier",       href: "/manager/calendar",        icon: <Icon d={PATHS.calendar} /> },
      { title: "Horaires",         href: "/manager/week-dispatcher", icon: <Icon d={PATHS.clock} /> },
      { title: "Semaines modèles", href: "/manager/week-creator",    icon: <Icon d={PATHS.list} /> },
    ],
  },
];

// ── resident ──────────────────────────────────────────────────────────────────

const resident = [
  {
    groupTitle: "Générale",
    id: "general",
    pages: [
      { title: "Mes horaires",    href: "/maccs/timer",           icon: <Icon d={PATHS.clock} /> },
      { title: "Mes statistiques",href: "/maccs/statistics",      icon: <Icon d={PATHS.chart} d2={PATHS.chart2} /> },
      { title: "Mes encodages",   href: "/maccs/data-management", icon: <Icon d={PATHS.clipboard} /> },
    ],
  },
  {
    groupTitle: "Année(s)",
    id: "years",
    pages: [
      { title: "Mes années", href: "/maccs/years",  icon: <Icon d={PATHS.years} /> },
      { title: "AJOUTER",    href: "/maccs/search", icon: <Icon d={PATHS.addFolder} /> },
    ],
  },
  {
    groupTitle: "Compte",
    id: "account",
    pages: [
      { title: "Notification", href: "/maccs/notifications", disabled: false, count: true, commCount: false, icon: <Icon d={PATHS.bell} /> },
    ],
  },
];

// ── superAdmin ────────────────────────────────────────────────────────────────

const superAdmin = [
  {
    groupTitle: "Établissements",
    id: "hospitals",
    pages: [
      { title: "Hôpitaux", href: "/admin", exact: true, icon: <Icon d={PATHS.building} /> },
      { title: "Années",   href: "/admin/years",  icon: <Icon d={PATHS.calendar} /> },
    ],
  },
  {
    groupTitle: "Utilisateurs",
    id: "users",
    pages: [
      { title: "Managers",       href: "/admin/managers",        icon: <Icon d={PATHS.users} /> },
      { title: "Admins hôpital", href: "/admin/hospital-admins", icon: <Icon d={PATHS.userCircle} /> },
      { title: "MACCS",          href: "/admin/residents",        icon: <Icon d={PATHS.check} /> },
    ],
  },
  {
    groupTitle: "Communication",
    id: "admin-communication",
    pages: [
      { title: "Messages",        href: "/admin/communication", icon: <Icon d={PATHS.chat} /> },
      { title: "Msgs contact",    href: "/admin/contact",       icon: <Icon d={PATHS.bell} /> },
    ],
  },
  {
    groupTitle: "Système",
    id: "system",
    pages: [
      { title: "Logs", href: "/admin/logs", icon: <Icon d={PATHS.doc} /> },
    ],
  },
];

// ── hospitalAdmin ─────────────────────────────────────────────────────────────

const hospitalAdmin = [
  {
    groupTitle: "Admin hôpital",
    id: "hospital-admin",
    pages: [
      { title: "Tableau de bord",     href: "/hospital-admin/dashboard", icon: <Icon d={PATHS.building} /> },
      { title: "Gestion des MACCS",   href: "/hospital-admin/residents", icon: <Icon d={PATHS.users} /> },
      { title: "Gestion des managers",href: "/hospital-admin/managers",  icon: <Icon d={PATHS.userSingle} /> },
      { title: "Journal d'activité",  href: "/hospital-admin/audit-log", icon: <Icon d={PATHS.clipboard} /> },
      { title: "Exports RH",          href: "/hospital-admin/exports",   icon: <Icon d={PATHS.download} /> },
    ],
  },
  {
    groupTitle: "Agenda",
    id: "ha-agenda",
    pages: [
      { title: "Calendrier",       href: "/manager/calendar",        icon: <Icon d={PATHS.calendar} /> },
      { title: "Horaires",         href: "/manager/week-dispatcher", icon: <Icon d={PATHS.clock} /> },
      { title: "Semaines modèles", href: "/manager/week-creator",    icon: <Icon d={PATHS.list} /> },
    ],
  },
  {
    groupTitle: "Communication",
    id: "ha-communication",
    pages: [
      { title: "Notifications", href: "/hospital-admin/notifications", count: true, icon: <Icon d={PATHS.bell} /> },
      { title: "Messages",      href: "/hospital-admin/communication",              icon: <Icon d={PATHS.chat} /> },
    ],
  },
];

export { linkTextSx, noAuth, manager, resident, superAdmin, hospitalAdmin };
