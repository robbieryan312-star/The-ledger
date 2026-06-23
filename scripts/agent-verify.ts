import { Agent, CursorAgentError } from "@cursor/sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function requireApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing CURSOR_API_KEY. Set it with: export CURSOR_API_KEY=<your-key>",
    );
    process.exit(1);
  }
  return apiKey;
}

const VERIFY_PROMPT = `You are verifying demo readiness for this Next.js app in the current working directory.
1. Run a production build (npm run build) and report any failures.
2. Review map, search, and county flows for obvious issues in the codebase.
3. Summarize whether the app is ready for a live demo and list any blockers.`;

async function main(): Promise<void> {
  const apiKey = requireApiKey();

  try {
    await using agent = await Agent.create({
      apiKey,
      model: { id: "composer-2.5" },
      local: { cwd: projectRoot, settingSources: [] },
    });

    const run = await agent.send(VERIFY_PROMPT);
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
        }
      }
    }

    const result = await run.wait();
    if (result.status === "error") {
      console.error(`\nrun failed: ${result.id}`);
      process.exit(2);
    }

    console.log(`\nstatus: ${result.status}`);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`startup failed: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
