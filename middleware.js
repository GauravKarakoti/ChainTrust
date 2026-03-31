export const config = {
  // Match both tgcloud and our new etherscan route
  matcher: ['/tgcloud/:path*', '/etherscan/:path*'],
};

export default async function middleware(req) {
  const url = new URL(req.url);
  
  let targetUrl;

  // 1. Route to the correct destination based on the path
  if (url.pathname.startsWith('/tgcloud')) {
    const targetPath = url.pathname.replace(/^\/tgcloud/, '') + url.search;
    targetUrl = `https://api.tgcloud.io${targetPath}`;
  } else if (url.pathname.startsWith('/etherscan')) {
    const targetPath = url.pathname.replace(/^\/etherscan/, '') + url.search;
    targetUrl = `https://api.etherscan.io${targetPath}`;
  }

  // 2. Clone headers and remove Origin, Referer, and Host to bypass firewalls
  const headers = new Headers(req.headers);
  headers.delete('origin');
  headers.delete('referer');
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