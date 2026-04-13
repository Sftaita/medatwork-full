import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const mock = [
  {
    title: "1. Quelles sont les informations que nous collectons?",
    description:
      "Toutes les données personnelles fournies par le visiteur ou membre sont destinées à l'usage interne de l’application Med@Work. Nous nous engageons à utiliser exclusivement les données qui sont indispensables à une qualité de service optimale. Lors de votre visite sur le site www.medatwork.be, nous sommes susceptibles de collecter les informations suivantes : votre 'domain name' (adresse IP), l'ensemble de l'information concernant les pages que vous avez consultées sur le site de www.medatwork, toute information que vous nous avez donnée volontairement (par exemple dans le cadre d'enquêtes d'informations et/ou des inscriptions sur site). Lors de votre inscription sur le site www.medatwork.be, nous sommes susceptibles de collecter les informations suivantes : Nom, prénom, adresse email, date de naissance, genre, lieu de travail, lieu de formation, année d’étude, status d’acceptation de l’opting out.",
  },
  {
    title: "2. Comment utilisons-nous vos informations?",
    description:
      "Ces informations sont utilisées pour : l’application des algorithmes de notre application/site web, améliorer le contenu de notre application/site web, personnaliser le contenu et le lay-out de nos pages pour chaque visiteur individuel, vous informer des mises à jour de notre site, vous aviser d’informations utiles si nécessaire, vous contacter ultérieurement à des fins de marketing direct.",
  },
  {
    title: "3. Vos informations seront-elles partagées avec des tiers?",
    description:
      "Les informations fournies par l’utilisateur à Med@Work sont destinées à l’usage unique de medatwork. Ces informations ne sont en aucun cas transmises à un service tiers, excepté aux services de stockage en base de données nécessaire au fonctionnement de l’application. Certaines informations personnelles utiles telles que le nom, le prénom, l’adresse email, l’université de formation, l’année de formation, le lieu d’exercice et la relation existante avec d’autres utilisateurs peuvent être visibles par les autres utilisateurs de l’application.",
  },
  {
    title: "4. Utilisons-nous des cookies ou d'autres technologies de suivi?",
    description:
      "Le site www.medatwork.be utilise des cookies, à savoir de petits fichiers déposés sur le disque dur de votre ordinateur, smartphone ou tablette qui conservent des informations en vue d'une connexion ultérieure. Ces cookies permettent à Med@Work d’enregistrer vos préférences et d’améliorer ou accélérer vos prochaines visites du site. Med@Work utilise des technologies de cryptage qui sont reconnues comme les standards industriels dans le secteur, quand elle collecte et utilise vos données personnelles.",
  },
  {
    title: "5. Vos informations sont-elles transférées au niveau international?",
    description:
      "Notre fournisseur de base de données est basé en France et utilise des serveurs européens pour le stockage de donnée de Med@Work. Ainsi les données stockées sont toujours couvertes par la réglementation européenne en matière de protection des données personnelles.",
  },
  {
    title: "6. Combien de temps conservons-nous vos informations?",
    description:
      "Dans le cadre des obligations du Règlement Général sur la Protection des Données (RGPD) et afin de respecter le droit à l’oubli, nous sommes tenus de supprimer ou d’anonymiser les données personnelles des personnes inactives depuis 3 ans de notre base de données. ",
  },
  {
    title: "7. Quels sont vos droits en matière de protection des données personnelles?",
    description:
      "Vous avez le droit : 1) de demander des informations sur le traitement de vos données à caractère personnel, d’obtenir l’accès aux données à caractère personnel détenues à votre sujet; 2) de demander que les données à caractère personnel incorrectes, inexactes ou incomplètes soient corrigées; 3) de demander que les données à caractère personnel soient effacées lorsqu’elles ne sont plus nécessaires ou si leur traitement est illicite ; 4) de vous opposer au traitement de vos données à caractère personnel à des fins de prospection ou pour des raisons liées à votre situation particulière; 5) de demander la limitation du traitement de vos données à caractère personnel dans des cas précis; 6) de récupérer vos données personnelles, dans un format utilisé et lisible par machine, pour un usage personnel ou pour les transférer à un autre organisme; 7) de demander que les décisions fondées sur un traitement automatisé qui vous concernent ou vous affectent de manière significative et fondée sur vos données à caractère personnel soient prises par des personnes physiques et non uniquement par des ordinateurs. Dans ce cas, vous avez également le droit d’exprimer votre avis et de contester lesdites décisions; 8) en cas de dommage matériel ou moral lié à la violation du RGPD, vous disposez d’un droit de recours. ",
  },
  {
    title:
      "8. Comment pouvez-vous consulter, mettre à jour ou supprimer les données que nous recueillons à votre sujet?",
    description:
      "Sur requête, nous procurons aux utilisateurs de notre site/application un accès à toutes les informations les concernant. Par ailleurs, conformément au Règlement européen de protection des données (GDPR), tout visiteur ou membre peut obtenir gratuitement la rectification, la limitation, la suppression ou l’interdiction d’utilisation de toute donnée à caractère personnel le concernant. Si le visiteur ou membre souhaite introduire une telle demande, merci d’envoyer un e-mail à info@medatwork.be. Med@Work s’engage à traiter votre demande dans un délai d’un mois. Si vous estimez que notre site/application ne respecte pas notre police vie privée telle qu'elle est décrite, veuillez prendre contact avec : Med@Work, dont les coordonnées sont reprises ci-dessus.",
  },
];

const PrivacySection = ({ title, description }) => {
  return (
    <Box>
      <Typography
        variant={"h6"}
        gutterBottom
        sx={{
          fontWeight: "medium",
        }}
      >
        {title}
      </Typography>
      <Typography component={"p"} color={"text.secondary"} align={"justify"}>
        {description}
      </Typography>
    </Box>
  );
};

const Content = () => {
  return (
    <Box>
      {mock.map((item, i) => (
        <Box key={i} marginBottom={i < mock.length - 1 ? 4 : 0}>
          <PrivacySection {...item} />
        </Box>
      ))}
    </Box>
  );
};

export default Content;
