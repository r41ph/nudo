import { gql } from 'graphql-request';

export const GET_FOLDERS = gql`
  query GetFolders {
    allFolders(orderBy: POSITION_ASC) {
      nodes {
        id
        name
        position
        createdAt
        updatedAt
        documentsByFolderId(orderBy: POSITION_ASC) {
          nodes {
            id
            title
            wordCount
            updatedAt
            position
          }
        }
      }
    }
  }
`;

export const CREATE_FOLDER = gql`
  mutation CreateFolder($name: String!) {
    createNewFolder(input: { folderName: $name }) {
      folder {
        id
        name
        position
      }
    }
  }
`;

export const RENAME_FOLDER = gql`
  mutation RenameFolder($id: UUID!, $name: String!) {
    updateFolderById(input: { id: $id, folderPatch: { name: $name } }) {
      folder {
        id
        name
        updatedAt
      }
    }
  }
`;

export const DELETE_FOLDER = gql`
  mutation DeleteFolder($id: UUID!) {
    deleteFolderById(input: { id: $id }) {
      deletedFolderId
    }
  }
`;

export const MOVE_DOCUMENT_TO_FOLDER = gql`
  mutation MoveDocumentToFolder($id: UUID!, $folderId: UUID) {
    updateDocumentById(
      input: { id: $id, documentPatch: { folderId: $folderId } }
    ) {
      document {
        id
        folderId
      }
    }
  }
`;

export const REORDER_FOLDERS = gql`
  mutation ReorderFolders($folderPositions: JSON!) {
    reorderFolders(input: { folderPositions: $folderPositions }) {
      clientMutationId
    }
  }
`;

export const MOVE_AND_REORDER_DOCUMENT = gql`
  mutation MoveAndReorderDocument(
    $docId: UUID!
    $targetFolderId: UUID
    $docPositions: JSON!
  ) {
    moveAndReorderDocument(
      input: {
        docId: $docId
        targetFolderId: $targetFolderId
        docPositions: $docPositions
      }
    ) {
      clientMutationId
    }
  }
`;
