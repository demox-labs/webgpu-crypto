module.exports = {
  ident: 'postcss',
  syntax: 'postcss-scss',
  parser: 'postcss-scss',
  plugins: [require('postcss-preset-env'), require('tailwindcss'), require('autoprefixer')]
};
