import { ImportTracker } from "./imports";
import { TypeResolver } from "./schema";

export class RenderContext {
  constructor(
    readonly resolver: TypeResolver,
    readonly imports: ImportTracker,
    readonly depth: number = 0,
  ) {}

  nested(): RenderContext {
    return new RenderContext(this.resolver, this.imports, this.depth + 1);
  }

  indent(): string {
    return "    ".repeat(this.depth);
  }
}
