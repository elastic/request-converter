import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Toast from 'react-bootstrap/Toast';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import Editor from './Editor';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { compareVersions } from 'compare-versions';
import { convertRequests, loadSchema, listFormats } from "@elastic/request-converter";

function App() {
  const formats = listFormats().sort();
  const [versions, setVersions] = useState<string[]>(['main']);
  const [schemaVersion, setSchemaVersion] = useState<string>('main');
  const [hasSchema, setHasSchema] = useState<boolean>(false);
  const [source, setSource] = useState<string>('GET /_search');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>('Loading...');
  const [language, setLanguage] = useState<string>(formats[0]);
  const [showClipboardMsg, setShowClipboardMsg] = useState(false);

  useEffect(() => {
    const sourceElem = document.getElementById("source");
    if (sourceElem) {
      sourceElem.focus();
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const r = await fetch('https://api.github.com/repos/elastic/elasticsearch-specification/branches');
      if (r.status === 200) {
        const s: {name: string}[] = (await r.json()) as {name: string}[];
        const versions = s.map(v => v.name).filter(v => v.match(/^[0-9]+\.[0-9x]+$/));
        setVersions(['main'].concat(versions.sort(compareVersions).reverse()));
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`https://raw.githubusercontent.com/elastic/elasticsearch-specification/refs/heads/${schemaVersion}/output/schema/schema.json`);
      if (response.ok) {
        setHasSchema(false);
        await loadSchema((await response.json()) as object);
        setHasSchema(true);
      }
    })();
  }, [schemaVersion]);

  useEffect(() => {
    void (async () => {
      if (hasSchema) {
        let c: string = "";
        try {
          c = await convertRequests(source, language, {complete: true, printResponse: true}) as string;
          setError(null);
        }
        catch (err) {
          if (err instanceof Error) {
            setError(err.toString());
          }
          else {
            setError('Uknown error');
          }
        }
        if (c) {
          setCode(c);
        }
      }
    })();
  }, [hasSchema, source, language]);

  const onRequestChanged = (ev: React.ChangeEvent<HTMLSelectElement>): any => {
    setSource(ev.target.value);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setShowClipboardMsg(true);
  };

  return (
    <Container id="main-container">
      <div aria-live="polite" aria-atomic="true" className="position-relative">
        <ToastContainer className="clipboard-toast p-3" position="top-end" style={{ zIndex: 1 }}>
          <Toast onClose={() => setShowClipboardMsg(false)} show={showClipboardMsg} delay={2000} autohide>
            <Toast.Body>Copied to clipboard!</Toast.Body>
          </Toast>
        </ToastContainer>
      </div>
      <Row>
        <Col>
          <h1>Elasticsearch Request Converter Demo</h1>
        </Col>
        <Col sm="auto" className="links">
          <p>
            <small>
              <svg width="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Interface / External_Link"> <path id="Vector" d="M10.0002 5H8.2002C7.08009 5 6.51962 5 6.0918 5.21799C5.71547 5.40973 5.40973 5.71547 5.21799 6.0918C5 6.51962 5 7.08009 5 8.2002V15.8002C5 16.9203 5 17.4801 5.21799 17.9079C5.40973 18.2842 5.71547 18.5905 6.0918 18.7822C6.5192 19 7.07899 19 8.19691 19H15.8031C16.921 19 17.48 19 17.9074 18.7822C18.2837 18.5905 18.5905 18.2839 18.7822 17.9076C19 17.4802 19 16.921 19 15.8031V14M20 9V4M20 4H15M20 4L13 11" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g> </g></svg>
              &nbsp;
              <a href="https://github.com/elastic/request-converter">GitHub project</a>
              <br />
              <svg width="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Interface / External_Link"> <path id="Vector" d="M10.0002 5H8.2002C7.08009 5 6.51962 5 6.0918 5.21799C5.71547 5.40973 5.40973 5.71547 5.21799 6.0918C5 6.51962 5 7.08009 5 8.2002V15.8002C5 16.9203 5 17.4801 5.21799 17.9079C5.40973 18.2842 5.71547 18.5905 6.0918 18.7822C6.5192 19 7.07899 19 8.19691 19H15.8031C16.921 19 17.48 19 17.9074 18.7822C18.2837 18.5905 18.5905 18.2839 18.7822 17.9076C19 17.4802 19 16.921 19 15.8031V14M20 9V4M20 4H15M20 4L13 11" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g> </g></svg>
              &nbsp;
              <a href="./docs/index.html">Library documentation</a>
            </small>
          </p>
        </Col>
      </Row>
      <Row>
        <Col className="col-6">
          <Stack direction="horizontal" className="heading">
            <p>Source&nbsp;Request</p>
            <p className="spacer"></p>
            <Form.Select id="version-choice" size="sm" defaultValue="main" onChange={ev => setSchemaVersion(ev.target.value)}>
              {versions.map(v => <option key={v} value={v}>{v}</option>)}
            </Form.Select>
          </Stack>
        </Col>
        <Col className="col-6">
          <Stack direction="horizontal" className="heading" gap={1}>
            <p>Converted&nbsp;Code</p>
            <p className="spacer"></p>
            <Form.Select id="language-choice" size="sm" defaultValue={language} onChange={ev => setLanguage(ev.target.value)}>
              {formats.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
            </Form.Select>
            <Button className="copy-clipboard" size="sm" variant="outline-secondary" onClick={() => copyToClipboard()}>&#x2398;</Button>
          </Stack>
        </Col>
      </Row>
      <Form id="main-form">
        <Row id="main-row">
          <Col className="col-6">
            <Editor className={error ? "is-invalid" : ""} id="source" value={source} onChange={(ev: any) => onRequestChanged(ev)} />
            {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
          </Col>
          <Col className="col-6">
            <SyntaxHighlighter wrapLongLines={true} language={language} style={atomOneLight}>{code}</SyntaxHighlighter>
          </Col>
        </Row>
      </Form>
    </Container>
  )
}

export default App
