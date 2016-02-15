require("babel-polyfill");
require("babel-register")({
  presets: ["react", "es2015"],
  plugins: ["transform-async-to-generator"]
});

var server = require('./main');

if(!module.parent) {
  server.run();
}

module.exports = server;
