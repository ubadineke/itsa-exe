"use strict";
exports.id = 429;
exports.ids = [429];
exports.modules = {

/***/ 2429:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "publicIp": () => (/* binding */ publicIp)
/* harmony export */ });
/* harmony import */ var node_dns_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9227);


/**
 * @typedef {Object} Options
 * @property {array} servers - Array of server IP addresses
 * @property {string} hostname - The hostname of the dns service. Defaults to "myip.opendns.com"
 * @property {integer} timeoutMs - Resolver timeout in milliseconds
 * @property {integer} triesPerServer - Resolver tries before trying the next server IP address
 * @property {function} resultTransform - Takes the DNS result and tries to convert it to a single IP address string
 */

/**
 * publicIp uses nodes DNS resolver and services like "myip.opendns.com" to return you're public IP address.
 * @param {Options} config - Configuration for the DNS resolver
 * @param {array} config.servers - Array of server IP addresses
 * @param {string} config.hostname - The hostname of the dns service. Defaults to "myip.opendns.com"
 * @param {integer} config.timeoutMs - Resolver timeout in milliseconds
 * @param {integer} config.triesPerServer - Resolver tries before trying the next server IP address
 * @param {function} config.resultTransform - Takes the DNS result and tries to convert it to a single IP address string
 * @returns {Promise} You're public IP address string.
 */
const publicIp = ({
  servers = [
    "208.67.222.222",
    "208.67.220.220",
    "208.67.222.220",
    "208.67.220.222",
  ],
  hostname = "myip.opendns.com",
  timeoutMs = 100,
  triesPerServer = 1,
  resultTransform = (addresses) =>
    addresses[0]?.address || addresses[0]?.entries?.[0],
} = {}) => {
  const resolver = new node_dns_promises__WEBPACK_IMPORTED_MODULE_0__.Resolver({ tries: triesPerServer, timeout: timeoutMs });
  resolver.setServers(servers);
  // Resolver results:
  // o-o.myaddr.l.google.com: [ { entries: [ '121.200.6.176' ], type: 'TXT' } ]
  // myip.opendns.com: [ { address: '147.182.172.106', ttl: 0, type: 'A' } ]
  return resolver.resolveAny(hostname).then(resultTransform);
};




/***/ })

};
;