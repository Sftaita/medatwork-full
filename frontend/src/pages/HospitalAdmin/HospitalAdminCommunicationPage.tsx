import CommunicationPageContent from "../../components/communication/CommunicationPageContent";
import { hospitalAdminCommunicationsApi } from "../../services/communicationsApi";

const QUERY_KEY = ["ha-communications"] as const;

const HospitalAdminCommunicationPage = () => (
  <CommunicationPageContent
    queryKey={QUERY_KEY}
    api={hospitalAdminCommunicationsApi}
    showHospital={false}
  />
);

export default HospitalAdminCommunicationPage;
