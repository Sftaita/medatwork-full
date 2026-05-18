import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  title: string;
  body: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Para = ({ children }: { children: React.ReactNode }) => (
  <Typography component="p" color="text.secondary" align="justify" mb={1}>
    {children}
  </Typography>
);

const BulletList = ({ items }: { items: string[] }) => (
  <Box component="ul" sx={{ pl: 3, mt: 0.5, mb: 1 }}>
    {items.map((item, i) => (
      <Typography key={i} component="li" color="text.secondary" mb={0.25}>
        {item}
      </Typography>
    ))}
  </Box>
);

const SubSection = ({ subtitle, items }: { subtitle: string; items: string[] }) => (
  <Box mb={1.5}>
    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
      {subtitle}
    </Typography>
    <BulletList items={items} />
  </Box>
);

// ── Content ───────────────────────────────────────────────────────────────────

const sections: Section[] = [
  {
    title: "1. Introduction",
    body: (
      <>
        <Para>
          MED@WORK est une plateforme numérique destinée à la gestion des horaires, gardes, validations
          académiques, conformité du temps de travail et organisation hospitalière des médecins en
          formation (MACCS), maîtres de stage, coordinateurs, ressources humaines et administrateurs
          hospitaliers.
        </Para>
        <Para>
          La présente politique de confidentialité explique quelles données sont collectées, pourquoi
          elles sont utilisées, comment elles sont protégées et quels sont les droits des utilisateurs.
        </Para>
        <Para>L'utilisation de la plateforme implique l'acceptation de la présente politique.</Para>
      </>
    ),
  },
  {
    title: "2. Responsable du traitement",
    body: (
      <>
        <Para>Le responsable du traitement des données est : <strong>MED@WORK</strong></Para>
        <Para>Pour toute question relative à la protection des données :</Para>
        <Para>📧 Email : <strong>privacy@medatwork.be</strong></Para>
      </>
    ),
  },
  {
    title: "3. Données collectées",
    body: (
      <>
        <Para>
          Selon le rôle de l'utilisateur (MACCS, manager, RH, administrateur hospitalier), MED@WORK
          peut traiter les catégories de données suivantes.
        </Para>
        <SubSection
          subtitle="3.1 Données d'identification"
          items={[
            "Nom",
            "Prénom",
            "Adresse email professionnelle",
            "Sexe",
            "Fonction / rôle",
            "Hôpital de rattachement",
            "Année académique",
            "Spécialité médicale",
            "Photo de profil (optionnelle)",
          ]}
        />
        <SubSection
          subtitle="3.2 Données liées à l'activité professionnelle"
          items={[
            "Horaires de travail",
            "Gardes hospitalières",
            "Gardes appelables",
            "Absences",
            "Validations de périodes",
            "Statuts de validation",
            "Paramètres d'organisation des semaines modèles",
            "Assignations de planning",
            "Exports RH",
            "Données de conformité du temps de travail",
          ]}
        />
        <SubSection
          subtitle="3.3 Données techniques et de sécurité"
          items={[
            "Adresse IP",
            "Logs d'authentification",
            "Historique des connexions",
            "Type d'appareil et navigateur",
            "Tokens d'authentification",
            "Actions administratives réalisées dans l'application",
            "Données nécessaires à la sécurité et à la prévention des abus",
          ]}
        />
        <SubSection
          subtitle="3.4 Données de communication"
          items={[
            "Notifications internes",
            "Messages administratifs",
            "Confirmations d'actions",
            "Emails automatiques liés au fonctionnement de la plateforme",
          ]}
        />
      </>
    ),
  },
  {
    title: "4. Finalités du traitement",
    body: (
      <>
        <Para>Les données sont utilisées uniquement pour les finalités suivantes :</Para>
        <BulletList
          items={[
            "Gestion des comptes utilisateurs",
            "Gestion des années académiques",
            "Gestion des plannings et horaires",
            "Validation des prestations et périodes de formation",
            "Suivi de conformité du temps de travail des MACCS",
            "Génération des exports RH et Staff Planner",
            "Communication interne liée au fonctionnement hospitalier",
            "Sécurisation des accès et prévention des accès non autorisés",
            "Production de statistiques organisationnelles",
            "Maintenance et amélioration de la plateforme",
            "Respect des obligations légales et réglementaires",
          ]}
        />
        <Para>MED@WORK ne revend pas les données personnelles.</Para>
      </>
    ),
  },
  {
    title: "5. Base légale du traitement",
    body: (
      <>
        <Para>Les traitements sont fondés sur :</Para>
        <BulletList
          items={[
            "L'exécution du contrat ou de la relation professionnelle",
            "Le respect des obligations légales applicables aux établissements hospitaliers et à la formation médicale",
            "L'intérêt légitime lié à l'organisation hospitalière et à la sécurité informatique",
            "Le consentement de l'utilisateur lorsque celui-ci est requis",
          ]}
        />
      </>
    ),
  },
  {
    title: "6. Accès aux données",
    body: (
      <>
        <Para>
          Les données sont accessibles uniquement aux personnes autorisées selon leur rôle.
        </Para>
        <SubSection
          subtitle="6.1 Managers"
          items={["Peuvent accéder uniquement aux années académiques auxquelles ils sont explicitement associés."]}
        />
        <SubSection
          subtitle="6.2 Administrateurs hospitaliers"
          items={["Peuvent accéder aux données liées à leur établissement hospitalier."]}
        />
        <SubSection
          subtitle="6.3 Ressources humaines"
          items={["Peuvent accéder uniquement aux données nécessaires à la gestion administrative et aux exports réglementaires."]}
        />
        <SubSection
          subtitle="6.4 Super administrateurs"
          items={["Disposent d'un accès restreint destiné exclusivement à l'administration et à la maintenance de la plateforme."]}
        />
      </>
    ),
  },
  {
    title: "7. Mesures de sécurité",
    body: (
      <>
        <Para>
          MED@WORK applique des mesures techniques et organisationnelles visant à protéger les données.
          Ces mesures incluent notamment :
        </Para>
        <BulletList
          items={[
            "Connexions sécurisées HTTPS/TLS",
            "Authentification JWT sécurisée",
            "Tokens cryptographiquement sécurisés",
            "Segmentation des accès par rôles et permissions",
            "Validation stricte des données entrantes",
            "Journalisation des actions sensibles",
            "Protection contre les accès non autorisés",
            "Sauvegardes techniques",
            "Limitation des accès administratifs",
            "Mise à jour régulière des composants logiciels",
          ]}
        />
        <Para>
          Les mots de passe sont stockés sous forme hachée et ne sont jamais conservés en clair.
        </Para>
      </>
    ),
  },
  {
    title: "8. Hébergement et sous-traitants",
    body: (
      <>
        <Para>
          Les données peuvent être hébergées auprès de prestataires techniques situés dans l'Union
          européenne. Certains services tiers peuvent être utilisés pour :
        </Para>
        <BulletList
          items={[
            "L'envoi d'emails transactionnels",
            "L'hébergement sécurisé de la plateforme",
            "La surveillance technique et les journaux d'erreurs",
            "Les sauvegardes techniques",
          ]}
        />
        <Para>
          MED@WORK veille à travailler avec des prestataires présentant des garanties suffisantes en
          matière de sécurité et de conformité RGPD.
        </Para>
      </>
    ),
  },
  {
    title: "9. Durée de conservation",
    body: (
      <>
        <Para>
          Les données sont conservées uniquement pendant la durée nécessaire aux finalités décrites
          ci-dessus. La durée de conservation peut varier selon :
        </Para>
        <BulletList
          items={[
            "Les obligations légales hospitalières",
            "Les obligations administratives et académiques",
            "Les contraintes de sécurité informatique",
            "Les obligations comptables ou réglementaires",
          ]}
        />
        <Para>
          Les comptes inactifs peuvent être anonymisés ou supprimés après une période raisonnable.
        </Para>
      </>
    ),
  },
  {
    title: "10. Droits des utilisateurs",
    body: (
      <>
        <Para>
          Conformément au RGPD, chaque utilisateur dispose des droits suivants :
        </Para>
        <BulletList
          items={[
            "Droit d'accès",
            "Droit de rectification",
            "Droit à l'effacement",
            "Droit à la limitation du traitement",
            "Droit d'opposition",
            "Droit à la portabilité des données",
            "Droit d'introduire une réclamation auprès de l'autorité de protection des données",
          ]}
        />
        <Para>
          Les demandes peuvent être adressées à : 📧 <strong>privacy@medatwork.be</strong>
        </Para>
        <Para>
          MED@WORK pourra demander une preuve d'identité avant de répondre à certaines demandes.
        </Para>
      </>
    ),
  },
  {
    title: "11. Cookies et stockage local",
    body: (
      <>
        <Para>La plateforme peut utiliser :</Para>
        <BulletList
          items={[
            "Des cookies techniques nécessaires à l'authentification",
            "Des mécanismes de stockage local pour maintenir la session utilisateur",
            "Des éléments nécessaires au fonctionnement de l'application web progressive (PWA)",
          ]}
        />
        <Para>Ces éléments ne sont pas utilisés à des fins publicitaires.</Para>
      </>
    ),
  },
  {
    title: "12. Journalisation et audit",
    body: (
      <>
        <Para>
          Certaines actions sensibles peuvent être journalisées afin de garantir la sécurité, la
          traçabilité et la conformité du système. Cela peut inclure :
        </Para>
        <BulletList
          items={[
            "Connexions et déconnexions",
            "Échecs d'authentification",
            "Exports RH",
            "Modifications de permissions",
            "Validations administratives",
            "Actions des administrateurs",
          ]}
        />
        <Para>
          Ces journaux sont utilisés exclusivement à des fins de sécurité, d'audit et de maintenance.
        </Para>
      </>
    ),
  },
  {
    title: "13. Confidentialité médicale",
    body: (
      <>
        <Para>MED@WORK n'a pas vocation à devenir un dossier médical patient.</Para>
        <Para>
          La plateforme est conçue principalement pour l'organisation du travail, la planification, les
          validations académiques et la gestion administrative.
        </Para>
        <Para>
          Les utilisateurs doivent éviter d'introduire des données médicales sensibles non nécessaires
          au fonctionnement de la plateforme.
        </Para>
      </>
    ),
  },
  {
    title: "14. Modification de la politique",
    body: (
      <>
        <Para>
          MED@WORK peut modifier la présente politique de confidentialité afin de tenir compte :
        </Para>
        <BulletList
          items={[
            "D'évolutions légales",
            "D'évolutions techniques",
            "De nouvelles fonctionnalités",
            "D'exigences de sécurité",
          ]}
        />
        <Para>La date de dernière mise à jour est indiquée en haut du document.</Para>
      </>
    ),
  },
  {
    title: "15. Contact",
    body: (
      <Para>
        Pour toute question relative à la protection des données ou à cette politique de
        confidentialité : 📧 <strong>privacy@medatwork.be</strong>
      </Para>
    ),
  },
  {
    title: "16. Droit applicable",
    body: (
      <Para>
        La présente politique est régie par le droit belge et le Règlement Général sur la Protection
        des Données (RGPD).
      </Para>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const PrivacySection = ({ title, body }: Section) => (
  <Box>
    <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
      {title}
    </Typography>
    {body}
  </Box>
);

const Content = () => (
  <Box>
    {sections.map((section, i) => (
      <Box key={i} marginBottom={i < sections.length - 1 ? 4 : 0}>
        <PrivacySection {...section} />
      </Box>
    ))}
  </Box>
);

export default Content;
