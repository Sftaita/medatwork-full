import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

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

// ── Content per language ──────────────────────────────────────────────────────

type Section = { title: string; body: React.ReactNode };

const SECTIONS: Record<string, Section[]> = {
  fr: [
    {
      title: "1. Introduction",
      body: (
        <>
          <Para>MED@WORK est une plateforme numérique destinée à la gestion des horaires, gardes, validations académiques, conformité du temps de travail et organisation hospitalière des médecins en formation (MACCS), maîtres de stage, coordinateurs, ressources humaines et administrateurs hospitaliers.</Para>
          <Para>La présente politique de confidentialité explique quelles données sont collectées, pourquoi elles sont utilisées, comment elles sont protégées et quels sont les droits des utilisateurs.</Para>
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
          <Para>Selon le rôle de l'utilisateur (MACCS, manager, RH, administrateur hospitalier), MED@WORK peut traiter les catégories de données suivantes.</Para>
          <SubSection subtitle="3.1 Données d'identification" items={["Nom","Prénom","Adresse email professionnelle","Sexe","Fonction / rôle","Hôpital de rattachement","Année académique","Spécialité médicale","Photo de profil (optionnelle)"]} />
          <SubSection subtitle="3.2 Données liées à l'activité professionnelle" items={["Horaires de travail","Gardes hospitalières","Gardes appelables","Absences","Validations de périodes","Statuts de validation","Paramètres d'organisation des semaines modèles","Assignations de planning","Exports RH","Données de conformité du temps de travail"]} />
          <SubSection subtitle="3.3 Données techniques et de sécurité" items={["Adresse IP","Logs d'authentification","Historique des connexions","Type d'appareil et navigateur","Tokens d'authentification","Actions administratives réalisées dans l'application","Données nécessaires à la sécurité et à la prévention des abus"]} />
          <SubSection subtitle="3.4 Données de communication" items={["Notifications internes","Messages administratifs","Confirmations d'actions","Emails automatiques liés au fonctionnement de la plateforme"]} />
        </>
      ),
    },
    {
      title: "4. Finalités du traitement",
      body: (
        <>
          <Para>Les données sont utilisées uniquement pour les finalités suivantes :</Para>
          <BulletList items={["Gestion des comptes utilisateurs","Gestion des années académiques","Gestion des plannings et horaires","Validation des prestations et périodes de formation","Suivi de conformité du temps de travail des MACCS","Génération des exports RH et Staff Planner","Communication interne liée au fonctionnement hospitalier","Sécurisation des accès et prévention des accès non autorisés","Production de statistiques organisationnelles","Maintenance et amélioration de la plateforme","Respect des obligations légales et réglementaires"]} />
          <Para>MED@WORK ne revend pas les données personnelles.</Para>
        </>
      ),
    },
    {
      title: "5. Base légale du traitement",
      body: (
        <>
          <Para>Les traitements sont fondés sur :</Para>
          <BulletList items={["L'exécution du contrat ou de la relation professionnelle","Le respect des obligations légales applicables aux établissements hospitaliers et à la formation médicale","L'intérêt légitime lié à l'organisation hospitalière et à la sécurité informatique","Le consentement de l'utilisateur lorsque celui-ci est requis"]} />
        </>
      ),
    },
    {
      title: "6. Accès aux données",
      body: (
        <>
          <Para>Les données sont accessibles uniquement aux personnes autorisées selon leur rôle.</Para>
          <SubSection subtitle="6.1 Managers" items={["Peuvent accéder uniquement aux années académiques auxquelles ils sont explicitement associés."]} />
          <SubSection subtitle="6.2 Administrateurs hospitaliers" items={["Peuvent accéder aux données liées à leur établissement hospitalier."]} />
          <SubSection subtitle="6.3 Ressources humaines" items={["Peuvent accéder uniquement aux données nécessaires à la gestion administrative et aux exports réglementaires."]} />
          <SubSection subtitle="6.4 Super administrateurs" items={["Disposent d'un accès restreint destiné exclusivement à l'administration et à la maintenance de la plateforme."]} />
        </>
      ),
    },
    {
      title: "7. Mesures de sécurité",
      body: (
        <>
          <Para>MED@WORK applique des mesures techniques et organisationnelles visant à protéger les données. Ces mesures incluent notamment :</Para>
          <BulletList items={["Connexions sécurisées HTTPS/TLS","Authentification JWT sécurisée","Tokens cryptographiquement sécurisés","Segmentation des accès par rôles et permissions","Validation stricte des données entrantes","Journalisation des actions sensibles","Protection contre les accès non autorisés","Sauvegardes techniques","Limitation des accès administratifs","Mise à jour régulière des composants logiciels"]} />
          <Para>Les mots de passe sont stockés sous forme hachée et ne sont jamais conservés en clair.</Para>
        </>
      ),
    },
    {
      title: "8. Hébergement et sous-traitants",
      body: (
        <>
          <Para>Les données peuvent être hébergées auprès de prestataires techniques situés dans l'Union européenne. Certains services tiers peuvent être utilisés pour :</Para>
          <BulletList items={["L'envoi d'emails transactionnels","L'hébergement sécurisé de la plateforme","La surveillance technique et les journaux d'erreurs","Les sauvegardes techniques"]} />
          <Para>MED@WORK veille à travailler avec des prestataires présentant des garanties suffisantes en matière de sécurité et de conformité RGPD.</Para>
        </>
      ),
    },
    {
      title: "9. Durée de conservation",
      body: (
        <>
          <Para>Les données sont conservées uniquement pendant la durée nécessaire aux finalités décrites ci-dessus. La durée de conservation peut varier selon :</Para>
          <BulletList items={["Les obligations légales hospitalières","Les obligations administratives et académiques","Les contraintes de sécurité informatique","Les obligations comptables ou réglementaires"]} />
          <Para>Les comptes inactifs peuvent être anonymisés ou supprimés après une période raisonnable.</Para>
        </>
      ),
    },
    {
      title: "10. Droits des utilisateurs",
      body: (
        <>
          <Para>Conformément au RGPD, chaque utilisateur dispose des droits suivants :</Para>
          <BulletList items={["Droit d'accès","Droit de rectification","Droit à l'effacement","Droit à la limitation du traitement","Droit d'opposition","Droit à la portabilité des données","Droit d'introduire une réclamation auprès de l'autorité de protection des données"]} />
          <Para>Les demandes peuvent être adressées à : 📧 <strong>privacy@medatwork.be</strong></Para>
          <Para>MED@WORK pourra demander une preuve d'identité avant de répondre à certaines demandes.</Para>
        </>
      ),
    },
    {
      title: "11. Cookies et stockage local",
      body: (
        <>
          <Para>La plateforme peut utiliser :</Para>
          <BulletList items={["Des cookies techniques nécessaires à l'authentification","Des mécanismes de stockage local pour maintenir la session utilisateur","Des éléments nécessaires au fonctionnement de l'application web progressive (PWA)"]} />
          <Para>Ces éléments ne sont pas utilisés à des fins publicitaires.</Para>
        </>
      ),
    },
    {
      title: "12. Journalisation et audit",
      body: (
        <>
          <Para>Certaines actions sensibles peuvent être journalisées afin de garantir la sécurité, la traçabilité et la conformité du système. Cela peut inclure :</Para>
          <BulletList items={["Connexions et déconnexions","Échecs d'authentification","Exports RH","Modifications de permissions","Validations administratives","Actions des administrateurs"]} />
          <Para>Ces journaux sont utilisés exclusivement à des fins de sécurité, d'audit et de maintenance.</Para>
        </>
      ),
    },
    {
      title: "13. Confidentialité médicale",
      body: (
        <>
          <Para>MED@WORK n'a pas vocation à devenir un dossier médical patient.</Para>
          <Para>La plateforme est conçue principalement pour l'organisation du travail, la planification, les validations académiques et la gestion administrative.</Para>
          <Para>Les utilisateurs doivent éviter d'introduire des données médicales sensibles non nécessaires au fonctionnement de la plateforme.</Para>
        </>
      ),
    },
    {
      title: "14. Modification de la politique",
      body: (
        <>
          <Para>MED@WORK peut modifier la présente politique de confidentialité afin de tenir compte :</Para>
          <BulletList items={["D'évolutions légales","D'évolutions techniques","De nouvelles fonctionnalités","D'exigences de sécurité"]} />
          <Para>La date de dernière mise à jour est indiquée en haut du document.</Para>
        </>
      ),
    },
    {
      title: "15. Contact",
      body: (
        <Para>Pour toute question relative à la protection des données ou à cette politique de confidentialité : 📧 <strong>privacy@medatwork.be</strong></Para>
      ),
    },
    {
      title: "16. Droit applicable",
      body: (
        <Para>La présente politique est régie par le droit belge et le Règlement Général sur la Protection des Données (RGPD).</Para>
      ),
    },
  ],

  en: [
    {
      title: "1. Introduction",
      body: (
        <>
          <Para>MED@WORK is a digital platform dedicated to the management of schedules, on-call duties, academic validations, working time compliance, and hospital organization for medical residents (MACCS), supervising physicians, coordinators, human resources staff, and hospital administrators.</Para>
          <Para>This Privacy Policy explains which data is collected, why it is used, how it is protected, and what rights users have.</Para>
          <Para>Use of the platform implies acceptance of this policy.</Para>
        </>
      ),
    },
    {
      title: "2. Data Controller",
      body: (
        <>
          <Para>The data controller is: <strong>MED@WORK</strong></Para>
          <Para>For any questions regarding data protection:</Para>
          <Para>📧 Email: <strong>privacy@medatwork.be</strong></Para>
        </>
      ),
    },
    {
      title: "3. Collected Data",
      body: (
        <>
          <Para>Depending on the user's role (MACCS, manager, HR, hospital administrator), MED@WORK may process the following categories of data.</Para>
          <SubSection subtitle="3.1 Identification Data" items={["Last name","First name","Professional email address","Gender","Function / role","Affiliated hospital","Academic year","Medical specialty","Profile picture (optional)"]} />
          <SubSection subtitle="3.2 Professional Activity Data" items={["Working schedules","Hospital on-call duties","Callable on-call duties","Absences","Period validations","Validation statuses","Model week organization settings","Planning assignments","HR exports","Working time compliance data"]} />
          <SubSection subtitle="3.3 Technical and Security Data" items={["IP address","Authentication logs","Connection history","Device and browser type","Authentication tokens","Administrative actions performed within the application","Data required for security and abuse prevention"]} />
          <SubSection subtitle="3.4 Communication Data" items={["Internal notifications","Administrative messages","Action confirmations","Automated emails related to platform operations"]} />
        </>
      ),
    },
    {
      title: "4. Purpose of Processing",
      body: (
        <>
          <Para>Data is used exclusively for the following purposes:</Para>
          <BulletList items={["User account management","Academic year management","Schedule and planning management","Validation of work activities and training periods","Monitoring MACCS working time compliance","Generation of HR and Staff Planner exports","Internal hospital-related communication","Securing access and preventing unauthorized access","Production of organizational statistics","Platform maintenance and improvement","Compliance with legal and regulatory obligations"]} />
          <Para>MED@WORK does not sell personal data.</Para>
        </>
      ),
    },
    {
      title: "5. Legal Basis for Processing",
      body: (
        <>
          <Para>Processing activities are based on:</Para>
          <BulletList items={["Performance of a contract or professional relationship","Compliance with legal obligations applicable to hospitals and medical training","Legitimate interest related to hospital organization and IT security","User consent where required"]} />
        </>
      ),
    },
    {
      title: "6. Access to Data",
      body: (
        <>
          <Para>Data is accessible only to authorized persons according to their role.</Para>
          <SubSection subtitle="6.1 Managers" items={["May access only the academic years to which they are explicitly assigned."]} />
          <SubSection subtitle="6.2 Hospital Administrators" items={["May access data related to their hospital institution."]} />
          <SubSection subtitle="6.3 Human Resources" items={["May access only the data necessary for administrative management and regulatory exports."]} />
          <SubSection subtitle="6.4 Super Administrators" items={["Have restricted access exclusively intended for platform administration and maintenance."]} />
        </>
      ),
    },
    {
      title: "7. Security Measures",
      body: (
        <>
          <Para>MED@WORK implements technical and organizational measures aimed at protecting data. These measures notably include:</Para>
          <BulletList items={["Secure HTTPS/TLS connections","Secure JWT authentication","Cryptographically secure tokens","Segmentation of access by roles and permissions","Strict validation of incoming data","Logging of sensitive actions","Protection against unauthorized access","Technical backups","Restriction of administrative access","Regular updates of software components"]} />
          <Para>Passwords are stored in hashed form and are never stored in plain text.</Para>
        </>
      ),
    },
    {
      title: "8. Hosting and Subprocessors",
      body: (
        <>
          <Para>Data may be hosted by technical providers located within the European Union. Third-party services may be used for:</Para>
          <BulletList items={["Sending transactional emails","Secure platform hosting","Technical monitoring and error logging","Technical backups"]} />
          <Para>MED@WORK strives to work with providers offering sufficient guarantees regarding security and GDPR compliance.</Para>
        </>
      ),
    },
    {
      title: "9. Data Retention",
      body: (
        <>
          <Para>Data is retained only for the duration necessary for the purposes described above. Retention periods may vary depending on:</Para>
          <BulletList items={["Hospital legal obligations","Administrative and academic obligations","IT security requirements","Accounting or regulatory obligations"]} />
          <Para>Inactive accounts may be anonymized or deleted after a reasonable period.</Para>
        </>
      ),
    },
    {
      title: "10. User Rights",
      body: (
        <>
          <Para>In accordance with the GDPR, each user has the following rights:</Para>
          <BulletList items={["Right of access","Right to rectification","Right to erasure","Right to restriction of processing","Right to object","Right to data portability","Right to lodge a complaint with a data protection authority"]} />
          <Para>Requests may be sent to: 📧 <strong>privacy@medatwork.be</strong></Para>
          <Para>MED@WORK may request proof of identity before responding to certain requests.</Para>
        </>
      ),
    },
    {
      title: "11. Cookies and Local Storage",
      body: (
        <>
          <Para>The platform may use:</Para>
          <BulletList items={["Technical cookies necessary for authentication","Local storage mechanisms to maintain user sessions","Components required for the operation of the Progressive Web App (PWA)"]} />
          <Para>These elements are not used for advertising purposes.</Para>
        </>
      ),
    },
    {
      title: "12. Logging and Audit",
      body: (
        <>
          <Para>Certain sensitive actions may be logged to ensure system security, traceability, and compliance. This may include:</Para>
          <BulletList items={["Logins and logouts","Authentication failures","HR exports","Permission modifications","Administrative validations","Administrator actions"]} />
          <Para>These logs are used exclusively for security, audit, and maintenance purposes.</Para>
        </>
      ),
    },
    {
      title: "13. Medical Confidentiality",
      body: (
        <>
          <Para>MED@WORK is not intended to function as a patient medical record system.</Para>
          <Para>The platform is primarily designed for work organization, planning, academic validations, and administrative management.</Para>
          <Para>Users should avoid entering sensitive medical data that is not necessary for the operation of the platform.</Para>
        </>
      ),
    },
    {
      title: "14. Policy Changes",
      body: (
        <>
          <Para>MED@WORK may modify this Privacy Policy in order to reflect:</Para>
          <BulletList items={["Legal developments","Technical developments","New functionalities","Security requirements"]} />
          <Para>The latest update date is indicated at the top of this document.</Para>
        </>
      ),
    },
    {
      title: "15. Contact",
      body: (
        <Para>For any questions regarding data protection or this Privacy Policy: 📧 <strong>privacy@medatwork.be</strong></Para>
      ),
    },
    {
      title: "16. Governing Law",
      body: (
        <Para>This policy is governed by Belgian law and the General Data Protection Regulation (GDPR).</Para>
      ),
    },
  ],

  nl: [
    {
      title: "1. Inleiding",
      body: (
        <>
          <Para>MED@WORK is een digitaal platform bestemd voor het beheer van uurroosters, wachtdiensten, academische validaties, arbeidstijdconformiteit en ziekenhuisorganisatie van artsen in opleiding (MACCS), stagemeesters, coördinatoren, HR-medewerkers en ziekenhuisadministrators.</Para>
          <Para>Dit privacybeleid legt uit welke gegevens worden verzameld, waarom ze worden gebruikt, hoe ze worden beschermd en welke rechten gebruikers hebben.</Para>
          <Para>Het gebruik van het platform impliceert de aanvaarding van dit beleid.</Para>
        </>
      ),
    },
    {
      title: "2. Verwerkingsverantwoordelijke",
      body: (
        <>
          <Para>De verwerkingsverantwoordelijke is: <strong>MED@WORK</strong></Para>
          <Para>Voor vragen met betrekking tot gegevensbescherming:</Para>
          <Para>📧 E-mail: <strong>privacy@medatwork.be</strong></Para>
        </>
      ),
    },
    {
      title: "3. Verzamelde gegevens",
      body: (
        <>
          <Para>Afhankelijk van de rol van de gebruiker (MACCS, manager, HR, ziekenhuisadministrator) kan MED@WORK de volgende categorieën gegevens verwerken.</Para>
          <SubSection subtitle="3.1 Identificatiegegevens" items={["Naam","Voornaam","Professioneel e-mailadres","Geslacht","Functie / rol","Aangesloten ziekenhuis","Academiejaar","Medische specialisatie","Profielfoto (optioneel)"]} />
          <SubSection subtitle="3.2 Gegevens met betrekking tot professionele activiteit" items={["Werkroosters","Ziekenhuiswachtdiensten","Oproepbare wachtdiensten","Afwezigheden","Validaties van periodes","Validatiestatussen","Organisatie-instellingen van modelweken","Planningstoewijzingen","HR-exporten","Gegevens inzake arbeidstijdconformiteit"]} />
          <SubSection subtitle="3.3 Technische en beveiligingsgegevens" items={["IP-adres","Authenticatielogs","Verbindingsgeschiedenis","Type apparaat en browser","Authenticatietokens","Administratieve acties uitgevoerd binnen de applicatie","Gegevens noodzakelijk voor beveiliging en misbruikpreventie"]} />
          <SubSection subtitle="3.4 Communicatiegegevens" items={["Interne meldingen","Administratieve berichten","Bevestigingen van acties","Geautomatiseerde e-mails verbonden aan de werking van het platform"]} />
        </>
      ),
    },
    {
      title: "4. Doeleinden van de verwerking",
      body: (
        <>
          <Para>Gegevens worden uitsluitend gebruikt voor de volgende doeleinden:</Para>
          <BulletList items={["Beheer van gebruikersaccounts","Beheer van academiejaren","Beheer van planningen en uurroosters","Validatie van prestaties en opleidingsperiodes","Opvolging van arbeidstijdconformiteit van MACCS","Generatie van HR- en Staff Planner-exporten","Interne communicatie met betrekking tot ziekenhuiswerking","Beveiliging van toegangen en preventie van ongeoorloofde toegang","Productie van organisatorische statistieken","Onderhoud en verbetering van het platform","Naleving van wettelijke en reglementaire verplichtingen"]} />
          <Para>MED@WORK verkoopt geen persoonsgegevens.</Para>
        </>
      ),
    },
    {
      title: "5. Rechtsgrond van de verwerking",
      body: (
        <>
          <Para>De verwerkingen zijn gebaseerd op:</Para>
          <BulletList items={["De uitvoering van een contract of professionele relatie","De naleving van wettelijke verplichtingen die van toepassing zijn op ziekenhuizen en medische opleiding","Het gerechtvaardigd belang met betrekking tot ziekenhuisorganisatie en IT-beveiliging","De toestemming van de gebruiker wanneer dit vereist is"]} />
        </>
      ),
    },
    {
      title: "6. Toegang tot gegevens",
      body: (
        <>
          <Para>Gegevens zijn uitsluitend toegankelijk voor bevoegde personen volgens hun rol.</Para>
          <SubSection subtitle="6.1 Managers" items={["Hebben enkel toegang tot de academiejaren waaraan zij expliciet gekoppeld zijn."]} />
          <SubSection subtitle="6.2 Ziekenhuisadministrators" items={["Hebben toegang tot gegevens die verband houden met hun ziekenhuisinstelling."]} />
          <SubSection subtitle="6.3 Human Resources" items={["Hebben enkel toegang tot de gegevens die noodzakelijk zijn voor administratief beheer en reglementaire exporten."]} />
          <SubSection subtitle="6.4 Superadministrators" items={["Beschikken over beperkte toegang die uitsluitend bedoeld is voor administratie en onderhoud van het platform."]} />
        </>
      ),
    },
    {
      title: "7. Beveiligingsmaatregelen",
      body: (
        <>
          <Para>MED@WORK past technische en organisatorische maatregelen toe om gegevens te beschermen. Deze maatregelen omvatten onder meer:</Para>
          <BulletList items={["Beveiligde HTTPS/TLS-verbindingen","Beveiligde JWT-authenticatie","Cryptografisch beveiligde tokens","Segmentatie van toegangen volgens rollen en rechten","Strikte validatie van ingevoerde gegevens","Logging van gevoelige acties","Bescherming tegen ongeoorloofde toegang","Technische back-ups","Beperking van administratieve toegangen","Regelmatige updates van softwarecomponenten"]} />
          <Para>Wachtwoorden worden gehasht opgeslagen en nooit in platte tekst bewaard.</Para>
        </>
      ),
    },
    {
      title: "8. Hosting en onderaannemers",
      body: (
        <>
          <Para>Gegevens kunnen worden gehost bij technische dienstverleners gevestigd binnen de Europese Unie. Bepaalde diensten van derden kunnen worden gebruikt voor:</Para>
          <BulletList items={["Het verzenden van transactionele e-mails","Veilige hosting van het platform","Technische monitoring en foutlogs","Technische back-ups"]} />
          <Para>MED@WORK streeft ernaar samen te werken met dienstverleners die voldoende garanties bieden inzake beveiliging en GDPR-conformiteit.</Para>
        </>
      ),
    },
    {
      title: "9. Bewaartermijn",
      body: (
        <>
          <Para>Gegevens worden enkel bewaard gedurende de periode die noodzakelijk is voor de hierboven beschreven doeleinden. De bewaartermijn kan variëren afhankelijk van:</Para>
          <BulletList items={["Wettelijke ziekenhuisverplichtingen","Administratieve en academische verplichtingen","IT-beveiligingsvereisten","Boekhoudkundige of reglementaire verplichtingen"]} />
          <Para>Inactieve accounts kunnen na een redelijke periode worden geanonimiseerd of verwijderd.</Para>
        </>
      ),
    },
    {
      title: "10. Rechten van gebruikers",
      body: (
        <>
          <Para>Overeenkomstig de GDPR beschikt elke gebruiker over de volgende rechten:</Para>
          <BulletList items={["Recht op toegang","Recht op rectificatie","Recht op gegevenswissing","Recht op beperking van de verwerking","Recht van bezwaar","Recht op gegevensoverdraagbaarheid","Recht om een klacht in te dienen bij de gegevensbeschermingsautoriteit"]} />
          <Para>Verzoeken kunnen worden gericht aan: 📧 <strong>privacy@medatwork.be</strong></Para>
          <Para>MED@WORK kan een identiteitsbewijs vragen alvorens bepaalde verzoeken te behandelen.</Para>
        </>
      ),
    },
    {
      title: "11. Cookies en lokale opslag",
      body: (
        <>
          <Para>Het platform kan gebruikmaken van:</Para>
          <BulletList items={["Technische cookies noodzakelijk voor authenticatie","Mechanismen voor lokale opslag om gebruikerssessies te behouden","Elementen noodzakelijk voor de werking van de Progressive Web App (PWA)"]} />
          <Para>Deze elementen worden niet gebruikt voor reclamedoeleinden.</Para>
        </>
      ),
    },
    {
      title: "12. Logging en audit",
      body: (
        <>
          <Para>Bepaalde gevoelige acties kunnen worden gelogd om de veiligheid, traceerbaarheid en conformiteit van het systeem te waarborgen. Dit kan onder meer omvatten:</Para>
          <BulletList items={["Aanmeldingen en afmeldingen","Mislukte authenticaties","HR-exporten","Wijzigingen van toegangsrechten","Administratieve validaties","Acties van administrators"]} />
          <Para>Deze logs worden uitsluitend gebruikt voor beveiligings-, audit- en onderhoudsdoeleinden.</Para>
        </>
      ),
    },
    {
      title: "13. Medische vertrouwelijkheid",
      body: (
        <>
          <Para>MED@WORK is niet bedoeld als elektronisch patiëntendossier.</Para>
          <Para>Het platform is voornamelijk ontworpen voor werkorganisatie, planning, academische validaties en administratief beheer.</Para>
          <Para>Gebruikers dienen te vermijden gevoelige medische gegevens in te voeren die niet noodzakelijk zijn voor de werking van het platform.</Para>
        </>
      ),
    },
    {
      title: "14. Wijziging van het beleid",
      body: (
        <>
          <Para>MED@WORK kan dit privacybeleid wijzigen om rekening te houden met:</Para>
          <BulletList items={["Wettelijke evoluties","Technische evoluties","Nieuwe functionaliteiten","Beveiligingsvereisten"]} />
          <Para>De datum van de laatste update staat bovenaan dit document vermeld.</Para>
        </>
      ),
    },
    {
      title: "15. Contact",
      body: (
        <Para>Voor vragen met betrekking tot gegevensbescherming of dit privacybeleid: 📧 <strong>privacy@medatwork.be</strong></Para>
      ),
    },
    {
      title: "16. Toepasselijk recht",
      body: (
        <Para>Dit beleid wordt beheerst door het Belgisch recht en de Algemene Verordening Gegevensbescherming (GDPR).</Para>
      ),
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

const Content = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language in SECTIONS ? i18n.language : "fr";
  const sections = SECTIONS[lang];

  return (
    <Box>
      {sections.map((section, i) => (
        <Box key={i} marginBottom={i < sections.length - 1 ? 4 : 0}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
            {section.title}
          </Typography>
          {section.body}
        </Box>
      ))}
    </Box>
  );
};

export default Content;
