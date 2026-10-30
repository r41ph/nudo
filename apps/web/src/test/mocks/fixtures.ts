export const MOCK_USER = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'test@example.com',
  displayName: 'Test User',
};

export const MOCK_TOKEN = 'fake-jwt-token-for-testing';

export const MOCK_PROJECT = {
  id: '99999999-8888-7777-6666-555544443333',
  title: 'Test Project',
};

export const MOCK_DOCUMENT = {
  id: '11111111-2222-3333-4444-555566667777',
  title: 'Test Document',
  content: [{ type: 'p', children: [{ text: 'Hello world' }] }],
  plainText: 'Hello world',
  wordCount: 2,
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  folderId: null,
  parentId: null,
  position: 0,
};

export const MOCK_DOCUMENT_2 = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000',
  title: 'Second Document',
  content: [{ type: 'p', children: [{ text: 'Another doc' }] }],
  plainText: 'Another doc',
  wordCount: 2,
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  folderId: null,
  parentId: null,
  position: 1,
};

export const MOCK_FOLDER = {
  id: 'ff111111-2222-3333-4444-555566667777',
  name: 'Test Folder',
  position: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  documentsByFolderId: { nodes: [] },
};

export const MOCK_USER_SETTINGS = {
  id: MOCK_USER.id,
  enabledTools: ['bold', 'italic', 'underline'],
  toolbarType: 'floating',
};

// The populated plot answered for MOCK_PROJECT; every other project is empty.
export const MOCK_PLOTLINES = [
  {
    id: '0a000000-0000-4000-8000-000000000001',
    name: 'Main plot',
    color: 'color1',
    position: 0,
  },
  {
    id: '0a000000-0000-4000-8000-000000000002',
    name: 'Ada',
    color: 'color4',
    position: 1,
  },
] as const;

export const MOCK_PLOT_BEATS = [
  {
    id: '0b000000-0000-4000-8000-000000000001',
    name: 'Beginning',
    position: 0,
  },
  { id: '0b000000-0000-4000-8000-000000000002', name: 'Middle', position: 1 },
  { id: '0b000000-0000-4000-8000-000000000003', name: 'End', position: 2 },
] as const;
