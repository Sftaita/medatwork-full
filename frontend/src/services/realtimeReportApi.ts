import { axiosPrivate } from "./Axios";

export interface RealtimeReportEmailResponse {
  message: string;
  sent:    number;
  skipped: number;
  errors?: string[];
}

const realtimeReportApi = {
  /** Envoie le rapport PDF (base64) aux managers liés à l'année. */
  emailManagers(yearId: number, pdfBase64: string, month: string): Promise<RealtimeReportEmailResponse> {
    return axiosPrivate
      .post<RealtimeReportEmailResponse>(
        `manager/years/${yearId}/realtime-report/email-managers`,
        { pdfBase64, month }
      )
      .then(r => r.data);
  },
};

export default realtimeReportApi;
