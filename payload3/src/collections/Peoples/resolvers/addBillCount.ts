export const addBillCountPeopleResolver = async (_obj, { id }, { req }, _info) => {
  // The afterRead hook counts every bill, without the default ten-document page.
  return req.payload.findByID({ collection: 'peoples', id, req, overrideAccess: false, depth: 0 });
};
