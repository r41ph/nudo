import { describe, it, expect } from 'vitest';
import { wordCount } from './wordCount.js';

describe('wordCount', () => {
  it('returns 0 for an empty string', () => {
    expect(wordCount('')).toBe(0);
  });

  it('returns 0 for a whitespace-only string', () => {
    expect(wordCount('   ')).toBe(0);
    expect(wordCount('\t\n')).toBe(0);
  });

  it('counts a single word', () => {
    expect(wordCount('Hello')).toBe(1);
  });

  it('counts multiple space-separated words', () => {
    expect(wordCount('Hello world foo')).toBe(3);
  });

  it('handles multiple consecutive spaces between words', () => {
    expect(wordCount('one  two   three')).toBe(3);
  });

  it('handles leading and trailing whitespace', () => {
    expect(wordCount('  hello world  ')).toBe(2);
  });

  it('handles newline and tab delimiters', () => {
    expect(wordCount('line one\nline two\ttab')).toBe(5);
  });
});
