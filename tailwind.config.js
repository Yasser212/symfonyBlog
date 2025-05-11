/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./assets/**/*.js",
        "./templates/**/*.html.twig",
        "./vendor/symfony/twig-bridge/Resources/views/Form/*.html.twig",
    ],
    theme: {
        extend: {
          animation: {
            'fade-in': 'fadeIn 1s ease-out',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            },
          },
        },
      },
      plugins: [
        require('@tailwindcss/typography'),
      ],
}