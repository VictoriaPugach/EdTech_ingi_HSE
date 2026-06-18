import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

/**
 * Метки присутствия участников в редакторе (как в Google Docs): рядом с местом,
 * где человек печатает, показывается аватар + имя. Имя/цвет/аватар берутся из
 * awareness (их же кладёт SessionPage), позиция курсора — из поля `cursor`,
 * которое ведёт y-codemirror. Это не «живой курсор-каретка» (её рисует yCollab),
 * а именно метка «кто и где сейчас редактирует».
 */
interface PresenceUser {
  name: string;
  color: string;
  avatarUrl?: string | null;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

class PresenceWidget extends WidgetType {
  constructor(readonly user: PresenceUser) {
    super();
  }

  eq(other: PresenceWidget): boolean {
    return (
      other.user.name === this.user.name &&
      other.user.color === this.user.color &&
      other.user.avatarUrl === this.user.avatarUrl
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-presence';
    wrap.style.setProperty('--presence-color', this.user.color);
    wrap.title = this.user.name;

    const avatar = document.createElement('span');
    avatar.className = 'cm-presence-avatar';
    if (this.user.avatarUrl) {
      const img = document.createElement('img');
      img.src = this.user.avatarUrl;
      img.alt = '';
      avatar.appendChild(img);
    } else {
      avatar.textContent = initials(this.user.name);
    }

    const label = document.createElement('span');
    label.className = 'cm-presence-label';
    label.textContent = this.user.name;

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export function remotePresence(ydoc: Y.Doc, yText: Y.Text, awareness: Awareness): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private readonly onAwareness: () => void;
      private frame = 0;

      constructor(readonly view: EditorView) {
        this.decorations = this.build();
        this.onAwareness = () => {
          this.decorations = this.build();
          // Перерисовку откладываем в кадр, чтобы не диспатчить во время апдейта CM.
          cancelAnimationFrame(this.frame);
          this.frame = requestAnimationFrame(() => {
            try {
              this.view.dispatch({});
            } catch {
              /* view уничтожен — игнорируем */
            }
          });
        };
        awareness.on('change', this.onAwareness);
      }

      update(u: ViewUpdate): void {
        if (u.docChanged || u.viewportChanged) this.decorations = this.build();
      }

      destroy(): void {
        cancelAnimationFrame(this.frame);
        awareness.off('change', this.onAwareness);
      }

      build(): DecorationSet {
        const localId = awareness.clientID;
        const entries: { pos: number; user: PresenceUser }[] = [];

        awareness.getStates().forEach((state: Record<string, unknown>, clientId: number) => {
          if (clientId === localId) return;
          const cursor = state.cursor as { head?: unknown } | undefined;
          const user = state.user as PresenceUser | undefined;
          if (!cursor?.head || !user?.name) return;
          try {
            const rel = Y.createRelativePositionFromJSON(cursor.head);
            const abs = Y.createAbsolutePositionFromRelativePosition(rel, ydoc);
            if (abs && abs.type === yText) {
              entries.push({ pos: Math.min(abs.index, this.view.state.doc.length), user });
            }
          } catch {
            /* устаревшая позиция — пропускаем */
          }
        });

        entries.sort((a, b) => a.pos - b.pos);
        const builder = new RangeSetBuilder<Decoration>();
        for (const e of entries) {
          builder.add(e.pos, e.pos, Decoration.widget({ widget: new PresenceWidget(e.user), side: 1 }));
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}
