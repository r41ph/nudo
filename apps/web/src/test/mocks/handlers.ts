import { graphql, http, HttpResponse } from 'msw';
import {
  MOCK_USER,
  MOCK_TOKEN,
  MOCK_DOCUMENT,
  MOCK_DOCUMENT_2,
  MOCK_FOLDER,
  MOCK_USER_SETTINGS,
  MOCK_PROJECT,
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_NEW_PROJECT_ID,
  MOCK_PLOT_CARDS,
} from '@web/test/mocks/fixtures';

// Both mock documents live in MOCK_PROJECT; any other project is empty.
function documentsIn(projectId: unknown) {
  return projectId === MOCK_PROJECT.id ? [MOCK_DOCUMENT, MOCK_DOCUMENT_2] : [];
}

export const handlers = [
  graphql.query('GetProjects', () => {
    return HttpResponse.json({
      data: { allProjects: { nodes: [MOCK_PROJECT] } },
    });
  }),

  graphql.mutation('CreateProject', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createProject: {
          project: { id: MOCK_NEW_PROJECT_ID, title: variables.title },
        },
      },
    });
  }),

  graphql.mutation('RenameProject', ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateProjectById: {
          project: { id: variables.id, title: variables.title },
        },
      },
    });
  }),

  graphql.mutation('DeleteProject', ({ variables }) => {
    return HttpResponse.json({
      data: { deleteProjectById: { deletedProjectId: variables.id } },
    });
  }),

  graphql.query('GetPlot', ({ variables }) => {
    const populated = variables.projectId === MOCK_PROJECT.id;
    return HttpResponse.json({
      data: {
        allPlotlines: { nodes: populated ? MOCK_PLOTLINES : [] },
        allPlotBeats: { nodes: populated ? MOCK_PLOT_BEATS : [] },
        allPlotCards: { nodes: populated ? MOCK_PLOT_CARDS : [] },
      },
    });
  }),

  graphql.mutation('StartPlot', () =>
    HttpResponse.json({ data: { startPlot: { clientMutationId: null } } })
  ),

  graphql.mutation('CreatePlotline', ({ variables }) =>
    HttpResponse.json({
      data: { createPlotline: { plotline: { id: variables.id } } },
    })
  ),

  graphql.mutation('UpdatePlotline', ({ variables }) =>
    HttpResponse.json({
      data: { updatePlotlineById: { plotline: { id: variables.id } } },
    })
  ),

  graphql.mutation('DeletePlotline', ({ variables }) =>
    HttpResponse.json({
      data: { deletePlotlineById: { deletedPlotlineId: variables.id } },
    })
  ),

  graphql.mutation('ReorderPlotlines', () =>
    HttpResponse.json({
      data: { reorderPlotlines: { clientMutationId: null } },
    })
  ),

  graphql.mutation('CreatePlotBeat', ({ variables }) =>
    HttpResponse.json({
      data: { createPlotBeat: { plotBeat: { id: variables.id } } },
    })
  ),

  graphql.mutation('UpdatePlotBeat', ({ variables }) =>
    HttpResponse.json({
      data: { updatePlotBeatById: { plotBeat: { id: variables.id } } },
    })
  ),

  graphql.mutation('DeletePlotBeat', ({ variables }) =>
    HttpResponse.json({
      data: { deletePlotBeatById: { deletedPlotBeatId: variables.id } },
    })
  ),

  graphql.mutation('CreatePlotCard', ({ variables }) =>
    HttpResponse.json({
      data: { createPlotCard: { plotCard: { id: variables.id } } },
    })
  ),

  graphql.mutation('UpdatePlotCard', ({ variables }) =>
    HttpResponse.json({
      data: { updatePlotCardById: { plotCard: { id: variables.id } } },
    })
  ),

  graphql.mutation('DeletePlotCard', ({ variables }) =>
    HttpResponse.json({
      data: { deletePlotCardById: { deletedPlotCardId: variables.id } },
    })
  ),

  graphql.mutation('MovePlotCard', () =>
    HttpResponse.json({ data: { movePlotCard: { clientMutationId: null } } })
  ),

  graphql.mutation('ReorderPlotBeats', () =>
    HttpResponse.json({
      data: { reorderPlotBeats: { clientMutationId: null } },
    })
  ),

  graphql.query('GetDocuments', ({ variables }) => {
    return HttpResponse.json({
      data: {
        allDocuments: {
          nodes: documentsIn(variables.projectId),
        },
      },
    });
  }),

  graphql.query('GetOutline', ({ variables }) => {
    return HttpResponse.json({
      data: {
        allDocuments: {
          nodes: documentsIn(variables.projectId).map((doc) => ({
            id: doc.id,
            title: doc.title,
            parentId: null,
            position: doc.position,
            kind: doc.kind,
            status: doc.status,
            wordCount: doc.wordCount,
            pov: doc.pov,
          })),
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

  graphql.mutation('CreateNode', () => {
    return HttpResponse.json({
      data: {
        createNode: {
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

  graphql.mutation('UpdateDocumentDetails', ({ variables }) => {
    const patch = (variables.patch ?? {}) as Record<string, unknown>;
    return HttpResponse.json({
      data: {
        updateDocumentById: {
          document: {
            id: variables.id,
            title: MOCK_DOCUMENT.title,
            status: null,
            summary: '',
            pov: '',
            ...patch,
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
