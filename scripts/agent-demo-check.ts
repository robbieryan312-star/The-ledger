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

const DEMO_PROMPT = `Demo check for this Next.js county/map app.
If a dev server is running (typically http://localhost:3000), curl or fetch key routes and summarize responses.
Validate the Palm Beach ZIP 33426 data chain end-to-end in code and via routes if possible.
Report pass/fail for demo-critical paths.`;

async function main(): Promise<void> {
  const apiKey = requireApiKey();

  try {
    const result = await Agent.prompt(DEMO_PROMPT, {
      apiKey,
      model: { id: "composer-2.5" },
      local: { cwd: projectRoot, settingSources: [] },
    });

    if (result.result) {
      console.log(result.result);
    }
    console.log(`status: ${result.status}`);

    if (result.status === "error") {
      process.exit(2);
    }
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
