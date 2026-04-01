import type { NextConfig } from "next";
import dns from 'dns';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Force IPv4 DNS resolution — fixes Supabase connection timeouts on Windows
dns.setDefaultResultOrder('ipv4first');

const nextConfig: NextConfig = {
  turbopack: {},
  /* config options here */
};

module.exports = withPWA(nextConfig);

