export const getBaseUrlFromReq = (req: any) => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"];
  return `${protocol}://${host}`;
};
