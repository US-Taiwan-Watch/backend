import {
  submitTaiwanRecordMutation,
  modifyTaiwanRecordMutation,
  withdrawTaiwanRecordMutation
} from "./reviewRecord";

export const getTaiwanRecordCustomizedMutations = (GraphQL, payload) => ({
  ...submitTaiwanRecordMutation(GraphQL, payload),
  ...modifyTaiwanRecordMutation(GraphQL, payload),
  ...withdrawTaiwanRecordMutation(GraphQL, payload),
})
