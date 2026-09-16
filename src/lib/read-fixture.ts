import { readFileSync } from "fs";
import { join } from "path";

/** Load fixture text with a statically scoped fixtures/ root for bundlers. */
export function readFixture(...parts: string[]): string {
  return readFileSync(join(process.cwd(), "fixtures", ...parts), "utf8");
}
