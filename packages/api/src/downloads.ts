/**
 * Trigger a browser download for a Blob received from an authenticated
 * fetch.  We can't use a plain `<a href>` for protected endpoints because
 * the JWT lives in an Authorization header, not in a cookie that the browser
 * would send for a top-level navigation.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Release the object URL on the next tick so Safari has time to start the
  // download before we revoke it.
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
