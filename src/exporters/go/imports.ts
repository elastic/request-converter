import { TypeName } from "../../metamodel";
import { GO_BASE_IMPORT } from "./constants";

export class ImportTracker {
  private imports = new Set<string>();
  // API package path -> identifier used to reference it (aliased on collision).
  private apiPackages = new Map<string, string>();
  private usedApiNames = new Set<string>();

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

  // Register an API package and return the identifier to reference it by. Two
  // APIs can share a package name (e.g. ingest/putpipeline and
  // logstash/putpipeline), so collisions get a namespace-prefixed alias.
  addApiPackage(api: string): string {
    const parts = api.split(".").map((p) => p.replace(/_/g, ""));
    const base = parts[parts.length - 1];
    const namespace = parts.length > 1 ? parts[parts.length - 2] : "core";
    const pkgPath =
      parts.length === 1
        ? `${GO_BASE_IMPORT}/typedapi/core/${base}`
        : `${GO_BASE_IMPORT}/typedapi/${parts.join("/")}`;

    const existing = this.apiPackages.get(pkgPath);
    if (existing) return existing;

    let ref = base;
    if (this.usedApiNames.has(ref)) {
      ref = `${namespace}${base}`;
      let n = 2;
      while (this.usedApiNames.has(ref)) {
        ref = `${namespace}${base}${n++}`;
      }
    }
    this.usedApiNames.add(ref);
    this.apiPackages.set(pkgPath, ref);
    return ref;
  }

  addEnumPackage(typeName: TypeName): void {
    const enumPkgName = typeName.name.toLowerCase();
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/types/enums/${enumPkgName}`);
  }

  render(): string {
    const sorted = [...this.imports].sort();
    const stdLib = sorted.filter((i) => !i.includes("/"));
    const external: { path: string; alias?: string }[] = sorted
      .filter((i) => i.includes("/"))
      .map((path) => ({ path }));
    for (const [path, ref] of this.apiPackages) {
      // Only emit an explicit alias when it differs from the package's own name.
      const alias = ref === path.split("/").pop() ? undefined : ref;
      external.push({ path, alias });
    }
    external.sort((a, b) => a.path.localeCompare(b.path));
    if (stdLib.length === 0 && external.length === 0) return "";

    const parts: string[] = [];
    if (stdLib.length > 0) {
      parts.push(stdLib.map((i) => `    "${i}"`).join("\n"));
    }
    if (external.length > 0) {
      parts.push(
        external
          .map((e) =>
            e.alias ? `    ${e.alias} "${e.path}"` : `    "${e.path}"`,
          )
          .join("\n"),
      );
    }
    return `import (\n${parts.join("\n\n")}\n)`;
  }
}
