/** @type {import('tailwindcss').Config} */
export default {
  content: ["./popup.html", "./options.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // TabFlow brand colors - refined blue
        // Clean, professional, trustworthy like Stripe/Linear
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Dark mode surface colors - warm, cozy
        surface: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          700: "#44403c",
          800: "#292524",
          850: "#1c1917",
          900: "#171412",
          950: "#0c0a09",
        },
      },
      width: {
        popup: "400px",
      },
      maxHeight: {
        popup: "600px",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
