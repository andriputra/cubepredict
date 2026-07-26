declare module "cubejs" {
  interface CubeJSON {
    center: number[];
    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];
  }

  class Cube {
    constructor(state?: Cube | CubeJSON);
    static initSolver(): void;
    static fromString(str: string): Cube;
    static random(): Cube;
    static inverse(algorithm: string): string;
    move(algorithm: string): this;
    identity(): this;
    toJSON(): CubeJSON;
    asString(): string;
    solve(maxDepth?: number): string;
    isSolved(): boolean;
    clone(): Cube;
    randomize(): this;
  }

  export = Cube;
}
