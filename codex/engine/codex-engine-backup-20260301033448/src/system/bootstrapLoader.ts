import fs from "fs";
import path from "path";
import { BootstrapDocument, BootSystemPromo } from "../types/engine";

const BOOTSTRAP_PATH = path.join(process.cwd(), "system", "bootstrap.json");

export function loadBootstrap(): BootSystemPromo {
  if (!fs.existsSync(BOOTSTRAP_PATH)) {
    throw new Error("Missing system/bootstrap.json");
  }

  const raw = fs.readFileSync(BOOTSTRAP_PATH, "utf8");
  const parsed = JSON.parse(raw) as BootstrapDocument;

  if (!parsed.BOOT_SYSTEM_PROMO) {
    throw new Error("Invalid bootstrap format: BOOT_SYSTEM_PROMO missing");
  }

  return parsed.BOOT_SYSTEM_PROMO;
}
