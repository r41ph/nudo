import { gql } from 'graphql-request';

export const GET_DOCUMENT = gql`
  query GetDocument($id: UUID!) {
    documentById(id: $id) {
      id
      title
      content
      plainText
      wordCount
      kind
      status
      summary
      pov
      createdAt
      updatedAt
    }
  }
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments($projectId: UUID!) {
    allDocuments(condition: { projectId: $projectId }, orderBy: POSITION_ASC) {
      nodes {
        id
        title
        wordCount
        updatedAt
        parentId
        position
        kind
      }
    }
  }
`;

export function documentsQueryKey(projectId: string | undefined) {
  return ['documents', projectId] as const;
}

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

export const CREATE_NODE = gql`
  mutation CreateNode(
    $projectId: UUID!
    $kind: String!
    $parentId: UUID
    $title: String
    $content: JSON
  ) {
    createNode(
      input: {
        nodeProjectId: $projectId
        nodeKind: $kind
        nodeParentId: $parentId
        nodeTitle: $title
        nodeContent: $content
      }
    ) {
      document {
        id
        title
        content
        wordCount
        kind
        status
        parentId
        position
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

export const UPDATE_DOCUMENT_DETAILS = gql`
  mutation UpdateDocumentDetails($id: UUID!, $patch: DocumentPatch!) {
    updateDocumentById(input: { id: $id, documentPatch: $patch }) {
      document {
        id
        title
        status
        summary
        pov
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
