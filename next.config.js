/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // Disable Turbopack due to nodemailer resolution issues
      resolveAlias: {},
    },
  },
  // Treat nodemailer as an external package that should not be bundled
  serverExternalPackages: ['nodemailer'],
};

module.exports = nextConfig;
