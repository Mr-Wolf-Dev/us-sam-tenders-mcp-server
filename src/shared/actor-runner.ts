import type { Server } from 'node:http';
import { Actor } from 'apify';

export interface DualModeActorOptions {
  runBatch: () => Promise<void>;
  createMcpServer: () => Server;
  defaultPort?: number;
}

/**
 * Boots the Apify Actor in Standby MCP mode when APIFY_META_ORIGIN=STANDBY,
 * or runs the standard batch extraction mode otherwise.
 */
export async function runDualModeActor(options: DualModeActorOptions): Promise<void> {
  await Actor.init();

  const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';
  if (isStandby) {
    const port = Number(process.env.ACTOR_STANDBY_PORT ?? options.defaultPort ?? 4321);
    console.log(`Starting MCP Standby server on port ${port}`);
    const server = options.createMcpServer();

    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });
    return;
  }

  console.log('Running batch extraction mode');

  try {
    await options.runBatch();
  } finally {
    await Actor.exit();
  }
}
