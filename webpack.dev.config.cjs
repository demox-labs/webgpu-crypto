/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");

const config = {
  mode: "development",
  output: {
    publicPath: "/",
  },
  entry: "./src/index.tsx",
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        loader: 'worker-loader',
        options: { inline: 'no-fallback' },
      },
      {
        test: /\.(ts|js)x?$/i,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "path": require.resolve("path-browserify")
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
    new webpack.HotModuleReplacementPlugin(),
    new ForkTsCheckerWebpackPlugin({
      async: false,
    }),
    new ESLintPlugin({
      extensions: ["js", "jsx", "ts", "tsx"],
    }),
  ],
  devtool: "inline-source-map",
  devServer: {
    static: path.join(__dirname, "build"),
    historyApiFallback: true,
    port: 4000,
    open: true,
    hot: true,
    client: {
      overlay: false
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
};

// export default config;

module.exports = config;
