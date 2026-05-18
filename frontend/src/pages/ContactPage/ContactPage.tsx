import { useEffect } from "react";
import Box from "@mui/material/Box";

import Container from "../../components/medium/Container";
import ContactUs from "../../components/big/ContactUs";

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight={{ xs: "calc(100vh - 58px)", sm: "calc(100vh - 66px)", md: "calc(100vh - 71px)" }}
      px={2}
      py={{ xs: 4, md: 6 }}
    >
      <Container>
        <ContactUs
          title="Contactez-nous"
          subtitle="Vous avez encore des questions, des suggestions ou vous souhaitez simplement en discuter ? N'hésitez pas à nous contacter."
        />
      </Container>
    </Box>
  );
};

export default ContactPage;
