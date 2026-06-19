import type { DataNode } from "antd/es/tree";

export type PackFileMeta = {
  path: string;
  sizeBytes: number;
  updatedAt: string;
};

/** URL 路径段编码（POSIX 相对路径）。 */
export function encodePackFilePath(relPath: string): string {
  return relPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/** 文件列表排序：SKILL.md 置顶，其余 POSIX 字典序。 */
export function sortPackFilePaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    if (a === "SKILL.md") return -1;
    if (b === "SKILL.md") return 1;
    return a.localeCompare(b);
  });
}

export function isScriptPath(path: string): boolean {
  return path === "scripts" || path.startsWith("scripts/");
}

export type PackTreeNode = DataNode & {
  path?: string;
  isFolder?: boolean;
};

/** 由扁平 path 列表构建 antd Tree 数据。 */
export function buildPackFileTree(paths: string[]): PackTreeNode[] {
  const sorted = sortPackFilePaths(paths);
  const root: PackTreeNode[] = [];

  for (const filePath of sorted) {
    const parts = filePath.split("/");
    let level = root;
    let acc = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      acc = acc ? `${acc}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      const key = acc;

      let node = level.find((n) => n.key === key);
      if (!node) {
        node = {
          key,
          title: part,
          path: isLeaf ? filePath : undefined,
          isFolder: !isLeaf,
          children: isLeaf ? undefined : [],
        };
        level.push(node);
      }
      if (!isLeaf) {
        if (!node.children) node.children = [];
        level = node.children as PackTreeNode[];
      }
    }
  }

  return root;
}

/** 收集树中所有文件 path。 */
export function collectFilePaths(nodes: PackTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (list: PackTreeNode[]) => {
    for (const n of list) {
      if (n.path) out.push(n.path);
      if (n.children?.length) walk(n.children as PackTreeNode[]);
    }
  };
  walk(nodes);
  return out;
}

/** UTF-8 字节长度估算（浏览器端）。 */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
