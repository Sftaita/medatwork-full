import { useEffect } from "react";
import Box from "@mui/material/Box";

import Container from "../../components/medium/Container";
import ContactUs from "../../components/big/ContactUs";

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box>
      <Box height={1}>
        <Container>
          <ContactUs
            title="Contactez-nous"
            subtitle="Vous avez encore des questions, des suggestions ou vous souhaitez simplement en discuter? N'hésitez pas à nous contacter."
          />
        </Container>
      </Box>
    </Box>
  );
};

export default ContactPage;
