import { useRef, useState, useEffect, KeyboardEvent } from 'react';
import Form from 'react-bootstrap/Form';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const TAB = "  ";

SyntaxHighlighter.registerLanguage('foo', (hljs: any) => ({
    case_insensitive: true, // language is case-insensitive
    keywords: {
      keyword: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      literal: ['true', 'false', 'null'],
    },
    contains: [
      {
        className: 'attr',
        begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
        relevance: 1.01
      },
      {
        match: /[{}[\],:]/,
        className: "punctuation",
        relevance: 0
      },
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.HASH_COMMENT_MODE,
      {
        className: 'meta',
        begin: '\/[^\\s]*',
      },
    ],
  }));

type EditorProps = {
  className: string,
  id: string,
  value: string,
  onChange: (ev: any) => any,
};

export default function Editor({ className, id, value, onChange }: EditorProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

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

  let height = Math.min(15, Math.max(6, value.split('\n').length)) + 1;

  const syncScroll = () => {
    if (!editorRef.current || !highlightRef.current) {
      return;
    }
    highlightRef.current.style.height = editorRef.current.clientHeight + "px";
    highlightRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
    if (!editorRef.current) {
      return;
    }
    const before = editorRef.current.value.slice(0, editorRef.current.selectionStart || undefined);
    const after = editorRef.current.value.slice(editorRef.current.selectionEnd || undefined, editorRef.current.value.length);
    const atEol = (after === "" || after.startsWith("\n"));
    const cursor_pos = editorRef.current.selectionEnd || 0;
    if (ev.key == "{" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "{}" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + 1;
    }
    else if (ev.key == "[" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "[]" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + 1;
    }
    else if (ev.key == "\"" && atEol) {
      ev.preventDefault();
      editorRef.current.value = before + "\"\"" + after;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + 1;
    }
    else if (ev.key == "\"" && after.startsWith("\"")) {
      ev.preventDefault();
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + 1;
    }
    else if (ev.key == "Backspace") {
      const keyPairs = ["{}", "[]", "\"\""];
      let matches = false;
      console.log(after.startsWith);
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
        editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos - 1;
      }
    }
    else if (ev.key == "Enter" && (before.endsWith("{") || before.endsWith("["))) {
      ev.preventDefault();
      const lines = before.split("\n");
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.split(/[^\s]/, 1)[0];
      const extra = (after.startsWith("}") || after.startsWith("]")) ? `\n${indent}` : "";
      editorRef.current.value = `${before}\n${indent}${TAB}${extra}${after}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + indent.length + TAB.length + 1;
      height += 2;
      setTimeout(syncScroll, 50);  // in case height changes due to this update
    }
    else if (ev.key == "Enter") {
      ev.preventDefault();
      const lines = before.split("\n");
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.split(/[^\s]/, 1)[0];
      editorRef.current.value = `${before}\n${indent}${after}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = cursor_pos + indent.length + 1;
      editorRef.current.selectionEnd = cursor_pos + indent.length + 1;
      height += 1;
      setTimeout(syncScroll, 50);  // in case height changes due to this update
    }
    else if (ev.key == "Tab") {
      ev.preventDefault();
      editorRef.current.value = `${before}${TAB}${after}`;
      if (onChange) {
        onChange({target: editorRef.current});
      }
      editorRef.current.selectionStart = editorRef.current.selectionEnd = cursor_pos + TAB.length;
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
          language="foo"
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
