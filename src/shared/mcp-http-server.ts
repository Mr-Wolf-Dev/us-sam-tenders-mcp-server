import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export interface McpHttpServerOptions {
  serviceName: string;
  createServer: () => McpServer;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw.length > 0 ? (JSON.parse(raw) as unknown) : undefined;
}

/**
 * Creates a stateless Streamable HTTP MCP server compatible with Apify Standby mode.
 */
export function createMcpHttpServer(options: McpHttpServerOptions): Server {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: options.serviceName }));
      return;
    }

    if (
      req.method === 'GET' &&
      (pathname === '/mcp/.well-known/glama.json' || pathname === '/.well-known/glama.json')
    ) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          $schema: 'https://glama.ai/mcp/schemas/connector.json',
          claim: process.env.GLAMA_CLAIM_TOKEN ?? 'glama_claim_NiaA3-wx54lP5B6TXgL2kaH9fyQquIKv',
        }),
      );
      return;
    }

    if (pathname === '/mcp') {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST /mcp.' }));
        return;
      }

      const mcpServer = options.createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      try {
        const body = await readJsonBody(req);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, body);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal MCP server error',
            }),
          );
        }
      } finally {
        await transport.close().catch(() => {});
        await mcpServer.close().catch(() => {});
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
}
