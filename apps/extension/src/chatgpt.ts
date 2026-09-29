import { useCallback, useEffect, useRef, useState } from 'react';
import type { Api } from './api';
import { errorMessage, isExtension } from './platform';

export type ChatGptAccount = {
  provider: 'chatgpt' | 'openai';
  ready: boolean;
  signedIn: boolean;
  email: string | null;
  plan: string | null;
  lastLoginError: string | null;
};

/**
 * "Sign in with ChatGPT": the backend's Codex runtime starts OpenAI's own sign-in page, the person
 * signs in there, and this hook polls until Codex reports the result. Tranz never sees the password.
 */
export function useChatGpt(api: Api, onSignedIn: () => void) {
  const [account, setAccount] = useState<ChatGptAccount>();
  const [problem, setProblem] = useState('');
  const [waiting, setWaiting] = useState(false);
  const signedInCallback = useRef(onSignedIn);
  signedInCallback.current = onSignedIn;

  const refresh = useCallback(async () => {
    try {
      const next = await api.call<ChatGptAccount>('/ai/account');
      setAccount(next);
      setProblem('');
      return next;
    } catch (caught) {
      setProblem(errorMessage(caught));
      return undefined;
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // While OpenAI's page is open, check every 2 s for up to 5 minutes.
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const next = await refresh();
      if (next?.signedIn || next?.lastLoginError || Date.now() - started > 300000) {
        setWaiting(false);
        if (next?.signedIn) signedInCallback.current();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [waiting, refresh]);

  const signIn = useCallback(async () => {
    setProblem('');
    try {
      const { authUrl } = await api.call<{ authUrl: string }>('/ai/login', 'POST');
      if (isExtension) await chrome.tabs.create({ url: authUrl });
      else window.open(authUrl, '_blank', 'noopener');
      setWaiting(true);
    } catch (caught) {
      setProblem(errorMessage(caught));
    }
  }, [api]);

  const signOut = useCallback(async () => {
    try {
      await api.call('/ai/logout', 'POST');
      await refresh();
    } catch (caught) {
      setProblem(errorMessage(caught));
    }
  }, [api, refresh]);

  return { account, problem, waiting, signIn, signOut, refresh };
}
