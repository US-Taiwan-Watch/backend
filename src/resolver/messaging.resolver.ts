import { Resolver, Mutation, Arg, PubSub, Publisher } from "type-graphql";
import {
  EventPayloadPublish,
  SubscriptionAction,
  UserEventPayloadEmitting,
} from "./subscription.resolver";

@Resolver()
export class MessagingResolver {
  @Mutation(() => Boolean)
  async emitGlobalEvent(
    @Arg("data", () => String!) data: string,
    @PubSub(SubscriptionAction.EVENT_GLOBAL)
    publish: Publisher<EventPayloadPublish>
  ): Promise<boolean> {
    await publish({ data });
    return true;
  }

  @Mutation(() => Boolean)
  async emitUserEvent(
    @Arg("userIdx", () => [String!]) userIdx: string[],
    @Arg("data", () => String!) data: string,
    @PubSub(SubscriptionAction.EVENT_USER)
    publish: Publisher<UserEventPayloadEmitting>
  ): Promise<boolean> {
    await publish({ userIdx, data });
    return true;
  }
}
