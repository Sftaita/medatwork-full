import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// ── Helpers ───────────────────────────────────────────────────────────────────

const H2 = ({ children }: { children: string }) => (
  <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
    {children}
  </Typography>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography component="p" color="text.secondary" align="justify" mb={1}>
    {children}
  </Typography>
);

const Ul = ({ items }: { items: string[] }) => (
  <Box component="ul" sx={{ pl: 3, mt: 0.5, mb: 1 }}>
    {items.map((item, i) => (
      <Typography key={i} component="li" color="text.secondary" mb={0.25}>
        {item}
      </Typography>
    ))}
  </Box>
);

// ── Sections ──────────────────────────────────────────────────────────────────

const sections = [
  {
    title: "1. Objet",
    body: (
      <>
        <P>Les présentes Conditions Générales d'Utilisation (« CGU ») définissent les règles d'utilisation de la plateforme MED@WORK.</P>
        <P>MED@WORK est une plateforme numérique destinée à la gestion organisationnelle et administrative des médecins en formation (MACCS), maîtres de stage, coordinateurs, ressources humaines et administrateurs hospitaliers.</P>
        <P>La plateforme permet notamment :</P>
        <Ul items={["La gestion des années académiques","La gestion des horaires et gardes","La gestion des validations","La gestion des absences","La gestion des semaines modèles","Les exports RH","Le suivi de conformité du temps de travail","Les communications internes"]} />
        <P>L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes conditions.</P>
      </>
    ),
  },
  {
    title: "2. Définitions",
    body: (
      <>
        <P><strong>Utilisateur</strong> — Toute personne disposant d'un accès autorisé à la plateforme.</P>
        <P><strong>MACCS</strong> — Médecin Assistant Candidat Spécialiste utilisant la plateforme dans le cadre de sa formation.</P>
        <P><strong>Manager</strong> — Médecin responsable de stage ou coordinateur disposant de droits de gestion.</P>
        <P><strong>Administrateur hospitalier</strong> — Utilisateur chargé de l'administration organisationnelle d'un établissement hospitalier.</P>
        <P><strong>Super administrateur</strong> — Administrateur technique de la plateforme MED@WORK.</P>
      </>
    ),
  },
  {
    title: "3. Accès à la plateforme",
    body: (
      <>
        <P>L'accès à MED@WORK est réservé aux utilisateurs autorisés. Chaque utilisateur est responsable :</P>
        <Ul items={["De la confidentialité de ses identifiants","De la sécurité de son compte","De l'utilisation faite depuis son compte","Des informations qu'il encode dans la plateforme"]} />
        <P>Toute tentative d'accès non autorisé ou d'utilisation abusive pourra entraîner une suspension immédiate du compte.</P>
      </>
    ),
  },
  {
    title: "4. Création de compte",
    body: (
      <>
        <P>Les comptes peuvent être créés par invitation, par auto-inscription ou par création administrative.</P>
        <P>L'utilisateur s'engage à fournir des informations exactes, complètes et à jour. MED@WORK se réserve le droit de suspendre ou supprimer tout compte contenant des informations incorrectes ou frauduleuses.</P>
      </>
    ),
  },
  {
    title: "5. Gestion des rôles et permissions",
    body: (
      <P>Les accès aux données et fonctionnalités sont limités selon le rôle de l'utilisateur. Un utilisateur ne peut accéder qu'aux données nécessaires à sa fonction.</P>
    ),
  },
  {
    title: "6. Obligations des utilisateurs",
    body: (
      <>
        <P>Les utilisateurs s'engagent à :</P>
        <Ul items={["Utiliser la plateforme conformément à la loi","Respecter la confidentialité des informations accessibles","Ne pas tenter de contourner les mesures de sécurité","Ne pas perturber le fonctionnement de la plateforme","Ne pas utiliser la plateforme à des fins illicites","Ne pas transmettre de contenu malveillant ou dangereux","Respecter les obligations déontologiques et professionnelles applicables"]} />
      </>
    ),
  },
  {
    title: "7. Données encodées",
    body: (
      <>
        <P>Chaque utilisateur est responsable des données qu'il introduit dans MED@WORK.</P>
        <P>Les utilisateurs s'engagent à ne pas encoder de données inutiles, excessives ou contraires aux obligations de confidentialité. MED@WORK n'est pas responsable des erreurs d'encodage réalisées par les utilisateurs.</P>
      </>
    ),
  },
  {
    title: "8. Confidentialité et protection des données",
    body: (
      <P>L'utilisation de MED@WORK est soumise à la Politique de confidentialité de la plateforme. Les utilisateurs s'engagent à respecter les obligations liées au RGPD, au secret professionnel et à la confidentialité des données auxquelles ils ont accès.</P>
    ),
  },
  {
    title: "9. Sécurité informatique",
    body: (
      <>
        <P>MED@WORK met en œuvre des mesures techniques et organisationnelles visant à assurer la sécurité de la plateforme. Toutefois, aucun système informatique ne peut garantir une sécurité absolue.</P>
        <P>En cas d'incident de sécurité ou de suspicion d'accès non autorisé, l'utilisateur doit informer MED@WORK dans les meilleurs délais.</P>
      </>
    ),
  },
  {
    title: "10. Disponibilité de la plateforme",
    body: (
      <>
        <P>MED@WORK s'efforce d'assurer une disponibilité raisonnable. La plateforme peut être temporairement indisponible notamment en cas de :</P>
        <Ul items={["Maintenance","Mise à jour","Incident technique","Problème réseau","Force majeure"]} />
        <P>MED@WORK ne garantit pas une disponibilité ininterrompue.</P>
      </>
    ),
  },
  {
    title: "11. Fonctionnalités et évolutions",
    body: (
      <P>MED@WORK peut modifier, ajouter ou supprimer des fonctionnalités à tout moment afin d'améliorer la plateforme ou de répondre à des contraintes techniques, légales ou organisationnelles.</P>
    ),
  },
  {
    title: "12. Export RH et conformité",
    body: (
      <>
        <P>Les fonctionnalités d'export RH, de suivi de conformité et de calcul du temps de travail constituent des outils d'assistance.</P>
        <P>Les établissements hospitaliers et utilisateurs restent responsables de la vérification des données, de la conformité légale finale, des validations administratives et des décisions organisationnelles. MED@WORK ne remplace pas un contrôle humain ou juridique.</P>
      </>
    ),
  },
  {
    title: "13. Limitation de responsabilité",
    body: (
      <>
        <P>Dans les limites autorisées par la loi, MED@WORK ne pourra être tenu responsable :</P>
        <Ul items={["D'erreurs d'encodage utilisateur","D'une mauvaise utilisation de la plateforme","D'une interruption temporaire de service","D'une perte indirecte ou immatérielle","D'un incident causé par un tiers","D'un usage non conforme aux présentes conditions"]} />
        <P>La responsabilité éventuelle de MED@WORK est limitée au montant éventuellement payé pour l'utilisation du service au cours des 12 derniers mois.</P>
      </>
    ),
  },
  {
    title: "14. Propriété intellectuelle",
    body: (
      <P>La plateforme MED@WORK, son interface, son code source, ses logos, son design et son contenu sont protégés par les droits de propriété intellectuelle applicables. Toute reproduction, copie, extraction ou utilisation non autorisée est interdite.</P>
    ),
  },
  {
    title: "15. Suspension et suppression de compte",
    body: (
      <>
        <P>MED@WORK peut suspendre ou supprimer un compte en cas notamment de violation des présentes CGU, d'utilisation abusive, de comportement frauduleux, de risque pour la sécurité ou d'inactivité prolongée.</P>
        <P>Cette suspension peut intervenir sans préavis en cas de nécessité de sécurité.</P>
      </>
    ),
  },
  {
    title: "16. Services tiers",
    body: (
      <>
        <P>MED@WORK peut utiliser des services tiers notamment pour :</P>
        <Ul items={["L'hébergement","Les emails transactionnels","Les sauvegardes","La surveillance technique","Les notifications"]} />
      </>
    ),
  },
  {
    title: "17. Journalisation et audit",
    body: (
      <>
        <P>Certaines actions peuvent être journalisées à des fins de sécurité, d'audit, de conformité et de traçabilité. Cela peut inclure les connexions, les exports RH, les validations, les modifications administratives et les changements de permissions.</P>
      </>
    ),
  },
  {
    title: "18. Utilisation acceptable",
    body: (
      <>
        <P>Il est strictement interdit :</P>
        <Ul items={["De tenter d'accéder aux données d'un autre utilisateur sans autorisation","D'utiliser des scripts ou outils automatisés non autorisés","De réaliser des tests d'intrusion sans autorisation écrite","D'introduire des logiciels malveillants","De perturber volontairement la plateforme","De détourner les fonctionnalités de leur usage prévu"]} />
      </>
    ),
  },
  {
    title: "19. Résiliation",
    body: (
      <P>Chaque utilisateur peut cesser d'utiliser MED@WORK à tout moment. Certaines données peuvent être conservées afin de respecter les obligations légales, administratives ou de sécurité.</P>
    ),
  },
  {
    title: "20. Modification des conditions",
    body: (
      <>
        <P>MED@WORK peut modifier les présentes conditions à tout moment. Les utilisateurs seront informés des modifications importantes lorsque cela est raisonnablement possible.</P>
        <P>La poursuite de l'utilisation de la plateforme après modification implique l'acceptation des nouvelles conditions.</P>
      </>
    ),
  },
  {
    title: "21. Droit applicable et juridiction",
    body: (
      <P>Les présentes conditions sont régies par le droit belge. En cas de litige, les tribunaux de Bruxelles sont compétents, sauf disposition légale impérative contraire.</P>
    ),
  },
  {
    title: "22. Contact",
    body: (
      <P>Pour toute question relative aux présentes conditions : 📧 <strong>legal@medatwork.be</strong></P>
    ),
  },
  {
    title: "23. Version",
    body: (
      <P>Version des CGU : <strong>2026.1</strong></P>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const CguContent = () => (
  <Box>
    {sections.map((s, i) => (
      <Box key={i} mb={i < sections.length - 1 ? 4 : 0}>
        <H2>{s.title}</H2>
        {s.body}
      </Box>
    ))}
  </Box>
);

export default CguContent;
