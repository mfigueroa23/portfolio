import { AGENT_URL, resolveAgentUrl } from './agent';

describe('resolveAgentUrl', () => {
  it('falls back to the production agent when the value is not set', () => {
    expect(resolveAgentUrl(undefined)).toBe('https://agent.figueroa-sanchez.com');
  });

  it('falls back to the production agent when the value is empty or blank', () => {
    expect(resolveAgentUrl('')).toBe('https://agent.figueroa-sanchez.com');
    expect(resolveAgentUrl('   ')).toBe('https://agent.figueroa-sanchez.com');
  });

  it('uses the given URL without surrounding spaces or trailing slashes', () => {
    expect(resolveAgentUrl('http://localhost:8000/')).toBe('http://localhost:8000');
    expect(resolveAgentUrl(' http://localhost:8000// ')).toBe('http://localhost:8000');
    expect(resolveAgentUrl('https://agent.example.com')).toBe('https://agent.example.com');
  });
});

describe('AGENT_URL', () => {
  it('uses the production agent when the build defines no NG_AGENT_URL', () => {
    expect(AGENT_URL).toBe('https://agent.figueroa-sanchez.com');
  });
});
