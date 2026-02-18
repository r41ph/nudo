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
      documentSettingsByDocumentId {
        nodes {
          id
          enabledTools
          toolbarType
        }
      }
    }
  }
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments {
    allDocuments(orderBy: UPDATED_AT_DESC) {
      nodes {
        id
        title
        slug
        wordCount
        updatedAt
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
