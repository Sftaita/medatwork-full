import { useState } from "react";
import { useParams } from "react-router-dom";

import Box from "@mui/material/Box";
import Container from "../../components/medium/Container";
import Main from "./components/Main";
import ContactUs from "../../components/big/ContactUs";
import { useEffect } from "react";

const DetailledDescriptionPage = ({ _match }) => {
  const [job, setJob] = useState();

  const { id = "Managers" } = useParams();

  useEffect(() => {
    setJob(id);
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <Box>
      <Container>
        <Main job={job} setJob={setJob} />
      </Container>
      <Box bgcolor={"alternate.main"}>
        <Container>
          <Box paddingTop={4} paddingBottom={4}>
            <ContactUs
              title="Contactez-nous"
              subtitle="Vous avez encore des questions, des suggestions ou vous souhaitez simplement en discuter? N'hésitez pas à nous contacter."
            />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default DetailledDescriptionPage;
