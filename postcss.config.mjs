// Hooks Tailwind into the CSS build. Theme tokens live in src/app/globals.css (Tailwind v4, no tailwind.config).
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
