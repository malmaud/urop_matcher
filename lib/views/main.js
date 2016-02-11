require("babel-polyfill");

var React = require('React');
var ReactDOM = require('react-dom');

var $ = require('jquery');
var Content = require('./content');

$(document).ready(()=>{
  ReactDOM.render(React.createElement(Content, initialProps), $("#content")[0]);
});

module.exports = {};
