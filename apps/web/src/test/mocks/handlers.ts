import { graphql, http, HttpResponse } from 'msw';
import {
  MOCK_USER,
  MOCK_TOKEN,
  MOCK_DOCUMENT,
  MOCK_DOCUMENT_2,
  MOCK_FOLDER,
  MOCK_USER_SETTINGS,
} from '@web/test/mocks/fixtures';

export const handlers = [
  // GraphQL queries
  graphql.query('GetDocuments', () => {
    return HttpResponse.json({
      data: {
        allDocuments: {
          nodes: [MOCK_DOCUMENT, MOCK_DOCUMENT_2],
        },
      },
    });
  }),

  graphql.query('GetDocument', ({ variables }) => {
    if (variables.id === MOCK_DOCUMENT.id) {
      return HttpResponse.json({
        data: { documentById: MOCK_DOCUMENT },
      });
    }
    return HttpResponse.json({
      data: { documentById: null },
    });
  }),

  graphql.query('GetFolders', () => {
    return HttpResponse.json({
      data: {
        allFolders: {
          nodes: [MOCK_FOLDER],
        },
      },
    });
  }),

  graphql.query('GetCurrentUser', () => {
    return HttpResponse.json({
      data: { userById: MOCK_USER_SETTINGS },
    });
  }),

  // GraphQL mutations
  graphql.mutation('CreateDocument', () => {
    return HttpResponse.json({
      data: {
        createNewDocument: {
          document: MOCK_DOCUMENT,
        },
      },
    });
  }),

  graphql.mutation('UpdateDocumentContent', () => {
    return HttpResponse.json({
      data: {
        updateDocumentContent: {
          document: {
            id: MOCK_DOCUMENT.id,
            content: MOCK_DOCUMENT.content,
            plainText: MOCK_DOCUMENT.plainText,
            wordCount: MOCK_DOCUMENT.wordCount,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });
  }),

  graphql.mutation('UpdateUserToolbar', () => {
    return HttpResponse.json({
      data: {
        updateUserToolbar: {
          user: MOCK_USER_SETTINGS,
        },
      },
    });
  }),

  graphql.mutation('RenameDocument', ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateDocumentById: {
          document: {
            id: variables.id,
            title: variables.title,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });
  }),

  graphql.mutation('DeleteDocument', ({ variables }) => {
    return HttpResponse.json({
      data: {
        deleteDocumentById: { deletedDocumentId: variables.id },
      },
    });
  }),

  graphql.mutation('CreateFolder', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createNewFolder: {
          folder: { id: 'new-folder-id', name: variables.name, position: 1 },
        },
      },
    });
  }),

  graphql.mutation('ReorderFolders', () => {
    return HttpResponse.json({
      data: { reorderFolders: { clientMutationId: null } },
    });
  }),

  graphql.mutation('MoveAndReorderDocument', () => {
    return HttpResponse.json({
      data: { moveAndReorderDocument: { clientMutationId: null } },
    });
  }),

  // REST auth endpoints
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ token: MOCK_TOKEN, user: MOCK_USER });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    return HttpResponse.json({
      token: MOCK_TOKEN,
      user: { ...MOCK_USER, email: body.email, displayName: body.displayName },
    });
  }),

  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
