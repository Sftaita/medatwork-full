import CommunicationPageContent from "../../components/communication/CommunicationPageContent";
import { adminCommunicationsApi } from "../../services/communicationsApi";

const QUERY_KEY = ["admin-communications"] as const;

const AdminCommunicationPage = () => (
  <CommunicationPageContent
    queryKey={QUERY_KEY}
    api={adminCommunicationsApi}
    showHospital
  />
);

export default AdminCommunicationPage;
