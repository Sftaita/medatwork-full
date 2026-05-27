import React from "react";
import { useTranslation } from "react-i18next";
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

// ── Content per language ──────────────────────────────────────────────────────

type Section = { title: string; body: React.ReactNode };

const SECTIONS: Record<string, Section[]> = {
  fr: [
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
        <>
          <P>Les accès aux données et fonctionnalités sont limités selon le rôle de l'utilisateur.</P>
          <P>Les permissions sont définies par MED@WORK et/ou par les administrateurs autorisés.</P>
          <P>Un utilisateur ne peut accéder qu'aux données nécessaires à sa fonction.</P>
        </>
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
          <P>L'utilisateur reconnaît utiliser la plateforme sous sa propre responsabilité.</P>
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
          <P>Les établissements hospitaliers et utilisateurs restent responsables :</P>
          <Ul items={["De la vérification des données","De la conformité légale finale","Des validations administratives","Des décisions organisationnelles prises sur base des données exportées"]} />
          <P>MED@WORK ne remplace pas un contrôle humain ou juridique.</P>
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
          <P>MED@WORK peut suspendre ou supprimer un compte en cas notamment :</P>
          <Ul items={["De violation des présentes CGU","D'utilisation abusive","De comportement frauduleux","De risque pour la sécurité de la plateforme","D'inactivité prolongée"]} />
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
          <P>L'utilisation de ces services peut impliquer le traitement de certaines données par des sous-traitants techniques.</P>
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
        <>
          <P>Chaque utilisateur peut cesser d'utiliser MED@WORK à tout moment.</P>
          <P>Les établissements hospitaliers peuvent demander la désactivation d'un accès utilisateur.</P>
          <P>Certaines données peuvent être conservées afin de respecter les obligations légales, administratives ou de sécurité.</P>
        </>
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
  ],

  en: [
    {
      title: "1. Purpose",
      body: (
        <>
          <P>These Terms of Use ("ToU") define the rules governing the use of the MED@WORK platform.</P>
          <P>MED@WORK is a digital platform designed for the organizational and administrative management of medical residents (MACCS), clinical supervisors, coordinators, HR staff, and hospital administrators.</P>
          <P>The platform enables, among other things:</P>
          <Ul items={["Academic year management","Schedule and on-call duty management","Validation management","Absence management","Week template management","HR exports","Working time compliance tracking","Internal communications"]} />
          <P>Use of the platform implies full and unreserved acceptance of these terms.</P>
        </>
      ),
    },
    {
      title: "2. Definitions",
      body: (
        <>
          <P><strong>User</strong> — Any person with authorized access to the platform.</P>
          <P><strong>MACCS</strong> — Medical resident (Médecin Assistant Candidat Spécialiste) using the platform as part of their training.</P>
          <P><strong>Manager</strong> — Clinical supervisor or coordinator with management rights.</P>
          <P><strong>Hospital Administrator</strong> — User responsible for the organizational administration of a hospital.</P>
          <P><strong>Super Administrator</strong> — Technical administrator of the MED@WORK platform.</P>
        </>
      ),
    },
    {
      title: "3. Access to the platform",
      body: (
        <>
          <P>Access to MED@WORK is reserved for authorized users. Each user is responsible for:</P>
          <Ul items={["The confidentiality of their login credentials","The security of their account","The use made from their account","The information they enter into the platform"]} />
          <P>Any attempt at unauthorized access or misuse may result in immediate account suspension.</P>
        </>
      ),
    },
    {
      title: "4. Account creation",
      body: (
        <>
          <P>Accounts may be created by invitation, self-registration, or administrative creation.</P>
          <P>Users agree to provide accurate, complete, and up-to-date information. MED@WORK reserves the right to suspend or delete any account containing incorrect or fraudulent information.</P>
        </>
      ),
    },
    {
      title: "5. Role and permission management",
      body: (
        <>
          <P>Access to data and features is restricted according to the user's role.</P>
          <P>Permissions are defined by MED@WORK and/or authorized administrators.</P>
          <P>A user may only access data necessary for their function.</P>
        </>
      ),
    },
    {
      title: "6. User obligations",
      body: (
        <>
          <P>Users agree to:</P>
          <Ul items={["Use the platform in compliance with applicable law","Respect the confidentiality of accessible information","Not attempt to circumvent security measures","Not disrupt the operation of the platform","Not use the platform for illegal purposes","Not transmit malicious or dangerous content","Comply with applicable professional and ethical obligations"]} />
        </>
      ),
    },
    {
      title: "7. Entered data",
      body: (
        <>
          <P>Each user is responsible for the data they enter into MED@WORK.</P>
          <P>Users agree not to enter unnecessary, excessive, or confidentiality-breaching data. MED@WORK is not liable for data entry errors made by users.</P>
        </>
      ),
    },
    {
      title: "8. Privacy and data protection",
      body: (
        <P>Use of MED@WORK is subject to the platform's Privacy Policy. Users agree to comply with GDPR obligations, professional confidentiality, and the confidentiality of data they access.</P>
      ),
    },
    {
      title: "9. IT security",
      body: (
        <>
          <P>MED@WORK implements technical and organizational measures to ensure the security of the platform. However, no IT system can guarantee absolute security.</P>
          <P>Users acknowledge using the platform at their own risk.</P>
          <P>In the event of a security incident or suspected unauthorized access, the user must notify MED@WORK as soon as possible.</P>
        </>
      ),
    },
    {
      title: "10. Platform availability",
      body: (
        <>
          <P>MED@WORK strives to ensure reasonable availability of the platform. However, the platform may be temporarily unavailable due to:</P>
          <Ul items={["Maintenance","Updates","Technical incidents","Network issues","Force majeure"]} />
          <P>MED@WORK does not guarantee uninterrupted availability.</P>
        </>
      ),
    },
    {
      title: "11. Features and updates",
      body: (
        <P>MED@WORK may modify, add, or remove features at any time to improve the platform or to meet technical, legal, or organizational requirements.</P>
      ),
    },
    {
      title: "12. HR export and compliance",
      body: (
        <>
          <P>HR export, compliance tracking, and working time calculation features are assistance tools.</P>
          <P>Hospitals and users remain responsible for:</P>
          <Ul items={["Data verification","Final legal compliance","Administrative validations","Organizational decisions based on exported data"]} />
          <P>MED@WORK does not replace human or legal oversight.</P>
        </>
      ),
    },
    {
      title: "13. Limitation of liability",
      body: (
        <>
          <P>To the extent permitted by law, MED@WORK shall not be liable for:</P>
          <Ul items={["User data entry errors","Misuse of the platform","Temporary service interruptions","Indirect or intangible losses","Incidents caused by third parties","Use not in accordance with these terms"]} />
          <P>MED@WORK's potential liability is limited to the amount paid for the service during the last 12 months.</P>
        </>
      ),
    },
    {
      title: "14. Intellectual property",
      body: (
        <P>The MED@WORK platform, its interface, source code, logos, design, and content are protected by applicable intellectual property rights. Any unauthorized reproduction, copying, extraction, or use is prohibited.</P>
      ),
    },
    {
      title: "15. Account suspension and deletion",
      body: (
        <>
          <P>MED@WORK may suspend or delete an account in cases including:</P>
          <Ul items={["Violation of these ToU","Misuse of the platform","Fraudulent behavior","Security risk to the platform","Prolonged inactivity"]} />
          <P>Such suspension may occur without prior notice in cases of security necessity.</P>
        </>
      ),
    },
    {
      title: "16. Third-party services",
      body: (
        <>
          <P>MED@WORK may use third-party services for:</P>
          <Ul items={["Hosting","Transactional emails","Backups","Technical monitoring","Notifications"]} />
          <P>Use of these services may involve the processing of certain data by technical sub-processors.</P>
        </>
      ),
    },
    {
      title: "17. Logging and audit",
      body: (
        <>
          <P>Certain actions may be logged for purposes of security, audit, compliance, and traceability. This may include logins, HR exports, validations, administrative changes, and permission changes.</P>
        </>
      ),
    },
    {
      title: "18. Acceptable use",
      body: (
        <>
          <P>It is strictly prohibited to:</P>
          <Ul items={["Attempt to access another user's data without authorization","Use unauthorized scripts or automated tools","Perform penetration testing without written authorization","Introduce malware","Intentionally disrupt the platform","Misuse features outside their intended purpose"]} />
        </>
      ),
    },
    {
      title: "19. Termination",
      body: (
        <>
          <P>Each user may stop using MED@WORK at any time.</P>
          <P>Hospitals may request the deactivation of a user's access.</P>
          <P>Certain data may be retained to comply with legal, administrative, or security obligations.</P>
        </>
      ),
    },
    {
      title: "20. Modification of terms",
      body: (
        <>
          <P>MED@WORK may modify these terms at any time. Users will be informed of significant changes where reasonably possible.</P>
          <P>Continued use of the platform after modification implies acceptance of the new terms.</P>
        </>
      ),
    },
    {
      title: "21. Applicable law and jurisdiction",
      body: (
        <P>These terms are governed by Belgian law. In the event of a dispute, the courts of Brussels shall have jurisdiction, unless overriding mandatory legal provisions apply.</P>
      ),
    },
    {
      title: "22. Contact",
      body: (
        <P>For any questions regarding these terms: 📧 <strong>legal@medatwork.be</strong></P>
      ),
    },
    {
      title: "23. Version",
      body: (
        <P>Terms of Use version: <strong>2026.1</strong></P>
      ),
    },
  ],

  nl: [
    {
      title: "1. Doel",
      body: (
        <>
          <P>Deze Algemene Gebruiksvoorwaarden ("Voorwaarden") bepalen de regels voor het gebruik van het MED@WORK-platform.</P>
          <P>MED@WORK is een digitaal platform bedoeld voor het organisatorisch en administratief beheer van artsen in opleiding (MACCS), stagemeesters, coördinatoren, HR-medewerkers en ziekenhuisadministrators.</P>
          <P>Het platform maakt onder meer mogelijk:</P>
          <Ul items={["Beheer van academiejaren","Beheer van werkroosters en wachtdiensten","Beheer van validaties","Beheer van afwezigheden","Beheer van modelweken","HR-exporten","Opvolging van arbeidstijdconformiteit","Interne communicatie"]} />
          <P>Het gebruik van het platform impliceert de volledige aanvaarding van deze Voorwaarden.</P>
        </>
      ),
    },
    {
      title: "2. Definities",
      body: (
        <>
          <P><strong>Gebruiker</strong> — Iedere persoon met geautoriseerde toegang tot het platform.</P>
          <P><strong>MACCS</strong> — Arts-specialist in opleiding die het platform gebruikt in het kader van zijn of haar opleiding.</P>
          <P><strong>Manager</strong> — Stagemeester of coördinator met beheersrechten.</P>
          <P><strong>Ziekenhuisadministrator</strong> — Gebruiker belast met het organisatorisch beheer van een ziekenhuisinstelling.</P>
          <P><strong>Superadministrator</strong> — Technisch administrator van het MED@WORK-platform.</P>
        </>
      ),
    },
    {
      title: "3. Toegang tot het platform",
      body: (
        <>
          <P>Toegang tot MED@WORK is uitsluitend voorbehouden aan geautoriseerde gebruikers. Elke gebruiker is verantwoordelijk voor:</P>
          <Ul items={["De vertrouwelijkheid van zijn of haar inloggegevens","De beveiliging van zijn of haar account","Het gebruik dat via het account wordt gemaakt","De informatie die in het platform wordt ingevoerd"]} />
          <P>Elke poging tot ongeoorloofde toegang of misbruik kan leiden tot onmiddellijke schorsing van het account.</P>
        </>
      ),
    },
    {
      title: "4. Aanmaak van accounts",
      body: (
        <>
          <P>Accounts kunnen worden aangemaakt via uitnodiging, zelfregistratie of administratieve creatie.</P>
          <P>De gebruiker verbindt zich ertoe correcte, volledige en actuele informatie te verstrekken. MED@WORK behoudt zich het recht voor om accounts met onjuiste of frauduleuze informatie op te schorten of te verwijderen.</P>
        </>
      ),
    },
    {
      title: "5. Beheer van rollen en toegangsrechten",
      body: (
        <>
          <P>Toegang tot gegevens en functionaliteiten is beperkt volgens de rol van de gebruiker.</P>
          <P>Gebruikers mogen enkel toegang hebben tot gegevens die noodzakelijk zijn voor hun functie.</P>
        </>
      ),
    },
    {
      title: "6. Verplichtingen van gebruikers",
      body: (
        <>
          <P>Gebruikers verbinden zich ertoe om:</P>
          <Ul items={["Het platform te gebruiken in overeenstemming met de wet","De vertrouwelijkheid van toegankelijke informatie te respecteren","Geen pogingen te ondernemen om beveiligingsmaatregelen te omzeilen","De werking van het platform niet te verstoren","Het platform niet te gebruiken voor onwettige doeleinden","Geen schadelijke of gevaarlijke inhoud te verspreiden","De toepasselijke professionele en deontologische verplichtingen te respecteren"]} />
        </>
      ),
    },
    {
      title: "7. Ingevoerde gegevens",
      body: (
        <>
          <P>Elke gebruiker is verantwoordelijk voor de gegevens die hij of zij in MED@WORK invoert.</P>
          <P>Gebruikers verbinden zich ertoe geen onnodige, buitensporige of vertrouwelijkheidsschendende gegevens in te voeren. MED@WORK is niet verantwoordelijk voor invoerfouten van gebruikers.</P>
        </>
      ),
    },
    {
      title: "8. Privacy en gegevensbescherming",
      body: (
        <P>Het gebruik van MED@WORK is onderworpen aan het privacybeleid van het platform. Gebruikers verbinden zich ertoe de verplichtingen inzake GDPR, beroepsgeheim en vertrouwelijkheid van de gegevens waartoe zij toegang hebben, na te leven.</P>
      ),
    },
    {
      title: "9. IT-beveiliging",
      body: (
        <>
          <P>MED@WORK neemt technische en organisatorische maatregelen om de veiligheid van het platform te waarborgen. Geen enkel IT-systeem kan echter absolute veiligheid garanderen.</P>
          <P>In geval van een beveiligingsincident of vermoeden van ongeoorloofde toegang moet de gebruiker MED@WORK zo snel mogelijk informeren.</P>
        </>
      ),
    },
    {
      title: "10. Beschikbaarheid van het platform",
      body: (
        <>
          <P>MED@WORK streeft naar een redelijke beschikbaarheid van het platform. Het platform kan tijdelijk onbeschikbaar zijn, onder meer in geval van:</P>
          <Ul items={["Onderhoud","Updates","Technische incidenten","Netwerkproblemen","Overmacht"]} />
          <P>MED@WORK garandeert geen ononderbroken beschikbaarheid.</P>
        </>
      ),
    },
    {
      title: "11. Functionaliteiten en evoluties",
      body: (
        <P>MED@WORK kan op elk moment functionaliteiten wijzigen, toevoegen of verwijderen om het platform te verbeteren of om te voldoen aan technische, wettelijke of organisatorische vereisten.</P>
      ),
    },
    {
      title: "12. HR-export en conformiteit",
      body: (
        <>
          <P>De functionaliteiten voor HR-export, conformiteitsopvolging en arbeidstijdberekening zijn ondersteunende hulpmiddelen.</P>
          <P>Ziekenhuizen en gebruikers blijven verantwoordelijk voor de verificatie van gegevens, de uiteindelijke wettelijke conformiteit, administratieve validaties en organisatorische beslissingen. MED@WORK vervangt geen menselijke of juridische controle.</P>
        </>
      ),
    },
    {
      title: "13. Beperking van aansprakelijkheid",
      body: (
        <>
          <P>Binnen de grenzen toegestaan door de wet kan MED@WORK niet aansprakelijk worden gesteld voor:</P>
          <Ul items={["Fouten bij gegevensinvoer door gebruikers","Onjuist gebruik van het platform","Tijdelijke onderbrekingen van de dienstverlening","Indirecte of immateriële schade","Incidenten veroorzaakt door derden","Gebruik dat niet in overeenstemming is met deze Voorwaarden"]} />
          <P>De eventuele aansprakelijkheid van MED@WORK is beperkt tot het bedrag dat gedurende de laatste 12 maanden voor het gebruik van de dienst werd betaald.</P>
        </>
      ),
    },
    {
      title: "14. Intellectuele eigendom",
      body: (
        <P>Het MED@WORK-platform, de interface, de broncode, logo's, het design en de inhoud zijn beschermd door toepasselijke intellectuele eigendomsrechten. Elke ongeoorloofde reproductie, kopie, extractie of gebruik is verboden.</P>
      ),
    },
    {
      title: "15. Opschorting en verwijdering van accounts",
      body: (
        <>
          <P>MED@WORK kan een account opschorten of verwijderen in geval van onder meer:</P>
          <Ul items={["Schending van deze Voorwaarden","Misbruik van het platform","Frauduleus gedrag","Veiligheidsrisico's voor het platform","Langdurige inactiviteit"]} />
          <P>Deze opschorting kan zonder voorafgaande kennisgeving plaatsvinden indien dit om veiligheidsredenen noodzakelijk is.</P>
        </>
      ),
    },
    {
      title: "16. Diensten van derden",
      body: (
        <>
          <P>MED@WORK kan gebruikmaken van diensten van derden, onder meer voor:</P>
          <Ul items={["Hosting","Transactionele e-mails","Back-ups","Technische monitoring","Meldingen"]} />
        </>
      ),
    },
    {
      title: "17. Logging en audit",
      body: (
        <>
          <P>Bepaalde acties kunnen worden gelogd voor doeleinden van veiligheid, audit, conformiteit en traceerbaarheid. Dit kan onder meer betrekking hebben op logins, HR-exporten, validaties, administratieve wijzigingen en wijzigingen van toegangsrechten.</P>
        </>
      ),
    },
    {
      title: "18. Aanvaardbaar gebruik",
      body: (
        <>
          <P>Het is strikt verboden om:</P>
          <Ul items={["Zonder toestemming toegang te proberen krijgen tot gegevens van andere gebruikers","Niet-geautoriseerde scripts of geautomatiseerde tools te gebruiken","Penetratietests uit te voeren zonder schriftelijke toestemming","Schadelijke software te introduceren","Het platform opzettelijk te verstoren","Functionaliteiten buiten hun bedoelde gebruik te misbruiken"]} />
        </>
      ),
    },
    {
      title: "19. Beëindiging",
      body: (
        <>
          <P>Elke gebruiker kan op elk moment stoppen met het gebruik van MED@WORK.</P>
          <P>Ziekenhuizen kunnen de deactivering van een gebruikerstoegang aanvragen.</P>
          <P>Bepaalde gegevens kunnen worden bewaard om te voldoen aan wettelijke, administratieve of veiligheidsverplichtingen.</P>
        </>
      ),
    },
    {
      title: "20. Wijziging van de voorwaarden",
      body: (
        <>
          <P>MED@WORK kan deze Voorwaarden op elk moment wijzigen. Gebruikers zullen waar redelijk mogelijk worden geïnformeerd over belangrijke wijzigingen.</P>
          <P>Verder gebruik van het platform na wijziging impliceert aanvaarding van de nieuwe voorwaarden.</P>
        </>
      ),
    },
    {
      title: "21. Toepasselijk recht en bevoegde rechtbank",
      body: (
        <P>Deze Voorwaarden worden beheerst door het Belgisch recht. In geval van een geschil zijn de rechtbanken van Brussel bevoegd, behoudens dwingende wettelijke bepalingen.</P>
      ),
    },
    {
      title: "22. Contact",
      body: (
        <P>Voor vragen met betrekking tot deze Voorwaarden: 📧 <strong>legal@medatwork.be</strong></P>
      ),
    },
    {
      title: "23. Versie",
      body: (
        <P>Versie van de Algemene Gebruiksvoorwaarden: <strong>2026.1</strong></P>
      ),
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

const CguContent = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language in SECTIONS ? i18n.language : "fr";
  const sections = SECTIONS[lang];

  return (
    <Box>
      {sections.map((s, i) => (
        <Box key={i} mb={i < sections.length - 1 ? 4 : 0}>
          <H2>{s.title}</H2>
          {s.body}
        </Box>
      ))}
    </Box>
  );
};

export default CguContent;
