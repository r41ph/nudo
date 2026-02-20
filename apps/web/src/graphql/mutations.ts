import { gql } from 'graphql-request';

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($title: String, $content: JSON, $folderId: UUID) {
    createNewDocument(
      input: { docTitle: $title, docContent: $content, docFolderId: $folderId }
    ) {
      document {
        id
        title
        slug
        content
        wordCount
        folderId
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_DOCUMENT_CONTENT = gql`
  mutation UpdateDocumentContent($docId: UUID!, $newContent: JSON!) {
    updateDocumentContent(input: { docId: $docId, newContent: $newContent }) {
      document {
        id
        content
        plainText
        wordCount
        updatedAt
      }
    }
  }
`;

export const UPDATE_DOCUMENT_SETTINGS = gql`
  mutation UpdateDocumentSettings(
    $id: UUID!
    $enabledTools: JSON
    $toolbarType: String
  ) {
    updateDocumentSettingById(
      input: {
        id: $id
        documentSettingPatch: {
          enabledTools: $enabledTools
          toolbarType: $toolbarType
        }
      }
    ) {
      documentSetting {
        id
        enabledTools
        toolbarType
      }
    }
  }
`;

export const RENAME_DOCUMENT = gql`
  mutation RenameDocument($id: UUID!, $title: String!) {
    updateDocumentById(input: { id: $id, documentPatch: { title: $title } }) {
      document {
        id
        title
        updatedAt
      }
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: UUID!) {
    deleteDocumentById(input: { id: $id }) {
      deletedDocumentId
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

export const RESTORE_DOCUMENT_VERSION = gql`
  mutation RestoreDocumentVersion($docId: UUID!, $targetVersion: Int!) {
    restoreDocumentVersion(
      input: { docId: $docId, targetVersion: $targetVersion }
    ) {
      document {
        id
        content
        plainText
        wordCount
        updatedAt
      }
    }
  }
`;
