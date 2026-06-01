import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: { purple: '#512d7c', gold: '#f2b42c' },
        bg: { workspace: '#F9FAFB', card: '#FFFFFF' },
        dggPurple: '#512D7C',
        dggYellow: '#F2B42C',
        dggDark: '#07020d',
      },
      fontFamily: {
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        grotesk: ['Space Grotesk', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
