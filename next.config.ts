import type { NextConfig } from "next";
import dns from 'dns';

// Force IPv4 DNS resolution — fixes Supabase connection timeouts on Windows
dns.setDefaultResultOrder('ipv4first');

const nextConfig: NextConfig = {
  turbopack: {},
  /* config options here */
};

export default nextConfig;

