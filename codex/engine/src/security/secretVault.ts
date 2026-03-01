import fs from "fs";
import path from "path";

const DEFAULT_SECRET_DIR = path.join(process.env.HOME ?? "/home/t79", ".asus_secrets");

function ensureOwnerOnly(filePath: string): void {
  const lst = fs.lstatSync(filePath);
  if (lst.isSymbolicLink()) {
    throw new Error(`Secret path must not be symlink: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const mode = stat.mode & 0o777;
  const currentUid = typeof process.getuid === "function" ? process.getuid() : stat.uid;
  const ownedByCurrentOrRoot = stat.uid === currentUid || stat.uid === 0;
  if (!ownedByCurrentOrRoot) {
    throw new Error(`Secret file owner invalid: ${filePath}`);
  }

  const isDockerSecret = filePath.startsWith("/run/secrets/");
  if ((mode & 0o022) !== 0) {
    throw new Error(`Secret file is writable by group/others: ${filePath} (mode ${mode.toString(8)})`);
  }

  if (!isDockerSecret && (mode & 0o077) !== 0) {
    throw new Error(`Secret file permissions too open: ${filePath} (mode ${mode.toString(8)})`);
  }

  const parent = path.dirname(filePath);
  const parentStat = fs.statSync(parent);
  const parentMode = parentStat.mode & 0o777;
  if ((parentMode & 0o002) !== 0) {
    throw new Error(`Secret parent directory is world-writable: ${parent}`);
  }
}

export function readSecretFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Secret file missing: ${filePath}`);
  }

  ensureOwnerOnly(filePath);
  const value = fs.readFileSync(filePath, "utf8").trim();
  if (!value) {
    throw new Error(`Secret file empty: ${filePath}`);
  }

  return value;
}

export function getAdminToken(): string {
  const inline = process.env.VYRDON_ADMIN_TOKEN?.trim();
  if (inline) {
    return inline;
  }

  const tokenFile = process.env.VYRDON_ADMIN_TOKEN_FILE?.trim() || path.join(DEFAULT_SECRET_DIR, "admin.token");
  return readSecretFile(tokenFile);
}

export function getExecutionPublicKeyPem(): string {
  const configured = process.env.EXECUTION_PUBLIC_KEY_FILE?.trim();
  const filePath = configured || path.join(DEFAULT_SECRET_DIR, "execution_ed25519.pub");
  return readSecretFile(filePath);
}

export function getOpenAIApiKey(): string | null {
  const inline = process.env.OPENAI_API_KEY?.trim();
  if (inline) {
    return inline;
  }

  const filePath = process.env.OPENAI_API_KEY_FILE?.trim();
  if (!filePath) {
    return null;
  }

  try {
    return readSecretFile(filePath);
  } catch {
    return null;
  }
}
