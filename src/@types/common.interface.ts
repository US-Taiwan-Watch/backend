export interface JWTDecodedObject {
  given_name: string;
  family_name: string;
  middle_name: string;
  nickname: string;
  name: string;
  picture: string;
  updated_at: string;
  email: string;
  email_verified: boolean;
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  nonce: string;
  scope?: string;
}

export interface IApolloContext {
  currentUser: JWTDecodedObject;
  token: string;
  ip?: string;
}
