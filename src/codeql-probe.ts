// Throwaway probe for Spec 009 E1: CodeQL must report code injection and block the PR.
export function runFromHash(): unknown {
  return eval(window.location.hash.slice(1));
}
