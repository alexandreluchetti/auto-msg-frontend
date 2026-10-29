import type { Settings } from '../api/types';

/** Whether there are saved changes the WhatsApp does not use yet. */
export function DraftBadge({ settings }: { settings: Settings }) {
  return settings.draft ? (
    <span className="badge draft">Rascunho com mudanças não publicadas</span>
  ) : (
    <span className="badge">Igual ao publicado</span>
  );
}
