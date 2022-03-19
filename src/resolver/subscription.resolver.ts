import {
  Arg,
  Field,
  ObjectType,
  ResolverFilterData,
  Root,
  Subscription,
} from "type-graphql";

export enum SubscriptionAction {
  EVENT_GLOBAL = "EVENT_GLOBAL",
  EVENT_USER = "EVENT_USER",
}

@ObjectType()
export class EventPayloadPublish {
  @Field((type) => String, { nullable: true })
  data?: string;
}

@ObjectType()
export class UserEventPayloadEmitting extends EventPayloadPublish {
  @Field(() => [String!], { nullable: false })
  userIdx: string[] = [];
}

export class SubscriptionResolver {
  @Subscription({
    topics: SubscriptionAction.EVENT_GLOBAL,
  })
  onGlobalEvent(@Root() payload: EventPayloadPublish): EventPayloadPublish {
    return payload ?? {};
  }

  @Subscription({
    topics: SubscriptionAction.EVENT_USER,
    filter: ({ payload, args }: ResolverFilterData<UserEventPayloadEmitting>) =>
      payload.userIdx.includes(args.userId),
  })
  onUserEvent(
    @Arg("userId", () => String!) _userId: string,
    @Root() payload: UserEventPayloadEmitting
  ): EventPayloadPublish {
    return payload ?? {};
  }
}
