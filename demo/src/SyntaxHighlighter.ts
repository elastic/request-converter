import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/cjs/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript';
import bash from 'react-syntax-highlighter/dist/cjs/languages/hljs/bash';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('curl', bash);

SyntaxHighlighter.registerLanguage('elasticsearch', (hljs: any) => ({
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
      begin: '\/[^\\s\\?]*',
    },
    {
      className: 'comment',
      begin: '\\?[^\\s]*',
    },
  ],
}));

export default SyntaxHighlighter;
