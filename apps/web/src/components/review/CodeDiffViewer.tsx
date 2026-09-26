import { useEffect, useRef, useState } from "react";
import { DiffEditor, type DiffOnMount, type Monaco } from "@monaco-editor/react";
import type { ScenarioFile } from "@redline/shared";

export interface LineSelection {
  startLine: number;
  endLine: number;
}

type StandaloneDiffEditor = Parameters<DiffOnMount>[0];
type StandaloneCodeEditor = ReturnType<StandaloneDiffEditor["getModifiedEditor"]>;
type ModelDeltaDecoration = Parameters<StandaloneCodeEditor["deltaDecorations"]>[1][number];

interface CodeDiffViewerProps {
  file: ScenarioFile;
  commentedLines: number[];
  onSelectionChange: (selection: LineSelection | null) => void;
}

export function CodeDiffViewer({ file, commentedLines, onSelectionChange }: CodeDiffViewerProps) {
  const modifiedEditorRef = useRef<StandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const handleMount: DiffOnMount = (diffEditor, monacoInstance) => {
    monacoRef.current = monacoInstance;
    const modifiedEditor = diffEditor.getModifiedEditor();
    modifiedEditorRef.current = modifiedEditor;

    modifiedEditor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      const startLine = Math.min(sel.startLineNumber, sel.endLineNumber);
      const endLine = Math.max(sel.startLineNumber, sel.endLineNumber);
      onSelectionChange({ startLine, endLine });
    });

    setIsReady(true);
  };

  useEffect(() => {
    const modifiedEditor = modifiedEditorRef.current;
    const monacoInstance = monacoRef.current;
    if (!isReady || !modifiedEditor || !monacoInstance) return;

    const decorations: ModelDeltaDecoration[] = commentedLines.map((line) => ({
      range: new monacoInstance.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "redline-commented-line",
        linesDecorationsClassName: "redline-commented-line-gutter",
      },
    }));

    decorationsRef.current = modifiedEditor.deltaDecorations(decorationsRef.current, decorations);
  }, [commentedLines, isReady]);

  return (
    <section aria-label="Code review" className="h-full min-h-0">
      <DiffEditor
        height="100%"
        language={file.language}
        original={file.oldContent}
        modified={file.newContent}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          readOnly: true,
          originalEditable: false,
          renderSideBySide: true,
          automaticLayout: true,
          minimap: { enabled: false },
          wordWrap: "on",
          scrollBeyondLastLine: false,
          fontSize: 13,
        }}
      />
    </section>
  );
}
