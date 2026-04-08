import { setupServer } from 'msw/node';
import { handlers } from '@web/test/mocks/handlers';

export const server = setupServer(...handlers);
