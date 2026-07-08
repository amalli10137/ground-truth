import { python } from '@codemirror/lang-python';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { keymap, EditorView } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { useEffect, useRef } from 'react';
import { loadCode, saveCode } from '../lib/store';
import { useTheme, type Theme } from '../lib/theme';

export interface ConsoleLine {
  text: string;
  isErr?: boolean;
}

/* "lab paper" editor themes: same ink palette as the rest of the notebook */
const editorThemes: Record<Theme, ReturnType<typeof EditorView.theme>> = {
  light: EditorView.theme({
    '&': { backgroundColor: '#fbfcfe', color: '#1c2f55' },
    '.cm-content': { caretColor: '#16305e', fontFamily: '"IBM Plex Mono", monospace' },
    '.cm-gutters': {
      backgroundColor: '#f1f4f9',
      color: '#9aa8c2',
      border: 'none',
      borderRight: '1px solid #e4eaf2',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(37, 84, 163, 0.05)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(37, 84, 163, 0.08)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(37, 84, 163, 0.16) !important',
    },
    '.cm-cursor': { borderLeftColor: '#16305e' },
  }),
  dark: EditorView.theme(
    {
      '&': { backgroundColor: '#121a2c', color: '#d5deee' },
      '.cm-content': { caretColor: '#d5deee', fontFamily: '"IBM Plex Mono", monospace' },
      '.cm-gutters': {
        backgroundColor: '#0e1524',
        color: '#5d6d8f',
        border: 'none',
        borderRight: '1px solid #1f2a44',
      },
      '.cm-activeLine': { backgroundColor: 'rgba(168, 194, 240, 0.06)' },
      '.cm-activeLineGutter': { backgroundColor: 'rgba(168, 194, 240, 0.08)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'rgba(111, 156, 232, 0.28) !important',
      },
      '.cm-cursor': { borderLeftColor: '#d5deee' },
    },
    { dark: true },
  ),
};

const highlights: Record<Theme, HighlightStyle> = {
  light: HighlightStyle.define([
    { tag: tags.comment, color: '#8b9ab8', fontStyle: 'italic' },
    { tag: tags.keyword, color: '#7a3fa0' },
    { tag: [tags.string, tags.special(tags.string)], color: '#00707a' },
    { tag: tags.number, color: '#b06a00' },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: '#2554a3',
    },
    { tag: tags.definition(tags.variableName), color: '#16305e', fontWeight: '600' },
    { tag: [tags.operator, tags.punctuation], color: '#47598a' },
    { tag: [tags.bool, tags.null], color: '#a03f62' },
  ]),
  dark: HighlightStyle.define([
    { tag: tags.comment, color: '#5d6d8f', fontStyle: 'italic' },
    { tag: tags.keyword, color: '#c08ae0' },
    { tag: [tags.string, tags.special(tags.string)], color: '#4ecbd6' },
    { tag: tags.number, color: '#e8a94e' },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: '#8ab4f8',
    },
    { tag: tags.definition(tags.variableName), color: '#d5deee', fontWeight: '600' },
    { tag: [tags.operator, tags.punctuation], color: '#93a3c4' },
    { tag: [tags.bool, tags.null], color: '#e07a9e' },
  ]),
};

export function CodeLab({
  levelId,
  starterCode,
  running,
  bootStage,
  consoleLines,
  onRun,
  onStop,
  onClearOverlays,
}: {
  levelId: number;
  starterCode: string;
  running: boolean;
  bootStage: string | null;
  consoleLines: ConsoleLine[];
  onRun: (code: string) => void;
  onStop: () => void;
  onClearOverlays: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const theme = useTheme();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      doc: loadCode(levelId) ?? starterCode,
      parent: host,
      extensions: [
        basicSetup,
        python(),
        editorThemes[theme],
        Prec.high(syntaxHighlighting(highlights[theme])),
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-Enter',
              run: (v) => {
                runRef.current(v.state.doc.toString());
                return true;
              },
            },
          ]),
        ),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) saveCode(levelId, u.state.doc.toString());
        }),
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [levelId, starterCode, theme]);

  useEffect(() => {
    const c = consoleRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [consoleLines]);

  const reset = () => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starterCode } });
    saveCode(levelId, starterCode);
  };

  return (
    <div className="codelab">
      <div ref={hostRef} aria-label="Python code editor" />
      <div className="lab-buttons">
        <button
          className="btn primary"
          disabled={running}
          onClick={() => viewRef.current && onRun(viewRef.current.state.doc.toString())}
        >
          {running ? 'Running…' : 'Run ⌘⏎'}
        </button>
        <button className="btn" disabled={!running} onClick={onStop}>
          Stop
        </button>
        <button className="btn quiet" onClick={reset}>
          Reset code
        </button>
        <button className="btn quiet" onClick={onClearOverlays}>
          Clear overlays
        </button>
        {bootStage && (
          <span className="boot-status" role="status">
            ⏳ {bootStage}…
          </span>
        )}
      </div>
      <div className="console" ref={consoleRef} role="log" aria-label="Python output console">
        {consoleLines.map((l, i) =>
          l.isErr ? (
            <span key={i} className="err">
              {l.text}
            </span>
          ) : (
            <span key={i}>{l.text}</span>
          ),
        )}
      </div>
    </div>
  );
}
