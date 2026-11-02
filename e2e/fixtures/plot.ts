import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { registerUser } from './auth';

/** Wait for a GraphQL mutation's response, matched by its operation name. */
export function graphqlOperation(page: Page, operation: string) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/graphql') &&
      (response.request().postData() ?? '').includes(`mutation ${operation}`)
  );
}

/**
 * Sign in as a fresh user and start their plot, which seeds one plotline
 * ("Main plot") and three beats (Beginning, Middle, End).
 */
export async function signInAndStartPlot(
  page: Page,
  request: APIRequestContext
) {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/project\/[0-9a-f-]+\/document\//i);

  await page.getByRole('button', { name: 'View: Story' }).click();
  await page.getByRole('menuitem', { name: 'Plot' }).click();
  await page.getByRole('button', { name: 'Start plot' }).click();
  const board = page.getByRole('table', { name: 'Plot board' });
  await expect(board.getByRole('columnheader')).toHaveText([
    'Beginning',
    'Middle',
    'End',
  ]);
  return board;
}

/** Add an "Untitled plotline" from the sidebar and wait until it is saved. */
export async function addPlotline(page: Page) {
  const created = graphqlOperation(page, 'CreatePlotline');
  await page.getByRole('button', { name: 'New plotline' }).click();
  await created;
}

/** Add an "Untitled beat" from the sidebar and wait until it is saved. */
export async function addBeat(page: Page) {
  const created = graphqlOperation(page, 'CreatePlotBeat');
  await page.getByRole('button', { name: 'New beat' }).click();
  await created;
}
