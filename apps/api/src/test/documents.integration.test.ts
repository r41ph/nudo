/**
 * Content SQL-function mutations for documents, exercised through GraphQL:
 * update_document_content (word count + version row) and
 * restore_document_version. (Node creation lives in outline.integration.test.)
 */
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createDocument, createUser } from './seed.js';

/** A minimal Plate/Slate-shaped value so extract_plain_text/count_words run. */
function richText(text: string) {
  return [{ type: 'p', children: [{ text }] }];
}

const UPDATE_CONTENT = `
  mutation ($docId: UUID!, $newContent: JSON!) {
    updateDocumentContent(input: { docId: $docId, newContent: $newContent }) {
      document {
        id
        plainText
        wordCount
      }
    }
  }
`;

describe('update_document_content', () => {
  it('recomputes the word count and records a version row', async () => {
    const user = await createUser();
    const doc = await createDocument(user);

    const res = await graphql<{
      updateDocumentContent: {
        document: { plainText: string; wordCount: number };
      };
    }>(
      UPDATE_CONTENT,
      { docId: doc.id, newContent: richText('alpha beta gamma delta') },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.updateDocumentContent.document.wordCount).toBe(4);
    expect(res.data?.updateDocumentContent.document.plainText).toBe(
      'alpha beta gamma delta'
    );

    const { rows } = await getTestPool().query<{ version_number: number }>(
      'SELECT version_number FROM document_versions WHERE document_id = $1',
      [doc.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].version_number).toBe(1);
  });
});

describe('restore_document_version', () => {
  it('restores the content and word count of an earlier version', async () => {
    const user = await createUser();
    const doc = await createDocument(user);

    // Version 1 (2 words), then version 2 (4 words).
    await graphql(
      UPDATE_CONTENT,
      { docId: doc.id, newContent: richText('one two') },
      user.token
    );
    await graphql(
      UPDATE_CONTENT,
      { docId: doc.id, newContent: richText('one two three four') },
      user.token
    );

    const res = await graphql<{
      restoreDocumentVersion: {
        document: { plainText: string; wordCount: number };
      };
    }>(
      `
        mutation ($docId: UUID!, $targetVersion: Int!) {
          restoreDocumentVersion(
            input: { docId: $docId, targetVersion: $targetVersion }
          ) {
            document {
              id
              plainText
              wordCount
            }
          }
        }
      `,
      { docId: doc.id, targetVersion: 1 },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.restoreDocumentVersion.document.wordCount).toBe(2);
    expect(res.data?.restoreDocumentVersion.document.plainText).toBe('one two');
  });
});
