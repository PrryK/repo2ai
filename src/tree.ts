interface TreeNode {
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function createNode(): TreeNode {
  return {
    children: new Map(),
    isFile: false
  };
}

export function renderDirectoryTree(paths: string[], depth: number): string {
  const root = createNode();

  for (const filePath of [...new Set(paths)].sort((a, b) => a.localeCompare(b))) {
    const parts = filePath.split("/").filter(Boolean).slice(0, Math.max(depth, 0));
    let node = root;

    parts.forEach((part, index) => {
      const existing = node.children.get(part) ?? createNode();
      node.children.set(part, existing);
      node = existing;
      if (index === parts.length - 1 && parts.length === filePath.split("/").filter(Boolean).length) {
        node.isFile = true;
      }
    });
  }

  const lines = ["."];
  appendChildren(root, "", lines);
  return lines.join("\n");
}

function appendChildren(node: TreeNode, prefix: string, lines: string[]): void {
  const entries = [...node.children.entries()].sort(([aName, aNode], [bName, bNode]) => {
    if (aNode.isFile !== bNode.isFile) {
      return aNode.isFile ? 1 : -1;
    }
    return aName.localeCompare(bName);
  });

  entries.forEach(([name, child], index) => {
    const isLast = index === entries.length - 1;
    lines.push(`${prefix}${isLast ? "`-- " : "|-- "}${name}`);
    appendChildren(child, `${prefix}${isLast ? "    " : "|   "}`, lines);
  });
}
