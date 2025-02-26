import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import SyntaxHighlighter from 'react-syntax-highlighter';
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

  const onRequestChanged = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    setSource(ev.target.value);
    ev.target.style.height = ev.target.scrollHeight + "px";
  };

  return (
    <Container id="main-container">
      <h1>Elasticsearch Request Converter Demo</h1>
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
          <Stack direction="horizontal" className="heading">
            <p>Converted&nbsp;Code</p>
            <p className="spacer"></p>
            <Form.Select id="language-choice" size="sm" defaultValue={language} onChange={ev => setLanguage(ev.target.value)}>
              {formats.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
            </Form.Select>
          </Stack>
        </Col>
      </Row>
      <Form id="main-form">
        <Row id="main-row">
          <Col className="col-6">
            <Form.Control className={error ? "is-invalid" : ""} as="textarea" id="source" value={source} onChange={(ev: any) => onRequestChanged(ev)} />
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
