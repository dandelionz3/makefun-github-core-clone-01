import { createApp } from './app.ts';

const origin = (process.env.MAKEFUN_ENV_URL || '').replace(/\/+$/, '');

if (!origin) {
  process.stderr.write('MAKEFUN_ENV_URL must name the running environment.\n');
  process.exit(1);
}

const requestLimit = 30_000;
const firstPause = 250;
const pauseLimit = 2_000;

function pauseFor(retry: number): Promise<void> {
  const duration = Math.min(pauseLimit, firstPause * 2 ** retry);
  return new Promise((done) => setTimeout(done, duration));
}

async function registerPort(portNumber: number): Promise<void> {
  let retry = 0;
  while (true) {
    try {
      const reply = await fetch(`${origin}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ port: portNumber }),
        signal: AbortSignal.timeout(requestLimit),
      });
      if (reply.status === 200 || reply.status === 409) return;
      if (reply.status === 400 || reply.status === 405) {
        throw new Error(`Environment rejected registration (${reply.status}): ${await reply.text()}`);
      }
    } catch (problem) {
      if (problem instanceof Error && problem.message.startsWith('Environment rejected registration (')) {
        throw problem;
      }
    }
    await pauseFor(retry++);
  }
}

async function followUntilComplete(): Promise<void> {
  let retry = 0;
  for (;;) {
    try {
      const reply = await fetch(`${origin}/done`, { signal: AbortSignal.timeout(requestLimit) });
      if (reply.ok) {
        const state = (await reply.json()) as { done?: boolean };
        if (state.done === true) return;
      }
    } catch {
      // An unavailable or expired poll simply means we should try again.
    }
    await pauseFor(retry++);
  }
}

async function serveTrial(): Promise<void> {
  const listener = createApp();
  await new Promise<void>((ready, failed) => {
    listener.once('error', failed);
    listener.listen(0, ready);
  });

  const bound = listener.address();
  if (bound === null || typeof bound === 'string') {
    throw new Error('Could not determine the server TCP port.');
  }

  process.stdout.write(`Bound forge server to port ${bound.port}.\n`);
  await registerPort(bound.port);
  process.stdout.write('Environment registered; waiting for completion.\n');
  await followUntilComplete();
  listener.close();
  process.stdout.write('Environment completed.\n');
}

try {
  await serveTrial();
  process.exit(0);
} catch (problem) {
  process.stderr.write(`${problem instanceof Error ? problem.message : String(problem)}\n`);
  process.exit(1);
}
