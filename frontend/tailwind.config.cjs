/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        synthwave: {
          purple: "#a855f7",
          blue: "#3b82f6",
          orange: "#f97316",
          yellow: "#eab308",
          dark: "#0a0a0f",
          card: "#1a1a2e",
          text: {
            primary: "#e0e7ff",
            secondary: "#a5b4fc",
          },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        synthwave: {
          primary: "#a855f7",
          secondary: "#3b82f6",
          accent: "#f97316",
          neutral: "#1a1a2e",
          "base-100": "#0a0a0f",
          "base-200": "#1a1a2e",
          "base-300": "#16213e",
          info: "#3b82f6",
          success: "#10b981",
          warning: "#eab308",
          error: "#ef4444",
        },
      },
    ],
    darkTheme: "synthwave",
    base: true,
    styled: true,
    utils: true,
  },
};
