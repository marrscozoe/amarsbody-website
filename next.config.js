/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack - use Webpack bundler instead
  // Turbopack has issues resolving certain packages like nodemailer
  experimental: {
    turbo: false,
  },
  serverExternalPackages: ['nodemailer'],
};

module.exports = nextConfig;
