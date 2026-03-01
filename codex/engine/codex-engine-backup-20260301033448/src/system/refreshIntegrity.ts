import { ensureHardwareProfile } from "./hardwareProfiler";
import { writeIntegrityHash } from "./integrity";

function run(): void {
  const hardware = ensureHardwareProfile();
  const digest = writeIntegrityHash();
  console.log(`hardware_profile=${hardware.status}`);
  console.log(`integrity_hash=${digest}`);
}

run();
