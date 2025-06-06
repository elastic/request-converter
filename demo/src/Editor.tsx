import { useRef, useState, useEffect, KeyboardEvent } from 'react';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import SyntaxHighlighter from './SyntaxHighlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { getCompletions, Completion } from '@elastic/request-converter';

const TAB = "  ";

type EditorProps = {
  className: string,
  id: string,
  value: string,
  onChange: (ev: any) => any,
};

export default function Editor({ className, id, value, onChange }: EditorProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const completionsRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [showCompletions, setShowCompletions] = useState(false);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [selectedCompletion, setSelectedCompletion] = useState(-1);

  const updateWidth = () => {
    if (!editorRef.current || !editorRef.current.parentElement) {
      return;
    }
    if (width != editorRef.current.parentElement.clientWidth - 1) {
      setWidth(editorRef.current.parentElement.clientWidth - 1);
    }
  };

  useEffect(() => {
    updateWidth();
  }, [editorRef, width]);

  useEffect(() => {
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!completionsRef.current || completionsRef.current.children.length < 1) {
      return;
    }
    const item = selectedCompletion === -1 ? 0 : selectedCompletion;
    completionsRef.current.children[0].children[item].scrollIntoView({block: 'nearest', inline: 'nearest'});
  }, [selectedCompletion, completions]);

  let height = Math.min(15, Math.max(6, value.split('\n').length)) + 1;

  const syncScroll = () => {
    if (!editorRef.current || !highlightRef.current) {
      return;
    }
    highlightRef.current.style.height = editorRef.current.clientHeight + "px";
    highlightRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
  };

  const updateCompletions = async () => {
    if (!editorRef.current || !completionsRef.current) {
      return;
    }
    const before = editorRef.current.value.slice(0, editorRef.current.selectionStart || 0);
    const beforeLines = before.split("\n");
    const cursorRow = beforeLines.length - 1;
    const cursorCol = beforeLines[beforeLines.length - 1].length;

    const newCompletions = await getCompletions(before);
    if (newCompletions.length) {
      completionsRef.current.style.left = `${(cursorCol * 8.5 + 17).toFixed(0)}px`;
      completionsRef.current.style.top = `${cursorRow * 21 + 30 - editorRef.current.scrollTop}px`;
      setCompletions(newCompletions);
      setSelectedCompletion(-1);
      setShowCompletions(true);
    }
    else {
      setShowCompletions(false);
    }
  };

  const onCompletionSelected = (selection: Completion) => {
    if (!editorRef.current) {
      return;
    }
    const before = editorRef.current.value.slice(0, editorRef.current.selectionStart || 0);
    const after = editorRef.current.value.slice(editorRef.current.selectionEnd || 0, editorRef.current.value.length);
    let afterOverlap = 0;
    while (after.length > afterOverlap && after.slice(0, afterOverlap + 1) === selection.insert.slice(selection.insert.length - afterOverlap - 1)) {
      afterOverlap++;
    }
    let extra = (selection.extraBeforeCursor) ? selection.extraBeforeCursor + selection.extraAfterCursor : '';
    let extraOverlap = 0;
    if (extra.length) {
      while (after[afterOverlap + extraOverlap] === extra[extraOverlap]) {
        extraOverlap++;
      }
      if (after[afterOverlap + extraOverlap] != '\n') {
        extra = '';
        extraOverlap = 0;
      }
    }
    const cursorPos = editorRef.current.selectionEnd || 0;
    editorRef.current.value = before.slice(0, before.length - selection.replace.length) +
      selection.replace + selection.insert + extra + after.slice(afterOverlap + extraOverlap);
    if (onChange) {
      onChange({target: editorRef.current});
    }
    editorRef.current.selectionStart = editorRef.current.selectionEnd =
      cursorPos + selection.insert.length + 
        ((extra.length > 0) ? extra.length - (selection.extraAfterCursor ?? '').length  : 0);
    editorRef.current.focus();
    setShowCompletions(false);
    if (extra.length) {
      setTimeout(updateCompletions, 100);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
    if (!editorRef.current) {
      return;
    }
    const before = editorRef.current.value.slice(0, editorRef.current.selectionStart || 0);
    const after = editorRef.current.value.slice(editorRef.current.selectionEnd || 0, editorRef.current.value.length);
    const atEol = (after === "" || after.startsWith("\n"));
    const cursorPos = editorRef.current.selectionEnd || 0;

    if (showCompletions) {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setSelectedCompletion(sel => (sel + 1) % completions.length);
      }
      else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setSelectedCompletion(sel => (sel - 1 + completions.length) % completions.length);
      }
      else if (ev.key === "Enter") {
        if (selectedCompletion != -1) {
          ev.preventDefault();
          const selection = completions[selectedCompletion];
          onCompletionSelected(selection);
        }
        else {
          setShowCompletions(false);
        }
      }
      else if (ev.key === "Escape") {
        ev.preventDefault();
        setShowCompletions(false);
      }
      else {
        if (["Backspace", "ArrowLeft", "ArrowRight"].includes(ev.key) || ev.key.length == 1) {
          setTimeout(updateCompletions, 100);
        }
      }
    }
    else if (ev.key === "{" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "{}" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + 1;
    }
    else if (ev.key === "[" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "[]" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + 1;
    }
    else if (ev.key === "\"" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "\"\"" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + 1;
      setTimeout(updateCompletions, 100);
    }
    else if (ev.key === "\"" && after.startsWith("\"")) {
      ev.preventDefault();
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + 1;
    }
    else if (ev.key === "Backspace") {
      const keyPairs = ["{}", "[]", "\"\""];
      let matches = false;
      for (const keyPair of keyPairs) {
        if (before.endsWith(keyPair[0]) && ((after === keyPair[1]) || (after.startsWith(`${keyPair[1]}\n`)))) {
          matches = true;
          break;
        }
      }
      if (matches) {
        ev.preventDefault();
        editorRef.current.value = before.slice(0, before.length - 1) + after.slice(1);
        if (onChange) {
          onChange({target: editorRef.current});
        }
        editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos - 1;
      }
      setTimeout(updateCompletions, 100);
    }
    else if (ev.key === "Enter" && before.endsWith("[{") && after.startsWith('}]')) {
      ev.preventDefault();
      const lines = before.split("\n");
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.split(/[^\s]/, 1)[0];
      const extra = `\n${indent}${TAB}}\n${indent}`;
      editorRef.current.value = `${before.slice(0, -1)}\n${indent}${TAB}{\n${indent}${TAB}${TAB}${extra}${after.slice(1)}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + indent.length * 2 + TAB.length * 3 + 2;
      height += 4;
      setTimeout(syncScroll, 50);  // in case height changes due to this update
    }
    else if (ev.key === "Enter" && (before.endsWith("{") || before.endsWith("["))) {
      ev.preventDefault();
      const lines = before.split("\n");
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.split(/[^\s]/, 1)[0];
      const extra = (after.startsWith("}") || after.startsWith("]")) ? `\n${indent}` : "";
      editorRef.current.value = `${before}\n${indent}${TAB}${extra}${after}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + indent.length + TAB.length + 1;
      height += 2;
      setTimeout(syncScroll, 50);  // in case height changes due to this update
    }
    else if (ev.key === "Enter") {
      ev.preventDefault();
      const lines = before.split("\n");
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.split(/[^\s]/, 1)[0];
      editorRef.current.value = `${before}\n${indent}${after}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = cursorPos + indent.length + 1;
      editorRef.current.selectionEnd = cursorPos + indent.length + 1;
      height += 1;
      setTimeout(syncScroll, 50);  // in case height changes due to this update
    }
    else if (ev.key === "Tab") {
      ev.preventDefault();
      if (ev.altKey) {
        // Alt+Tab opens the completion list
        setTimeout(updateCompletions, 100);
      }
      else {
        editorRef.current.value = `${before}${TAB}${after}`;
        if (onChange) {
          onChange({target: editorRef.current});
        }
        editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + TAB.length;
      }
    }
    else {
      if (ev.key.length == 1) {
        setTimeout(updateCompletions, 100);
      }
    }
  };

  const changedEvent = (ev: any) => {
    if (onChange) {
      onChange(ev);
    } 
    syncScroll();
  };

  return (
    <>
      <div className="completions" ref={completionsRef}>
        <Dropdown.Menu show={showCompletions}>
          {completions.map((completion, i) => (
            <Dropdown.Item key={i} active={selectedCompletion === i} onClick={onCompletionSelected.bind(undefined, completion)}>
              <span className="completionReplace">{completion.replace}</span>
              <span className="completionInsert">{completion.insert}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </div>
      <Form.Control
        className={className}
        as="textarea"
        rows={height}
        spellCheck="false"
        id={id}
        value={value}
        style={{
          position: 'absolute',
          color: 'transparent',
          background: 'transparent',
          caretColor: 'black',          
          width: (width - 24) + "px",
          tabSize: 2,
        }}
        onChange={changedEvent}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        ref={editorRef}
      />   
      <div className={(className ? className + " " : "") + "form-control"} style={{
        borderColor: 'transparent',
        overflow: 'auto',
        whiteSpace: 'pre',
        width: (width - 24) + "px",
      }} ref={highlightRef}>
        <SyntaxHighlighter
          wrapLongLines={true}
          language="elasticsearch"
          style={atomOneLight}
          customStyle={{
            margin: 0,
            padding: 0,
            tabSize: 2,
          }}
          codeTagProps={{"aria-hidden": false}}
        >{value + " "}</SyntaxHighlighter>
      </div>
    </>
  );
}
