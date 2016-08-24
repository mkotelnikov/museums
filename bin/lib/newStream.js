var reactive = require('mosaic-reactive');
module.exports = function newStream() {
  return new reactive.Stream(Promise, reactive.stream);
}
