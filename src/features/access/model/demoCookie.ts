const name = 'odontoflow_demo_session';
export function demoCookie(): string {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}
export function setDemoCookie(token: string, remember: boolean) {
  if (typeof document !== 'undefined')
    document.cookie = `${name}=${token}; Path=/; SameSite=Strict${remember ? '; Max-Age=2592000' : ''}${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export function clearDemoCookie() {
  if (typeof document !== 'undefined')
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
}
