import { initRepairoConfig } from "../../lib/engine";

export interface InitOptions {
  repo?: string;
  vendors?: string[];
}

export function handleInitCommand(options: InitOptions = {}): void {
  console.log("\nREPAIRO");
  console.log("──────────────────────────────\n");
  console.log("Initializing Repairo local workspace...\n");

  const repository = options.repo || "owner/repository";

  try {
    const { configPath, created, config } = initRepairoConfig(".", {
      repository,
      vendors: options.vendors,
    });

    if (created) {
      console.log(`✓ Initialized .repairo workspace directory`);
      console.log(`✓ Created config: ${configPath}`);
      console.log(`✓ Created baseline snapshots & reports directories\n`);
    } else {
      console.log(`✓ Updated existing Repairo configuration: ${configPath}\n`);
    }

    console.log("Configuration:");
    console.log(JSON.stringify(config, null, 2));

    console.log("\nNext step:");
    console.log("  repairo diff --spec ./specs/openapi.json\n");
  } catch (err: any) {
    console.error(`\n❌ Error initializing Repairo: ${err.message || String(err)}\n`);
    process.exit(1);
  }
}
