import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

/* A programmable HTTP server in twenty lines. Binding to port 0 is what
   makes it safe to run in parallel — see /practices/parallel-test-execution. */

export type Handler = (req: IncomingMessage, res: ServerResponse, callNumber: number) => void;

export interface StubServer {
  url: string;
  calls: number;
  close(): Promise<void>;
}

export async function startStub(handler: Handler): Promise<StubServer> {
  let calls = 0;
  const server: Server = createServer((req, res) => handler(req, res, ++calls));

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port assigned');

  return {
    url: `http://127.0.0.1:${address.port}`,
    get calls() {
      return calls;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}

export const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};
