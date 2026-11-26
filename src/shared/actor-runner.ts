import type { Server } from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Actor } from 'apify';

export interface DualModeActorOptions {
  runBatch: () => Promise<void>;
  createMcpServer: () => Server;
  createStdioMcpServer?: () => McpServer;
  defaultPort?: number;
}

/**
 * Boots the Apify Actor in stdio MCP mode (--stdio / MCP_TRANSPORT=stdio),
 * Standby HTTP MCP mode (APIFY_META_ORIGIN=STANDBY), or standard batch extraction mode.
 */
export async function runDualModeActor(options: DualModeActorOptions): Promise<void> {
  const isStdio =
    process.env.MCP_TRANSPORT === 'stdio' || process.argv.includes('--stdio');

  if (isStdio && options.createStdioMcpServer) {
    const server = options.createStdioMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

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
