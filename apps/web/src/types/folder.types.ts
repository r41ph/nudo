export interface FolderNode {
  id: string;
  name: string;
  position: number;
  documentsByFolderId: {
    nodes: Array<{
      id: string;
      title: string;
      wordCount: number;
      updatedAt: string;
      position: number;
    }>;
  };
}
