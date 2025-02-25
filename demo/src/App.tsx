import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { convertRequests, loadSchema, listFormats } from "@elastic/request-converter";

function App() {
  const formats = listFormats().sort();
  const [hasSchema, setHasSchema] = useState(false);
  const [source, setSource] = useState('GET /_search');
  const [code, setCode] = useState('Loading...');
  const [language, setLanguage] = useState(formats[0]);

  useEffect(() => {
    document.getElementById("source").focus();
  }, []);

  useEffect(() => {
    (async () => {
      const response = await fetch('https://raw.githubusercontent.com/elastic/elasticsearch-specification/refs/heads/main/output/schema/schema.json');
      if (response.ok) {
        loadSchema(await response.json());
        setHasSchema(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (hasSchema) {
        let c: string = "";
        try {
          c = await convertRequests(source, language, {complete: true, printResponse: true}) as string;
        }
        catch (err) {
        }
        if (c) {
          setCode(c as string);
        }
      }
    })();
  }, [hasSchema, source, language]);

  const onRequestChanged = (ev: React.ChangeEventHandler<HTMLSelectElement>) => {
    setSource(ev.target.value);
    ev.target.style.height = ev.target.scrollHeight + "px";
  };

  return (
    <Container id="main-container">
      <h1>Elasticsearch Request Converter Demo</h1>
      <Row>
        <Col className="col-6">
          Source Request
        </Col>
        <Col className="col-6">
          <Stack direction="horizontal" className="heading">
            <p>Converted&nbsp;Code</p>
            <p className="spacer"></p>
            <Form.Select id="language-choice" size="sm" defaultValue={language} onChange={ev => setLanguage(ev.currentTarget.value)}>
              {formats.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
            </Form.Select>
          </Stack>
        </Col>
      </Row>
      <Form id="main-form">
        <Row id="main-row">
          <Col className="col-6">
            <Form.Control as="textarea" id="source" value={source} onChange={onRequestChanged} />
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
