import { Field, Int, ObjectType } from "type-graphql";
import { Bill, Member } from "../../common/models";
import { MemberResolver } from "../resolver/member.resolver";

@ObjectType()
export class DenormalizedBill extends Bill {
  static from(bill: Bill | null) {
    if (!bill) {
      return null;
    }
    return new DenormalizedBill(bill);
  }

  constructor(bill: Bill) {
    super();
    Object.assign(this, bill);
  }

  @Field(() => Member, { nullable: true })
  async sponsor(): Promise<Member | null> {
    if (!this.sponsorId) {
      return null;
    }
    return await new MemberResolver().member(this.sponsorId);
  }

  @Field(() => Int, { nullable: true })
  cosponsorsCount(): number | undefined {
    return this.cosponsorInfos?.length;
  }

  @Field(() => [Member], { nullable: true })
  async cosponsors(): Promise<Member[] | null> {
    if (!this.cosponsorInfos) {
      return null;
    }
    const cosponsors = await new MemberResolver().members(this.cosponsorInfos.map(ci => ci.memberId));
    return this.cosponsorInfos.map(co => {
      const found = cosponsors.find(coo => coo.id === co.memberId);
      return found ? found : { id: co.memberId };
    })
  }
  tags?: string[];
}
