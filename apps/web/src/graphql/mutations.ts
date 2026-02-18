import { gql } from 'graphql-request';

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($title: String, $content: JSON) {
    createNewDocument(input: { docTitle: $title, docContent: $content }) {
      document {
        id
        title
        slug
        content
        wordCount
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

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: UUID!) {
    deleteDocumentById(input: { id: $id }) {
      deletedDocumentId
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
