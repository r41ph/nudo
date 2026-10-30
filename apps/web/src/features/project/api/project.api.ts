import { gql } from 'graphql-request';

export const CREATE_PROJECT = gql`
  mutation CreateProject($title: String!) {
    createProject(input: { projectTitle: $title }) {
      project {
        id
        title
      }
    }
  }
`;

export const RENAME_PROJECT = gql`
  mutation RenameProject($id: UUID!, $title: String!) {
    updateProjectById(input: { id: $id, projectPatch: { title: $title } }) {
      project {
        id
        title
      }
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: UUID!) {
    deleteProjectById(input: { id: $id }) {
      deletedProjectId
    }
  }
`;
