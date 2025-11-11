import fs from 'fs';
import { exec }  from 'child_process';

const sourceDir = (process.platform !== "win32")
  ? "src/exporters"
  : "src\\exporters";
process.chdir(sourceDir);
const cmd = "handlebars python.tpl javascript.tpl php.tpl ruby.tpl java.tpl -f templates.js -c";
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.log(stdout);
    console.error(stderr);
    process.exit(1);
  }
  let templates = fs.readFileSync("templates.js", 'utf-8');
  templates = 'const Handlebars = require("handlebars");\n' + templates;
  fs.writeFileSync("templates.js", templates);
});
