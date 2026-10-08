// Escape a string for use inside a Go interpreted (double-quoted) string literal.
// Handles the common escapes plus any remaining control character via \xNN so the
// generated source always compiles.
export function escapeGoString(s: string): string {
  let out = "";
  for (const ch of s) {
    switch (ch) {
      case "\\":
        out += "\\\\";
        break;
      case '"':
        out += '\\"';
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default: {
        const code = ch.codePointAt(0)!;
        if (code < 0x20 || code === 0x7f) {
          out += "\\x" + code.toString(16).padStart(2, "0");
        } else {
          out += ch;
        }
      }
    }
  }
  return out;
}
