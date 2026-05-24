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

export const UPDATE_USER_TOOLBAR = gql`
  mutation UpdateUserToolbar($enabledTools: JSON!, $toolbarType: String) {
    updateUserToolbar(
      input: { newEnabledTools: $enabledTools, newToolbarType: $toolbarType }
    ) {
      user {
        id
        enabledTools
        toolbarType
      }
    }
  }
`;
