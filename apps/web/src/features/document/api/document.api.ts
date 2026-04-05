import { gql } from 'graphql-request';

export const GET_DOCUMENT = gql`
  query GetDocument($id: UUID!) {
    documentById(id: $id) {
      id
      title
      slug
      content
      plainText
      wordCount
      createdAt
      updatedAt
    }
  }
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments {
    allDocuments(orderBy: POSITION_ASC) {
      nodes {
        id
        title
        slug
        wordCount
        updatedAt
        folderId
        position
      }
    }
  }
`;

export const GET_DOCUMENT_VERSIONS = gql`
  query GetDocumentVersions($documentId: UUID!) {
    allDocumentVersions(
      condition: { documentId: $documentId }
      orderBy: VERSION_NUMBER_DESC
    ) {
      nodes {
        id
        versionNumber
        wordCount
        createdAt
      }
    }
  }
`;

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
