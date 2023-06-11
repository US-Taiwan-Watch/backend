import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { I18NText } from "../../common/models";
import { IApolloContext } from "../@types/common.interface";

@Resolver(I18NText)
export class I18nResolver {
  // computed field
  @FieldResolver(() => String, { nullable: true })
  text(@Root() i18n: I18NText, @Ctx() ctx: IApolloContext): string {
    const lang = ctx.language;
    let s = i18n.zh || i18n.en || "";
    if (lang) {
      switch (lang.toLowerCase().substring(0, 2)) {
        case "en":
          s = i18n.en ?? s;
          break;

        case "zh":
        default:
          s = i18n.zh ?? s;
      }
    }
    return s;
  }
}
