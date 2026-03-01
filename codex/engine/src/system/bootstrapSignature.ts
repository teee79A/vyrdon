import crypto from "crypto";
import fs from "fs";
import path from "path";

function resolveRequired(): boolean {
  const raw = (process.env.BOOTSTRAP_SIGNATURE_REQUIRED ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

function decodeSignature(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("bootstrap signature is empty");
  }

  if (/^[a-f0-9]+$/i.test(trimmed) && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, "hex");
  }

  return Buffer.from(trimmed, "base64");
}

export function verifyBootstrapSignature(bootstrapPath: string): void {
  if (!resolveRequired()) {
    return;
  }

  const sigPath = process.env.BOOTSTRAP_SIGNATURE_FILE?.trim() || path.join(process.cwd(), "system", "bootstrap.sig");
  const pubPath =
    process.env.BOOTSTRAP_PUBLIC_KEY_FILE?.trim() || path.join(process.env.HOME ?? "/home/t79", ".asus_secrets", "bootstrap_ed25519.pub");

  if (!fs.existsSync(sigPath)) {
    throw new Error(`Missing bootstrap signature file: ${sigPath}`);
  }

  if (!fs.existsSync(pubPath)) {
    throw new Error(`Missing bootstrap public key file: ${pubPath}`);
  }

  const payload = fs.readFileSync(bootstrapPath);
  const signature = decodeSignature(fs.readFileSync(sigPath, "utf8"));
  const publicKey = fs.readFileSync(pubPath, "utf8");

  const valid = crypto.verify(null, payload, publicKey, signature);
  if (!valid) {
    throw new Error("bootstrap signature verification failed");
  }
}
