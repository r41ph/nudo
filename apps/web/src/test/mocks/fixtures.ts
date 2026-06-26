export const MOCK_USER = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'test@example.com',
  displayName: 'Test User',
};

export const MOCK_TOKEN = 'fake-jwt-token-for-testing';

export const MOCK_DOCUMENT = {
  id: '11111111-2222-3333-4444-555566667777',
  title: 'Test Document',
  content: [{ type: 'p', children: [{ text: 'Hello world' }] }],
  plainText: 'Hello world',
  wordCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  folderId: null,
  position: 0,
};

export const MOCK_DOCUMENT_2 = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000',
  title: 'Second Document',
  content: [{ type: 'p', children: [{ text: 'Another doc' }] }],
  plainText: 'Another doc',
  wordCount: 2,
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  folderId: null,
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
