/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com'],
  },
  env: {
    NEXT_PUBLIC_BOT_INVITE_URL: process.env.NEXT_PUBLIC_BOT_INVITE_URL,
    NEXT_PUBLIC_SUPPORT_SERVER: process.env.NEXT_PUBLIC_SUPPORT_SERVER,
  },
};

module.exports = nextConfig;
