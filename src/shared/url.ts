export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function joinUrl(directoryUrl: string, fileName: string): string {
  const baseUrl = directoryUrl.endsWith('/') ? directoryUrl : `${directoryUrl}/`;
  return new URL(fileName, baseUrl).toString();
}
