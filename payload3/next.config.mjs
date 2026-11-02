import { withPayload } from '@payloadcms/next/withPayload';
const publicMedia = process.env.AZURE_STORAGE_ACCOUNT_BASEURL ? new URL(process.env.AZURE_STORAGE_ACCOUNT_BASEURL).origin : '';
export default withPayload({
  output: 'standalone', poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data: blob: ${publicMedia}; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'` }] }];
  },
});
