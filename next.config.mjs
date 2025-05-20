/** @type {import('next').NextConfig} */
const nextConfig = {
    headers: async () => [
        {
            source: "/(.*)",
            headers: [
                {
                    key: "Content-Security-Policy",
                    value:
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://stunning-chimp-36.clerk.accounts.dev; object-src 'none';",
                },
            ],
        },
    ],
};

export default nextConfig;
