import {
  updateNameMutation,
  updateEmailMutation,
  updatePasswordMutation,
  deleteMeMutation
} from "./auth";
import {
  bookmarkUstwArticleMutation,
  bookmarkKetagalanArticleMutation,
  unbookmarkUstwArticleMutation,
  unbookmarkKetagalanArticleMutation
} from "./bookmark";
import { updateNotificationSettingMutation } from "./notification";
import {
  subscribeBillMutation,
  subscribePeopleMutation,
  unsubscribeBillMutation,
  unsubscribePeopleMutation
} from "./subscribe";

export const getMemberCustomizedMutations = (GraphQL, payload) => ({
  ...bookmarkUstwArticleMutation(GraphQL, payload),
  ...unbookmarkUstwArticleMutation(GraphQL, payload),
  ...bookmarkKetagalanArticleMutation(GraphQL, payload),
  ...unbookmarkKetagalanArticleMutation(GraphQL, payload),
  ...subscribeBillMutation(GraphQL, payload),
  ...unsubscribeBillMutation(GraphQL, payload),
  ...subscribePeopleMutation(GraphQL, payload),
  ...unsubscribePeopleMutation(GraphQL, payload),
  ...updateNameMutation(GraphQL, payload),
  ...updateEmailMutation(GraphQL, payload),
  ...updatePasswordMutation(GraphQL, payload),
  ...updateNotificationSettingMutation(GraphQL, payload),
  ...deleteMeMutation(GraphQL, payload)
})
