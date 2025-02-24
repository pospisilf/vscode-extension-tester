// Test Block
export interface TestBlock {
    describe: string;
    filePath: string;
    line: number;
    modifier?: string | null; // skip/only
    parentModifier?: string | null; // skip/only
    its: ItBlock[];
    children: TestBlock[];
}

export interface ItBlock {
    name: string;
    filePath: string;
    line: number;
    modifier?: string | null; // skip/only
    parentModifier?: string | null; // skip/only
    describeModifier?: string | null;
}