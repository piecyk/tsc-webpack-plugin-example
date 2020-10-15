const path = require("path");
const os = require("os");
const webpack = require("webpack");
const pty = require("node-pty");

// const rewire = require("rewire");
// const createConsoleLogger = require("webpack/lib/logging/createConsoleLogger");

// const nodeConsole = rewire("webpack/lib/node/nodeConsole");
// nodeConsole.info = nodeConsole.__get__("writeColored")("<i> ", "", "");

const PLUGIN_NAME = "tsc-plugin";

class TscWebpackPlugin {
  constructor() {
    this.initialized = false;
  }
  apply(compiler) {
    // TODO: opt out from webpack info log colors
    // compiler.infrastructureLogger = createConsoleLogger({
    //   level: "info",
    //   debug: false,
    //   console: nodeConsole,
    // });

    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    const isWatchPromise = new Promise((resolve) => {
      compiler.hooks.run.tap(PLUGIN_NAME, () => {
        if (!this.initialized) {
          this.initialized = true;

          resolve(false);
        }
      });

      compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
        if (!this.initialized) {
          this.initialized = true;

          resolve(true);
        }
      });
    });

    isWatchPromise.then((isWatch) => {
      const file = path.resolve(
        compiler.context,
        `./node_modules/.bin/tsc${os.platform() === "win32" ? ".exe" : ""}`
      );

      const watchArgs = ["--watch", "--preserveWatchOutput"];

      if (!isWatch) {
        logger.info("Starting typechecking...");
      }

      const ptyProcess = pty.spawn(file, isWatch ? watchArgs : [], {
        name: "xterm-color",
      });

      ptyProcess.onData((data) => {
        logger.info(data.slice(0, -1));
      });

      ptyProcess.onExit((event) => {
        if (event.exitCode === 0) {
          logger.info(`Found 0 errors.`);
        } else {
          throw new Error("TODO: tsc");
        }
      });
    });
  }
}

module.exports = {
  entry: "./src/index.ts",
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
  plugins: [new webpack.ProgressPlugin(), new TscWebpackPlugin()],
};
