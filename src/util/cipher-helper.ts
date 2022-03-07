import * as crypto from "crypto";

const algorithm = "aes-256-cbc";

/**
 *
 * @param text text to encrypt
 * @param password secret key
 * @returns return string in the format if iv:encrypted-data
 */
export function encrypt(text: string, password: string): string {
  let key = crypto.randomBytes(32);
  key = Buffer.concat([Buffer.from(password)], key.length);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedData: string, password: string) {
  const [ivHex, data] = encryptedData.split(":");
  let key = crypto.randomBytes(32);
  key = Buffer.concat([Buffer.from(password)], key.length);
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(data, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export const sha256 = (text: string) => {
  const hash = crypto.createHash("sha256");
  hash.update(text);
  return hash.digest("hex");
};

if (require.main === module) {
  const encrypted = encrypt(
    JSON.stringify({
      type: "ticket-link",
      event_id: "101400824596",
      order_id: "1309230414",
      name: "Ying-Po Liao",
      email: "contact@aikhun.com",
      barcode: "13092304141835963604002",
    }),
    "some-secret-password"
  );
  console.log(encrypted);
  console.log();
  console.log(decrypt(encrypted, "some-secret-password"));
}
