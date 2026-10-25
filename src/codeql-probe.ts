// Throwaway probe for Spec 009 E2: CodeQL must report DOM XSS (medium) without blocking.
export function showHash(): void {
  document.body.innerHTML = decodeURIComponent(window.location.hash.slice(1));
}
