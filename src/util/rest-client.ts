import * as rm from "typed-rest-client";

declare class RestClientAuth extends rm.RestClient {
  public token: string;
}

const RestClient = new rm.RestClient("asiania") as RestClientAuth;

const proto = rm.RestClient.prototype as any;
const realFn = proto._headersFromOptions;

proto._headersFromOptions = (options: any, contentType: string) => {
  const optionsAuth = {
    additionalHeaders: {
      ...(RestClient.token && {
        Authorization: `Bearer ${RestClient.token}`,
      }),
      ...options?.additionalHeaders,
    },
    ...options,
  };
  return realFn(optionsAuth, contentType);
};

export { RestClient };
