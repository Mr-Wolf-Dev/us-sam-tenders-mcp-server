import { pathToFileURL } from 'node:url';
import { runActorBatch, type SamBillingEvent } from './adapters/apify-actor.js';
import { createSamMcpHttpServer } from './adapters/mcp-server.js';
import { SamHttpClient } from './adapters/sam-http-client.js';
import { runDualModeActor } from './shared/actor-runner.js';
import { createApifyBillingMeter } from './shared/billing-meter.js';

export async function main(): Promise<void> {
  const source = new SamHttpClient();
  const billing = createApifyBillingMeter<SamBillingEvent>();

  await runDualModeActor({
    runBatch: () => runActorBatch(source, billing),
    createMcpServer: () => createSamMcpHttpServer({ source, billing }),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
