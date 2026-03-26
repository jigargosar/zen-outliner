export interface OutlineNode {
  id: string;
  parentId: string | null;
  content: string;
  order: number;
  collapsed: boolean;
}

export interface TreeNode {
  node: OutlineNode;
  children: TreeNode[];
}
