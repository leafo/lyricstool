import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeWord, wordsMatch } from '../wordMatch.js';

describe('normalizeWord', () => {
  test('trims whitespace', () => {
    assert.strictEqual(normalizeWord('  hello  '), 'hello');
  });

  test('converts to lowercase', () => {
    assert.strictEqual(normalizeWord('HELLO'), 'hello');
    assert.strictEqual(normalizeWord('HeLLo'), 'hello');
  });

  test('removes punctuation', () => {
    assert.strictEqual(normalizeWord('hello!'), 'hello');
    assert.strictEqual(normalizeWord('hello,'), 'hello');
    assert.strictEqual(normalizeWord('hello.'), 'hello');
    assert.strictEqual(normalizeWord("hello'"), 'hello');
  });

  test('preserves word characters', () => {
    assert.strictEqual(normalizeWord('hello123'), 'hello123');
  });
});

describe('wordsMatch', () => {
  describe('basic matching', () => {
    test('matches identical words', () => {
      assert.strictEqual(wordsMatch('hello', 'hello'), true);
    });

    test('matches case-insensitively', () => {
      assert.strictEqual(wordsMatch('Hello', 'HELLO'), true);
      assert.strictEqual(wordsMatch('WORLD', 'world'), true);
    });

    test('matches with punctuation stripped from input', () => {
      assert.strictEqual(wordsMatch('hello!', 'hello'), true);
      assert.strictEqual(wordsMatch('hello,', 'hello'), true);
    });

    test('does not match different words', () => {
      assert.strictEqual(wordsMatch('hello', 'world'), false);
      assert.strictEqual(wordsMatch('cat', 'car'), false);
    });
  });

  describe('apostrophe wildcard', () => {
    test("matches apostrophe at end with extra character (mornin' -> morning)", () => {
      assert.strictEqual(wordsMatch('morning', "mornin'"), true);
    });

    test("matches apostrophe at end with no extra character (mornin' -> mornin)", () => {
      assert.strictEqual(wordsMatch('mornin', "mornin'"), true);
    });

    test("matches apostrophe in middle with no character (don't -> dont)", () => {
      assert.strictEqual(wordsMatch('dont', "don't"), true);
    });

    test("matches apostrophe in middle with one character (don't -> donXt)", () => {
      assert.strictEqual(wordsMatch('donxt', "don't"), true);
    });

    test("does not match when word is completely different", () => {
      assert.strictEqual(wordsMatch('hello', "mornin'"), false);
    });

    test("handles multiple apostrophes", () => {
      assert.strictEqual(wordsMatch('yall', "y'all"), true);
      assert.strictEqual(wordsMatch('yoall', "y'all"), true);
    });
  });
});
