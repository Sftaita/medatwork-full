export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export interface ApiCall {
  method: HttpMethod;
  url: string;
}
