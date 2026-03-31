export const config = {
  // This ensures the middleware only runs for /tgcloud/ requests
  matcher: '/tgcloud/:path*',
};

export default async function middleware(req) {
  const url = new URL(req.url);
  
  // 1. Rewrite the URL (equivalent to your Vite path.replace)
  const targetPath = url.pathname.replace(/^\/tgcloud/, '') + url.search;
  const targetUrl = `https://api.tgcloud.io${targetPath}`;

  // 2. Clone headers and remove Origin & Referer
  const headers = new Headers(req.headers);
  headers.delete('origin');
  headers.delete('referer');
  // Vercel sometimes passes a host header that conflicts with the target
  headers.delete('host'); 

  // 3. Proxy the request using fetch to the new target
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: headers,
    body: req.body,
    redirect: 'manual'
  });

  // 4. Return the response back to your React frontend
  return response;
}