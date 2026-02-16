interface SlateNode {
  text?: string;
  children?: SlateNode[];
  [key: string]: unknown;
}

export function extractPlainText(nodes: SlateNode[]): string {
  let result = '';
  for (const node of nodes) {
    if (typeof node.text === 'string') {
      result += node.text + ' ';
    }
    if (node.children) {
      result += extractPlainText(node.children);
    }
  }
  return result.trim();
}
