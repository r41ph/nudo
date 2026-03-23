import { gql } from 'graphql-request';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser($id: UUID!) {
    userById(id: $id) {
      id
      enabledTools
      toolbarType
    }
  }
`;

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
