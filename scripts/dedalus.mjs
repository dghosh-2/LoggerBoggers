import Dedalus, { DedalusRunner } from 'dedalus-labs';

const apiKey = process.env.DEDALUS_API_KEY;
if (!apiKey) {
  console.error('Missing env var: DEDALUS_API_KEY');
  console.error('Example: DEDALUS_API_KEY="dsk-..." npm run dedalus -- "Hello"');
  process.exit(1);
}

const input = process.argv.slice(2).join(' ').trim() || 'Hello, what can you do?';
const model = process.env.DEDALUS_MODEL || 'anthropic/claude-opus-4-5';

const client = new Dedalus({ apiKey });
const runner = new DedalusRunner(client);

const result = await runner.run({ input, model });

// DedalusRunner typically returns { finalOutput, ... }.
if (result && typeof result === 'object' && 'finalOutput' in result) {
  console.log(result.finalOutput);
} else {
  console.log(result);
}

