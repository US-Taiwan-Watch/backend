import * as _ from "lodash";

const CacheKeyDefinition = {
  AUTH0_ROLE: (user_id: string) => `auth0-role-${user_id}`,
  AUTH0_USER: (user_id: string) => `auth0-user-${user_id}`,
} as const;

type FilterFlags<Base, Condition> = {
  [K in keyof Base]: Base[K] extends Condition ? K : never;
};

type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];

type CacheKeyDefT = typeof CacheKeyDefinition;

export type CacheKey = keyof CacheKeyDefT;

type CacheKeyPrefixConst = AllowedNames<CacheKeyDefT, string>;
type CacheKeySubtypeConst = Pick<CacheKeyDefT, CacheKeyPrefixConst>;

type CacheKeyPrefixFunc = AllowedNames<CacheKeyDefT, (...args: any[]) => any>;
type CacheKeySubtypeFunc = Pick<CacheKeyDefT, CacheKeyPrefixFunc>;

type CacheKeyFuncParams<K extends CacheKey> = K extends CacheKeyPrefixFunc
  ? Parameters<CacheKeyDefT[K]>
  : [];

export const getCacheKey = <K extends CacheKey>(
  prefix: K,
  ...args: CacheKeyFuncParams<K>
): string => {
  if (_.isString(CacheKeyDefinition[prefix])) {
    return (CacheKeyDefinition as CacheKeySubtypeConst)[
      prefix as CacheKeyPrefixConst
    ];
  } else {
    const f = (CacheKeyDefinition as CacheKeySubtypeFunc)[
      prefix as CacheKeyPrefixFunc
    ];
    return (f as any)(args);
  }
};
