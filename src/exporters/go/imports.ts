import { TypeName } from "../../metamodel";
import { GO_BASE_IMPORT } from "./constants";

export class ImportTracker {
  private imports = new Set<string>();

  add(pkg: string): void {
    this.imports.add(pkg);
  }

  addContext(): void {
    this.imports.add("context");
  }

  addFmt(): void {
    this.imports.add("fmt");
  }

  addLog(): void {
    this.imports.add("log");
  }

  addTypes(): void {
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/types`);
  }

  addSome(): void {
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/some`);
  }

  addElasticsearch(): void {
    this.imports.add(GO_BASE_IMPORT);
  }

  addApiPackage(api: string): void {
    const parts = api.split(".");
    let pkgPath: string;
    if (parts.length === 1) {
      pkgPath = `${GO_BASE_IMPORT}/typedapi/core/${parts[0]}`;
    } else {
      pkgPath = `${GO_BASE_IMPORT}/typedapi/${parts.join("/")}`;
    }
    this.imports.add(pkgPath);
  }

  addEnumPackage(typeName: TypeName): void {
    const enumPkgName = typeName.name.toLowerCase();
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/types/enums/${enumPkgName}`);
  }

  render(): string {
    if (this.imports.size === 0) return "";
    const sorted = [...this.imports].sort();
    const stdLib = sorted.filter((i) => !i.includes("/"));
    const external = sorted.filter((i) => i.includes("/"));
    const parts: string[] = [];
    if (stdLib.length > 0) {
      parts.push(stdLib.map((i) => `    "${i}"`).join("\n"));
    }
    if (external.length > 0) {
      parts.push(external.map((i) => `    "${i}"`).join("\n"));
    }
    return `import (\n${parts.join("\n\n")}\n)`;
  }
}
