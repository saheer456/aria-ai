import nodeFetch, { RequestInit, Response } from 'node-fetch';
import https from 'https';

// Custom DNS lookup to permanently bypass Indian ISP (Jio) DNS blocks
// on the Supabase domain by hardcoding the Cloudflare IP.
const lookup = (hostname: string, options: any, callback: any) => {
  if (hostname === 'khbuelgpuzztztixqfgi.supabase.co') {
    if (options.all) {
      callback(null, [{ address: '104.18.38.10', family: 4 }]);
    } else {
      callback(null, '104.18.38.10', 4);
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dns').lookup(hostname, options, callback);
  }
};

const agent = new https.Agent({ lookup });

export async function supabaseFetch(url: string, options?: RequestInit): Promise<Response> {
  return nodeFetch(url, { ...options, agent });
}
