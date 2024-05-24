import { parseRequest } from '../src/parse';

describe('parse', () => {
  it('should pass', () => {
    expect(parseRequest('foo')).toBeDefined()
  });
});
