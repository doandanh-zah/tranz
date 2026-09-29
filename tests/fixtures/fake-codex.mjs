#!/usr/bin/env node
// Test double for `codex app-server` speaking the JSON-RPC subset Tranz uses. Behaviour is chosen
// by the text of the user's request (all synthetic). Never used outside tests.
import readline from 'node:readline';

const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
let signedIn = process.env.FAKE_CODEX_SIGNED_IN === '1';
let thread = 0;
const declined = [];

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  if (message.id !== undefined && !message.method) {
    declined.push(message); // response to our server request
    return;
  }
  const { id, method, params } = message;
  switch (method) {
    case 'initialize':
      return send({ id, result: { userAgent: 'fake-codex' } });
    case 'initialized':
      return;
    case 'account/read':
      return send({ id, result: { account: signedIn ? { type: 'chatgpt', email: 'synthetic@example.test', planType: 'plus' } : null, requiresOpenaiAuth: true } });
    case 'account/login/start':
      setTimeout(() => {
        signedIn = true;
        send({ method: 'account/login/completed', params: { loginId: 'login-1', success: true, error: null, onboardingEntrypoint: null } });
      }, 50);
      return send({ id, result: { type: 'chatgpt', loginId: 'login-1', authUrl: 'https://auth.openai.com/oauth/authorize?synthetic=1' } });
    case 'account/logout':
      signedIn = false;
      return send({ id, result: {} });
    case 'thread/start':
      thread++;
      return send({ id, result: { thread: { id: `thread-${thread}` }, model: 'fake', sandbox: params.sandbox, approvalPolicy: params.approvalPolicy } });
    case 'turn/start': {
      const threadId = params.threadId;
      const text = params.input[0].text;
      const turn = { id: `turn-${threadId}` };
      send({ id, result: { turn } });
      const item = (it) => send({ method: 'item/completed', params: { threadId, turnId: turn.id, item: it, completedAtMs: Date.now() } });
      const complete = (status) => send({ method: 'turn/completed', params: { threadId, turn: { ...turn, status, items: [] } } });
      if (text.includes('HANG')) return; // never completes → adapter timeout
      if (text.includes('TOOL')) {
        // Ask for approval (must be declined) and report a command item (must be rejected).
        send({ id: 'srv-1', method: 'item/commandExecution/requestApproval', params: { threadId } });
        item({ type: 'commandExecution', id: 'c1', command: 'ls ~', status: 'declined' });
      }
      if (text.includes('FAIL')) return complete('failed');
      item({ type: 'userMessage', id: 'u1', content: [] });
      item({ type: 'agentMessage', id: 'a1', text: JSON.stringify({ value: `echo:${JSON.parse(text).value ?? ''}`, schemaSeen: !!params.outputSchema, sandbox: 'read-only' }) });
      return complete('completed');
    }
    case 'turn/interrupt':
      return send({ id, result: {} });
    default:
      return send({ id, error: { code: -32601, message: `unknown ${method}` } });
  }
});
