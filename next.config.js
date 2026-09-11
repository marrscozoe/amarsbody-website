/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize nodemailer so Turbopack doesn't try to bundle it
  serverExternalPackages: ['nodemailer'],
};

module.exports = nextConfig;
