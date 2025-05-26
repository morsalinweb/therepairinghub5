/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        ".src/app/**/*.{js,ts,jsx,tsx}", // or wherever your components are
        "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                // Add others like:
                destructive: 'hsl(var(--destructive))',
                'destructive-foreground': 'hsl(var(--destructive-foreground))',
            },
        },
    },
    plugins: [],
}
