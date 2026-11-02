import { updateNotificationSettingResolver } from "../resolvers/notification"

export const updateNotificationSettingMutation = (GraphQL, payload) => {
  return {
    updateMyNotificationSetting: {
      type: payload.collections.members.graphQL.type,
      args: {
        notificationSetting: {
          type: payload.collections.members.graphQL.mutationInputType.ofType.getFields().notificationSetting.type,
        }
      },
      resolve: updateNotificationSettingResolver,
    },
  };
};
