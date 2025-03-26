// This is a PEG parser for Elasticsearch requests, used by the completion
// engine.
//
// The result from parsing is an array of requests, where each request is given
// as a three-element array with the following elements
//
// - the request method, even if it is incomplete or invalid
// - the request URL, `undefined` if the request method is incomplete, `null` if there is no URL
// - the request body as an array of tokens, `undefined` if the request URL is incomplete, `null` if there is no request body
//
// The request body includes the results of a relaxed parsing the JSON body
// that allows the completion engine to do its work even if the body is
// incomplete because it is being typed.
//
// Below is an example partial request:
//
// ```
// GET /_search
// {
// 	"_source": tru
// ```
//
// The result of parsing this request is:
//
// ```json
// [
//   [
//     'GET',
//     '/_search',
//     [
//       '{',
//       '"_source"',
//       ':',
//       'tru'
//     ]
//   ]
// ]
// ```

requests = @request+
request = ws m:http_method ws1:ws u:url? ws2:ws o:object? { return [m, ws1.length === 0 ? undefined : u, ws2.length === 0 ? undefined : o]; } 

http_method = literal
url = "/" u:[^ \t\n\r]* { return '/' + u.join(''); }

begin_object = ws @"{" ws
end_object = ws @"}" ws
begin_array = ws @"[" ws
end_array = ws @"]" ws
colon  = ws @":" ws
comma = ws @"," ws
ws = [ \t\n\r]*

object = b:begin_object t:tokens e:end_object? { return e ? [b, ...t, e] : [b, ...t]; }
array = b:begin_array t:tokens e:end_array? { return e ? [b, ...t, e] : [b, ...t]; }

tokens = token*

token = ws @(value / colon / comma) ws

value
  = literal
  / number
  / string
  / object
  / array

literal = first:[a-zA-Z_] rest:[a-zA-Z0-9_]* { return [first, ...rest].join(""); }

// ----- Numbers -----

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point
  = "."

digit1_9
  = [1-9]

e
  = [eE]

exp
  = e (minus / plus)? DIGIT+

frac
  = decimal_point DIGIT+

int
  = zero / (digit1_9 DIGIT*)

minus
  = "-"

plus
  = "+"

zero
  = "0"

// ----- Strings -----

string "string"
  = quotation_mark chars:char* e:quotation_mark? { return '"' + chars.join("") + (e ? '"' : ''); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

quotation_mark
  = '"'

unescaped
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i
