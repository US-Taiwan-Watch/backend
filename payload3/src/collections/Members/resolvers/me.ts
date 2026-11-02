export const meResolver = async (obj, args, context) => {
  if (context.req.user?.collection !== "members") {
    throw new Error("User is not authenticated.");
  }

  const member = context.req.user;
  const db = context.req.payload.db;

  const submittedTaiwanRecords = await db
    .collections["taiwan-records"]
    .find({ author: member.id, status: { $ne: "deleted" } }) || [];
  const submittedIds = submittedTaiwanRecords.map((r) => r.id);

  return {
    ...member,
    submittedTaiwanRecords: submittedIds,
  };
}
