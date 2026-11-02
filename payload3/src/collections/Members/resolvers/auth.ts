import { assertIsDatabaseUser, getAuth0Management } from "../../../services/auth0";

export const updateNameResolver = async (obj, args, context, info) => {
  const { req } = context;
  const user = req?.user;
  if (!user || user.collection !== "members") {
    throw new Error('User is not authenticated');
  }

  const auth0UserId: string = user.providerId || user.sub;
  if (!auth0UserId) {
    throw new Error("Missing providerId on user");
  }

  const db = context.req.payload.db;

  try {
    await db.collections['members'].updateOne(
      { providerId: auth0UserId },
      {
        $set: {
          fullName: args.name,
        },
      }
    );

    const updatedMember = await db.collections['members'].findOne({
      providerId: auth0UserId
    });

    return updatedMember;
  } catch (err: any) {
    throw new Error(`Failed to update name: ${err?.message || String(err)}`);
  }
};

export const updateEmailResolver = async (obj, args, context, info) => {
  const { req } = context;
  const user = req?.user;
  if (!user || user.collection !== "members") {
    throw new Error('User is not authenticated');
  }

  const auth0UserId: string = user.providerId || user.sub;
  if (!auth0UserId) {
    throw new Error("Missing providerId on user");
  }

  assertIsDatabaseUser(auth0UserId);

  const db = context.req.payload.db;
  const mgmt = getAuth0Management();

  try {
    await mgmt.users.update(
      auth0UserId,
      {
        email: args.email,
        email_verified: false,
        verify_email: true,
      } as any
    );

    await db.collections['members'].updateOne(
      { providerId: auth0UserId },
      {
        $set: {
          email: args.email,
        },
      }
    );

    const updatedMember = await db.collections['members'].findOne({
      providerId: auth0UserId
    });

    return updatedMember;
  } catch (err: any) {
    throw new Error(`Failed to update email: ${err?.message || String(err)}`);
  }
};

export const updatePasswordResolver = async (obj, args, context, info) => {
  const { req } = context;
  const user = req?.user;
  if (!user || user.collection !== "members") {
    throw new Error('User is not authenticated');
  }

  const auth0UserId: string = user.providerId || user.sub;
  if (!auth0UserId) {
    throw new Error("Missing providerId on user");
  }

  assertIsDatabaseUser(auth0UserId);

  const db = context.req.payload.db;
  const mgmt = getAuth0Management();

  try {
    await mgmt.users.update(
      auth0UserId,
      {
        password: args.password,
      } as any
    );

    const currentMember = await db.collections['members'].findOne({
      providerId: auth0UserId
    });

    return currentMember;
  } catch (err: any) {
    throw new Error(`Failed to update password: ${err?.message || String(err)}`);
  }
};

export const deleteMeResolver = async (obj, args, context, info) => {
  const { req } = context;
  const user = req?.user;
  if (!user || user.collection !== "members") {
    throw new Error('User is not authenticated');
  }

  const auth0UserId: string = user.providerId || user.sub;
  if (!auth0UserId) {
    throw new Error("Missing providerId on user");
  }

  const db = context.req.payload.db;
  const mgmt = getAuth0Management();

  try {
    await mgmt.users.delete(auth0UserId);

    const currentMember = await db.collections['members'].findOne({
      providerId: auth0UserId
    });

    await db.collections['members'].findOneAndDelete({ _id: user.id });
    return currentMember;
  } catch (err: any) {
    throw new Error(`Failed to delete member: ${err?.message || String(err)}`);
  }
};
