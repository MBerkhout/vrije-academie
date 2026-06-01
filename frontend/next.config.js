/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Salesforce-synced product thumbnails (Primary_1_Url__c, Image_*_Url__c)
      { protocol: 'https', hostname: 's3-eu-central-1.amazonaws.com' },
      { protocol: 'https', hostname: 'vrije-academie.s3.eu-central-1.amazonaws.com' },
    ],
  },
}

export default nextConfig
