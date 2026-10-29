import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { Settings, TenantConfig } from '../api/types';

/**
 * The business settings for the settings screens. Changes always go to the draft (merged over the
 * business's own settings, never over the defaults); only `publish` changes what WhatsApp uses.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSettings(await api.settings());
    } catch {
      setError('Não foi possível carregar as configurações.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, done: string): Promise<string | null> {
    setSaving(true);
    setError(null);
    try {
      await action();
      await load();
      return done;
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Não foi possível salvar.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  /** Saves `changes` (top-level sections) into the draft. */
  function saveDraft(changes: Partial<TenantConfig>) {
    const own = settings?.draft ?? settings?.published ?? {};
    return run(() => api.saveDraft({ ...own, ...changes }), 'Rascunho salvo. Teste no simulador e publique quando quiser.');
  }

  function publish() {
    return run(() => api.publish(), 'Publicado! O WhatsApp já usa estas configurações.');
  }

  return { settings, error, saving, saveDraft, publish };
}
