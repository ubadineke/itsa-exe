/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 785:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports =
{
  parallel      : __nccwpck_require__(7585),
  serial        : __nccwpck_require__(5758),
  serialOrdered : __nccwpck_require__(3209)
};


/***/ }),

/***/ 5953:
/***/ ((module) => {

// API
module.exports = abort;

/**
 * Aborts leftover active jobs
 *
 * @param {object} state - current state object
 */
function abort(state)
{
  Object.keys(state.jobs).forEach(clean.bind(state));

  // reset leftover jobs
  state.jobs = {};
}

/**
 * Cleans up leftover job by invoking abort function for the provided job id
 *
 * @this  state
 * @param {string|number} key - job id to abort
 */
function clean(key)
{
  if (typeof this.jobs[key] == 'function')
  {
    this.jobs[key]();
  }
}


/***/ }),

/***/ 2094:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var defer = __nccwpck_require__(3563);

// API
module.exports = async;

/**
 * Runs provided callback asynchronously
 * even if callback itself is not
 *
 * @param   {function} callback - callback to invoke
 * @returns {function} - augmented callback
 */
function async(callback)
{
  var isAsync = false;

  // check if async happened
  defer(function() { isAsync = true; });

  return function async_callback(err, result)
  {
    if (isAsync)
    {
      callback(err, result);
    }
    else
    {
      defer(function nextTick_callback()
      {
        callback(err, result);
      });
    }
  };
}


/***/ }),

/***/ 3563:
/***/ ((module) => {

module.exports = defer;

/**
 * Runs provided function on next iteration of the event loop
 *
 * @param {function} fn - function to run
 */
function defer(fn)
{
  var nextTick = typeof setImmediate == 'function'
    ? setImmediate
    : (
      typeof process == 'object' && typeof process.nextTick == 'function'
      ? process.nextTick
      : null
    );

  if (nextTick)
  {
    nextTick(fn);
  }
  else
  {
    setTimeout(fn, 0);
  }
}


/***/ }),

/***/ 7413:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var async = __nccwpck_require__(2094)
  , abort = __nccwpck_require__(5953)
  ;

// API
module.exports = iterate;

/**
 * Iterates over each job object
 *
 * @param {array|object} list - array or object (named list) to iterate over
 * @param {function} iterator - iterator to run
 * @param {object} state - current job status
 * @param {function} callback - invoked when all elements processed
 */
function iterate(list, iterator, state, callback)
{
  // store current index
  var key = state['keyedList'] ? state['keyedList'][state.index] : state.index;

  state.jobs[key] = runJob(iterator, key, list[key], function(error, output)
  {
    // don't repeat yourself
    // skip secondary callbacks
    if (!(key in state.jobs))
    {
      return;
    }

    // clean up jobs
    delete state.jobs[key];

    if (error)
    {
      // don't process rest of the results
      // stop still active jobs
      // and reset the list
      abort(state);
    }
    else
    {
      state.results[key] = output;
    }

    // return salvaged results
    callback(error, state.results);
  });
}

/**
 * Runs iterator over provided job element
 *
 * @param   {function} iterator - iterator to invoke
 * @param   {string|number} key - key/index of the element in the list of jobs
 * @param   {mixed} item - job description
 * @param   {function} callback - invoked after iterator is done with the job
 * @returns {function|mixed} - job abort function or something else
 */
function runJob(iterator, key, item, callback)
{
  var aborter;

  // allow shortcut if iterator expects only two arguments
  if (iterator.length == 2)
  {
    aborter = iterator(item, async(callback));
  }
  // otherwise go with full three arguments
  else
  {
    aborter = iterator(item, key, async(callback));
  }

  return aborter;
}


/***/ }),

/***/ 4618:
/***/ ((module) => {

// API
module.exports = state;

/**
 * Creates initial state object
 * for iteration over list
 *
 * @param   {array|object} list - list to iterate over
 * @param   {function|null} sortMethod - function to use for keys sort,
 *                                     or `null` to keep them as is
 * @returns {object} - initial state object
 */
function state(list, sortMethod)
{
  var isNamedList = !Array.isArray(list)
    , initState =
    {
      index    : 0,
      keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
      jobs     : {},
      results  : isNamedList ? {} : [],
      size     : isNamedList ? Object.keys(list).length : list.length
    }
    ;

  if (sortMethod)
  {
    // sort array keys based on it's values
    // sort object's keys just on own merit
    initState.keyedList.sort(isNamedList ? sortMethod : function(a, b)
    {
      return sortMethod(list[a], list[b]);
    });
  }

  return initState;
}


/***/ }),

/***/ 7276:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var abort = __nccwpck_require__(5953)
  , async = __nccwpck_require__(2094)
  ;

// API
module.exports = terminator;

/**
 * Terminates jobs in the attached state context
 *
 * @this  AsyncKitState#
 * @param {function} callback - final callback to invoke after termination
 */
function terminator(callback)
{
  if (!Object.keys(this.jobs).length)
  {
    return;
  }

  // fast forward iteration index
  this.index = this.size;

  // abort jobs
  abort(this);

  // send back results we have so far
  async(callback)(null, this.results);
}


/***/ }),

/***/ 7585:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var iterate    = __nccwpck_require__(7413)
  , initState  = __nccwpck_require__(4618)
  , terminator = __nccwpck_require__(7276)
  ;

// Public API
module.exports = parallel;

/**
 * Runs iterator over provided array elements in parallel
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function parallel(list, iterator, callback)
{
  var state = initState(list);

  while (state.index < (state['keyedList'] || list).length)
  {
    iterate(list, iterator, state, function(error, result)
    {
      if (error)
      {
        callback(error, result);
        return;
      }

      // looks like it's the last one
      if (Object.keys(state.jobs).length === 0)
      {
        callback(null, state.results);
        return;
      }
    });

    state.index++;
  }

  return terminator.bind(state, callback);
}


/***/ }),

/***/ 5758:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var serialOrdered = __nccwpck_require__(3209);

// Public API
module.exports = serial;

/**
 * Runs iterator over provided array elements in series
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function serial(list, iterator, callback)
{
  return serialOrdered(list, iterator, null, callback);
}


/***/ }),

/***/ 3209:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var iterate    = __nccwpck_require__(7413)
  , initState  = __nccwpck_require__(4618)
  , terminator = __nccwpck_require__(7276)
  ;

// Public API
module.exports = serialOrdered;
// sorting helpers
module.exports.ascending  = ascending;
module.exports.descending = descending;

/**
 * Runs iterator over provided sorted array elements in series
 *
 * @param   {array|object} list - array or object (named list) to iterate over
 * @param   {function} iterator - iterator to run
 * @param   {function} sortMethod - custom sort function
 * @param   {function} callback - invoked when all elements processed
 * @returns {function} - jobs terminator
 */
function serialOrdered(list, iterator, sortMethod, callback)
{
  var state = initState(list, sortMethod);

  iterate(list, iterator, state, function iteratorHandler(error, result)
  {
    if (error)
    {
      callback(error, result);
      return;
    }

    state.index++;

    // are we there yet?
    if (state.index < (state['keyedList'] || list).length)
    {
      iterate(list, iterator, state, iteratorHandler);
      return;
    }

    // done here
    callback(null, state.results);
  });

  return terminator.bind(state, callback);
}

/*
 * -- Sort methods
 */

/**
 * sort helper to sort array elements in ascending order
 *
 * @param   {mixed} a - an item to compare
 * @param   {mixed} b - an item to compare
 * @returns {number} - comparison result
 */
function ascending(a, b)
{
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * sort helper to sort array elements in descending order
 *
 * @param   {mixed} a - an item to compare
 * @param   {mixed} b - an item to compare
 * @returns {number} - comparison result
 */
function descending(a, b)
{
  return -1 * ascending(a, b);
}


/***/ }),

/***/ 7105:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var util = __nccwpck_require__(3837);
var Stream = (__nccwpck_require__(2781).Stream);
var DelayedStream = __nccwpck_require__(7386);

module.exports = CombinedStream;
function CombinedStream() {
  this.writable = false;
  this.readable = true;
  this.dataSize = 0;
  this.maxDataSize = 2 * 1024 * 1024;
  this.pauseStreams = true;

  this._released = false;
  this._streams = [];
  this._currentStream = null;
  this._insideLoop = false;
  this._pendingNext = false;
}
util.inherits(CombinedStream, Stream);

CombinedStream.create = function(options) {
  var combinedStream = new this();

  options = options || {};
  for (var option in options) {
    combinedStream[option] = options[option];
  }

  return combinedStream;
};

CombinedStream.isStreamLike = function(stream) {
  return (typeof stream !== 'function')
    && (typeof stream !== 'string')
    && (typeof stream !== 'boolean')
    && (typeof stream !== 'number')
    && (!Buffer.isBuffer(stream));
};

CombinedStream.prototype.append = function(stream) {
  var isStreamLike = CombinedStream.isStreamLike(stream);

  if (isStreamLike) {
    if (!(stream instanceof DelayedStream)) {
      var newStream = DelayedStream.create(stream, {
        maxDataSize: Infinity,
        pauseStream: this.pauseStreams,
      });
      stream.on('data', this._checkDataSize.bind(this));
      stream = newStream;
    }

    this._handleErrors(stream);

    if (this.pauseStreams) {
      stream.pause();
    }
  }

  this._streams.push(stream);
  return this;
};

CombinedStream.prototype.pipe = function(dest, options) {
  Stream.prototype.pipe.call(this, dest, options);
  this.resume();
  return dest;
};

CombinedStream.prototype._getNext = function() {
  this._currentStream = null;

  if (this._insideLoop) {
    this._pendingNext = true;
    return; // defer call
  }

  this._insideLoop = true;
  try {
    do {
      this._pendingNext = false;
      this._realGetNext();
    } while (this._pendingNext);
  } finally {
    this._insideLoop = false;
  }
};

CombinedStream.prototype._realGetNext = function() {
  var stream = this._streams.shift();


  if (typeof stream == 'undefined') {
    this.end();
    return;
  }

  if (typeof stream !== 'function') {
    this._pipeNext(stream);
    return;
  }

  var getStream = stream;
  getStream(function(stream) {
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      stream.on('data', this._checkDataSize.bind(this));
      this._handleErrors(stream);
    }

    this._pipeNext(stream);
  }.bind(this));
};

CombinedStream.prototype._pipeNext = function(stream) {
  this._currentStream = stream;

  var isStreamLike = CombinedStream.isStreamLike(stream);
  if (isStreamLike) {
    stream.on('end', this._getNext.bind(this));
    stream.pipe(this, {end: false});
    return;
  }

  var value = stream;
  this.write(value);
  this._getNext();
};

CombinedStream.prototype._handleErrors = function(stream) {
  var self = this;
  stream.on('error', function(err) {
    self._emitError(err);
  });
};

CombinedStream.prototype.write = function(data) {
  this.emit('data', data);
};

CombinedStream.prototype.pause = function() {
  if (!this.pauseStreams) {
    return;
  }

  if(this.pauseStreams && this._currentStream && typeof(this._currentStream.pause) == 'function') this._currentStream.pause();
  this.emit('pause');
};

CombinedStream.prototype.resume = function() {
  if (!this._released) {
    this._released = true;
    this.writable = true;
    this._getNext();
  }

  if(this.pauseStreams && this._currentStream && typeof(this._currentStream.resume) == 'function') this._currentStream.resume();
  this.emit('resume');
};

CombinedStream.prototype.end = function() {
  this._reset();
  this.emit('end');
};

CombinedStream.prototype.destroy = function() {
  this._reset();
  this.emit('close');
};

CombinedStream.prototype._reset = function() {
  this.writable = false;
  this._streams = [];
  this._currentStream = null;
};

CombinedStream.prototype._checkDataSize = function() {
  this._updateDataSize();
  if (this.dataSize <= this.maxDataSize) {
    return;
  }

  var message =
    'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
  this._emitError(new Error(message));
};

CombinedStream.prototype._updateDataSize = function() {
  this.dataSize = 0;

  var self = this;
  this._streams.forEach(function(stream) {
    if (!stream.dataSize) {
      return;
    }

    self.dataSize += stream.dataSize;
  });

  if (this._currentStream && this._currentStream.dataSize) {
    this.dataSize += this._currentStream.dataSize;
  }
};

CombinedStream.prototype._emitError = function(err) {
  this._reset();
  this.emit('error', err);
};


/***/ }),

/***/ 7386:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var Stream = (__nccwpck_require__(2781).Stream);
var util = __nccwpck_require__(3837);

module.exports = DelayedStream;
function DelayedStream() {
  this.source = null;
  this.dataSize = 0;
  this.maxDataSize = 1024 * 1024;
  this.pauseStream = true;

  this._maxDataSizeExceeded = false;
  this._released = false;
  this._bufferedEvents = [];
}
util.inherits(DelayedStream, Stream);

DelayedStream.create = function(source, options) {
  var delayedStream = new this();

  options = options || {};
  for (var option in options) {
    delayedStream[option] = options[option];
  }

  delayedStream.source = source;

  var realEmit = source.emit;
  source.emit = function() {
    delayedStream._handleEmit(arguments);
    return realEmit.apply(source, arguments);
  };

  source.on('error', function() {});
  if (delayedStream.pauseStream) {
    source.pause();
  }

  return delayedStream;
};

Object.defineProperty(DelayedStream.prototype, 'readable', {
  configurable: true,
  enumerable: true,
  get: function() {
    return this.source.readable;
  }
});

DelayedStream.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};

DelayedStream.prototype.resume = function() {
  if (!this._released) {
    this.release();
  }

  this.source.resume();
};

DelayedStream.prototype.pause = function() {
  this.source.pause();
};

DelayedStream.prototype.release = function() {
  this._released = true;

  this._bufferedEvents.forEach(function(args) {
    this.emit.apply(this, args);
  }.bind(this));
  this._bufferedEvents = [];
};

DelayedStream.prototype.pipe = function() {
  var r = Stream.prototype.pipe.apply(this, arguments);
  this.resume();
  return r;
};

DelayedStream.prototype._handleEmit = function(args) {
  if (this._released) {
    this.emit.apply(this, args);
    return;
  }

  if (args[0] === 'data') {
    this.dataSize += args[1].length;
    this._checkIfMaxDataSizeExceeded();
  }

  this._bufferedEvents.push(args);
};

DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
  if (this._maxDataSizeExceeded) {
    return;
  }

  if (this.dataSize <= this.maxDataSize) {
    return;
  }

  this._maxDataSizeExceeded = true;
  var message =
    'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.'
  this.emit('error', new Error(message));
};


/***/ }),

/***/ 1285:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var debug;

module.exports = function () {
  if (!debug) {
    try {
      /* eslint global-require: off */
      debug = __nccwpck_require__(9991)("follow-redirects");
    }
    catch (error) { /* */ }
    if (typeof debug !== "function") {
      debug = function () { /* */ };
    }
  }
  debug.apply(null, arguments);
};


/***/ }),

/***/ 2803:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var url = __nccwpck_require__(7310);
var URL = url.URL;
var http = __nccwpck_require__(3685);
var https = __nccwpck_require__(5687);
var Writable = (__nccwpck_require__(2781).Writable);
var assert = __nccwpck_require__(9491);
var debug = __nccwpck_require__(1285);

// Whether to use the native URL object or the legacy url module
var useNativeURL = false;
try {
  assert(new URL());
}
catch (error) {
  useNativeURL = error.code === "ERR_INVALID_URL";
}

// URL fields to preserve in copy operations
var preservedUrlFields = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash",
];

// Create handlers that pass events from native requests
var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
var eventHandlers = Object.create(null);
events.forEach(function (event) {
  eventHandlers[event] = function (arg1, arg2, arg3) {
    this._redirectable.emit(event, arg1, arg2, arg3);
  };
});

// Error types with codes
var InvalidUrlError = createErrorType(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
);
var RedirectionError = createErrorType(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
);
var TooManyRedirectsError = createErrorType(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  RedirectionError
);
var MaxBodyLengthExceededError = createErrorType(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
);
var WriteAfterEndError = createErrorType(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
);

// istanbul ignore next
var destroy = Writable.prototype.destroy || noop;

// An HTTP(S) request that can be redirected
function RedirectableRequest(options, responseCallback) {
  // Initialize the request
  Writable.call(this);
  this._sanitizeOptions(options);
  this._options = options;
  this._ended = false;
  this._ending = false;
  this._redirectCount = 0;
  this._redirects = [];
  this._requestBodyLength = 0;
  this._requestBodyBuffers = [];

  // Attach a callback if passed
  if (responseCallback) {
    this.on("response", responseCallback);
  }

  // React to responses of native requests
  var self = this;
  this._onNativeResponse = function (response) {
    try {
      self._processResponse(response);
    }
    catch (cause) {
      self.emit("error", cause instanceof RedirectionError ?
        cause : new RedirectionError({ cause: cause }));
    }
  };

  // Perform the first request
  this._performRequest();
}
RedirectableRequest.prototype = Object.create(Writable.prototype);

RedirectableRequest.prototype.abort = function () {
  destroyRequest(this._currentRequest);
  this._currentRequest.abort();
  this.emit("abort");
};

RedirectableRequest.prototype.destroy = function (error) {
  destroyRequest(this._currentRequest, error);
  destroy.call(this, error);
  return this;
};

// Writes buffered data to the current native request
RedirectableRequest.prototype.write = function (data, encoding, callback) {
  // Writing is not allowed if end has been called
  if (this._ending) {
    throw new WriteAfterEndError();
  }

  // Validate input and shift parameters if necessary
  if (!isString(data) && !isBuffer(data)) {
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  }
  if (isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }

  // Ignore empty buffers, since writing them doesn't invoke the callback
  // https://github.com/nodejs/node/issues/22066
  if (data.length === 0) {
    if (callback) {
      callback();
    }
    return;
  }
  // Only write when we don't exceed the maximum body length
  if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
    this._requestBodyLength += data.length;
    this._requestBodyBuffers.push({ data: data, encoding: encoding });
    this._currentRequest.write(data, encoding, callback);
  }
  // Error when we exceed the maximum body length
  else {
    this.emit("error", new MaxBodyLengthExceededError());
    this.abort();
  }
};

// Ends the current native request
RedirectableRequest.prototype.end = function (data, encoding, callback) {
  // Shift parameters if necessary
  if (isFunction(data)) {
    callback = data;
    data = encoding = null;
  }
  else if (isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }

  // Write data if needed and end
  if (!data) {
    this._ended = this._ending = true;
    this._currentRequest.end(null, null, callback);
  }
  else {
    var self = this;
    var currentRequest = this._currentRequest;
    this.write(data, encoding, function () {
      self._ended = true;
      currentRequest.end(null, null, callback);
    });
    this._ending = true;
  }
};

// Sets a header value on the current native request
RedirectableRequest.prototype.setHeader = function (name, value) {
  this._options.headers[name] = value;
  this._currentRequest.setHeader(name, value);
};

// Clears a header value on the current native request
RedirectableRequest.prototype.removeHeader = function (name) {
  delete this._options.headers[name];
  this._currentRequest.removeHeader(name);
};

// Global timeout for all underlying requests
RedirectableRequest.prototype.setTimeout = function (msecs, callback) {
  var self = this;

  // Destroys the socket on timeout
  function destroyOnTimeout(socket) {
    socket.setTimeout(msecs);
    socket.removeListener("timeout", socket.destroy);
    socket.addListener("timeout", socket.destroy);
  }

  // Sets up a timer to trigger a timeout event
  function startTimer(socket) {
    if (self._timeout) {
      clearTimeout(self._timeout);
    }
    self._timeout = setTimeout(function () {
      self.emit("timeout");
      clearTimer();
    }, msecs);
    destroyOnTimeout(socket);
  }

  // Stops a timeout from triggering
  function clearTimer() {
    // Clear the timeout
    if (self._timeout) {
      clearTimeout(self._timeout);
      self._timeout = null;
    }

    // Clean up all attached listeners
    self.removeListener("abort", clearTimer);
    self.removeListener("error", clearTimer);
    self.removeListener("response", clearTimer);
    self.removeListener("close", clearTimer);
    if (callback) {
      self.removeListener("timeout", callback);
    }
    if (!self.socket) {
      self._currentRequest.removeListener("socket", startTimer);
    }
  }

  // Attach callback if passed
  if (callback) {
    this.on("timeout", callback);
  }

  // Start the timer if or when the socket is opened
  if (this.socket) {
    startTimer(this.socket);
  }
  else {
    this._currentRequest.once("socket", startTimer);
  }

  // Clean up on events
  this.on("socket", destroyOnTimeout);
  this.on("abort", clearTimer);
  this.on("error", clearTimer);
  this.on("response", clearTimer);
  this.on("close", clearTimer);

  return this;
};

// Proxy all other public ClientRequest methods
[
  "flushHeaders", "getHeader",
  "setNoDelay", "setSocketKeepAlive",
].forEach(function (method) {
  RedirectableRequest.prototype[method] = function (a, b) {
    return this._currentRequest[method](a, b);
  };
});

// Proxy all public ClientRequest properties
["aborted", "connection", "socket"].forEach(function (property) {
  Object.defineProperty(RedirectableRequest.prototype, property, {
    get: function () { return this._currentRequest[property]; },
  });
});

RedirectableRequest.prototype._sanitizeOptions = function (options) {
  // Ensure headers are always present
  if (!options.headers) {
    options.headers = {};
  }

  // Since http.request treats host as an alias of hostname,
  // but the url module interprets host as hostname plus port,
  // eliminate the host property to avoid confusion.
  if (options.host) {
    // Use hostname if set, because it has precedence
    if (!options.hostname) {
      options.hostname = options.host;
    }
    delete options.host;
  }

  // Complete the URL object when necessary
  if (!options.pathname && options.path) {
    var searchPos = options.path.indexOf("?");
    if (searchPos < 0) {
      options.pathname = options.path;
    }
    else {
      options.pathname = options.path.substring(0, searchPos);
      options.search = options.path.substring(searchPos);
    }
  }
};


// Executes the next native request (initial or redirect)
RedirectableRequest.prototype._performRequest = function () {
  // Load the native protocol
  var protocol = this._options.protocol;
  var nativeProtocol = this._options.nativeProtocols[protocol];
  if (!nativeProtocol) {
    throw new TypeError("Unsupported protocol " + protocol);
  }

  // If specified, use the agent corresponding to the protocol
  // (HTTP and HTTPS use different types of agents)
  if (this._options.agents) {
    var scheme = protocol.slice(0, -1);
    this._options.agent = this._options.agents[scheme];
  }

  // Create the native request and set up its event handlers
  var request = this._currentRequest =
        nativeProtocol.request(this._options, this._onNativeResponse);
  request._redirectable = this;
  for (var event of events) {
    request.on(event, eventHandlers[event]);
  }

  // RFC7230§5.3.1: When making a request directly to an origin server, […]
  // a client MUST send only the absolute path […] as the request-target.
  this._currentUrl = /^\//.test(this._options.path) ?
    url.format(this._options) :
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path;

  // End a redirected request
  // (The first request must be ended explicitly with RedirectableRequest#end)
  if (this._isRedirect) {
    // Write the request entity and end
    var i = 0;
    var self = this;
    var buffers = this._requestBodyBuffers;
    (function writeNext(error) {
      // Only write if this request has not been redirected yet
      /* istanbul ignore else */
      if (request === self._currentRequest) {
        // Report any write errors
        /* istanbul ignore if */
        if (error) {
          self.emit("error", error);
        }
        // Write the next buffer if there are still left
        else if (i < buffers.length) {
          var buffer = buffers[i++];
          /* istanbul ignore else */
          if (!request.finished) {
            request.write(buffer.data, buffer.encoding, writeNext);
          }
        }
        // End the request if `end` has been called on us
        else if (self._ended) {
          request.end();
        }
      }
    }());
  }
};

// Processes a response from the current native request
RedirectableRequest.prototype._processResponse = function (response) {
  // Store the redirected response
  var statusCode = response.statusCode;
  if (this._options.trackRedirects) {
    this._redirects.push({
      url: this._currentUrl,
      headers: response.headers,
      statusCode: statusCode,
    });
  }

  // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
  // that further action needs to be taken by the user agent in order to
  // fulfill the request. If a Location header field is provided,
  // the user agent MAY automatically redirect its request to the URI
  // referenced by the Location field value,
  // even if the specific status code is not understood.

  // If the response is not a redirect; return it as-is
  var location = response.headers.location;
  if (!location || this._options.followRedirects === false ||
      statusCode < 300 || statusCode >= 400) {
    response.responseUrl = this._currentUrl;
    response.redirects = this._redirects;
    this.emit("response", response);

    // Clean up
    this._requestBodyBuffers = [];
    return;
  }

  // The response is a redirect, so abort the current request
  destroyRequest(this._currentRequest);
  // Discard the remainder of the response to avoid waiting for data
  response.destroy();

  // RFC7231§6.4: A client SHOULD detect and intervene
  // in cyclical redirections (i.e., "infinite" redirection loops).
  if (++this._redirectCount > this._options.maxRedirects) {
    throw new TooManyRedirectsError();
  }

  // Store the request headers if applicable
  var requestHeaders;
  var beforeRedirect = this._options.beforeRedirect;
  if (beforeRedirect) {
    requestHeaders = Object.assign({
      // The Host header was set by nativeProtocol.request
      Host: response.req.getHeader("host"),
    }, this._options.headers);
  }

  // RFC7231§6.4: Automatic redirection needs to done with
  // care for methods not known to be safe, […]
  // RFC7231§6.4.2–3: For historical reasons, a user agent MAY change
  // the request method from POST to GET for the subsequent request.
  var method = this._options.method;
  if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" ||
      // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      (statusCode === 303) && !/^(?:GET|HEAD)$/.test(this._options.method)) {
    this._options.method = "GET";
    // Drop a possible entity and headers related to it
    this._requestBodyBuffers = [];
    removeMatchingHeaders(/^content-/i, this._options.headers);
  }

  // Drop the Host header, as the redirect might lead to a different host
  var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);

  // If the redirect is relative, carry over the host of the last request
  var currentUrlParts = parseUrl(this._currentUrl);
  var currentHost = currentHostHeader || currentUrlParts.host;
  var currentUrl = /^\w+:/.test(location) ? this._currentUrl :
    url.format(Object.assign(currentUrlParts, { host: currentHost }));

  // Create the redirected request
  var redirectUrl = resolveUrl(location, currentUrl);
  debug("redirecting to", redirectUrl.href);
  this._isRedirect = true;
  spreadUrlObject(redirectUrl, this._options);

  // Drop confidential headers when redirecting to a less secure protocol
  // or to a different domain that is not a superdomain
  if (redirectUrl.protocol !== currentUrlParts.protocol &&
     redirectUrl.protocol !== "https:" ||
     redirectUrl.host !== currentHost &&
     !isSubdomain(redirectUrl.host, currentHost)) {
    removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
  }

  // Evaluate the beforeRedirect callback
  if (isFunction(beforeRedirect)) {
    var responseDetails = {
      headers: response.headers,
      statusCode: statusCode,
    };
    var requestDetails = {
      url: currentUrl,
      method: method,
      headers: requestHeaders,
    };
    beforeRedirect(this._options, responseDetails, requestDetails);
    this._sanitizeOptions(this._options);
  }

  // Perform the redirected request
  this._performRequest();
};

// Wraps the key/value object of protocols with redirect functionality
function wrap(protocols) {
  // Default settings
  var exports = {
    maxRedirects: 21,
    maxBodyLength: 10 * 1024 * 1024,
  };

  // Wrap each protocol
  var nativeProtocols = {};
  Object.keys(protocols).forEach(function (scheme) {
    var protocol = scheme + ":";
    var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
    var wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);

    // Executes a request, following redirects
    function request(input, options, callback) {
      // Parse parameters, ensuring that input is an object
      if (isURL(input)) {
        input = spreadUrlObject(input);
      }
      else if (isString(input)) {
        input = spreadUrlObject(parseUrl(input));
      }
      else {
        callback = options;
        options = validateUrl(input);
        input = { protocol: protocol };
      }
      if (isFunction(options)) {
        callback = options;
        options = null;
      }

      // Set defaults
      options = Object.assign({
        maxRedirects: exports.maxRedirects,
        maxBodyLength: exports.maxBodyLength,
      }, input, options);
      options.nativeProtocols = nativeProtocols;
      if (!isString(options.host) && !isString(options.hostname)) {
        options.hostname = "::1";
      }

      assert.equal(options.protocol, protocol, "protocol mismatch");
      debug("options", options);
      return new RedirectableRequest(options, callback);
    }

    // Executes a GET request, following redirects
    function get(input, options, callback) {
      var wrappedRequest = wrappedProtocol.request(input, options, callback);
      wrappedRequest.end();
      return wrappedRequest;
    }

    // Expose the properties on the wrapped protocol
    Object.defineProperties(wrappedProtocol, {
      request: { value: request, configurable: true, enumerable: true, writable: true },
      get: { value: get, configurable: true, enumerable: true, writable: true },
    });
  });
  return exports;
}

function noop() { /* empty */ }

function parseUrl(input) {
  var parsed;
  /* istanbul ignore else */
  if (useNativeURL) {
    parsed = new URL(input);
  }
  else {
    // Ensure the URL is valid and absolute
    parsed = validateUrl(url.parse(input));
    if (!isString(parsed.protocol)) {
      throw new InvalidUrlError({ input });
    }
  }
  return parsed;
}

function resolveUrl(relative, base) {
  /* istanbul ignore next */
  return useNativeURL ? new URL(relative, base) : parseUrl(url.resolve(base, relative));
}

function validateUrl(input) {
  if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
    throw new InvalidUrlError({ input: input.href || input });
  }
  if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
    throw new InvalidUrlError({ input: input.href || input });
  }
  return input;
}

function spreadUrlObject(urlObject, target) {
  var spread = target || {};
  for (var key of preservedUrlFields) {
    spread[key] = urlObject[key];
  }

  // Fix IPv6 hostname
  if (spread.hostname.startsWith("[")) {
    spread.hostname = spread.hostname.slice(1, -1);
  }
  // Ensure port is a number
  if (spread.port !== "") {
    spread.port = Number(spread.port);
  }
  // Concatenate path
  spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;

  return spread;
}

function removeMatchingHeaders(regex, headers) {
  var lastValue;
  for (var header in headers) {
    if (regex.test(header)) {
      lastValue = headers[header];
      delete headers[header];
    }
  }
  return (lastValue === null || typeof lastValue === "undefined") ?
    undefined : String(lastValue).trim();
}

function createErrorType(code, message, baseClass) {
  // Create constructor
  function CustomError(properties) {
    Error.captureStackTrace(this, this.constructor);
    Object.assign(this, properties || {});
    this.code = code;
    this.message = this.cause ? message + ": " + this.cause.message : message;
  }

  // Attach constructor and set default properties
  CustomError.prototype = new (baseClass || Error)();
  Object.defineProperties(CustomError.prototype, {
    constructor: {
      value: CustomError,
      enumerable: false,
    },
    name: {
      value: "Error [" + code + "]",
      enumerable: false,
    },
  });
  return CustomError;
}

function destroyRequest(request, error) {
  for (var event of events) {
    request.removeListener(event, eventHandlers[event]);
  }
  request.on("error", noop);
  request.destroy(error);
}

function isSubdomain(subdomain, domain) {
  assert(isString(subdomain) && isString(domain));
  var dot = subdomain.length - domain.length - 1;
  return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
}

function isString(value) {
  return typeof value === "string" || value instanceof String;
}

function isFunction(value) {
  return typeof value === "function";
}

function isBuffer(value) {
  return typeof value === "object" && ("length" in value);
}

function isURL(value) {
  return URL && value instanceof URL;
}

// Exports
module.exports = wrap({ http: http, https: https });
module.exports.wrap = wrap;


/***/ }),

/***/ 5676:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var CombinedStream = __nccwpck_require__(7105);
var util = __nccwpck_require__(3837);
var path = __nccwpck_require__(1017);
var http = __nccwpck_require__(3685);
var https = __nccwpck_require__(5687);
var parseUrl = (__nccwpck_require__(7310).parse);
var fs = __nccwpck_require__(7147);
var Stream = (__nccwpck_require__(2781).Stream);
var mime = __nccwpck_require__(6032);
var asynckit = __nccwpck_require__(785);
var populate = __nccwpck_require__(3978);

// Public API
module.exports = FormData;

// make it a Stream
util.inherits(FormData, CombinedStream);

/**
 * Create readable "multipart/form-data" streams.
 * Can be used to submit forms
 * and file uploads to other web applications.
 *
 * @constructor
 * @param {Object} options - Properties to be added/overriden for FormData and CombinedStream
 */
function FormData(options) {
  if (!(this instanceof FormData)) {
    return new FormData(options);
  }

  this._overheadLength = 0;
  this._valueLength = 0;
  this._valuesToMeasure = [];

  CombinedStream.call(this);

  options = options || {};
  for (var option in options) {
    this[option] = options[option];
  }
}

FormData.LINE_BREAK = '\r\n';
FormData.DEFAULT_CONTENT_TYPE = 'application/octet-stream';

FormData.prototype.append = function(field, value, options) {

  options = options || {};

  // allow filename as single option
  if (typeof options == 'string') {
    options = {filename: options};
  }

  var append = CombinedStream.prototype.append.bind(this);

  // all that streamy business can't handle numbers
  if (typeof value == 'number') {
    value = '' + value;
  }

  // https://github.com/felixge/node-form-data/issues/38
  if (util.isArray(value)) {
    // Please convert your array into string
    // the way web server expects it
    this._error(new Error('Arrays are not supported.'));
    return;
  }

  var header = this._multiPartHeader(field, value, options);
  var footer = this._multiPartFooter();

  append(header);
  append(value);
  append(footer);

  // pass along options.knownLength
  this._trackLength(header, value, options);
};

FormData.prototype._trackLength = function(header, value, options) {
  var valueLength = 0;

  // used w/ getLengthSync(), when length is known.
  // e.g. for streaming directly from a remote server,
  // w/ a known file a size, and not wanting to wait for
  // incoming file to finish to get its size.
  if (options.knownLength != null) {
    valueLength += +options.knownLength;
  } else if (Buffer.isBuffer(value)) {
    valueLength = value.length;
  } else if (typeof value === 'string') {
    valueLength = Buffer.byteLength(value);
  }

  this._valueLength += valueLength;

  // @check why add CRLF? does this account for custom/multiple CRLFs?
  this._overheadLength +=
    Buffer.byteLength(header) +
    FormData.LINE_BREAK.length;

  // empty or either doesn't have path or not an http response or not a stream
  if (!value || ( !value.path && !(value.readable && value.hasOwnProperty('httpVersion')) && !(value instanceof Stream))) {
    return;
  }

  // no need to bother with the length
  if (!options.knownLength) {
    this._valuesToMeasure.push(value);
  }
};

FormData.prototype._lengthRetriever = function(value, callback) {

  if (value.hasOwnProperty('fd')) {

    // take read range into a account
    // `end` = Infinity –> read file till the end
    //
    // TODO: Looks like there is bug in Node fs.createReadStream
    // it doesn't respect `end` options without `start` options
    // Fix it when node fixes it.
    // https://github.com/joyent/node/issues/7819
    if (value.end != undefined && value.end != Infinity && value.start != undefined) {

      // when end specified
      // no need to calculate range
      // inclusive, starts with 0
      callback(null, value.end + 1 - (value.start ? value.start : 0));

    // not that fast snoopy
    } else {
      // still need to fetch file size from fs
      fs.stat(value.path, function(err, stat) {

        var fileSize;

        if (err) {
          callback(err);
          return;
        }

        // update final size based on the range options
        fileSize = stat.size - (value.start ? value.start : 0);
        callback(null, fileSize);
      });
    }

  // or http response
  } else if (value.hasOwnProperty('httpVersion')) {
    callback(null, +value.headers['content-length']);

  // or request stream http://github.com/mikeal/request
  } else if (value.hasOwnProperty('httpModule')) {
    // wait till response come back
    value.on('response', function(response) {
      value.pause();
      callback(null, +response.headers['content-length']);
    });
    value.resume();

  // something else
  } else {
    callback('Unknown stream');
  }
};

FormData.prototype._multiPartHeader = function(field, value, options) {
  // custom header specified (as string)?
  // it becomes responsible for boundary
  // (e.g. to handle extra CRLFs on .NET servers)
  if (typeof options.header == 'string') {
    return options.header;
  }

  var contentDisposition = this._getContentDisposition(value, options);
  var contentType = this._getContentType(value, options);

  var contents = '';
  var headers  = {
    // add custom disposition as third element or keep it two elements if not
    'Content-Disposition': ['form-data', 'name="' + field + '"'].concat(contentDisposition || []),
    // if no content type. allow it to be empty array
    'Content-Type': [].concat(contentType || [])
  };

  // allow custom headers.
  if (typeof options.header == 'object') {
    populate(headers, options.header);
  }

  var header;
  for (var prop in headers) {
    if (!headers.hasOwnProperty(prop)) continue;
    header = headers[prop];

    // skip nullish headers.
    if (header == null) {
      continue;
    }

    // convert all headers to arrays.
    if (!Array.isArray(header)) {
      header = [header];
    }

    // add non-empty headers.
    if (header.length) {
      contents += prop + ': ' + header.join('; ') + FormData.LINE_BREAK;
    }
  }

  return '--' + this.getBoundary() + FormData.LINE_BREAK + contents + FormData.LINE_BREAK;
};

FormData.prototype._getContentDisposition = function(value, options) {

  var filename
    , contentDisposition
    ;

  if (typeof options.filepath === 'string') {
    // custom filepath for relative paths
    filename = path.normalize(options.filepath).replace(/\\/g, '/');
  } else if (options.filename || value.name || value.path) {
    // custom filename take precedence
    // formidable and the browser add a name property
    // fs- and request- streams have path property
    filename = path.basename(options.filename || value.name || value.path);
  } else if (value.readable && value.hasOwnProperty('httpVersion')) {
    // or try http response
    filename = path.basename(value.client._httpMessage.path || '');
  }

  if (filename) {
    contentDisposition = 'filename="' + filename + '"';
  }

  return contentDisposition;
};

FormData.prototype._getContentType = function(value, options) {

  // use custom content-type above all
  var contentType = options.contentType;

  // or try `name` from formidable, browser
  if (!contentType && value.name) {
    contentType = mime.lookup(value.name);
  }

  // or try `path` from fs-, request- streams
  if (!contentType && value.path) {
    contentType = mime.lookup(value.path);
  }

  // or if it's http-reponse
  if (!contentType && value.readable && value.hasOwnProperty('httpVersion')) {
    contentType = value.headers['content-type'];
  }

  // or guess it from the filepath or filename
  if (!contentType && (options.filepath || options.filename)) {
    contentType = mime.lookup(options.filepath || options.filename);
  }

  // fallback to the default content type if `value` is not simple value
  if (!contentType && typeof value == 'object') {
    contentType = FormData.DEFAULT_CONTENT_TYPE;
  }

  return contentType;
};

FormData.prototype._multiPartFooter = function() {
  return function(next) {
    var footer = FormData.LINE_BREAK;

    var lastPart = (this._streams.length === 0);
    if (lastPart) {
      footer += this._lastBoundary();
    }

    next(footer);
  }.bind(this);
};

FormData.prototype._lastBoundary = function() {
  return '--' + this.getBoundary() + '--' + FormData.LINE_BREAK;
};

FormData.prototype.getHeaders = function(userHeaders) {
  var header;
  var formHeaders = {
    'content-type': 'multipart/form-data; boundary=' + this.getBoundary()
  };

  for (header in userHeaders) {
    if (userHeaders.hasOwnProperty(header)) {
      formHeaders[header.toLowerCase()] = userHeaders[header];
    }
  }

  return formHeaders;
};

FormData.prototype.setBoundary = function(boundary) {
  this._boundary = boundary;
};

FormData.prototype.getBoundary = function() {
  if (!this._boundary) {
    this._generateBoundary();
  }

  return this._boundary;
};

FormData.prototype.getBuffer = function() {
  var dataBuffer = new Buffer.alloc( 0 );
  var boundary = this.getBoundary();

  // Create the form content. Add Line breaks to the end of data.
  for (var i = 0, len = this._streams.length; i < len; i++) {
    if (typeof this._streams[i] !== 'function') {

      // Add content to the buffer.
      if(Buffer.isBuffer(this._streams[i])) {
        dataBuffer = Buffer.concat( [dataBuffer, this._streams[i]]);
      }else {
        dataBuffer = Buffer.concat( [dataBuffer, Buffer.from(this._streams[i])]);
      }

      // Add break after content.
      if (typeof this._streams[i] !== 'string' || this._streams[i].substring( 2, boundary.length + 2 ) !== boundary) {
        dataBuffer = Buffer.concat( [dataBuffer, Buffer.from(FormData.LINE_BREAK)] );
      }
    }
  }

  // Add the footer and return the Buffer object.
  return Buffer.concat( [dataBuffer, Buffer.from(this._lastBoundary())] );
};

FormData.prototype._generateBoundary = function() {
  // This generates a 50 character boundary similar to those used by Firefox.
  // They are optimized for boyer-moore parsing.
  var boundary = '--------------------------';
  for (var i = 0; i < 24; i++) {
    boundary += Math.floor(Math.random() * 10).toString(16);
  }

  this._boundary = boundary;
};

// Note: getLengthSync DOESN'T calculate streams length
// As workaround one can calculate file size manually
// and add it as knownLength option
FormData.prototype.getLengthSync = function() {
  var knownLength = this._overheadLength + this._valueLength;

  // Don't get confused, there are 3 "internal" streams for each keyval pair
  // so it basically checks if there is any value added to the form
  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }

  // https://github.com/form-data/form-data/issues/40
  if (!this.hasKnownLength()) {
    // Some async length retrievers are present
    // therefore synchronous length calculation is false.
    // Please use getLength(callback) to get proper length
    this._error(new Error('Cannot calculate proper length in synchronous way.'));
  }

  return knownLength;
};

// Public API to check if length of added values is known
// https://github.com/form-data/form-data/issues/196
// https://github.com/form-data/form-data/issues/262
FormData.prototype.hasKnownLength = function() {
  var hasKnownLength = true;

  if (this._valuesToMeasure.length) {
    hasKnownLength = false;
  }

  return hasKnownLength;
};

FormData.prototype.getLength = function(cb) {
  var knownLength = this._overheadLength + this._valueLength;

  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }

  if (!this._valuesToMeasure.length) {
    process.nextTick(cb.bind(this, null, knownLength));
    return;
  }

  asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
    if (err) {
      cb(err);
      return;
    }

    values.forEach(function(length) {
      knownLength += length;
    });

    cb(null, knownLength);
  });
};

FormData.prototype.submit = function(params, cb) {
  var request
    , options
    , defaults = {method: 'post'}
    ;

  // parse provided url if it's string
  // or treat it as options object
  if (typeof params == 'string') {

    params = parseUrl(params);
    options = populate({
      port: params.port,
      path: params.pathname,
      host: params.hostname,
      protocol: params.protocol
    }, defaults);

  // use custom params
  } else {

    options = populate(params, defaults);
    // if no port provided use default one
    if (!options.port) {
      options.port = options.protocol == 'https:' ? 443 : 80;
    }
  }

  // put that good code in getHeaders to some use
  options.headers = this.getHeaders(params.headers);

  // https if specified, fallback to http in any other case
  if (options.protocol == 'https:') {
    request = https.request(options);
  } else {
    request = http.request(options);
  }

  // get content length and fire away
  this.getLength(function(err, length) {
    if (err && err !== 'Unknown stream') {
      this._error(err);
      return;
    }

    // add content length
    if (length) {
      request.setHeader('Content-Length', length);
    }

    this.pipe(request);
    if (cb) {
      var onResponse;

      var callback = function (error, responce) {
        request.removeListener('error', callback);
        request.removeListener('response', onResponse);

        return cb.call(this, error, responce);
      };

      onResponse = callback.bind(this, null);

      request.on('error', callback);
      request.on('response', onResponse);
    }
  }.bind(this));

  return request;
};

FormData.prototype._error = function(err) {
  if (!this.error) {
    this.error = err;
    this.pause();
    this.emit('error', err);
  }
};

FormData.prototype.toString = function () {
  return '[object FormData]';
};


/***/ }),

/***/ 3978:
/***/ ((module) => {

// populates missing values
module.exports = function(dst, src) {

  Object.keys(src).forEach(function(prop)
  {
    dst[prop] = dst[prop] || src[prop];
  });

  return dst;
};


/***/ }),

/***/ 4454:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = __nccwpck_require__(3765)


/***/ }),

/***/ 6032:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var db = __nccwpck_require__(4454)
var extname = (__nccwpck_require__(1017).extname)

/**
 * Module variables.
 * @private
 */

var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/
var TEXT_TYPE_REGEXP = /^text\//i

/**
 * Module exports.
 * @public
 */

exports.charset = charset
exports.charsets = { lookup: charset }
exports.contentType = contentType
exports.extension = extension
exports.extensions = Object.create(null)
exports.lookup = lookup
exports.types = Object.create(null)

// Populate the extensions/types maps
populateMaps(exports.extensions, exports.types)

/**
 * Get the default charset for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function charset (type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = EXTRACT_TYPE_REGEXP.exec(type)
  var mime = match && db[match[1].toLowerCase()]

  if (mime && mime.charset) {
    return mime.charset
  }

  // default text/* to utf-8
  if (match && TEXT_TYPE_REGEXP.test(match[1])) {
    return 'UTF-8'
  }

  return false
}

/**
 * Create a full Content-Type header given a MIME type or extension.
 *
 * @param {string} str
 * @return {boolean|string}
 */

function contentType (str) {
  // TODO: should this even be in this module?
  if (!str || typeof str !== 'string') {
    return false
  }

  var mime = str.indexOf('/') === -1
    ? exports.lookup(str)
    : str

  if (!mime) {
    return false
  }

  // TODO: use content-type or other module
  if (mime.indexOf('charset') === -1) {
    var charset = exports.charset(mime)
    if (charset) mime += '; charset=' + charset.toLowerCase()
  }

  return mime
}

/**
 * Get the default extension for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function extension (type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = EXTRACT_TYPE_REGEXP.exec(type)

  // get extensions
  var exts = match && exports.extensions[match[1].toLowerCase()]

  if (!exts || !exts.length) {
    return false
  }

  return exts[0]
}

/**
 * Lookup the MIME type for a file path/extension.
 *
 * @param {string} path
 * @return {boolean|string}
 */

function lookup (path) {
  if (!path || typeof path !== 'string') {
    return false
  }

  // get the extension ("ext" or ".ext" or full path)
  var extension = extname('x.' + path)
    .toLowerCase()
    .substr(1)

  if (!extension) {
    return false
  }

  return exports.types[extension] || false
}

/**
 * Populate the extensions and types maps.
 * @private
 */

function populateMaps (extensions, types) {
  // source preference (least -> most)
  var preference = ['nginx', 'apache', undefined, 'iana']

  Object.keys(db).forEach(function forEachMimeType (type) {
    var mime = db[type]
    var exts = mime.extensions

    if (!exts || !exts.length) {
      return
    }

    // mime -> extensions
    extensions[type] = exts

    // extension -> mime
    for (var i = 0; i < exts.length; i++) {
      var extension = exts[i]

      if (types[extension]) {
        var from = preference.indexOf(db[types[extension]].source)
        var to = preference.indexOf(mime.source)

        if (types[extension] !== 'application/octet-stream' &&
          (from > to || (from === to && types[extension].substr(0, 12) === 'application/'))) {
          // skip the remapping
          continue
        }
      }

      // set the extension -> mime
      types[extension] = type
    }
  })
}


/***/ }),

/***/ 7229:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


var parseUrl = (__nccwpck_require__(7310).parse);

var DEFAULT_PORTS = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
};

var stringEndsWith = String.prototype.endsWith || function(s) {
  return s.length <= this.length &&
    this.indexOf(s, this.length - s.length) !== -1;
};

/**
 * @param {string|object} url - The URL, or the result from url.parse.
 * @return {string} The URL of the proxy that should handle the request to the
 *  given URL. If no proxy is set, this will be an empty string.
 */
function getProxyForUrl(url) {
  var parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {};
  var proto = parsedUrl.protocol;
  var hostname = parsedUrl.host;
  var port = parsedUrl.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return '';  // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
  if (!shouldProxy(hostname, port)) {
    return '';  // Don't proxy URLs that match NO_PROXY.
  }

  var proxy =
    getEnv('npm_config_' + proto + '_proxy') ||
    getEnv(proto + '_proxy') ||
    getEnv('npm_config_proxy') ||
    getEnv('all_proxy');
  if (proxy && proxy.indexOf('://') === -1) {
    // Missing scheme in proxy, default to the requested URL's scheme.
    proxy = proto + '://' + proxy;
  }
  return proxy;
}

/**
 * Determines whether a given URL should be proxied.
 *
 * @param {string} hostname - The host name of the URL.
 * @param {number} port - The effective port of the URL.
 * @returns {boolean} Whether the given URL should be proxied.
 * @private
 */
function shouldProxy(hostname, port) {
  var NO_PROXY =
    (getEnv('npm_config_no_proxy') || getEnv('no_proxy')).toLowerCase();
  if (!NO_PROXY) {
    return true;  // Always proxy if NO_PROXY is not set.
  }
  if (NO_PROXY === '*') {
    return false;  // Never proxy if wildcard is set.
  }

  return NO_PROXY.split(/[,\s]/).every(function(proxy) {
    if (!proxy) {
      return true;  // Skip zero-length hosts.
    }
    var parsedProxy = proxy.match(/^(.+):(\d+)$/);
    var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;  // Skip if ports don't match.
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      // No wildcards, so stop proxying if there is an exact match.
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === '*') {
      // Remove leading wildcard.
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    // Stop proxying if the hostname ends with the no_proxy host.
    return !stringEndsWith.call(hostname, parsedProxyHostname);
  });
}

/**
 * Get the value for an environment variable.
 *
 * @param {string} key - The name of the environment variable.
 * @return {string} The value of the environment variable.
 * @private
 */
function getEnv(key) {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || '';
}

exports.getProxyForUrl = getProxyForUrl;


/***/ }),

/***/ 9676:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// audio.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 16. audio
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function parseAudioType(str, input, output) {
  str = str.toLowerCase();
  let result = '';

  if (str.indexOf('input') >= 0) { result = 'Microphone'; }
  if (str.indexOf('display audio') >= 0) { result = 'Speaker'; }
  if (str.indexOf('speak') >= 0) { result = 'Speaker'; }
  if (str.indexOf('laut') >= 0) { result = 'Speaker'; }
  if (str.indexOf('loud') >= 0) { result = 'Speaker'; }
  if (str.indexOf('head') >= 0) { result = 'Headset'; }
  if (str.indexOf('mic') >= 0) { result = 'Microphone'; }
  if (str.indexOf('mikr') >= 0) { result = 'Microphone'; }
  if (str.indexOf('phone') >= 0) { result = 'Phone'; }
  if (str.indexOf('controll') >= 0) { result = 'Controller'; }
  if (str.indexOf('line o') >= 0) { result = 'Line Out'; }
  if (str.indexOf('digital o') >= 0) { result = 'Digital Out'; }
  if (str.indexOf('smart sound technology') >= 0) { result = 'Digital Signal Processor'; }
  if (str.indexOf('high definition audio') >= 0) { result = 'Sound Driver'; }

  if (!result && output) {
    result = 'Speaker';
  } else if (!result && input) {
    result = 'Microphone';
  }
  return result;
}


function getLinuxAudioPci() {
  let cmd = 'lspci -v 2>/dev/null';
  let result = [];
  try {
    const parts = execSync(cmd).toString().split('\n\n');
    parts.forEach(element => {
      const lines = element.split('\n');
      if (lines && lines.length && lines[0].toLowerCase().indexOf('audio') >= 0) {
        const audio = {};
        audio.slotId = lines[0].split(' ')[0];
        audio.driver = util.getValue(lines, 'Kernel driver in use', ':', true) || util.getValue(lines, 'Kernel modules', ':', true);
        result.push(audio);
      }
    });
    return result;
  } catch (e) {
    return result;
  }
}

function parseLinuxAudioPciMM(lines, audioPCI) {
  const result = {};
  const slotId = util.getValue(lines, 'Slot');

  const pciMatch = audioPCI.filter(function (item) { return item.slotId === slotId; });

  result.id = slotId;
  result.name = util.getValue(lines, 'SDevice');
  result.manufacturer = util.getValue(lines, 'SVendor');
  result.revision = util.getValue(lines, 'Rev');
  result.driver = pciMatch && pciMatch.length === 1 && pciMatch[0].driver ? pciMatch[0].driver : '';
  result.default = null;
  result.channel = 'PCIe';
  result.type = parseAudioType(result.name, null, null);
  result.in = null;
  result.out = null;
  result.status = 'online';

  return result;
}

function parseDarwinChannel(str) {
  let result = '';

  if (str.indexOf('builtin') >= 0) { result = 'Built-In'; }
  if (str.indexOf('extern') >= 0) { result = 'Audio-Jack'; }
  if (str.indexOf('hdmi') >= 0) { result = 'HDMI'; }
  if (str.indexOf('displayport') >= 0) { result = 'Display-Port'; }
  if (str.indexOf('usb') >= 0) { result = 'USB'; }
  if (str.indexOf('pci') >= 0) { result = 'PCIe'; }

  return result;
}

function parseDarwinAudio(audioObject, id) {
  const result = {};
  const channelStr = ((audioObject.coreaudio_device_transport || '') + ' ' + (audioObject._name || '')).toLowerCase();

  result.id = id;
  result.name = audioObject._name;
  result.manufacturer = audioObject.coreaudio_device_manufacturer;
  result.revision = null;
  result.driver = null;
  result.default = !!(audioObject.coreaudio_default_audio_input_device || '') || !!(audioObject.coreaudio_default_audio_output_device || '');
  result.channel = parseDarwinChannel(channelStr);
  result.type = parseAudioType(result.name, !!(audioObject.coreaudio_device_input || ''), !!(audioObject.coreaudio_device_output || ''));
  result.in = !!(audioObject.coreaudio_device_input || '');
  result.out = !!(audioObject.coreaudio_device_output || '');
  result.status = 'online';

  return result;
}

function parseWindowsAudio(lines) {
  const result = {};
  const status = util.getValue(lines, 'StatusInfo', ':');

  result.id = util.getValue(lines, 'DeviceID', ':'); // PNPDeviceID??
  result.name = util.getValue(lines, 'name', ':');
  result.manufacturer = util.getValue(lines, 'manufacturer', ':');
  result.revision = null;
  result.driver = null;
  result.default = null;
  result.channel = null;
  result.type = parseAudioType(result.name, null, null);
  result.in = null;
  result.out = null;
  result.status = status;

  return result;
}

function audio(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux || _freebsd || _openbsd || _netbsd) {
        let cmd = 'lspci -vmm 2>/dev/null';
        exec(cmd, function (error, stdout) {
          // PCI
          if (!error) {
            const audioPCI = getLinuxAudioPci();
            const parts = stdout.toString().split('\n\n');
            parts.forEach(element => {
              const lines = element.split('\n');
              if (util.getValue(lines, 'class', ':', true).toLowerCase().indexOf('audio') >= 0) {
                const audio = parseLinuxAudioPciMM(lines, audioPCI);
                result.push(audio);
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin) {
        let cmd = 'system_profiler SPAudioDataType -json';
        exec(cmd, function (error, stdout) {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPAudioDataType && outObj.SPAudioDataType.length && outObj.SPAudioDataType[0] && outObj.SPAudioDataType[0]['_items'] && outObj.SPAudioDataType[0]['_items'].length) {
                for (let i = 0; i < outObj.SPAudioDataType[0]['_items'].length; i++) {
                  const audio = parseDarwinAudio(outObj.SPAudioDataType[0]['_items'][i], i);
                  result.push(audio);
                }
              }
            } catch (e) {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        util.powerShell('Get-CimInstance Win32_SoundDevice | select DeviceID,StatusInfo,Name,Manufacturer | fl').then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            parts.forEach(element => {
              const lines = element.split('\n');
              if (util.getValue(lines, 'name', ':')) {
                result.push(parseWindowsAudio(lines));
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos) {
        resolve(null);
      }
    });
  });
}

exports.audio = audio;


/***/ }),

/***/ 6828:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

// @ts-check;
// ==================================================================================
// battery.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 6. Battery
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const fs = __nccwpck_require__(7147);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function parseWinBatteryPart(lines, designedCapacity, fullChargeCapacity) {
  const result = {};
  let status = util.getValue(lines, 'BatteryStatus', ':').trim();
  // 1 = "Discharging"
  // 2 = "On A/C"
  // 3 = "Fully Charged"
  // 4 = "Low"
  // 5 = "Critical"
  // 6 = "Charging"
  // 7 = "Charging High"
  // 8 = "Charging Low"
  // 9 = "Charging Critical"
  // 10 = "Undefined"
  // 11 = "Partially Charged"
  if (status >= 0) {
    const statusValue = status ? parseInt(status) : 0;
    result.status = statusValue;
    result.hasBattery = true;
    result.maxCapacity = fullChargeCapacity || parseInt(util.getValue(lines, 'DesignCapacity', ':') || 0);
    result.designedCapacity = parseInt(util.getValue(lines, 'DesignCapacity', ':') || designedCapacity);
    result.voltage = parseInt(util.getValue(lines, 'DesignVoltage', ':') || 0) / 1000.0;
    result.capacityUnit = 'mWh';
    result.percent = parseInt(util.getValue(lines, 'EstimatedChargeRemaining', ':') || 0);
    result.currentCapacity = parseInt(result.maxCapacity * result.percent / 100);
    result.isCharging = (statusValue >= 6 && statusValue <= 9) || statusValue === 11 || ((statusValue !== 3) && (statusValue !== 1) && result.percent < 100);
    result.acConnected = result.isCharging || statusValue === 2;
    result.model = util.getValue(lines, 'DeviceID', ':');
  } else {
    result.status = -1;
  }

  return result;
}

module.exports = function (callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        hasBattery: false,
        cycleCount: 0,
        isCharging: false,
        designedCapacity: 0,
        maxCapacity: 0,
        currentCapacity: 0,
        voltage: 0,
        capacityUnit: '',
        percent: 0,
        timeRemaining: null,
        acConnected: true,
        type: '',
        model: '',
        manufacturer: '',
        serial: ''
      };

      if (_linux) {
        let battery_path = '';
        if (fs.existsSync('/sys/class/power_supply/BAT1/uevent')) {
          battery_path = '/sys/class/power_supply/BAT1/';
        } else if (fs.existsSync('/sys/class/power_supply/BAT0/uevent')) {
          battery_path = '/sys/class/power_supply/BAT0/';
        }

        let acConnected = false;
        let acPath = '';
        if (fs.existsSync('/sys/class/power_supply/AC/online')) {
          acPath = '/sys/class/power_supply/AC/online';
        } else if (fs.existsSync('/sys/class/power_supply/AC0/online')) {
          acPath = '/sys/class/power_supply/AC0/online';
        }

        if (acPath) {
          const file = fs.readFileSync(acPath);
          acConnected = file.toString().trim() === '1';
        }

        if (battery_path) {
          fs.readFile(battery_path + 'uevent', function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');

              result.isCharging = (util.getValue(lines, 'POWER_SUPPLY_STATUS', '=').toLowerCase() === 'charging');
              result.acConnected = acConnected || result.isCharging;
              result.voltage = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_VOLTAGE_NOW', '='), 10) / 1000000.0;
              result.capacityUnit = result.voltage ? 'mWh' : 'mAh';
              result.cycleCount = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CYCLE_COUNT', '='), 10);
              result.maxCapacity = Math.round(parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CHARGE_FULL', '=', true, true), 10) / 1000.0 * (result.voltage || 1));
              const desingedMinVoltage = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_VOLTAGE_MIN_DESIGN', '='), 10) / 1000000.0;
              result.designedCapacity = Math.round(parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CHARGE_FULL_DESIGN', '=', true, true), 10) / 1000.0 * (desingedMinVoltage || result.voltage || 1));
              result.currentCapacity = Math.round(parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CHARGE_NOW', '='), 10) / 1000.0 * (result.voltage || 1));
              if (!result.maxCapacity) {
                result.maxCapacity = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_ENERGY_FULL', '=', true, true), 10) / 1000.0;
                result.designedCapacity = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_ENERGY_FULL_DESIGN', '=', true, true), 10) / 1000.0 | result.maxCapacity;
                result.currentCapacity = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_ENERGY_NOW', '='), 10) / 1000.0;
              }
              const percent = util.getValue(lines, 'POWER_SUPPLY_CAPACITY', '=');
              const energy = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_ENERGY_NOW', '='), 10);
              const power = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_POWER_NOW', '='), 10);
              const current = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CURRENT_NOW', '='), 10);
              const charge = parseInt('0' + util.getValue(lines, 'POWER_SUPPLY_CHARGE_NOW', '='), 10);

              result.percent = parseInt('0' + percent, 10);
              if (result.maxCapacity && result.currentCapacity) {
                result.hasBattery = true;
                if (!percent) {
                  result.percent = 100.0 * result.currentCapacity / result.maxCapacity;
                }
              }
              if (result.isCharging) {
                result.hasBattery = true;
              }
              if (energy && power) {
                result.timeRemaining = Math.floor(energy / power * 60);
              } else if (current && charge) {
                result.timeRemaining = Math.floor(charge / current * 60);
              } else if (current && result.currentCapacity) {
                result.timeRemaining = Math.floor(result.currentCapacity / current * 60);
              }
              result.type = util.getValue(lines, 'POWER_SUPPLY_TECHNOLOGY', '=');
              result.model = util.getValue(lines, 'POWER_SUPPLY_MODEL_NAME', '=');
              result.manufacturer = util.getValue(lines, 'POWER_SUPPLY_MANUFACTURER', '=');
              result.serial = util.getValue(lines, 'POWER_SUPPLY_SERIAL_NUMBER', '=');
              if (callback) { callback(result); }
              resolve(result);
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          });
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('sysctl -i hw.acpi.battery hw.acpi.acline', function (error, stdout) {
          let lines = stdout.toString().split('\n');
          const batteries = parseInt('0' + util.getValue(lines, 'hw.acpi.battery.units'), 10);
          const percent = parseInt('0' + util.getValue(lines, 'hw.acpi.battery.life'), 10);
          result.hasBattery = (batteries > 0);
          result.cycleCount = null;
          result.isCharging = util.getValue(lines, 'hw.acpi.acline') !== '1';
          result.acConnected = result.isCharging;
          result.maxCapacity = null;
          result.currentCapacity = null;
          result.capacityUnit = 'unknown';
          result.percent = batteries ? percent : null;
          if (callback) { callback(result); }
          resolve(result);
        });
      }

      if (_darwin) {
        exec('ioreg -n AppleSmartBattery -r | egrep "CycleCount|IsCharging|DesignCapacity|MaxCapacity|CurrentCapacity|BatterySerialNumber|TimeRemaining|Voltage"; pmset -g batt | grep %', function (error, stdout) {
          if (stdout) {
            let lines = stdout.toString().replace(/ +/g, '').replace(/"+/g, '').replace(/-/g, '').split('\n');
            result.cycleCount = parseInt('0' + util.getValue(lines, 'cyclecount', '='), 10);
            result.voltage = parseInt('0' + util.getValue(lines, 'voltage', '='), 10) / 1000.0;
            result.capacityUnit = result.voltage ? 'mWh' : 'mAh';
            result.maxCapacity = Math.round(parseInt('0' + util.getValue(lines, 'applerawmaxcapacity', '='), 10) * (result.voltage || 1));
            result.currentCapacity = Math.round(parseInt('0' + util.getValue(lines, 'applerawcurrentcapacity', '='), 10) * (result.voltage || 1));
            result.designedCapacity = Math.round(parseInt('0' + util.getValue(lines, 'DesignCapacity', '='), 10) * (result.voltage || 1));
            result.manufacturer = 'Apple';
            result.serial = util.getValue(lines, 'BatterySerialNumber', '=');
            let percent = null;
            const line = util.getValue(lines, 'internal', 'Battery');
            let parts = line.split(';');
            if (parts && parts[0]) {
              let parts2 = parts[0].split('\t');
              if (parts2 && parts2[1]) {
                percent = parseFloat(parts2[1].trim().replace(/%/g, ''));
              }
            }
            if (parts && parts[1]) {
              result.isCharging = (parts[1].trim() === 'charging');
              result.acConnected = (parts[1].trim() !== 'discharging');
            } else {
              result.isCharging = util.getValue(lines, 'ischarging', '=').toLowerCase() === 'yes';
              result.acConnected = result.isCharging;
            }
            if (result.maxCapacity && result.currentCapacity) {
              result.hasBattery = true;
              result.type = 'Li-ion';
              result.percent = percent !== null ? percent : Math.round(100.0 * result.currentCapacity / result.maxCapacity);
              if (!result.isCharging) {
                result.timeRemaining = parseInt('0' + util.getValue(lines, 'TimeRemaining', '='), 10);
              }
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance Win32_Battery | select BatteryStatus, DesignCapacity, DesignVoltage, EstimatedChargeRemaining, DeviceID | fl'));
          workload.push(util.powerShell('(Get-WmiObject -Class BatteryStaticData -Namespace ROOT/WMI).DesignedCapacity'));
          workload.push(util.powerShell('(Get-CimInstance -Class BatteryFullChargedCapacity -Namespace ROOT/WMI).FullChargedCapacity'));
          util.promiseAll(
            workload
          ).then((data) => {
            if (data) {
              let parts = data.results[0].split(/\n\s*\n/);
              let batteries = [];
              const hasValue = value => /\S/.test(value);
              for (let i = 0; i < parts.length; i++) {
                if (hasValue(parts[i]) && (!batteries.length || !hasValue(parts[i - 1]))) {
                  batteries.push([]);
                }
                if (hasValue(parts[i])) {
                  batteries[batteries.length - 1].push(parts[i]);
                }
              }
              let designCapacities = data.results[1].split('\r\n').filter(e => e);
              let fullChargeCapacities = data.results[2].split('\r\n').filter(e => e);
              if (batteries.length) {
                let first = false;
                let additionalBatteries = [];
                for (let i = 0; i < batteries.length; i++) {
                  let lines = batteries[i][0].split('\r\n');
                  const designedCapacity = designCapacities && designCapacities.length >= (i + 1) && designCapacities[i] ? util.toInt(designCapacities[i]) : 0;
                  const fullChargeCapacity = fullChargeCapacities && fullChargeCapacities.length >= (i + 1) && fullChargeCapacities[i] ? util.toInt(fullChargeCapacities[i]) : 0;
                  const parsed = parseWinBatteryPart(lines, designedCapacity, fullChargeCapacity);
                  if (!first && parsed.status > 0 && parsed.status !== 10) {
                    result.hasBattery = parsed.hasBattery;
                    result.maxCapacity = parsed.maxCapacity;
                    result.designedCapacity = parsed.designedCapacity;
                    result.voltage = parsed.voltage;
                    result.capacityUnit = parsed.capacityUnit;
                    result.percent = parsed.percent;
                    result.currentCapacity = parsed.currentCapacity;
                    result.isCharging = parsed.isCharging;
                    result.acConnected = parsed.acConnected;
                    result.model = parsed.model;
                    first = true;
                  } else if (parsed.status !== -1) {
                    additionalBatteries.push(
                      {
                        hasBattery: parsed.hasBattery,
                        maxCapacity: parsed.maxCapacity,
                        designedCapacity: parsed.designedCapacity,
                        voltage: parsed.voltage,
                        capacityUnit: parsed.capacityUnit,
                        percent: parsed.percent,
                        currentCapacity: parsed.currentCapacity,
                        isCharging: parsed.isCharging,
                        timeRemaining: null,
                        acConnected: parsed.acConnected,
                        model: parsed.model,
                        type: '',
                        manufacturer: '',
                        serial: ''
                      }
                    );
                  }
                }
                if (!first && additionalBatteries.length) {
                  result = additionalBatteries[0];
                  additionalBatteries.shift();
                }
                if (additionalBatteries.length) {
                  result.additionalBatteries = additionalBatteries;
                }
              }
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
};


/***/ }),

/***/ 7378:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// audio.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 17. bluetooth
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const path = __nccwpck_require__(1017);
const util = __nccwpck_require__(7146);
const fs = __nccwpck_require__(7147);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function parseBluetoothType(str) {
  let result = '';

  if (str.indexOf('keyboard') >= 0) { result = 'Keyboard'; }
  if (str.indexOf('mouse') >= 0) { result = 'Mouse'; }
  if (str.indexOf('trackpad') >= 0) { result = 'Trackpad'; }
  if (str.indexOf('speaker') >= 0) { result = 'Speaker'; }
  if (str.indexOf('headset') >= 0) { result = 'Headset'; }
  if (str.indexOf('phone') >= 0) { result = 'Phone'; }
  if (str.indexOf('macbook') >= 0) { result = 'Computer'; }
  if (str.indexOf('imac') >= 0) { result = 'Computer'; }
  if (str.indexOf('ipad') >= 0) { result = 'Tablet'; }
  if (str.indexOf('watch') >= 0) { result = 'Watch'; }
  if (str.indexOf('headphone') >= 0) { result = 'Headset'; }
  // to be continued ...

  return result;
}

function parseBluetoothManufacturer(str) {
  let result = str.split(' ')[0];
  str = str.toLowerCase();
  if (str.indexOf('apple') >= 0) { result = 'Apple'; }
  if (str.indexOf('ipad') >= 0) { result = 'Apple'; }
  if (str.indexOf('imac') >= 0) { result = 'Apple'; }
  if (str.indexOf('iphone') >= 0) { result = 'Apple'; }
  if (str.indexOf('magic mouse') >= 0) { result = 'Apple'; }
  if (str.indexOf('magic track') >= 0) { result = 'Apple'; }
  if (str.indexOf('macbook') >= 0) { result = 'Apple'; }
  // to be continued ...

  return result;
}

function parseLinuxBluetoothInfo(lines, macAddr1, macAddr2) {
  const result = {};

  result.device = null;
  result.name = util.getValue(lines, 'name', '=');
  result.manufacturer = null;
  result.macDevice = macAddr1;
  result.macHost = macAddr2;
  result.batteryPercent = null;
  result.type = parseBluetoothType(result.name.toLowerCase());
  result.connected = false;

  return result;
}

function parseDarwinBluetoothDevices(bluetoothObject, macAddr2) {
  const result = {};
  const typeStr = ((bluetoothObject.device_minorClassOfDevice_string || bluetoothObject.device_majorClassOfDevice_string || bluetoothObject.device_minorType || '') + (bluetoothObject.device_name || '')).toLowerCase();

  result.device = bluetoothObject.device_services || '';
  result.name = bluetoothObject.device_name || '';
  result.manufacturer = bluetoothObject.device_manufacturer || parseBluetoothManufacturer(bluetoothObject.device_name || '') || '';
  result.macDevice = (bluetoothObject.device_addr || bluetoothObject.device_address || '').toLowerCase().replace(/-/g, ':');
  result.macHost = macAddr2;
  result.batteryPercent = bluetoothObject.device_batteryPercent || null;
  result.type = parseBluetoothType(typeStr);
  result.connected = bluetoothObject.device_isconnected === 'attrib_Yes' || false;

  return result;
}

function parseWindowsBluetooth(lines) {
  const result = {};

  result.device = null;
  result.name = util.getValue(lines, 'name', ':');
  result.manufacturer = util.getValue(lines, 'manufacturer', ':');
  result.macDevice = null;
  result.macHost = null;
  result.batteryPercent = null;
  result.type = parseBluetoothType(result.name.toLowerCase());
  result.connected = null;

  return result;
}

function bluetoothDevices(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux) {
        // get files in /var/lib/bluetooth/ recursive
        const btFiles = util.getFilesInPath('/var/lib/bluetooth/');
        btFiles.forEach((element) => {
          const filename = path.basename(element);
          const pathParts = element.split('/');
          const macAddr1 = pathParts.length >= 6 ? pathParts[pathParts.length - 2] : null;
          const macAddr2 = pathParts.length >= 7 ? pathParts[pathParts.length - 3] : null;
          if (filename === 'info') {
            const infoFile = fs.readFileSync(element, { encoding: 'utf8' }).split('\n');
            result.push(parseLinuxBluetoothInfo(infoFile, macAddr1, macAddr2));
          }
        });
        // determine "connected" with hcitool con
        try {
          const hdicon = execSync('hcitool con').toString().toLowerCase();
          for (let i = 0; i < result.length; i++) {
            if (result[i].macDevice && result[i].macDevice.length > 10 && hdicon.indexOf(result[i].macDevice.toLowerCase()) >= 0) {
              result[i].connected = true;
            }
          }
        } catch (e) {
          util.noop();
        }

        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_darwin) {
        let cmd = 'system_profiler SPBluetoothDataType -json';
        exec(cmd, function (error, stdout) {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]['device_title'] && outObj.SPBluetoothDataType[0]['device_title'].length) {
                // missing: host BT Adapter macAddr ()
                let macAddr2 = null;
                if (outObj.SPBluetoothDataType[0]['local_device_title'] && outObj.SPBluetoothDataType[0].local_device_title.general_address) {
                  macAddr2 = outObj.SPBluetoothDataType[0].local_device_title.general_address.toLowerCase().replace(/-/g, ':');
                }
                outObj.SPBluetoothDataType[0]['device_title'].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]['device_connected'] && outObj.SPBluetoothDataType[0]['device_connected'].length) {
                const macAddr2 = outObj.SPBluetoothDataType[0].controller_properties && outObj.SPBluetoothDataType[0].controller_properties.controller_address ? outObj.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ':') : null;
                outObj.SPBluetoothDataType[0]['device_connected'].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    innerObject.device_isconnected = 'attrib_Yes';
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]['device_not_connected'] && outObj.SPBluetoothDataType[0]['device_not_connected'].length) {
                const macAddr2 = outObj.SPBluetoothDataType[0].controller_properties && outObj.SPBluetoothDataType[0].controller_properties.controller_address ? outObj.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ':') : null;
                outObj.SPBluetoothDataType[0]['device_not_connected'].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    innerObject.device_isconnected = 'attrib_No';
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
            } catch (e) {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        util.powerShell('Get-CimInstance Win32_PNPEntity | select PNPClass, Name, Manufacturer | fl').then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            parts.forEach((part) => {
              if (util.getValue(part.split('\n'), 'PNPClass', ':') === 'Bluetooth') {
                result.push(parseWindowsBluetooth(part.split('\n')));
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_freebsd || _netbsd || _openbsd || _sunos) {
        resolve(null);
      }
    });
  });
}

exports.bluetoothDevices = bluetoothDevices;


/***/ }),

/***/ 2009:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// cpu.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 4. CPU
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const fs = __nccwpck_require__(7147);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

let _cpu_speed = 0;
let _current_cpu = {
  user: 0,
  nice: 0,
  system: 0,
  idle: 0,
  irq: 0,
  steal: 0,
  guest: 0,
  load: 0,
  tick: 0,
  ms: 0,
  currentLoad: 0,
  currentLoadUser: 0,
  currentLoadSystem: 0,
  currentLoadNice: 0,
  currentLoadIdle: 0,
  currentLoadIrq: 0,
  currentLoadSteal: 0,
  currentLoadGuest: 0,
  rawCurrentLoad: 0,
  rawCurrentLoadUser: 0,
  rawCurrentLoadSystem: 0,
  rawCurrentLoadNice: 0,
  rawCurrentLoadIdle: 0,
  rawCurrentLoadIrq: 0,
  rawCurrentLoadSteal: 0,
  rawCurrentLoadGuest: 0
};
let _cpus = [];
let _corecount = 0;

const AMDBaseFrequencies = {
  '8346': '1.8',
  '8347': '1.9',
  '8350': '2.0',
  '8354': '2.2',
  '8356|SE': '2.4',
  '8356': '2.3',
  '8360': '2.5',
  '2372': '2.1',
  '2373': '2.1',
  '2374': '2.2',
  '2376': '2.3',
  '2377': '2.3',
  '2378': '2.4',
  '2379': '2.4',
  '2380': '2.5',
  '2381': '2.5',
  '2382': '2.6',
  '2384': '2.7',
  '2386': '2.8',
  '2387': '2.8',
  '2389': '2.9',
  '2393': '3.1',
  '8374': '2.2',
  '8376': '2.3',
  '8378': '2.4',
  '8379': '2.4',
  '8380': '2.5',
  '8381': '2.5',
  '8382': '2.6',
  '8384': '2.7',
  '8386': '2.8',
  '8387': '2.8',
  '8389': '2.9',
  '8393': '3.1',
  '2419EE': '1.8',
  '2423HE': '2.0',
  '2425HE': '2.1',
  '2427': '2.2',
  '2431': '2.4',
  '2435': '2.6',
  '2439SE': '2.8',
  '8425HE': '2.1',
  '8431': '2.4',
  '8435': '2.6',
  '8439SE': '2.8',
  '4122': '2.2',
  '4130': '2.6',
  '4162EE': '1.7',
  '4164EE': '1.8',
  '4170HE': '2.1',
  '4174HE': '2.3',
  '4176HE': '2.4',
  '4180': '2.6',
  '4184': '2.8',
  '6124HE': '1.8',
  '6128HE': '2.0',
  '6132HE': '2.2',
  '6128': '2.0',
  '6134': '2.3',
  '6136': '2.4',
  '6140': '2.6',
  '6164HE': '1.7',
  '6166HE': '1.8',
  '6168': '1.9',
  '6172': '2.1',
  '6174': '2.2',
  '6176': '2.3',
  '6176SE': '2.3',
  '6180SE': '2.5',
  '3250': '2.5',
  '3260': '2.7',
  '3280': '2.4',
  '4226': '2.7',
  '4228': '2.8',
  '4230': '2.9',
  '4234': '3.1',
  '4238': '3.3',
  '4240': '3.4',
  '4256': '1.6',
  '4274': '2.5',
  '4276': '2.6',
  '4280': '2.8',
  '4284': '3.0',
  '6204': '3.3',
  '6212': '2.6',
  '6220': '3.0',
  '6234': '2.4',
  '6238': '2.6',
  '6262HE': '1.6',
  '6272': '2.1',
  '6274': '2.2',
  '6276': '2.3',
  '6278': '2.4',
  '6282SE': '2.6',
  '6284SE': '2.7',
  '6308': '3.5',
  '6320': '2.8',
  '6328': '3.2',
  '6338P': '2.3',
  '6344': '2.6',
  '6348': '2.8',
  '6366': '1.8',
  '6370P': '2.0',
  '6376': '2.3',
  '6378': '2.4',
  '6380': '2.5',
  '6386': '2.8',
  'FX|4100': '3.6',
  'FX|4120': '3.9',
  'FX|4130': '3.8',
  'FX|4150': '3.8',
  'FX|4170': '4.2',
  'FX|6100': '3.3',
  'FX|6120': '3.6',
  'FX|6130': '3.6',
  'FX|6200': '3.8',
  'FX|8100': '2.8',
  'FX|8120': '3.1',
  'FX|8140': '3.2',
  'FX|8150': '3.6',
  'FX|8170': '3.9',
  'FX|4300': '3.8',
  'FX|4320': '4.0',
  'FX|4350': '4.2',
  'FX|6300': '3.5',
  'FX|6350': '3.9',
  'FX|8300': '3.3',
  'FX|8310': '3.4',
  'FX|8320': '3.5',
  'FX|8350': '4.0',
  'FX|8370': '4.0',
  'FX|9370': '4.4',
  'FX|9590': '4.7',
  'FX|8320E': '3.2',
  'FX|8370E': '3.3',

  // ZEN Desktop CPUs
  '1200': '3.1',
  'Pro 1200': '3.1',
  '1300X': '3.5',
  'Pro 1300': '3.5',
  '1400': '3.2',
  '1500X': '3.5',
  'Pro 1500': '3.5',
  '1600': '3.2',
  '1600X': '3.6',
  'Pro 1600': '3.2',
  '1700': '3.0',
  'Pro 1700': '3.0',
  '1700X': '3.4',
  'Pro 1700X': '3.4',
  '1800X': '3.6',
  '1900X': '3.8',
  '1920': '3.2',
  '1920X': '3.5',
  '1950X': '3.4',

  // ZEN Desktop APUs
  '200GE': '3.2',
  'Pro 200GE': '3.2',
  '220GE': '3.4',
  '240GE': '3.5',
  '3000G': '3.5',
  '300GE': '3.4',
  '3050GE': '3.4',
  '2200G': '3.5',
  'Pro 2200G': '3.5',
  '2200GE': '3.2',
  'Pro 2200GE': '3.2',
  '2400G': '3.6',
  'Pro 2400G': '3.6',
  '2400GE': '3.2',
  'Pro 2400GE': '3.2',

  // ZEN Mobile APUs
  'Pro 200U': '2.3',
  '300U': '2.4',
  '2200U': '2.5',
  '3200U': '2.6',
  '2300U': '2.0',
  'Pro 2300U': '2.0',
  '2500U': '2.0',
  'Pro 2500U': '2.2',
  '2600H': '3.2',
  '2700U': '2.0',
  'Pro 2700U': '2.2',
  '2800H': '3.3',

  // ZEN Server Processors
  '7351': '2.4',
  '7351P': '2.4',
  '7401': '2.0',
  '7401P': '2.0',
  '7551P': '2.0',
  '7551': '2.0',
  '7251': '2.1',
  '7261': '2.5',
  '7281': '2.1',
  '7301': '2.2',
  '7371': '3.1',
  '7451': '2.3',
  '7501': '2.0',
  '7571': '2.2',
  '7601': '2.2',

  // ZEN Embedded Processors
  'V1500B': '2.2',
  'V1780B': '3.35',
  'V1202B': '2.3',
  'V1404I': '2.0',
  'V1605B': '2.0',
  'V1756B': '3.25',
  'V1807B': '3.35',

  '3101': '2.1',
  '3151': '2.7',
  '3201': '1.5',
  '3251': '2.5',
  '3255': '2.5',
  '3301': '2.0',
  '3351': '1.9',
  '3401': '1.85',
  '3451': '2.15',

  // ZEN+ Desktop
  '1200|AF': '3.1',
  '2300X': '3.5',
  '2500X': '3.6',
  '2600': '3.4',
  '2600E': '3.1',
  '1600|AF': '3.2',
  '2600X': '3.6',
  '2700': '3.2',
  '2700E': '2.8',
  'Pro 2700': '3.2',
  '2700X': '3.7',
  'Pro 2700X': '3.6',
  '2920X': '3.5',
  '2950X': '3.5',
  '2970WX': '3.0',
  '2990WX': '3.0',

  // ZEN+ Desktop APU
  'Pro 300GE': '3.4',
  'Pro 3125GE': '3.4',
  '3150G': '3.5',
  'Pro 3150G': '3.5',
  '3150GE': '3.3',
  'Pro 3150GE': '3.3',
  '3200G': '3.6',
  'Pro 3200G': '3.6',
  '3200GE': '3.3',
  'Pro 3200GE': '3.3',
  '3350G': '3.6',
  'Pro 3350G': '3.6',
  '3350GE': '3.3',
  'Pro 3350GE': '3.3',
  '3400G': '3.7',
  'Pro 3400G': '3.7',
  '3400GE': '3.3',
  'Pro 3400GE': '3.3',

  // ZEN+ Mobile
  '3300U': '2.1',
  'PRO 3300U': '2.1',
  '3450U': '2.1',
  '3500U': '2.1',
  'PRO 3500U': '2.1',
  '3500C': '2.1',
  '3550H': '2.1',
  '3580U': '2.1',
  '3700U': '2.3',
  'PRO 3700U': '2.3',
  '3700C': '2.3',
  '3750H': '2.3',
  '3780U': '2.3',

  // ZEN2 Desktop CPUS
  '3100': '3.6',
  '3300X': '3.8',
  '3500': '3.6',
  '3500X': '3.6',
  '3600': '3.6',
  'Pro 3600': '3.6',
  '3600X': '3.8',
  '3600XT': '3.8',
  'Pro 3700': '3.6',
  '3700X': '3.6',
  '3800X': '3.9',
  '3800XT': '3.9',
  '3900': '3.1',
  'Pro 3900': '3.1',
  '3900X': '3.8',
  '3900XT': '3.8',
  '3950X': '3.5',
  '3960X': '3.8',
  '3970X': '3.7',
  '3990X': '2.9',
  '3945WX': '4.0',
  '3955WX': '3.9',
  '3975WX': '3.5',
  '3995WX': '2.7',

  // ZEN2 Desktop APUs
  '4300GE': '3.5',
  'Pro 4300GE': '3.5',
  '4300G': '3.8',
  'Pro 4300G': '3.8',
  '4600GE': '3.3',
  'Pro 4650GE': '3.3',
  '4600G': '3.7',
  'Pro 4650G': '3.7',
  '4700GE': '3.1',
  'Pro 4750GE': '3.1',
  '4700G': '3.6',
  'Pro 4750G': '3.6',
  '4300U': '2.7',
  '4450U': '2.5',
  'Pro 4450U': '2.5',
  '4500U': '2.3',
  '4600U': '2.1',
  'PRO 4650U': '2.1',
  '4680U': '2.1',
  '4600HS': '3.0',
  '4600H': '3.0',
  '4700U': '2.0',
  'PRO 4750U': '1.7',
  '4800U': '1.8',
  '4800HS': '2.9',
  '4800H': '2.9',
  '4900HS': '3.0',
  '4900H': '3.3',
  '5300U': '2.6',
  '5500U': '2.1',
  '5700U': '1.8',

  // ZEN2 - EPYC
  '7232P': '3.1',
  '7302P': '3.0',
  '7402P': '2.8',
  '7502P': '2.5',
  '7702P': '2.0',
  '7252': '3.1',
  '7262': '3.2',
  '7272': '2.9',
  '7282': '2.8',
  '7302': '3.0',
  '7352': '2.3',
  '7402': '2.8',
  '7452': '2.35',
  '7502': '2.5',
  '7532': '2.4',
  '7542': '2.9',
  '7552': '2.2',
  '7642': '2.3',
  '7662': '2.0',
  '7702': '2.0',
  '7742': '2.25',
  '7H12': '2.6',
  '7F32': '3.7',
  '7F52': '3.5',
  '7F72': '3.2',

  // Epyc (Milan)

  '7773X': '2.2',
  '7763': '2.45',
  '7713': '2.0',
  '7713P': '2.0',
  '7663': '2.0',
  '7643': '2.3',
  '7573X': '2.8',
  '75F3': '2.95',
  '7543': '2.8',
  '7543P': '2.8',
  '7513': '2.6',
  '7473X': '2.8',
  '7453': '2.75',
  '74F3': '3.2',
  '7443': '2.85',
  '7443P': '2.85',
  '7413': '2.65',
  '7373X': '3.05',
  '73F3': '3.5',
  '7343': '3.2',
  '7313': '3.0',
  '7313P': '3.0',
  '72F3': '3.7',

  // ZEN3
  '5600X': '3.7',
  '5800X': '3.8',
  '5900X': '3.7',
  '5950X': '3.4',
  '5945WX': '4.1',
  '5955WX': '4.0',
  '5965WX': '3.8',
  '5975WX': '3.6',
  '5995WX': '2.7',

  '7960X': '4.2',
  '7970X': '4.0',
  '7980X': '3.2',

  '7965WX': '4.2',
  '7975WX': '4.0',
  '7985WX': '3.2',
  '7995WX': '2.5',

  // ZEN4
  '9754': '2.25',
  '9754S': '2.25',
  '9734': '2.2',
  '9684X': '2.55',
  '9384X': '3.1',
  '9184X': '3.55',
  '9654P': '2.4',
  '9654': '2.4',
  '9634': '2.25',
  '9554P': '3.1',
  '9554': '3.1',
  '9534': '2.45',
  '9474F': '3.6',
  '9454P': '2.75',
  '9454': '2.75',
  '9374F': '3.85',
  '9354P': '3.25',
  '9354': '3.25',
  '9334': '2.7',
  '9274F': '4.05',
  '9254': '2.9',
  '9224': '2.5',
  '9174F': '4.1',
  '9124': '3.0'
};

const socketTypes = {
  1: 'Other',
  2: 'Unknown',
  3: 'Daughter Board',
  4: 'ZIF Socket',
  5: 'Replacement/Piggy Back',
  6: 'None',
  7: 'LIF Socket',
  8: 'Slot 1',
  9: 'Slot 2',
  10: '370 Pin Socket',
  11: 'Slot A',
  12: 'Slot M',
  13: '423',
  14: 'A (Socket 462)',
  15: '478',
  16: '754',
  17: '940',
  18: '939',
  19: 'mPGA604',
  20: 'LGA771',
  21: 'LGA775',
  22: 'S1',
  23: 'AM2',
  24: 'F (1207)',
  25: 'LGA1366',
  26: 'G34',
  27: 'AM3',
  28: 'C32',
  29: 'LGA1156',
  30: 'LGA1567',
  31: 'PGA988A',
  32: 'BGA1288',
  33: 'rPGA988B',
  34: 'BGA1023',
  35: 'BGA1224',
  36: 'LGA1155',
  37: 'LGA1356',
  38: 'LGA2011',
  39: 'FS1',
  40: 'FS2',
  41: 'FM1',
  42: 'FM2',
  43: 'LGA2011-3',
  44: 'LGA1356-3',
  45: 'LGA1150',
  46: 'BGA1168',
  47: 'BGA1234',
  48: 'BGA1364',
  49: 'AM4',
  50: 'LGA1151',
  51: 'BGA1356',
  52: 'BGA1440',
  53: 'BGA1515',
  54: 'LGA3647-1',
  55: 'SP3',
  56: 'SP3r2',
  57: 'LGA2066',
  58: 'BGA1392',
  59: 'BGA1510',
  60: 'BGA1528',
  61: 'LGA4189',
  62: 'LGA1200',
  63: 'LGA4677',
  64: 'LGA1700',
  65: 'BGA1744',
  66: 'BGA1781',
  67: 'BGA1211',
  68: 'BGA2422',
  69: 'LGA1211',
  70: 'LGA2422',
  71: 'LGA5773',
  72: 'BGA5773',
};

const socketTypesByName = {
  'LGA1150': 'i7-5775C i3-4340 i3-4170 G3250 i3-4160T i3-4160 E3-1231 G3258 G3240 i7-4790S i7-4790K i7-4790 i5-4690K i5-4690 i5-4590T i5-4590S i5-4590 i5-4460 i3-4360 i3-4150 G1820 G3420 G3220 i7-4771 i5-4440 i3-4330 i3-4130T i3-4130 E3-1230 i7-4770S i7-4770K i7-4770 i5-4670K i5-4670 i5-4570T i5-4570S i5-4570 i5-4430',
  'LGA1151': 'i9-9900KS E-2288G E-2224 G5420 i9-9900T i9-9900 i7-9700T i7-9700F i7-9700E i7-9700 i5-9600 i5-9500T i5-9500F i5-9500 i5-9400T i3-9350K i3-9300 i3-9100T i3-9100F i3-9100 G4930 i9-9900KF i7-9700KF i5-9600KF i5-9400F i5-9400 i3-9350KF i9-9900K i7-9700K i5-9600K G5500 G5400 i7-8700T i7-8086K i5-8600 i5-8500T i5-8500 i5-8400T i3-8300 i3-8100T G4900 i7-8700K i7-8700 i5-8600K i5-8400 i3-8350K i3-8100 E3-1270 G4600 G4560 i7-7700T i7-7700K i7-7700 i5-7600K i5-7600 i5-7500T i5-7500 i5-7400 i3-7350K i3-7300 i3-7100T i3-7100 G3930 G3900 G4400 i7-6700T i7-6700K i7-6700 i5-6600K i5-6600 i5-6500T i5-6500 i5-6400T i5-6400 i3-6300 i3-6100T i3-6100 E3-1270 E3-1270 T4500 T4400',
  '1155': 'G440 G460 G465 G470 G530T G540T G550T G1610T G1620T G530 G540 G1610 G550 G1620 G555 G1630 i3-2100T i3-2120T i3-3220T i3-3240T i3-3250T i3-2100 i3-2105 i3-2102 i3-3210 i3-3220 i3-2125 i3-2120 i3-3225 i3-2130 i3-3245 i3-3240 i3-3250 i5-3570T i5-2500T i5-2400S i5-2405S i5-2390T i5-3330S i5-2500S i5-3335S i5-2300 i5-3450S i5-3340S i5-3470S i5-3475S i5-3470T i5-2310 i5-3550S i5-2320 i5-3330 i5-3350P i5-3450 i5-2400 i5-3340 i5-3570S i5-2380P i5-2450P i5-3470 i5-2500K i5-3550 i5-2500 i5-3570 i5-3570K i5-2550K i7-3770T i7-2600S i7-3770S i7-2600K i7-2600 i7-3770 i7-3770K i7-2700K G620T G630T G640T G2020T G645T G2100T G2030T G622 G860T G620 G632 G2120T G630 G640 G2010 G840 G2020 G850 G645 G2030 G860 G2120 G870 G2130 G2140 E3-1220L E3-1220L E3-1260L E3-1265L E3-1220 E3-1225 E3-1220 E3-1235 E3-1225 E3-1230 E3-1230 E3-1240 E3-1245 E3-1270 E3-1275 E3-1240 E3-1245 E3-1270 E3-1280 E3-1275 E3-1290 E3-1280 E3-1290'
};

function getSocketTypesByName(str) {
  let result = '';
  for (const key in socketTypesByName) {
    const names = socketTypesByName[key].split(' ');
    names.forEach(element => {
      if (str.indexOf(element) >= 0) {
        result = key;
      }
    });
  }
  return result;
}

function cpuManufacturer(str) {
  let result = str;
  str = str.toLowerCase();

  if (str.indexOf('intel') >= 0) { result = 'Intel'; }
  if (str.indexOf('amd') >= 0) { result = 'AMD'; }
  if (str.indexOf('qemu') >= 0) { result = 'QEMU'; }
  if (str.indexOf('hygon') >= 0) { result = 'Hygon'; }
  if (str.indexOf('centaur') >= 0) { result = 'WinChip/Via'; }
  if (str.indexOf('vmware') >= 0) { result = 'VMware'; }
  if (str.indexOf('Xen') >= 0) { result = 'Xen Hypervisor'; }
  if (str.indexOf('tcg') >= 0) { result = 'QEMU'; }
  if (str.indexOf('apple') >= 0) { result = 'Apple'; }

  return result;
}

function cpuBrandManufacturer(res) {
  res.brand = res.brand.replace(/\(R\)+/g, '®').replace(/\s+/g, ' ').trim();
  res.brand = res.brand.replace(/\(TM\)+/g, '™').replace(/\s+/g, ' ').trim();
  res.brand = res.brand.replace(/\(C\)+/g, '©').replace(/\s+/g, ' ').trim();
  res.brand = res.brand.replace(/CPU+/g, '').replace(/\s+/g, ' ').trim();
  res.manufacturer = cpuManufacturer(res.brand);

  let parts = res.brand.split(' ');
  parts.shift();
  res.brand = parts.join(' ');
  return res;
}

function getAMDSpeed(brand) {
  let result = '0';
  for (let key in AMDBaseFrequencies) {
    if ({}.hasOwnProperty.call(AMDBaseFrequencies, key)) {
      let parts = key.split('|');
      let found = 0;
      parts.forEach(item => {
        if (brand.indexOf(item) > -1) {
          found++;
        }
      });
      if (found === parts.length) {
        result = AMDBaseFrequencies[key];
      }
    }
  }
  return parseFloat(result);
}

// --------------------------
// CPU - brand, speed

function getCpu() {

  return new Promise((resolve) => {
    process.nextTick(() => {
      const UNKNOWN = 'unknown';
      let result = {
        manufacturer: UNKNOWN,
        brand: UNKNOWN,
        vendor: '',
        family: '',
        model: '',
        stepping: '',
        revision: '',
        voltage: '',
        speed: 0,
        speedMin: 0,
        speedMax: 0,
        governor: '',
        cores: util.cores(),
        physicalCores: util.cores(),
        performanceCores: util.cores(),
        efficiencyCores: 0,
        processors: 1,
        socket: '',
        flags: '',
        virtualization: false,
        cache: {}
      };
      cpuFlags().then(flags => {
        result.flags = flags;
        result.virtualization = flags.indexOf('vmx') > -1 || flags.indexOf('svm') > -1;
        if (_darwin) {
          exec('sysctl machdep.cpu hw.cpufrequency_max hw.cpufrequency_min hw.packages hw.physicalcpu_max hw.ncpu hw.tbfrequency hw.cpufamily hw.cpusubfamily', function (error, stdout) {
            let lines = stdout.toString().split('\n');
            const modelline = util.getValue(lines, 'machdep.cpu.brand_string');
            const modellineParts = modelline.split('@');
            result.brand = modellineParts[0].trim();
            const speed = modellineParts[1] ? modellineParts[1].trim() : '0';
            result.speed = parseFloat(speed.replace(/GHz+/g, ''));
            let tbFrequency = util.getValue(lines, 'hw.tbfrequency') / 1000000000.0;
            tbFrequency = tbFrequency < 0.1 ? tbFrequency * 100 : tbFrequency;
            result.speed = result.speed === 0 ? tbFrequency : result.speed;

            _cpu_speed = result.speed;
            result = cpuBrandManufacturer(result);
            result.speedMin = util.getValue(lines, 'hw.cpufrequency_min') ? (util.getValue(lines, 'hw.cpufrequency_min') / 1000000000.0) : result.speed;
            result.speedMax = util.getValue(lines, 'hw.cpufrequency_max') ? (util.getValue(lines, 'hw.cpufrequency_max') / 1000000000.0) : result.speed;
            result.vendor = util.getValue(lines, 'machdep.cpu.vendor') || 'Apple';
            result.family = util.getValue(lines, 'machdep.cpu.family') || util.getValue(lines, 'hw.cpufamily');
            result.model = util.getValue(lines, 'machdep.cpu.model');
            result.stepping = util.getValue(lines, 'machdep.cpu.stepping') || util.getValue(lines, 'hw.cpusubfamily');
            result.virtualization = true;
            const countProcessors = util.getValue(lines, 'hw.packages');
            const countCores = util.getValue(lines, 'hw.physicalcpu_max');
            const countThreads = util.getValue(lines, 'hw.ncpu');
            if (os.arch() === 'arm64') {
              result.socket = 'SOC';
              try {
                const clusters = execSync('ioreg -c IOPlatformDevice -d 3 -r | grep cluster-type').toString().split('\n');
                const efficiencyCores = clusters.filter(line => line.indexOf('"E"') >= 0).length;
                const performanceCores = clusters.filter(line => line.indexOf('"P"') >= 0).length;
                result.efficiencyCores = efficiencyCores;
                result.performanceCores = performanceCores;
              } catch (e) {
                util.noop();
              }
            }
            if (countProcessors) {
              result.processors = parseInt(countProcessors) || 1;
            }
            if (countCores && countThreads) {
              result.cores = parseInt(countThreads) || util.cores();
              result.physicalCores = parseInt(countCores) || util.cores();
            }
            cpuCache().then((res) => {
              result.cache = res;
              resolve(result);
            });
          });
        }
        if (_linux) {
          let modelline = '';
          let lines = [];
          if (os.cpus()[0] && os.cpus()[0].model) { modelline = os.cpus()[0].model; }
          exec('export LC_ALL=C; lscpu; echo -n "Governor: "; cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null; echo; unset LC_ALL', function (error, stdout) {
            if (!error) {
              lines = stdout.toString().split('\n');
            }
            modelline = util.getValue(lines, 'model name') || modelline;
            modelline = util.getValue(lines, 'bios model name') || modelline;
            const modellineParts = modelline.split('@');
            result.brand = modellineParts[0].trim();
            result.speed = modellineParts[1] ? parseFloat(modellineParts[1].trim()) : 0;
            if (result.speed === 0 && (result.brand.indexOf('AMD') > -1 || result.brand.toLowerCase().indexOf('ryzen') > -1)) {
              result.speed = getAMDSpeed(result.brand);
            }
            if (result.speed === 0) {
              const current = getCpuCurrentSpeedSync();
              if (current.avg !== 0) { result.speed = current.avg; }
            }
            _cpu_speed = result.speed;
            result.speedMin = Math.round(parseFloat(util.getValue(lines, 'cpu min mhz').replace(/,/g, '.')) / 10.0) / 100;
            result.speedMax = Math.round(parseFloat(util.getValue(lines, 'cpu max mhz').replace(/,/g, '.')) / 10.0) / 100;

            result = cpuBrandManufacturer(result);
            result.vendor = cpuManufacturer(util.getValue(lines, 'vendor id'));

            result.family = util.getValue(lines, 'cpu family');
            result.model = util.getValue(lines, 'model:');
            result.stepping = util.getValue(lines, 'stepping');
            result.revision = util.getValue(lines, 'cpu revision');
            result.cache.l1d = util.getValue(lines, 'l1d cache');
            if (result.cache.l1d) { result.cache.l1d = parseInt(result.cache.l1d) * (result.cache.l1d.indexOf('M') !== -1 ? 1024 * 1024 : (result.cache.l1d.indexOf('K') !== -1 ? 1024 : 1)); }
            result.cache.l1i = util.getValue(lines, 'l1i cache');
            if (result.cache.l1i) { result.cache.l1i = parseInt(result.cache.l1i) * (result.cache.l1i.indexOf('M') !== -1 ? 1024 * 1024 : (result.cache.l1i.indexOf('K') !== -1 ? 1024 : 1)); }
            result.cache.l2 = util.getValue(lines, 'l2 cache');
            if (result.cache.l2) { result.cache.l2 = parseInt(result.cache.l2) * (result.cache.l2.indexOf('M') !== -1 ? 1024 * 1024 : (result.cache.l2.indexOf('K') !== -1 ? 1024 : 1)); }
            result.cache.l3 = util.getValue(lines, 'l3 cache');
            if (result.cache.l3) { result.cache.l3 = parseInt(result.cache.l3) * (result.cache.l3.indexOf('M') !== -1 ? 1024 * 1024 : (result.cache.l3.indexOf('K') !== -1 ? 1024 : 1)); }

            const threadsPerCore = util.getValue(lines, 'thread(s) per core') || '1';
            const processors = util.getValue(lines, 'socket(s)') || '1';
            const threadsPerCoreInt = parseInt(threadsPerCore, 10); // threads per code (normally only for performance cores)
            const processorsInt = parseInt(processors, 10) || 1;  // number of sockets /  processor units in machine (normally 1)
            const coresPerSocket = parseInt(util.getValue(lines, 'core(s) per socket'), 10); // number of cores (e.g. 16 on i12900)
            result.physicalCores = coresPerSocket ? coresPerSocket * processorsInt : result.cores / threadsPerCoreInt;
            result.performanceCores = threadsPerCoreInt > 1 ? result.cores - result.physicalCores : result.cores;
            result.efficiencyCores = threadsPerCoreInt > 1 ? result.cores - (threadsPerCoreInt * result.performanceCores) : 0;
            result.processors = processorsInt;
            result.governor = util.getValue(lines, 'governor') || '';

            // Test Raspberry
            if (result.vendor === 'ARM') {
              const linesRpi = fs.readFileSync('/proc/cpuinfo').toString().split('\n');
              const rPIRevision = util.decodePiCpuinfo(linesRpi);
              if (rPIRevision.model.toLowerCase().indexOf('raspberry') >= 0) {
                result.family = result.manufacturer;
                result.manufacturer = rPIRevision.manufacturer;
                result.brand = rPIRevision.processor;
                result.revision = rPIRevision.revisionCode;
                result.socket = 'SOC';
              }
            }

            // socket type
            let lines2 = [];
            exec('export LC_ALL=C; dmidecode –t 4 2>/dev/null | grep "Upgrade: Socket"; unset LC_ALL', function (error2, stdout2) {
              lines2 = stdout2.toString().split('\n');
              if (lines2 && lines2.length) {
                result.socket = util.getValue(lines2, 'Upgrade').replace('Socket', '').trim() || result.socket;
              }
              resolve(result);
            });
          });
        }
        if (_freebsd || _openbsd || _netbsd) {
          let modelline = '';
          let lines = [];
          if (os.cpus()[0] && os.cpus()[0].model) { modelline = os.cpus()[0].model; }
          exec('export LC_ALL=C; dmidecode -t 4; dmidecode -t 7 unset LC_ALL', function (error, stdout) {
            let cache = [];
            if (!error) {
              const data = stdout.toString().split('# dmidecode');
              const processor = data.length > 1 ? data[1] : '';
              cache = data.length > 2 ? data[2].split('Cache Information') : [];

              lines = processor.split('\n');
            }
            result.brand = modelline.split('@')[0].trim();
            result.speed = modelline.split('@')[1] ? parseFloat(modelline.split('@')[1].trim()) : 0;
            if (result.speed === 0 && (result.brand.indexOf('AMD') > -1 || result.brand.toLowerCase().indexOf('ryzen') > -1)) {
              result.speed = getAMDSpeed(result.brand);
            }
            if (result.speed === 0) {
              const current = getCpuCurrentSpeedSync();
              if (current.avg !== 0) { result.speed = current.avg; }
            }
            _cpu_speed = result.speed;
            result.speedMin = result.speed;
            result.speedMax = Math.round(parseFloat(util.getValue(lines, 'max speed').replace(/Mhz/g, '')) / 10.0) / 100;

            result = cpuBrandManufacturer(result);
            result.vendor = cpuManufacturer(util.getValue(lines, 'manufacturer'));
            let sig = util.getValue(lines, 'signature');
            sig = sig.split(',');
            for (let i = 0; i < sig.length; i++) {
              sig[i] = sig[i].trim();
            }
            result.family = util.getValue(sig, 'Family', ' ', true);
            result.model = util.getValue(sig, 'Model', ' ', true);
            result.stepping = util.getValue(sig, 'Stepping', ' ', true);
            result.revision = '';
            const voltage = parseFloat(util.getValue(lines, 'voltage'));
            result.voltage = isNaN(voltage) ? '' : voltage.toFixed(2);
            for (let i = 0; i < cache.length; i++) {
              lines = cache[i].split('\n');
              let cacheType = util.getValue(lines, 'Socket Designation').toLowerCase().replace(' ', '-').split('-');
              cacheType = cacheType.length ? cacheType[0] : '';
              const sizeParts = util.getValue(lines, 'Installed Size').split(' ');
              let size = parseInt(sizeParts[0], 10);
              const unit = sizeParts.length > 1 ? sizeParts[1] : 'kb';
              size = size * (unit === 'kb' ? 1024 : (unit === 'mb' ? 1024 * 1024 : (unit === 'gb' ? 1024 * 1024 * 1024 : 1)));
              if (cacheType) {
                if (cacheType === 'l1') {
                  result.cache[cacheType + 'd'] = size / 2;
                  result.cache[cacheType + 'i'] = size / 2;
                } else {
                  result.cache[cacheType] = size;
                }
              }
            }
            // socket type
            result.socket = util.getValue(lines, 'Upgrade').replace('Socket', '').trim();
            // # threads / # cores
            const threadCount = util.getValue(lines, 'thread count').trim();
            const coreCount = util.getValue(lines, 'core count').trim();
            if (coreCount && threadCount) {
              result.cores = parseInt(threadCount, 10);
              result.physicalCores = parseInt(coreCount, 10);
            }
            resolve(result);
          });
        }
        if (_sunos) {
          resolve(result);
        }
        if (_windows) {
          try {
            const workload = [];
            workload.push(util.powerShell('Get-CimInstance Win32_processor | select Name, Revision, L2CacheSize, L3CacheSize, Manufacturer, MaxClockSpeed, Description, UpgradeMethod, Caption, NumberOfLogicalProcessors, NumberOfCores | fl'));
            workload.push(util.powerShell('Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl'));
            workload.push(util.powerShell('(Get-CimInstance Win32_ComputerSystem).HypervisorPresent'));

            Promise.all(
              workload
            ).then((data) => {
              let lines = data[0].split('\r\n');
              let name = util.getValue(lines, 'name', ':') || '';
              if (name.indexOf('@') >= 0) {
                result.brand = name.split('@')[0].trim();
                result.speed = name.split('@')[1] ? parseFloat(name.split('@')[1].trim()) : 0;
                _cpu_speed = result.speed;
              } else {
                result.brand = name.trim();
                result.speed = 0;
              }
              result = cpuBrandManufacturer(result);
              result.revision = util.getValue(lines, 'revision', ':');
              result.vendor = util.getValue(lines, 'manufacturer', ':');
              result.speedMax = Math.round(parseFloat(util.getValue(lines, 'maxclockspeed', ':').replace(/,/g, '.')) / 10.0) / 100;
              if (result.speed === 0 && (result.brand.indexOf('AMD') > -1 || result.brand.toLowerCase().indexOf('ryzen') > -1)) {
                result.speed = getAMDSpeed(result.brand);
              }
              if (result.speed === 0) {
                result.speed = result.speedMax;
              }
              result.speedMin = result.speed;

              let description = util.getValue(lines, 'description', ':').split(' ');
              for (let i = 0; i < description.length; i++) {
                if (description[i].toLowerCase().startsWith('family') && (i + 1) < description.length && description[i + 1]) {
                  result.family = description[i + 1];
                }
                if (description[i].toLowerCase().startsWith('model') && (i + 1) < description.length && description[i + 1]) {
                  result.model = description[i + 1];
                }
                if (description[i].toLowerCase().startsWith('stepping') && (i + 1) < description.length && description[i + 1]) {
                  result.stepping = description[i + 1];
                }
              }
              // socket type
              const socketId = util.getValue(lines, 'UpgradeMethod', ':');
              if (socketTypes[socketId]) {
                result.socket = socketTypes[socketId];
              }
              const socketByName = getSocketTypesByName(name);
              if (socketByName) {
                result.socket = socketByName;
              }
              // # threads / # cores
              const countProcessors = util.countLines(lines, 'Caption');
              const countThreads = util.getValue(lines, 'NumberOfLogicalProcessors', ':');
              const countCores = util.getValue(lines, 'NumberOfCores', ':');
              if (countProcessors) {
                result.processors = parseInt(countProcessors) || 1;
              }
              if (countCores && countThreads) {
                result.cores = parseInt(countThreads) || util.cores();
                result.physicalCores = parseInt(countCores) || util.cores();
              }
              if (countProcessors > 1) {
                result.cores = result.cores * countProcessors;
                result.physicalCores = result.physicalCores * countProcessors;
              }
              result.cache = parseWinCache(data[0], data[1]);
              const hyperv = data[2] ? data[2].toString().toLowerCase() : '';
              result.virtualization = hyperv.indexOf('true') !== -1;

              resolve(result);
            });
          } catch (e) {
            resolve(result);
          }
        }
      });
    });
  });
}

// --------------------------
// CPU - Processor Data

function cpu(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      getCpu().then(result => {
        if (callback) { callback(result); }
        resolve(result);
      });
    });
  });
}

exports.cpu = cpu;

// --------------------------
// CPU - current speed - in GHz

function getCpuCurrentSpeedSync() {

  let cpus = os.cpus();
  let minFreq = 999999999;
  let maxFreq = 0;
  let avgFreq = 0;
  let cores = [];

  if (cpus && cpus.length) {
    for (let i in cpus) {
      if ({}.hasOwnProperty.call(cpus, i)) {
        let freq = cpus[i].speed > 100 ? (cpus[i].speed + 1) / 1000 : cpus[i].speed / 10;
        avgFreq = avgFreq + freq;
        if (freq > maxFreq) { maxFreq = freq; }
        if (freq < minFreq) { minFreq = freq; }
        cores.push(parseFloat(freq.toFixed(2)));
      }
    }
    avgFreq = avgFreq / cpus.length;
    return {
      min: parseFloat(minFreq.toFixed(2)),
      max: parseFloat(maxFreq.toFixed(2)),
      avg: parseFloat((avgFreq).toFixed(2)),
      cores: cores
    };
  } else {
    return {
      min: 0,
      max: 0,
      avg: 0,
      cores: cores
    };
  }
}

function cpuCurrentSpeed(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = getCpuCurrentSpeedSync();
      if (result.avg === 0 && _cpu_speed !== 0) {
        const currCpuSpeed = parseFloat(_cpu_speed);
        result = {
          min: currCpuSpeed,
          max: currCpuSpeed,
          avg: currCpuSpeed,
          cores: []
        };
      }
      if (callback) { callback(result); }
      resolve(result);
    });
  });
}

exports.cpuCurrentSpeed = cpuCurrentSpeed;

// --------------------------
// CPU - temperature
// if sensors are installed

function cpuTemperature(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        main: null,
        cores: [],
        max: null,
        socket: [],
        chipset: null
      };
      if (_linux) {
        // CPU Chipset, Socket
        try {
          const cmd = 'cat /sys/class/thermal/thermal_zone*/type  2>/dev/null; echo "-----"; cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null;';
          const parts = execSync(cmd).toString().split('-----\n');
          if (parts.length === 2) {
            const lines = parts[0].split('\n');
            const lines2 = parts[1].split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith('acpi') && lines2[i]) {
                result.socket.push(Math.round(parseInt(lines2[i], 10) / 100) / 10);
              }
              if (line.startsWith('pch') && lines2[i]) {
                result.chipset = Math.round(parseInt(lines2[i], 10) / 100) / 10;
              }
            }
          }
        } catch (e) {
          util.noop();
        }

        const cmd = 'for mon in /sys/class/hwmon/hwmon*; do for label in "$mon"/temp*_label; do if [ -f $label ]; then value=${label%_*}_input; echo $(cat "$label")___$(cat "$value"); fi; done; done;';
        try {
          exec(cmd, function (error, stdout) {
            stdout = stdout.toString();
            const tdiePos = stdout.toLowerCase().indexOf('tdie');
            if (tdiePos !== -1) {
              stdout = stdout.substring(tdiePos);
            }
            let lines = stdout.split('\n');
            let tctl = 0;
            lines.forEach(line => {
              const parts = line.split('___');
              const label = parts[0];
              const value = parts.length > 1 && parts[1] ? parts[1] : '0';
              if (value && label && label.toLowerCase() === 'tctl') {
                tctl = result.main = Math.round(parseInt(value, 10) / 100) / 10;
              }
              if (value && (label === undefined || (label && label.toLowerCase().startsWith('core')))) {
                result.cores.push(Math.round(parseInt(value, 10) / 100) / 10);
              } else if (value && label && result.main === null && (label.toLowerCase().indexOf('package') >= 0 || label.toLowerCase().indexOf('physical') >= 0 || label.toLowerCase() === 'tccd1')) {
                result.main = Math.round(parseInt(value, 10) / 100) / 10;
              }
            });
            if (tctl && result.main === null) {
              result.main = tctl;
            }

            if (result.cores.length > 0) {
              if (result.main === null) {
                result.main = Math.round(result.cores.reduce((a, b) => a + b, 0) / result.cores.length);
              }
              let maxtmp = Math.max.apply(Math, result.cores);
              result.max = (maxtmp > result.main) ? maxtmp : result.main;
            }
            if (result.main !== null) {
              if (result.max === null) {
                result.max = result.main;
              }
              if (callback) { callback(result); }
              resolve(result);
              return;
            }
            exec('sensors', function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                let tdieTemp = null;
                let newSectionStarts = true;
                let section = '';
                lines.forEach(function (line) {
                  // determine section
                  if (line.trim() === '') {
                    newSectionStarts = true;
                  } else if (newSectionStarts) {
                    if (line.trim().toLowerCase().startsWith('acpi')) { section = 'acpi'; }
                    if (line.trim().toLowerCase().startsWith('pch')) { section = 'pch'; }
                    if (line.trim().toLowerCase().startsWith('core')) { section = 'core'; }
                    newSectionStarts = false;
                  }
                  let regex = /[+-]([^°]*)/g;
                  let temps = line.match(regex);
                  let firstPart = line.split(':')[0].toUpperCase();
                  if (section === 'acpi') {
                    // socket temp
                    if (firstPart.indexOf('TEMP') !== -1) {
                      result.socket.push(parseFloat(temps));
                    }
                  } else if (section === 'pch') {
                    // chipset temp
                    if (firstPart.indexOf('TEMP') !== -1 && !result.chipset) {
                      result.chipset = parseFloat(temps);
                    }
                  }
                  // cpu temp
                  if (firstPart.indexOf('PHYSICAL') !== -1 || firstPart.indexOf('PACKAGE') !== -1) {
                    result.main = parseFloat(temps);
                  }
                  if (firstPart.indexOf('CORE ') !== -1) {
                    result.cores.push(parseFloat(temps));
                  }
                  if (firstPart.indexOf('TDIE') !== -1 && tdieTemp === null) {
                    tdieTemp = parseFloat(temps);
                  }
                });
                if (result.cores.length > 0) {
                  result.main = Math.round(result.cores.reduce((a, b) => a + b, 0) / result.cores.length);
                  let maxtmp = Math.max.apply(Math, result.cores);
                  result.max = (maxtmp > result.main) ? maxtmp : result.main;
                } else {
                  if (result.main === null && tdieTemp !== null) {
                    result.main = tdieTemp;
                    result.max = tdieTemp;
                  }
                }
                if (result.main !== null || result.max !== null) {
                  if (callback) { callback(result); }
                  resolve(result);
                  return;
                }
              }
              fs.stat('/sys/class/thermal/thermal_zone0/temp', function (err) {
                if (err === null) {
                  fs.readFile('/sys/class/thermal/thermal_zone0/temp', function (error, stdout) {
                    if (!error) {
                      let lines = stdout.toString().split('\n');
                      if (lines.length > 0) {
                        result.main = parseFloat(lines[0]) / 1000.0;
                        result.max = result.main;
                      }
                    }
                    if (callback) { callback(result); }
                    resolve(result);
                  });
                } else {
                  exec('/opt/vc/bin/vcgencmd measure_temp', function (error, stdout) {
                    if (!error) {
                      let lines = stdout.toString().split('\n');
                      if (lines.length > 0 && lines[0].indexOf('=')) {
                        result.main = parseFloat(lines[0].split('=')[1]);
                        result.max = result.main;
                      }
                    }
                    if (callback) { callback(result); }
                    resolve(result);
                  });
                }
              });
            });
          });
        } catch (er) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('sysctl dev.cpu | grep temp', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            let sum = 0;
            lines.forEach(function (line) {
              const parts = line.split(':');
              if (parts.length > 1) {
                const temp = parseFloat(parts[1].replace(',', '.'));
                if (temp > result.max) { result.max = temp; }
                sum = sum + temp;
                result.cores.push(temp);
              }
            });
            if (result.cores.length) {
              result.main = Math.round(sum / result.cores.length * 100) / 100;
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        let osxTemp = null;
        try {
          osxTemp = __nccwpck_require__(4616);
        } catch (er) {
          osxTemp = null;
        }
        if (osxTemp) {
          result = osxTemp.cpuTemperature();
          // round to 2 digits
          if (result.main) {
            result.main = Math.round(result.main * 100) / 100;
          }
          if (result.max) {
            result.max = Math.round(result.max * 100) / 100;
          }
          if (result.cores && result.cores.length) {
            for (let i = 0; i < result.cores.length; i++) {
              result.cores[i] = Math.round(result.cores[i] * 100) / 100;
            }
          }
        }

        if (callback) { callback(result); }
        resolve(result);
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          util.powerShell('Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | Select CurrentTemperature').then((stdout, error) => {
            if (!error) {
              let sum = 0;
              let lines = stdout.split('\r\n').filter(line => line.trim() !== '').filter((line, idx) => idx > 0);
              lines.forEach(function (line) {
                let value = (parseInt(line, 10) - 2732) / 10;
                if (!isNaN(value)) {
                  sum = sum + value;
                  if (value > result.max) { result.max = value; }
                  result.cores.push(value);
                }
              });
              if (result.cores.length) {
                result.main = sum / result.cores.length;
              }
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.cpuTemperature = cpuTemperature;

// --------------------------
// CPU Flags

function cpuFlags(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = '';
      if (_windows) {
        try {
          exec('reg query "HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0" /v FeatureSet', util.execOptsWin, function (error, stdout) {
            if (!error) {
              let flag_hex = stdout.split('0x').pop().trim();
              let flag_bin_unpadded = parseInt(flag_hex, 16).toString(2);
              let flag_bin = '0'.repeat(32 - flag_bin_unpadded.length) + flag_bin_unpadded;
              // empty flags are the reserved fields in the CPUID feature bit list
              // as found on wikipedia:
              // https://en.wikipedia.org/wiki/CPUID
              let all_flags = [
                'fpu', 'vme', 'de', 'pse', 'tsc', 'msr', 'pae', 'mce', 'cx8', 'apic',
                '', 'sep', 'mtrr', 'pge', 'mca', 'cmov', 'pat', 'pse-36', 'psn', 'clfsh',
                '', 'ds', 'acpi', 'mmx', 'fxsr', 'sse', 'sse2', 'ss', 'htt', 'tm', 'ia64', 'pbe'
              ];
              for (let f = 0; f < all_flags.length; f++) {
                if (flag_bin[f] === '1' && all_flags[f] !== '') {
                  result += ' ' + all_flags[f];
                }
              }
              result = result.trim().toLowerCase();
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_linux) {
        try {

          exec('export LC_ALL=C; lscpu; unset LC_ALL', function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              lines.forEach(function (line) {
                if (line.split(':')[0].toUpperCase().indexOf('FLAGS') !== -1) {
                  result = line.split(':')[1].trim().toLowerCase();
                }
              });
            }
            if (!result) {
              fs.readFile('/proc/cpuinfo', function (error, stdout) {
                if (!error) {
                  let lines = stdout.toString().split('\n');
                  result = util.getValue(lines, 'features', ':', true).toLowerCase();
                }
                if (callback) { callback(result); }
                resolve(result);
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('export LC_ALL=C; dmidecode -t 4 2>/dev/null; unset LC_ALL', function (error, stdout) {
          let flags = [];
          if (!error) {
            let parts = stdout.toString().split('\tFlags:');
            const lines = parts.length > 1 ? parts[1].split('\tVersion:')[0].split('\n') : [];
            lines.forEach(function (line) {
              let flag = (line.indexOf('(') ? line.split('(')[0].toLowerCase() : '').trim().replace(/\t/g, '');
              if (flag) {
                flags.push(flag);
              }
            });
          }
          result = flags.join(' ').trim().toLowerCase();
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        exec('sysctl machdep.cpu.features', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            if (lines.length > 0 && lines[0].indexOf('machdep.cpu.features:') !== -1) {
              result = lines[0].split(':')[1].trim().toLowerCase();
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
    });
  });
}

exports.cpuFlags = cpuFlags;

// --------------------------
// CPU Cache

function cpuCache(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        l1d: null,
        l1i: null,
        l2: null,
        l3: null,
      };
      if (_linux) {
        try {
          exec('export LC_ALL=C; lscpu; unset LC_ALL', function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              lines.forEach(function (line) {
                let parts = line.split(':');
                if (parts[0].toUpperCase().indexOf('L1D CACHE') !== -1) {
                  result.l1d = parseInt(parts[1].trim()) * (parts[1].indexOf('M') !== -1 ? 1024 * 1024 : (parts[1].indexOf('K') !== -1 ? 1024 : 1));
                }
                if (parts[0].toUpperCase().indexOf('L1I CACHE') !== -1) {
                  result.l1i = parseInt(parts[1].trim()) * (parts[1].indexOf('M') !== -1 ? 1024 * 1024 : (parts[1].indexOf('K') !== -1 ? 1024 : 1));
                }
                if (parts[0].toUpperCase().indexOf('L2 CACHE') !== -1) {
                  result.l2 = parseInt(parts[1].trim()) * (parts[1].indexOf('M') !== -1 ? 1024 * 1024 : (parts[1].indexOf('K') !== -1 ? 1024 : 1));
                }
                if (parts[0].toUpperCase().indexOf('L3 CACHE') !== -1) {
                  result.l3 = parseInt(parts[1].trim()) * (parts[1].indexOf('M') !== -1 ? 1024 * 1024 : (parts[1].indexOf('K') !== -1 ? 1024 : 1));
                }
              });
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('export LC_ALL=C; dmidecode -t 7 2>/dev/null; unset LC_ALL', function (error, stdout) {
          let cache = [];
          if (!error) {
            const data = stdout.toString();
            cache = data.split('Cache Information');
            cache.shift();
          }
          for (let i = 0; i < cache.length; i++) {
            const lines = cache[i].split('\n');
            let cacheType = util.getValue(lines, 'Socket Designation').toLowerCase().replace(' ', '-').split('-');
            cacheType = cacheType.length ? cacheType[0] : '';
            const sizeParts = util.getValue(lines, 'Installed Size').split(' ');
            let size = parseInt(sizeParts[0], 10);
            const unit = sizeParts.length > 1 ? sizeParts[1] : 'kb';
            size = size * (unit === 'kb' ? 1024 : (unit === 'mb' ? 1024 * 1024 : (unit === 'gb' ? 1024 * 1024 * 1024 : 1)));
            if (cacheType) {
              if (cacheType === 'l1') {
                result.cache[cacheType + 'd'] = size / 2;
                result.cache[cacheType + 'i'] = size / 2;
              } else {
                result.cache[cacheType] = size;
              }
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        exec('sysctl hw.l1icachesize hw.l1dcachesize hw.l2cachesize hw.l3cachesize', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            lines.forEach(function (line) {
              let parts = line.split(':');
              if (parts[0].toLowerCase().indexOf('hw.l1icachesize') !== -1) {
                result.l1d = parseInt(parts[1].trim()) * (parts[1].indexOf('K') !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf('hw.l1dcachesize') !== -1) {
                result.l1i = parseInt(parts[1].trim()) * (parts[1].indexOf('K') !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf('hw.l2cachesize') !== -1) {
                result.l2 = parseInt(parts[1].trim()) * (parts[1].indexOf('K') !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf('hw.l3cachesize') !== -1) {
                result.l3 = parseInt(parts[1].trim()) * (parts[1].indexOf('K') !== -1 ? 1024 : 1);
              }
            });
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance Win32_processor | select L2CacheSize, L3CacheSize | fl'));
          workload.push(util.powerShell('Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl'));

          Promise.all(
            workload
          ).then((data) => {
            result = parseWinCache(data[0], data[1]);

            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

function parseWinCache(linesProc, linesCache) {
  let result = {
    l1d: null,
    l1i: null,
    l2: null,
    l3: null,
  };

  // Win32_processor
  let lines = linesProc.split('\r\n');
  result.l1d = 0;
  result.l1i = 0;
  result.l2 = util.getValue(lines, 'l2cachesize', ':');
  result.l3 = util.getValue(lines, 'l3cachesize', ':');
  if (result.l2) { result.l2 = parseInt(result.l2, 10) * 1024; } else { result.l2 = 0; }
  if (result.l3) { result.l3 = parseInt(result.l3, 10) * 1024; } else { result.l3 = 0; }

  // Win32_CacheMemory
  const parts = linesCache.split(/\n\s*\n/);
  let l1i = 0;
  let l1d = 0;
  let l2 = 0;
  parts.forEach(function (part) {
    const lines = part.split('\r\n');
    const cacheType = util.getValue(lines, 'CacheType');
    const level = util.getValue(lines, 'Level');
    const installedSize = util.getValue(lines, 'InstalledSize');
    // L1 Instructions
    if (level === '3' && cacheType === '3') {
      result.l1i = result.l1i + parseInt(installedSize, 10) * 1024;
    }
    // L1 Data
    if (level === '3' && cacheType === '4') {
      result.l1d = result.l1d + parseInt(installedSize, 10) * 1024;
    }
    // L1 all
    if (level === '3' && cacheType === '5') {
      l1i = parseInt(installedSize, 10) / 2;
      l1d = parseInt(installedSize, 10) / 2;
    }
    // L2
    if (level === '4' && cacheType === '5') {
      l2 = l2 + parseInt(installedSize, 10) * 1024;
    }
  });
  if (!result.l1i && !result.l1d) {
    result.l1i = l1i;
    result.l1d = l1d;
  }
  if (l2) {
    result.l2 = l2;
  }
  return result;
}

exports.cpuCache = cpuCache;

// --------------------------
// CPU - current load - in %

function getLoad() {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let loads = os.loadavg().map(function (x) { return x / util.cores(); });
      let avgLoad = parseFloat((Math.max.apply(Math, loads)).toFixed(2));
      let result = {};

      let now = Date.now() - _current_cpu.ms;
      if (now >= 200) {
        _current_cpu.ms = Date.now();
        const cpus = os.cpus().map(function (cpu) {
          cpu.times.steal = 0;
          cpu.times.guest = 0;
          return cpu;
        });
        let totalUser = 0;
        let totalSystem = 0;
        let totalNice = 0;
        let totalIrq = 0;
        let totalIdle = 0;
        let totalSteal = 0;
        let totalGuest = 0;
        let cores = [];
        _corecount = (cpus && cpus.length) ? cpus.length : 0;

        // linux: try to get other cpu stats
        if (_linux) {
          try {
            const lines = execSync('cat /proc/stat 2>/dev/null | grep cpu', { encoding: 'utf8' }).toString().split('\n');
            if (lines.length > 1) {
              lines.shift();
              if (lines.length === cpus.length) {
                for (let i = 0; i < lines.length; i++) {
                  let parts = lines[i].split(' ');
                  if (parts.length >= 10) {
                    const steal = parseFloat(parts[8]) || 0;
                    const guest = parseFloat(parts[9]) || 0;
                    cpus[i].times.steal = steal;
                    cpus[i].times.guest = guest;
                  }
                }
              }
            }
          } catch (e) {
            util.noop();
          }
        }

        for (let i = 0; i < _corecount; i++) {
          const cpu = cpus[i].times;
          totalUser += cpu.user;
          totalSystem += cpu.sys;
          totalNice += cpu.nice;
          totalIdle += cpu.idle;
          totalIrq += cpu.irq;
          totalSteal += cpu.steal || 0;
          totalGuest += cpu.guest || 0;
          let tmpTick = (_cpus && _cpus[i] && _cpus[i].totalTick ? _cpus[i].totalTick : 0);
          let tmpLoad = (_cpus && _cpus[i] && _cpus[i].totalLoad ? _cpus[i].totalLoad : 0);
          let tmpUser = (_cpus && _cpus[i] && _cpus[i].user ? _cpus[i].user : 0);
          let tmpSystem = (_cpus && _cpus[i] && _cpus[i].sys ? _cpus[i].sys : 0);
          let tmpNice = (_cpus && _cpus[i] && _cpus[i].nice ? _cpus[i].nice : 0);
          let tmpIdle = (_cpus && _cpus[i] && _cpus[i].idle ? _cpus[i].idle : 0);
          let tmpIrq = (_cpus && _cpus[i] && _cpus[i].irq ? _cpus[i].irq : 0);
          let tmpSteal = (_cpus && _cpus[i] && _cpus[i].steal ? _cpus[i].steal : 0);
          let tmpGuest = (_cpus && _cpus[i] && _cpus[i].guest ? _cpus[i].guest : 0);
          _cpus[i] = cpu;
          _cpus[i].totalTick = _cpus[i].user + _cpus[i].sys + _cpus[i].nice + _cpus[i].irq + _cpus[i].steal + _cpus[i].guest + _cpus[i].idle;
          _cpus[i].totalLoad = _cpus[i].user + _cpus[i].sys + _cpus[i].nice + _cpus[i].irq + _cpus[i].steal + _cpus[i].guest;
          _cpus[i].currentTick = _cpus[i].totalTick - tmpTick;
          _cpus[i].load = (_cpus[i].totalLoad - tmpLoad);
          _cpus[i].loadUser = (_cpus[i].user - tmpUser);
          _cpus[i].loadSystem = (_cpus[i].sys - tmpSystem);
          _cpus[i].loadNice = (_cpus[i].nice - tmpNice);
          _cpus[i].loadIdle = (_cpus[i].idle - tmpIdle);
          _cpus[i].loadIrq = (_cpus[i].irq - tmpIrq);
          _cpus[i].loadSteal = (_cpus[i].steal - tmpSteal);
          _cpus[i].loadGuest = (_cpus[i].guest - tmpGuest);
          cores[i] = {};
          cores[i].load = _cpus[i].load / _cpus[i].currentTick * 100;
          cores[i].loadUser = _cpus[i].loadUser / _cpus[i].currentTick * 100;
          cores[i].loadSystem = _cpus[i].loadSystem / _cpus[i].currentTick * 100;
          cores[i].loadNice = _cpus[i].loadNice / _cpus[i].currentTick * 100;
          cores[i].loadIdle = _cpus[i].loadIdle / _cpus[i].currentTick * 100;
          cores[i].loadIrq = _cpus[i].loadIrq / _cpus[i].currentTick * 100;
          cores[i].loadSteal = _cpus[i].loadSteal / _cpus[i].currentTick * 100;
          cores[i].loadGuest = _cpus[i].loadGuest / _cpus[i].currentTick * 100;
          cores[i].rawLoad = _cpus[i].load;
          cores[i].rawLoadUser = _cpus[i].loadUser;
          cores[i].rawLoadSystem = _cpus[i].loadSystem;
          cores[i].rawLoadNice = _cpus[i].loadNice;
          cores[i].rawLoadIdle = _cpus[i].loadIdle;
          cores[i].rawLoadIrq = _cpus[i].loadIrq;
          cores[i].rawLoadSteal = _cpus[i].loadSteal;
          cores[i].rawLoadGuest = _cpus[i].loadGuest;
        }
        let totalTick = totalUser + totalSystem + totalNice + totalIrq + totalSteal + totalGuest + totalIdle;
        let totalLoad = totalUser + totalSystem + totalNice + totalIrq + totalSteal + totalGuest;
        let currentTick = totalTick - _current_cpu.tick;
        result = {
          avgLoad: avgLoad,
          currentLoad: (totalLoad - _current_cpu.load) / currentTick * 100,
          currentLoadUser: (totalUser - _current_cpu.user) / currentTick * 100,
          currentLoadSystem: (totalSystem - _current_cpu.system) / currentTick * 100,
          currentLoadNice: (totalNice - _current_cpu.nice) / currentTick * 100,
          currentLoadIdle: (totalIdle - _current_cpu.idle) / currentTick * 100,
          currentLoadIrq: (totalIrq - _current_cpu.irq) / currentTick * 100,
          currentLoadSteal: (totalSteal - _current_cpu.steal) / currentTick * 100,
          currentLoadGuest: (totalGuest - _current_cpu.guest) / currentTick * 100,
          rawCurrentLoad: (totalLoad - _current_cpu.load),
          rawCurrentLoadUser: (totalUser - _current_cpu.user),
          rawCurrentLoadSystem: (totalSystem - _current_cpu.system),
          rawCurrentLoadNice: (totalNice - _current_cpu.nice),
          rawCurrentLoadIdle: (totalIdle - _current_cpu.idle),
          rawCurrentLoadIrq: (totalIrq - _current_cpu.irq),
          rawCurrentLoadSteal: (totalSteal - _current_cpu.steal),
          rawCurrentLoadGuest: (totalGuest - _current_cpu.guest),
          cpus: cores
        };
        _current_cpu = {
          user: totalUser,
          nice: totalNice,
          system: totalSystem,
          idle: totalIdle,
          irq: totalIrq,
          steal: totalSteal,
          guest: totalGuest,
          tick: totalTick,
          load: totalLoad,
          ms: _current_cpu.ms,
          currentLoad: result.currentLoad,
          currentLoadUser: result.currentLoadUser,
          currentLoadSystem: result.currentLoadSystem,
          currentLoadNice: result.currentLoadNice,
          currentLoadIdle: result.currentLoadIdle,
          currentLoadIrq: result.currentLoadIrq,
          currentLoadSteal: result.currentLoadSteal,
          currentLoadGuest: result.currentLoadGuest,
          rawCurrentLoad: result.rawCurrentLoad,
          rawCurrentLoadUser: result.rawCurrentLoadUser,
          rawCurrentLoadSystem: result.rawCurrentLoadSystem,
          rawCurrentLoadNice: result.rawCurrentLoadNice,
          rawCurrentLoadIdle: result.rawCurrentLoadIdle,
          rawCurrentLoadIrq: result.rawCurrentLoadIrq,
          rawCurrentLoadSteal: result.rawCurrentLoadSteal,
          rawCurrentLoadGuest: result.rawCurrentLoadGuest,
        };
      } else {
        let cores = [];
        for (let i = 0; i < _corecount; i++) {
          cores[i] = {};
          cores[i].load = _cpus[i].load / _cpus[i].currentTick * 100;
          cores[i].loadUser = _cpus[i].loadUser / _cpus[i].currentTick * 100;
          cores[i].loadSystem = _cpus[i].loadSystem / _cpus[i].currentTick * 100;
          cores[i].loadNice = _cpus[i].loadNice / _cpus[i].currentTick * 100;
          cores[i].loadIdle = _cpus[i].loadIdle / _cpus[i].currentTick * 100;
          cores[i].loadIrq = _cpus[i].loadIrq / _cpus[i].currentTick * 100;
          cores[i].rawLoad = _cpus[i].load;
          cores[i].rawLoadUser = _cpus[i].loadUser;
          cores[i].rawLoadSystem = _cpus[i].loadSystem;
          cores[i].rawLoadNice = _cpus[i].loadNice;
          cores[i].rawLoadIdle = _cpus[i].loadIdle;
          cores[i].rawLoadIrq = _cpus[i].loadIrq;
          cores[i].rawLoadSteal = _cpus[i].loadSteal;
          cores[i].rawLoadGuest = _cpus[i].loadGuest;
        }
        result = {
          avgLoad: avgLoad,
          currentLoad: _current_cpu.currentLoad,
          currentLoadUser: _current_cpu.currentLoadUser,
          currentLoadSystem: _current_cpu.currentLoadSystem,
          currentLoadNice: _current_cpu.currentLoadNice,
          currentLoadIdle: _current_cpu.currentLoadIdle,
          currentLoadIrq: _current_cpu.currentLoadIrq,
          currentLoadSteal: _current_cpu.currentLoadSteal,
          currentLoadGuest: _current_cpu.currentLoadGuest,
          rawCurrentLoad: _current_cpu.rawCurrentLoad,
          rawCurrentLoadUser: _current_cpu.rawCurrentLoadUser,
          rawCurrentLoadSystem: _current_cpu.rawCurrentLoadSystem,
          rawCurrentLoadNice: _current_cpu.rawCurrentLoadNice,
          rawCurrentLoadIdle: _current_cpu.rawCurrentLoadIdle,
          rawCurrentLoadIrq: _current_cpu.rawCurrentLoadIrq,
          rawCurrentLoadSteal: _current_cpu.rawCurrentLoadSteal,
          rawCurrentLoadGuest: _current_cpu.rawCurrentLoadGuest,
          cpus: cores
        };
      }
      resolve(result);
    });
  });
}

function currentLoad(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      getLoad().then(result => {
        if (callback) { callback(result); }
        resolve(result);
      });
    });
  });
}

exports.currentLoad = currentLoad;

// --------------------------
// PS - full load
// since bootup

function getFullLoad() {

  return new Promise((resolve) => {
    process.nextTick(() => {

      const cpus = os.cpus();
      let totalUser = 0;
      let totalSystem = 0;
      let totalNice = 0;
      let totalIrq = 0;
      let totalIdle = 0;

      let result = 0;

      if (cpus && cpus.length) {
        for (let i = 0, len = cpus.length; i < len; i++) {
          const cpu = cpus[i].times;
          totalUser += cpu.user;
          totalSystem += cpu.sys;
          totalNice += cpu.nice;
          totalIrq += cpu.irq;
          totalIdle += cpu.idle;
        }
        let totalTicks = totalIdle + totalIrq + totalNice + totalSystem + totalUser;
        result = (totalTicks - totalIdle) / totalTicks * 100.0;

      }
      resolve(result);
    });
  });
}

function fullLoad(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      getFullLoad().then(result => {
        if (callback) { callback(result); }
        resolve(result);
      });
    });
  });
}

exports.fullLoad = fullLoad;


/***/ }),

/***/ 8953:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// docker.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 13. Docker
// ----------------------------------------------------------------------------------

const util = __nccwpck_require__(7146);
const DockerSocket = __nccwpck_require__(3708);

let _platform = process.platform;
const _windows = (_platform === 'win32');

let _docker_container_stats = {};
let _docker_socket;
let _docker_last_read = 0;


// --------------------------
// get containers (parameter all: get also inactive/exited containers)

function dockerInfo(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket();
      }
      const result = {};

      _docker_socket.getInfo((data) => {
        result.id = data.ID;
        result.containers = data.Containers;
        result.containersRunning = data.ContainersRunning;
        result.containersPaused = data.ContainersPaused;
        result.containersStopped = data.ContainersStopped;
        result.images = data.Images;
        result.driver = data.Driver;
        result.memoryLimit = data.MemoryLimit;
        result.swapLimit = data.SwapLimit;
        result.kernelMemory = data.KernelMemory;
        result.cpuCfsPeriod = data.CpuCfsPeriod;
        result.cpuCfsQuota = data.CpuCfsQuota;
        result.cpuShares = data.CPUShares;
        result.cpuSet = data.CPUSet;
        result.ipv4Forwarding = data.IPv4Forwarding;
        result.bridgeNfIptables = data.BridgeNfIptables;
        result.bridgeNfIp6tables = data.BridgeNfIp6tables;
        result.debug = data.Debug;
        result.nfd = data.NFd;
        result.oomKillDisable = data.OomKillDisable;
        result.ngoroutines = data.NGoroutines;
        result.systemTime = data.SystemTime;
        result.loggingDriver = data.LoggingDriver;
        result.cgroupDriver = data.CgroupDriver;
        result.nEventsListener = data.NEventsListener;
        result.kernelVersion = data.KernelVersion;
        result.operatingSystem = data.OperatingSystem;
        result.osType = data.OSType;
        result.architecture = data.Architecture;
        result.ncpu = data.NCPU;
        result.memTotal = data.MemTotal;
        result.dockerRootDir = data.DockerRootDir;
        result.httpProxy = data.HttpProxy;
        result.httpsProxy = data.HttpsProxy;
        result.noProxy = data.NoProxy;
        result.name = data.Name;
        result.labels = data.Labels;
        result.experimentalBuild = data.ExperimentalBuild;
        result.serverVersion = data.ServerVersion;
        result.clusterStore = data.ClusterStore;
        result.clusterAdvertise = data.ClusterAdvertise;
        result.defaultRuntime = data.DefaultRuntime;
        result.liveRestoreEnabled = data.LiveRestoreEnabled;
        result.isolation = data.Isolation;
        result.initBinary = data.InitBinary;
        result.productLicense = data.ProductLicense;
        if (callback) { callback(result); }
        resolve(result);
      });
    });
  });
}

exports.dockerInfo = dockerInfo;

function dockerImages(all, callback) {

  // fallback - if only callback is given
  if (util.isFunction(all) && !callback) {
    callback = all;
    all = false;
  }
  if (typeof all === 'string' && all === 'true') {
    all = true;
  }
  if (typeof all !== 'boolean' && all !== undefined) {
    all = false;
  }

  all = all || false;
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket();
      }
      const workload = [];

      _docker_socket.listImages(all, data => {
        let dockerImages = {};
        try {
          dockerImages = data;
          if (dockerImages && Object.prototype.toString.call(dockerImages) === '[object Array]' && dockerImages.length > 0) {

            dockerImages.forEach(function (element) {

              if (element.Names && Object.prototype.toString.call(element.Names) === '[object Array]' && element.Names.length > 0) {
                element.Name = element.Names[0].replace(/^\/|\/$/g, '');
              }
              workload.push(dockerImagesInspect(element.Id.trim(), element));
            });
            if (workload.length) {
              Promise.all(
                workload
              ).then((data) => {
                if (callback) { callback(data); }
                resolve(data);
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        } catch (err) {
          if (callback) { callback(result); }
          resolve(result);
        }
      });
    });
  });
}

// --------------------------
// container inspect (for one container)

function dockerImagesInspect(imageID, payload) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      imageID = imageID || '';
      if (typeof imageID !== 'string') {
        return resolve();
      }
      const imageIDSanitized = (util.isPrototypePolluted() ? '' : util.sanitizeShellString(imageID, true)).trim();
      if (imageIDSanitized) {

        if (!_docker_socket) {
          _docker_socket = new DockerSocket();
        }

        _docker_socket.inspectImage(imageIDSanitized.trim(), data => {
          try {
            resolve({
              id: payload.Id,
              container: data.Container,
              comment: data.Comment,
              os: data.Os,
              architecture: data.Architecture,
              parent: data.Parent,
              dockerVersion: data.DockerVersion,
              size: data.Size,
              sharedSize: payload.SharedSize,
              virtualSize: data.VirtualSize,
              author: data.Author,
              created: data.Created ? Math.round(new Date(data.Created).getTime() / 1000) : 0,
              containerConfig: data.ContainerConfig ? data.ContainerConfig : {},
              graphDriver: data.GraphDriver ? data.GraphDriver : {},
              repoDigests: data.RepoDigests ? data.RepoDigests : {},
              repoTags: data.RepoTags ? data.RepoTags : {},
              config: data.Config ? data.Config : {},
              rootFS: data.RootFS ? data.RootFS : {},
            });
          } catch (err) {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

exports.dockerImages = dockerImages;

function dockerContainers(all, callback) {

  function inContainers(containers, id) {
    let filtered = containers.filter(obj => {
      /**
       * @namespace
       * @property {string}  Id
       */
      return (obj.Id && (obj.Id === id));
    });
    return (filtered.length > 0);
  }

  // fallback - if only callback is given
  if (util.isFunction(all) && !callback) {
    callback = all;
    all = false;
  }
  if (typeof all === 'string' && all === 'true') {
    all = true;
  }
  if (typeof all !== 'boolean' && all !== undefined) {
    all = false;
  }

  all = all || false;
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket();
      }
      const workload = [];

      _docker_socket.listContainers(all, data => {
        let docker_containers = {};
        try {
          docker_containers = data;
          if (docker_containers && Object.prototype.toString.call(docker_containers) === '[object Array]' && docker_containers.length > 0) {
            // GC in _docker_container_stats
            for (let key in _docker_container_stats) {
              if ({}.hasOwnProperty.call(_docker_container_stats, key)) {
                if (!inContainers(docker_containers, key)) { delete _docker_container_stats[key]; }
              }
            }

            docker_containers.forEach(function (element) {

              if (element.Names && Object.prototype.toString.call(element.Names) === '[object Array]' && element.Names.length > 0) {
                element.Name = element.Names[0].replace(/^\/|\/$/g, '');
              }
              workload.push(dockerContainerInspect(element.Id.trim(), element));
            });
            if (workload.length) {
              Promise.all(
                workload
              ).then((data) => {
                if (callback) { callback(data); }
                resolve(data);
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        } catch (err) {
          // GC in _docker_container_stats
          for (let key in _docker_container_stats) {
            if ({}.hasOwnProperty.call(_docker_container_stats, key)) {
              if (!inContainers(docker_containers, key)) { delete _docker_container_stats[key]; }
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        }
      });
    });
  });
}

// --------------------------
// container inspect (for one container)

function dockerContainerInspect(containerID, payload) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      containerID = containerID || '';
      if (typeof containerID !== 'string') {
        return resolve();
      }
      const containerIdSanitized = (util.isPrototypePolluted() ? '' : util.sanitizeShellString(containerID, true)).trim();
      if (containerIdSanitized) {

        if (!_docker_socket) {
          _docker_socket = new DockerSocket();
        }

        _docker_socket.getInspect(containerIdSanitized.trim(), data => {
          try {
            resolve({
              id: payload.Id,
              name: payload.Name,
              image: payload.Image,
              imageID: payload.ImageID,
              command: payload.Command,
              created: payload.Created,
              started: data.State && data.State.StartedAt ? Math.round(new Date(data.State.StartedAt).getTime() / 1000) : 0,
              finished: data.State && data.State.FinishedAt && !data.State.FinishedAt.startsWith('0001-01-01') ? Math.round(new Date(data.State.FinishedAt).getTime() / 1000) : 0,
              createdAt: data.Created ? data.Created : '',
              startedAt: data.State && data.State.StartedAt ? data.State.StartedAt : '',
              finishedAt: data.State && data.State.FinishedAt && !data.State.FinishedAt.startsWith('0001-01-01') ? data.State.FinishedAt : '',
              state: payload.State,
              restartCount: data.RestartCount || 0,
              platform: data.Platform || '',
              driver: data.Driver || '',
              ports: payload.Ports,
              mounts: payload.Mounts,
              // hostconfig: payload.HostConfig,
              // network: payload.NetworkSettings
            });
          } catch (err) {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

exports.dockerContainers = dockerContainers;

// --------------------------
// helper functions for calculation of docker stats

function docker_calcCPUPercent(cpu_stats, precpu_stats) {
  /**
   * @namespace
   * @property {object}  cpu_usage
   * @property {number}  cpu_usage.total_usage
   * @property {number}  system_cpu_usage
   * @property {object}  cpu_usage
   * @property {Array}  cpu_usage.percpu_usage
   */

  if (!_windows) {
    let cpuPercent = 0.0;
    // calculate the change for the cpu usage of the container in between readings
    let cpuDelta = cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage;
    // calculate the change for the entire system between readings
    let systemDelta = cpu_stats.system_cpu_usage - precpu_stats.system_cpu_usage;

    if (systemDelta > 0.0 && cpuDelta > 0.0) {
      // calculate the change for the cpu usage of the container in between readings
      if (precpu_stats.online_cpus) {
        cpuPercent = (cpuDelta / systemDelta) * precpu_stats.online_cpus * 100.0;
      }
      else {
        cpuPercent = (cpuDelta / systemDelta) * cpu_stats.cpu_usage.percpu_usage.length * 100.0;
      }
    }

    return cpuPercent;
  } else {
    let nanoSecNow = util.nanoSeconds();
    let cpuPercent = 0.0;
    if (_docker_last_read > 0) {
      let possIntervals = (nanoSecNow - _docker_last_read); //  / 100 * os.cpus().length;
      let intervalsUsed = cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage;
      if (possIntervals > 0) {
        cpuPercent = 100.0 * intervalsUsed / possIntervals;
      }
    }
    _docker_last_read = nanoSecNow;
    return cpuPercent;
  }
}

function docker_calcNetworkIO(networks) {
  let rx;
  let wx;
  for (let key in networks) {
    // skip loop if the property is from prototype
    if (!{}.hasOwnProperty.call(networks, key)) { continue; }

    /**
     * @namespace
     * @property {number}  rx_bytes
     * @property {number}  tx_bytes
     */
    let obj = networks[key];
    rx = +obj.rx_bytes;
    wx = +obj.tx_bytes;
  }
  return {
    rx,
    wx
  };
}

function docker_calcBlockIO(blkio_stats) {
  let result = {
    r: 0,
    w: 0
  };

  /**
   * @namespace
   * @property {Array}  io_service_bytes_recursive
   */
  if (blkio_stats && blkio_stats.io_service_bytes_recursive && Object.prototype.toString.call(blkio_stats.io_service_bytes_recursive) === '[object Array]' && blkio_stats.io_service_bytes_recursive.length > 0) {
    blkio_stats.io_service_bytes_recursive.forEach(function (element) {
      /**
       * @namespace
       * @property {string}  op
       * @property {number}  value
       */

      if (element.op && element.op.toLowerCase() === 'read' && element.value) {
        result.r += element.value;
      }
      if (element.op && element.op.toLowerCase() === 'write' && element.value) {
        result.w += element.value;
      }
    });
  }
  return result;
}

function dockerContainerStats(containerIDs, callback) {

  let containerArray = [];
  return new Promise((resolve) => {
    process.nextTick(() => {

      // fallback - if only callback is given
      if (util.isFunction(containerIDs) && !callback) {
        callback = containerIDs;
        containerArray = ['*'];
      } else {
        containerIDs = containerIDs || '*';
        if (typeof containerIDs !== 'string') {
          if (callback) { callback([]); }
          return resolve([]);
        }
        let containerIDsSanitized = '';
        containerIDsSanitized.__proto__.toLowerCase = util.stringToLower;
        containerIDsSanitized.__proto__.replace = util.stringReplace;
        containerIDsSanitized.__proto__.trim = util.stringTrim;

        containerIDsSanitized = containerIDs;
        containerIDsSanitized = containerIDsSanitized.trim();
        if (containerIDsSanitized !== '*') {
          containerIDsSanitized = '';
          const s = (util.isPrototypePolluted() ? '' : util.sanitizeShellString(containerIDs, true)).trim();
          const l = util.mathMin(s.length, 2000);
          for (let i = 0; i <= l; i++) {
            if (s[i] !== undefined) {
              s[i].__proto__.toLowerCase = util.stringToLower;
              const sl = s[i].toLowerCase();
              if (sl && sl[0] && !sl[1]) {
                containerIDsSanitized = containerIDsSanitized + sl[0];
              }
            }
          }
        }

        containerIDsSanitized = containerIDsSanitized.trim().toLowerCase().replace(/,+/g, '|');
        containerArray = containerIDsSanitized.split('|');
      }

      const result = [];

      const workload = [];
      if (containerArray.length && containerArray[0].trim() === '*') {
        containerArray = [];
        dockerContainers().then(allContainers => {
          for (let container of allContainers) {
            containerArray.push(container.id.substring(0, 12));
          }
          if (containerArray.length) {
            dockerContainerStats(containerArray.join(',')).then(result => {
              if (callback) { callback(result); }
              resolve(result);
            });
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        });
      } else {
        for (let containerID of containerArray) {
          workload.push(dockerContainerStatsSingle(containerID.trim()));
        }
        if (workload.length) {
          Promise.all(
            workload
          ).then((data) => {
            if (callback) { callback(data); }
            resolve(data);
          });
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

// --------------------------
// container stats (for one container)

function dockerContainerStatsSingle(containerID) {
  containerID = containerID || '';
  let result = {
    id: containerID,
    memUsage: 0,
    memLimit: 0,
    memPercent: 0,
    cpuPercent: 0,
    pids: 0,
    netIO: {
      rx: 0,
      wx: 0
    },
    blockIO: {
      r: 0,
      w: 0
    },
    restartCount: 0,
    cpuStats: {},
    precpuStats: {},
    memoryStats: {},
    networks: {},
  };
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (containerID) {

        if (!_docker_socket) {
          _docker_socket = new DockerSocket();
        }

        _docker_socket.getInspect(containerID, dataInspect => {
          try {
            _docker_socket.getStats(containerID, data => {
              try {
                let stats = data;
                if (!stats.message) {
                  if (data.id) { result.id = data.id; }
                  result.memUsage = (stats.memory_stats && stats.memory_stats.usage ? stats.memory_stats.usage : 0);
                  result.memLimit = (stats.memory_stats && stats.memory_stats.limit ? stats.memory_stats.limit : 0);
                  result.memPercent = (stats.memory_stats && stats.memory_stats.usage && stats.memory_stats.limit ? stats.memory_stats.usage / stats.memory_stats.limit * 100.0 : 0);
                  result.cpuPercent = (stats.cpu_stats && stats.precpu_stats ? docker_calcCPUPercent(stats.cpu_stats, stats.precpu_stats) : 0);
                  result.pids = (stats.pids_stats && stats.pids_stats.current ? stats.pids_stats.current : 0);
                  result.restartCount = (dataInspect.RestartCount ? dataInspect.RestartCount : 0);
                  if (stats.networks) { result.netIO = docker_calcNetworkIO(stats.networks); }
                  if (stats.blkio_stats) { result.blockIO = docker_calcBlockIO(stats.blkio_stats); }
                  result.cpuStats = (stats.cpu_stats ? stats.cpu_stats : {});
                  result.precpuStats = (stats.precpu_stats ? stats.precpu_stats : {});
                  result.memoryStats = (stats.memory_stats ? stats.memory_stats : {});
                  result.networks = (stats.networks ? stats.networks : {});
                }
              } catch (err) {
                util.noop();
              }
              // }
              resolve(result);
            });
          } catch (err) {
            util.noop();
          }
        });
      } else {
        resolve(result);
      }
    });
  });
}

exports.dockerContainerStats = dockerContainerStats;

// --------------------------
// container processes (for one container)

function dockerContainerProcesses(containerID, callback) {
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      containerID = containerID || '';
      if (typeof containerID !== 'string') {
        return resolve(result);
      }
      const containerIdSanitized = (util.isPrototypePolluted() ? '' : util.sanitizeShellString(containerID, true)).trim();

      if (containerIdSanitized) {

        if (!_docker_socket) {
          _docker_socket = new DockerSocket();
        }

        _docker_socket.getProcesses(containerIdSanitized, data => {
          /**
           * @namespace
           * @property {Array}  Titles
           * @property {Array}  Processes
           **/
          try {
            if (data && data.Titles && data.Processes) {
              let titles = data.Titles.map(function (value) {
                return value.toUpperCase();
              });
              let pos_pid = titles.indexOf('PID');
              let pos_ppid = titles.indexOf('PPID');
              let pos_pgid = titles.indexOf('PGID');
              let pos_vsz = titles.indexOf('VSZ');
              let pos_time = titles.indexOf('TIME');
              let pos_elapsed = titles.indexOf('ELAPSED');
              let pos_ni = titles.indexOf('NI');
              let pos_ruser = titles.indexOf('RUSER');
              let pos_user = titles.indexOf('USER');
              let pos_rgroup = titles.indexOf('RGROUP');
              let pos_group = titles.indexOf('GROUP');
              let pos_stat = titles.indexOf('STAT');
              let pos_rss = titles.indexOf('RSS');
              let pos_command = titles.indexOf('COMMAND');

              data.Processes.forEach(process => {
                result.push({
                  pidHost: (pos_pid >= 0 ? process[pos_pid] : ''),
                  ppid: (pos_ppid >= 0 ? process[pos_ppid] : ''),
                  pgid: (pos_pgid >= 0 ? process[pos_pgid] : ''),
                  user: (pos_user >= 0 ? process[pos_user] : ''),
                  ruser: (pos_ruser >= 0 ? process[pos_ruser] : ''),
                  group: (pos_group >= 0 ? process[pos_group] : ''),
                  rgroup: (pos_rgroup >= 0 ? process[pos_rgroup] : ''),
                  stat: (pos_stat >= 0 ? process[pos_stat] : ''),
                  time: (pos_time >= 0 ? process[pos_time] : ''),
                  elapsed: (pos_elapsed >= 0 ? process[pos_elapsed] : ''),
                  nice: (pos_ni >= 0 ? process[pos_ni] : ''),
                  rss: (pos_rss >= 0 ? process[pos_rss] : ''),
                  vsz: (pos_vsz >= 0 ? process[pos_vsz] : ''),
                  command: (pos_command >= 0 ? process[pos_command] : '')
                });
              });
            }
          } catch (err) {
            util.noop();
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      } else {
        if (callback) { callback(result); }
        resolve(result);
      }
    });
  });
}

exports.dockerContainerProcesses = dockerContainerProcesses;

function dockerVolumes(callback) {

  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket();
      }
      _docker_socket.listVolumes((data) => {
        let dockerVolumes = {};
        try {
          dockerVolumes = data;
          if (dockerVolumes && dockerVolumes.Volumes && Object.prototype.toString.call(dockerVolumes.Volumes) === '[object Array]' && dockerVolumes.Volumes.length > 0) {

            dockerVolumes.Volumes.forEach(function (element) {

              result.push({
                name: element.Name,
                driver: element.Driver,
                labels: element.Labels,
                mountpoint: element.Mountpoint,
                options: element.Options,
                scope: element.Scope,
                created: element.CreatedAt ? Math.round(new Date(element.CreatedAt).getTime() / 1000) : 0,
              });
            });
            if (callback) { callback(result); }
            resolve(result);
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        } catch (err) {
          if (callback) { callback(result); }
          resolve(result);
        }
      });
    });
  });
}

exports.dockerVolumes = dockerVolumes;

function dockerAll(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      dockerContainers(true).then(result => {
        if (result && Object.prototype.toString.call(result) === '[object Array]' && result.length > 0) {
          let l = result.length;
          result.forEach(function (element) {
            dockerContainerStats(element.id).then((res) => {
              // include stats in array
              element.memUsage = res[0].memUsage;
              element.memLimit = res[0].memLimit;
              element.memPercent = res[0].memPercent;
              element.cpuPercent = res[0].cpuPercent;
              element.pids = res[0].pids;
              element.netIO = res[0].netIO;
              element.blockIO = res[0].blockIO;
              element.cpuStats = res[0].cpuStats;
              element.precpuStats = res[0].precpuStats;
              element.memoryStats = res[0].memoryStats;
              element.networks = res[0].networks;

              dockerContainerProcesses(element.id).then(processes => {
                element.processes = processes;

                l -= 1;
                if (l === 0) {
                  if (callback) { callback(result); }
                  resolve(result);
                }
              });
              // all done??
            });
          });
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      });
    });
  });
}

exports.dockerAll = dockerAll;


/***/ }),

/***/ 3708:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// dockerSockets.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 13. DockerSockets
// ----------------------------------------------------------------------------------

const net = __nccwpck_require__(1808);
const isWin = (__nccwpck_require__(2037).type)() === 'Windows_NT';
const socketPath = isWin ? '//./pipe/docker_engine' : '/var/run/docker.sock';

class DockerSocket {

  getInfo(callback) {
    try {

      let socket = net.createConnection({ path: socketPath });
      let alldata = '';
      let data;

      socket.on('connect', () => {
        socket.write('GET http:/info HTTP/1.0\r\n\r\n');
      });

      socket.on('data', data => {
        alldata = alldata + data.toString();
      });

      socket.on('error', () => {
        socket = false;
        callback({});
      });

      socket.on('end', () => {
        let startbody = alldata.indexOf('\r\n\r\n');
        alldata = alldata.substring(startbody + 4);
        socket = false;
        try {
          data = JSON.parse(alldata);
          callback(data);
        } catch (err) {
          callback({});
        }
      });
    } catch (err) {
      callback({});
    }
  }

  listImages(all, callback) {
    try {

      let socket = net.createConnection({ path: socketPath });
      let alldata = '';
      let data;

      socket.on('connect', () => {
        socket.write('GET http:/images/json' + (all ? '?all=1' : '') + ' HTTP/1.0\r\n\r\n');
      });

      socket.on('data', data => {
        alldata = alldata + data.toString();
      });

      socket.on('error', () => {
        socket = false;
        callback({});
      });

      socket.on('end', () => {
        let startbody = alldata.indexOf('\r\n\r\n');
        alldata = alldata.substring(startbody + 4);
        socket = false;
        try {
          data = JSON.parse(alldata);
          callback(data);
        } catch (err) {
          callback({});
        }
      });
    } catch (err) {
      callback({});
    }
  }

  inspectImage(id, callback) {
    id = id || '';
    if (id) {
      try {
        let socket = net.createConnection({ path: socketPath });
        let alldata = '';
        let data;

        socket.on('connect', () => {
          socket.write('GET http:/images/' + id + '/json?stream=0 HTTP/1.0\r\n\r\n');
        });

        socket.on('data', data => {
          alldata = alldata + data.toString();
        });

        socket.on('error', () => {
          socket = false;
          callback({});
        });

        socket.on('end', () => {
          let startbody = alldata.indexOf('\r\n\r\n');
          alldata = alldata.substring(startbody + 4);
          socket = false;
          try {
            data = JSON.parse(alldata);
            callback(data);
          } catch (err) {
            callback({});
          }
        });
      } catch (err) {
        callback({});
      }
    } else {
      callback({});
    }
  }

  listContainers(all, callback) {
    try {

      let socket = net.createConnection({ path: socketPath });
      let alldata = '';
      let data;

      socket.on('connect', () => {
        socket.write('GET http:/containers/json' + (all ? '?all=1' : '') + ' HTTP/1.0\r\n\r\n');
      });

      socket.on('data', data => {
        alldata = alldata + data.toString();
      });

      socket.on('error', () => {
        socket = false;
        callback({});
      });

      socket.on('end', () => {
        let startbody = alldata.indexOf('\r\n\r\n');
        alldata = alldata.substring(startbody + 4);
        socket = false;
        try {
          data = JSON.parse(alldata);
          callback(data);
        } catch (err) {
          callback({});
        }
      });
    } catch (err) {
      callback({});
    }
  }

  getStats(id, callback) {
    id = id || '';
    if (id) {
      try {
        let socket = net.createConnection({ path: socketPath });
        let alldata = '';
        let data;

        socket.on('connect', () => {
          socket.write('GET http:/containers/' + id + '/stats?stream=0 HTTP/1.0\r\n\r\n');
        });

        socket.on('data', data => {
          alldata = alldata + data.toString();
        });

        socket.on('error', () => {
          socket = false;
          callback({});
        });

        socket.on('end', () => {
          let startbody = alldata.indexOf('\r\n\r\n');
          alldata = alldata.substring(startbody + 4);
          socket = false;
          try {
            data = JSON.parse(alldata);
            callback(data);
          } catch (err) {
            callback({});
          }
        });
      } catch (err) {
        callback({});
      }
    } else {
      callback({});
    }
  }

  getInspect(id, callback) {
    id = id || '';
    if (id) {
      try {
        let socket = net.createConnection({ path: socketPath });
        let alldata = '';
        let data;

        socket.on('connect', () => {
          socket.write('GET http:/containers/' + id + '/json?stream=0 HTTP/1.0\r\n\r\n');
        });

        socket.on('data', data => {
          alldata = alldata + data.toString();
        });

        socket.on('error', () => {
          socket = false;
          callback({});
        });

        socket.on('end', () => {
          let startbody = alldata.indexOf('\r\n\r\n');
          alldata = alldata.substring(startbody + 4);
          socket = false;
          try {
            data = JSON.parse(alldata);
            callback(data);
          } catch (err) {
            callback({});
          }
        });
      } catch (err) {
        callback({});
      }
    } else {
      callback({});
    }
  }

  getProcesses(id, callback) {
    id = id || '';
    if (id) {
      try {
        let socket = net.createConnection({ path: socketPath });
        let alldata = '';
        let data;

        socket.on('connect', () => {
          socket.write('GET http:/containers/' + id + '/top?ps_args=-opid,ppid,pgid,vsz,time,etime,nice,ruser,user,rgroup,group,stat,rss,args HTTP/1.0\r\n\r\n');
        });

        socket.on('data', data => {
          alldata = alldata + data.toString();
        });

        socket.on('error', () => {
          socket = false;
          callback({});
        });

        socket.on('end', () => {
          let startbody = alldata.indexOf('\r\n\r\n');
          alldata = alldata.substring(startbody + 4);
          socket = false;
          try {
            data = JSON.parse(alldata);
            callback(data);
          } catch (err) {
            callback({});
          }
        });
      } catch (err) {
        callback({});
      }
    } else {
      callback({});
    }
  }

  listVolumes(callback) {
    try {

      let socket = net.createConnection({ path: socketPath });
      let alldata = '';
      let data;

      socket.on('connect', () => {
        socket.write('GET http:/volumes HTTP/1.0\r\n\r\n');
      });

      socket.on('data', data => {
        alldata = alldata + data.toString();
      });

      socket.on('error', () => {
        socket = false;
        callback({});
      });

      socket.on('end', () => {
        let startbody = alldata.indexOf('\r\n\r\n');
        alldata = alldata.substring(startbody + 4);
        socket = false;
        try {
          data = JSON.parse(alldata);
          callback(data);
        } catch (err) {
          callback({});
        }
      });
    } catch (err) {
      callback({});
    }
  }
}

module.exports = DockerSocket;


/***/ }),

/***/ 7177:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// filesystem.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 8. File System
// ----------------------------------------------------------------------------------

const util = __nccwpck_require__(7146);
const fs = __nccwpck_require__(7147);

const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const execPromiseSave = util.promisifySave((__nccwpck_require__(2081).exec));

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

let _fs_speed = {};
let _disk_io = {};

// --------------------------
// FS - mounted file systems

function fsSize(drive, callback) {

  if (util.isFunction(drive)) {
    callback = drive;
    drive = '';
  }

  let macOsDisks = [];
  let osMounts = [];

  function getmacOsFsType(fs) {
    if (!fs.startsWith('/')) { return 'NFS'; }
    const parts = fs.split('/');
    const fsShort = parts[parts.length - 1];
    const macOsDisksSingle = macOsDisks.filter(item => item.indexOf(fsShort) >= 0);
    if (macOsDisksSingle.length === 1 && macOsDisksSingle[0].indexOf('APFS') >= 0) { return 'APFS'; }
    return 'HFS';
  }

  function isLinuxTmpFs(fs) {
    const linuxTmpFileSystems = ['rootfs', 'unionfs', 'squashfs', 'cramfs', 'initrd', 'initramfs', 'devtmpfs', 'tmpfs', 'udev', 'devfs', 'specfs', 'type', 'appimaged'];
    let result = false;
    linuxTmpFileSystems.forEach(linuxFs => {
      if (fs.toLowerCase().indexOf(linuxFs) >= 0) { result = true; }
    });
    return result;
  }

  function filterLines(stdout) {
    let lines = stdout.toString().split('\n');
    lines.shift();
    if (stdout.toString().toLowerCase().indexOf('filesystem')) {
      let removeLines = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i].toLowerCase().startsWith('filesystem')) {
          removeLines = i;
        }
      }
      for (let i = 0; i < removeLines; i++) {
        lines.shift();
      }
    }
    return lines;
  }

  function parseDf(lines) {
    let data = [];
    lines.forEach(function (line) {
      if (line !== '') {
        line = line.replace(/ +/g, ' ').split(' ');
        if (line && ((line[0].startsWith('/')) || (line[6] && line[6] === '/') || (line[0].indexOf('/') > 0) || (line[0].indexOf(':') === 1) || !_darwin && !isLinuxTmpFs(line[1]))) {
          const fs = line[0];
          const fsType = ((_linux || _freebsd || _openbsd || _netbsd) ? line[1] : getmacOsFsType(line[0]));
          const size = parseInt(((_linux || _freebsd || _openbsd || _netbsd) ? line[2] : line[1])) * 1024;
          const used = parseInt(((_linux || _freebsd || _openbsd || _netbsd) ? line[3] : line[2])) * 1024;
          const available = parseInt(((_linux || _freebsd || _openbsd || _netbsd) ? line[4] : line[3])) * 1024;
          const use = parseFloat((100.0 * (used / (used + available))).toFixed(2));
          let rw = osMounts && Object.keys(osMounts).length > 0 ? osMounts[fs] || false : null;
          line.splice(0, (_linux || _freebsd || _openbsd || _netbsd) ? 6 : 5);
          const mount = line.join(' ');
          if (!data.find(el => (el.fs === fs && el.type === fsType))) {
            data.push({
              fs,
              type: fsType,
              size,
              used,
              available,
              use,
              mount,
              rw
            });
          }
        }
      }
    });
    return data;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      let data = [];
      if (_linux || _freebsd || _openbsd || _netbsd || _darwin) {
        let cmd = '';
        macOsDisks = [];
        osMounts = {};
        if (_darwin) {
          cmd = 'df -kP';
          try {
            macOsDisks = execSync('diskutil list').toString().split('\n').filter(line => {
              return !line.startsWith('/') && line.indexOf(':') > 0;
            });
            execSync('mount').toString().split('\n').filter(line => {
              return line.startsWith('/');
            }).forEach((line) => {
              osMounts[line.split(' ')[0]] = line.toLowerCase().indexOf('read-only') === -1;
            });
          } catch (e) {
            util.noop();
          }
        }
        if (_linux) {
          try {
            cmd = 'export LC_ALL=C; df -lkPTx squashfs; unset LC_ALL';
            execSync('cat /proc/mounts 2>/dev/null').toString().split('\n').filter(line => {
              return line.startsWith('/');
            }).forEach((line) => {
              osMounts[line.split(' ')[0]] = osMounts[line.split(' ')[0]] || false;
              if (line.toLowerCase().indexOf('/snap/') === -1) {
                osMounts[line.split(' ')[0]] = ((line.toLowerCase().indexOf('rw,') >= 0 || line.toLowerCase().indexOf(' rw ') >= 0));
              }
            });
          } catch (e) {
            util.noop();
          }
        }
        if (_freebsd || _openbsd || _netbsd) {
          try {
            cmd = 'df -lkPT';
            execSync('mount').toString().split('\n').forEach((line) => {
              osMounts[line.split(' ')[0]] = line.toLowerCase().indexOf('read-only') === -1;
            });
          } catch (e) {
            util.noop();
          }
        }
        exec(cmd, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          let lines = filterLines(stdout);
          data = parseDf(lines);
          if (drive) {
            data = data.filter(item => {
              return item.fs.toLowerCase().indexOf(drive.toLowerCase()) >= 0 || item.mount.toLowerCase().indexOf(drive.toLowerCase()) >= 0;
            });
          }
          if ((!error || data.length) && stdout.toString().trim() !== '') {
            if (callback) {
              callback(data);
            }
            resolve(data);
          } else {
            exec('df -kPT', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
              if (!error) {
                let lines = filterLines(stdout);
                data = parseDf(lines);
              }
              if (callback) {
                callback(data);
              }
              resolve(data);
            });
          }
        });
      }
      if (_sunos) {
        if (callback) { callback(data); }
        resolve(data);
      }
      if (_windows) {
        try {
          const cmd = `Get-WmiObject Win32_logicaldisk | select Access,Caption,FileSystem,FreeSpace,Size ${drive ? '| where -property Caption -eq ' + drive : ''} | fl`;
          util.powerShell(cmd).then((stdout, error) => {
            if (!error) {
              let devices = stdout.toString().split(/\n\s*\n/);
              devices.forEach(function (device) {
                let lines = device.split('\r\n');
                const size = util.toInt(util.getValue(lines, 'size', ':'));
                const free = util.toInt(util.getValue(lines, 'freespace', ':'));
                const caption = util.getValue(lines, 'caption', ':');
                const rwValue = util.getValue(lines, 'access', ':');
                const rw = rwValue ? (util.toInt(rwValue) !== 1) : null;
                if (size) {
                  data.push({
                    fs: caption,
                    type: util.getValue(lines, 'filesystem', ':'),
                    size,
                    used: size - free,
                    available: free,
                    use: parseFloat(((100.0 * (size - free)) / size).toFixed(2)),
                    mount: caption,
                    rw
                  });
                }
              });
            }
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } catch (e) {
          if (callback) { callback(data); }
          resolve(data);
        }
      }
    });
  });
}

exports.fsSize = fsSize;

// --------------------------
// FS - open files count

function fsOpenFiles(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = {
        max: null,
        allocated: null,
        available: null
      };
      if (_freebsd || _openbsd || _netbsd || _darwin) {
        let cmd = 'sysctl -i kern.maxfiles kern.num_files kern.open_files';
        exec(cmd, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            result.max = parseInt(util.getValue(lines, 'kern.maxfiles', ':'), 10);
            result.allocated = parseInt(util.getValue(lines, 'kern.num_files', ':'), 10) || parseInt(util.getValue(lines, 'kern.open_files', ':'), 10);
            result.available = result.max - result.allocated;
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux) {
        fs.readFile('/proc/sys/fs/file-nr', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            if (lines[0]) {
              const parts = lines[0].replace(/\s+/g, ' ').split(' ');
              if (parts.length === 3) {
                result.allocated = parseInt(parts[0], 10);
                result.available = parseInt(parts[1], 10);
                result.max = parseInt(parts[2], 10);
                if (!result.available) { result.available = result.max - result.allocated; }
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            fs.readFile('/proc/sys/fs/file-max', function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                if (lines[0]) {
                  result.max = parseInt(lines[0], 10);
                }
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          }
        });
      }
      if (_sunos) {
        if (callback) { callback(null); }
        resolve(null);
      }
      if (_windows) {
        if (callback) { callback(null); }
        resolve(null);
      }
    });
  });
}

exports.fsOpenFiles = fsOpenFiles;

// --------------------------
// disks

function parseBytes(s) {
  return parseInt(s.substr(s.indexOf(' (') + 2, s.indexOf(' Bytes)') - 10));
}

function parseDevices(lines) {
  let devices = [];
  let i = 0;
  lines.forEach(line => {
    if (line.length > 0) {
      if (line[0] === '*') {
        i++;
      } else {
        let parts = line.split(':');
        if (parts.length > 1) {
          if (!devices[i]) {
            devices[i] = {
              name: '',
              identifier: '',
              type: 'disk',
              fsType: '',
              mount: '',
              size: 0,
              physical: 'HDD',
              uuid: '',
              label: '',
              model: '',
              serial: '',
              removable: false,
              protocol: '',
              group: '',
              device: ''
            };
          }
          parts[0] = parts[0].trim().toUpperCase().replace(/ +/g, '');
          parts[1] = parts[1].trim();
          if ('DEVICEIDENTIFIER' === parts[0]) { devices[i].identifier = parts[1]; }
          if ('DEVICENODE' === parts[0]) { devices[i].name = parts[1]; }
          if ('VOLUMENAME' === parts[0]) {
            if (parts[1].indexOf('Not applicable') === -1) { devices[i].label = parts[1]; }
          }
          if ('PROTOCOL' === parts[0]) { devices[i].protocol = parts[1]; }
          if ('DISKSIZE' === parts[0]) { devices[i].size = parseBytes(parts[1]); }
          if ('FILESYSTEMPERSONALITY' === parts[0]) { devices[i].fsType = parts[1]; }
          if ('MOUNTPOINT' === parts[0]) { devices[i].mount = parts[1]; }
          if ('VOLUMEUUID' === parts[0]) { devices[i].uuid = parts[1]; }
          if ('READ-ONLYMEDIA' === parts[0] && parts[1] === 'Yes') { devices[i].physical = 'CD/DVD'; }
          if ('SOLIDSTATE' === parts[0] && parts[1] === 'Yes') { devices[i].physical = 'SSD'; }
          if ('VIRTUAL' === parts[0]) { devices[i].type = 'virtual'; }
          if ('REMOVABLEMEDIA' === parts[0]) { devices[i].removable = (parts[1] === 'Removable'); }
          if ('PARTITIONTYPE' === parts[0]) { devices[i].type = 'part'; }
          if ('DEVICE/MEDIANAME' === parts[0]) { devices[i].model = parts[1]; }
        }
      }
    }
  });
  return devices;
}

function parseBlk(lines) {
  let data = [];

  lines.filter(line => line !== '').forEach((line) => {
    try {
      line = decodeURIComponent(line.replace(/\\x/g, '%'));
      line = line.replace(/\\/g, '\\\\');
      let disk = JSON.parse(line);
      data.push({
        'name': disk.name,
        'type': disk.type,
        'fsType': disk.fsType,
        'mount': disk.mountpoint,
        'size': parseInt(disk.size),
        'physical': (disk.type === 'disk' ? (disk.rota === '0' ? 'SSD' : 'HDD') : (disk.type === 'rom' ? 'CD/DVD' : '')),
        'uuid': disk.uuid,
        'label': disk.label,
        'model': (disk.model || '').trim(),
        'serial': disk.serial,
        'removable': disk.rm === '1',
        'protocol': disk.tran,
        'group': disk.group || '',
      });
    } catch (e) {
      util.noop();
    }
  });
  data = util.unique(data);
  data = util.sortByKey(data, ['type', 'name']);
  return data;
}

function decodeMdabmData(lines) {
  const raid = util.getValue(lines, 'md_level', '=');
  const label = util.getValue(lines, 'md_name', '='); // <- get label info
  const uuid = util.getValue(lines, 'md_uuid', '='); // <- get uuid info
  const members = [];
  lines.forEach(line => {
    if (line.toLowerCase().startsWith('md_device_dev') && line.toLowerCase().indexOf('/dev/') > 0) {
      members.push(line.split('/dev/')[1]);
    }
  });
  return {
    raid,
    label,
    uuid,
    members
  };
}

function raidMatchLinux(data) {
  // for all block devices of type "raid%"
  let result = data;
  try {
    data.forEach(element => {
      if (element.type.startsWith('raid')) {
        const lines = execSync(`mdadm --export --detail /dev/${element.name}`).toString().split('\n');
        const mdData = decodeMdabmData(lines);

        element.label = mdData.label; // <- assign label info
        element.uuid = mdData.uuid; // <- assign uuid info

        if (mdData.members && mdData.members.length && mdData.raid === element.type) {
          result = result.map(blockdevice => {
            if (blockdevice.fsType === 'linux_raid_member' && mdData.members.indexOf(blockdevice.name) >= 0) {
              blockdevice.group = element.name;
            }
            return blockdevice;
          });
        }
      }
    });
  } catch (e) {
    util.noop();
  }
  return result;
}

function getDevicesLinux(data) {
  const result = [];
  data.forEach(element => {
    if (element.type.startsWith('disk')) {
      result.push(element.name);
    }
  });
  return result;
}

function matchDevicesLinux(data) {
  let result = data;
  try {
    const devices = getDevicesLinux(data);
    result = result.map(blockdevice => {
      if (blockdevice.type.startsWith('part') || blockdevice.type.startsWith('disk')) {
        devices.forEach(element => {
          if (blockdevice.name.startsWith(element)) {
            blockdevice.device = '/dev/' + element;
          }
        });
      }
      return blockdevice;
    });
  } catch (e) {
    util.noop();
  }
  return result;
}

function getDevicesMac(data) {
  const result = [];
  data.forEach(element => {
    if (element.type.startsWith('disk')) {
      result.push({ name: element.name, model: element.model, device: element.name });
    }
    if (element.type.startsWith('virtual')) {
      let device = '';
      result.forEach(e => {
        if (e.model === element.model) {
          device = e.device;
        }
      });
      if (device) {
        result.push({ name: element.name, model: element.model, device });
      }
    }
  });
  return result;
}

function matchDevicesMac(data) {
  let result = data;
  try {
    const devices = getDevicesMac(data);
    result = result.map(blockdevice => {
      if (blockdevice.type.startsWith('part') || blockdevice.type.startsWith('disk') || blockdevice.type.startsWith('virtual')) {
        devices.forEach(element => {
          if (blockdevice.name.startsWith(element.name)) {
            blockdevice.device = element.device;
          }
        });
      }
      return blockdevice;
    });
  } catch (e) {
    util.noop();
  }
  return result;
}

function getDevicesWin(diskDrives) {
  const result = [];
  diskDrives.forEach(element => {
    const lines = element.split('\r\n');
    const device = util.getValue(lines, 'DeviceID', ':');
    let partitions = element.split('@{DeviceID=');
    if (partitions.length > 1) {
      partitions = partitions.slice(1);
      partitions.forEach(partition => {
        result.push({ name: partition.split(';')[0].toUpperCase(), device });
      });
    }
  });
  return result;
}

function matchDevicesWin(data, diskDrives) {
  const devices = getDevicesWin(diskDrives);
  data.map(element => {
    const filteresDevices = devices.filter((e) => { return e.name === element.name.toUpperCase(); });
    if (filteresDevices.length > 0) {
      element.device = filteresDevices[0].device;
    }
    return element;
  });
  return data;
}

function blkStdoutToObject(stdout) {
  return stdout.toString()
    .replace(/NAME=/g, '{"name":')
    .replace(/FSTYPE=/g, ',"fsType":')
    .replace(/TYPE=/g, ',"type":')
    .replace(/SIZE=/g, ',"size":')
    .replace(/MOUNTPOINT=/g, ',"mountpoint":')
    .replace(/UUID=/g, ',"uuid":')
    .replace(/ROTA=/g, ',"rota":')
    .replace(/RO=/g, ',"ro":')
    .replace(/RM=/g, ',"rm":')
    .replace(/TRAN=/g, ',"tran":')
    .replace(/SERIAL=/g, ',"serial":')
    .replace(/LABEL=/g, ',"label":')
    .replace(/MODEL=/g, ',"model":')
    .replace(/OWNER=/g, ',"owner":')
    .replace(/GROUP=/g, ',"group":')
    .replace(/\n/g, '}\n');
}

function blockDevices(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let data = [];
      if (_linux) {
        // see https://wiki.ubuntuusers.de/lsblk/
        // exec("lsblk -bo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,TRAN,SERIAL,LABEL,MODEL,OWNER,GROUP,MODE,ALIGNMENT,MIN-IO,OPT-IO,PHY-SEC,LOG-SEC,SCHED,RQ-SIZE,RA,WSAME", function (error, stdout) {
        exec('lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,TRAN,SERIAL,LABEL,MODEL,OWNER 2>/dev/null', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          if (!error) {
            let lines = blkStdoutToObject(stdout).split('\n');
            data = parseBlk(lines);
            data = raidMatchLinux(data);
            data = matchDevicesLinux(data);
            if (callback) {
              callback(data);
            }
            resolve(data);
          } else {
            exec('lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER 2>/dev/null', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
              if (!error) {
                let lines = blkStdoutToObject(stdout).split('\n');
                data = parseBlk(lines);
                data = raidMatchLinux(data);
              }
              if (callback) {
                callback(data);
              }
              resolve(data);
            });
          }
        });
      }
      if (_darwin) {
        exec('diskutil info -all', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().split('\n');
            // parse lines into temp array of devices
            data = parseDevices(lines);
            data = matchDevicesMac(data);
          }
          if (callback) {
            callback(data);
          }
          resolve(data);
        });
      }
      if (_sunos) {
        if (callback) { callback(data); }
        resolve(data);
      }
      if (_windows) {
        let drivetypes = ['Unknown', 'NoRoot', 'Removable', 'Local', 'Network', 'CD/DVD', 'RAM'];
        try {
          // util.wmic('logicaldisk get Caption,Description,DeviceID,DriveType,FileSystem,FreeSpace,Name,Size,VolumeName,VolumeSerialNumber /value').then((stdout, error) => {
          // util.powerShell('Get-CimInstance Win32_logicaldisk | select Caption,DriveType,Name,FileSystem,Size,VolumeSerialNumber,VolumeName | fl').then((stdout, error) => {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance -ClassName Win32_LogicalDisk | select Caption,DriveType,Name,FileSystem,Size,VolumeSerialNumber,VolumeName | fl'));
          workload.push(util.powerShell('Get-WmiObject -Class Win32_diskdrive | Select-Object -Property PNPDeviceId,DeviceID, Model, Size, @{L=\'Partitions\'; E={$_.GetRelated(\'Win32_DiskPartition\').GetRelated(\'Win32_LogicalDisk\') | Select-Object -Property DeviceID, VolumeName, Size, FreeSpace}} | fl'));
          util.promiseAll(
            workload
          ).then((res) => {
            let logicalDisks = res.results[0].toString().split(/\n\s*\n/);
            let diskDrives = res.results[1].toString().split(/\n\s*\n/);
            logicalDisks.forEach(function (device) {
              let lines = device.split('\r\n');
              let drivetype = util.getValue(lines, 'drivetype', ':');
              if (drivetype) {
                data.push({
                  name: util.getValue(lines, 'name', ':'),
                  identifier: util.getValue(lines, 'caption', ':'),
                  type: 'disk',
                  fsType: util.getValue(lines, 'filesystem', ':').toLowerCase(),
                  mount: util.getValue(lines, 'caption', ':'),
                  size: util.getValue(lines, 'size', ':'),
                  physical: (drivetype >= 0 && drivetype <= 6) ? drivetypes[drivetype] : drivetypes[0],
                  uuid: util.getValue(lines, 'volumeserialnumber', ':'),
                  label: util.getValue(lines, 'volumename', ':'),
                  model: '',
                  serial: util.getValue(lines, 'volumeserialnumber', ':'),
                  removable: drivetype === '2',
                  protocol: '',
                  group: '',
                  device: ''
                });
              }
            });
            // match devices
            data = matchDevicesWin(data, diskDrives);
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } catch (e) {
          if (callback) { callback(data); }
          resolve(data);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        // will follow
        if (callback) { callback(null); }
        resolve(null);
      }

    });
  });
}

exports.blockDevices = blockDevices;

// --------------------------
// FS - speed

function calcFsSpeed(rx, wx) {
  let result = {
    rx: 0,
    wx: 0,
    tx: 0,
    rx_sec: null,
    wx_sec: null,
    tx_sec: null,
    ms: 0
  };

  if (_fs_speed && _fs_speed.ms) {
    result.rx = rx;
    result.wx = wx;
    result.tx = result.rx + result.wx;
    result.ms = Date.now() - _fs_speed.ms;
    result.rx_sec = (result.rx - _fs_speed.bytes_read) / (result.ms / 1000);
    result.wx_sec = (result.wx - _fs_speed.bytes_write) / (result.ms / 1000);
    result.tx_sec = result.rx_sec + result.wx_sec;
    _fs_speed.rx_sec = result.rx_sec;
    _fs_speed.wx_sec = result.wx_sec;
    _fs_speed.tx_sec = result.tx_sec;
    _fs_speed.bytes_read = result.rx;
    _fs_speed.bytes_write = result.wx;
    _fs_speed.bytes_overall = result.rx + result.wx;
    _fs_speed.ms = Date.now();
    _fs_speed.last_ms = result.ms;
  } else {
    result.rx = rx;
    result.wx = wx;
    result.tx = result.rx + result.wx;
    _fs_speed.rx_sec = null;
    _fs_speed.wx_sec = null;
    _fs_speed.tx_sec = null;
    _fs_speed.bytes_read = result.rx;
    _fs_speed.bytes_write = result.wx;
    _fs_speed.bytes_overall = result.rx + result.wx;
    _fs_speed.ms = Date.now();
    _fs_speed.last_ms = 0;
  }
  return result;
}

function fsStats(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows || _freebsd || _openbsd || _netbsd || _sunos) {
        return resolve(null);
      }

      let result = {
        rx: 0,
        wx: 0,
        tx: 0,
        rx_sec: null,
        wx_sec: null,
        tx_sec: null,
        ms: 0
      };

      let rx = 0;
      let wx = 0;
      if ((_fs_speed && !_fs_speed.ms) || (_fs_speed && _fs_speed.ms && Date.now() - _fs_speed.ms >= 500)) {
        if (_linux) {
          // exec("df -k | grep /dev/", function(error, stdout) {
          exec('lsblk -r 2>/dev/null | grep /', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              let fs_filter = [];
              lines.forEach(function (line) {
                if (line !== '') {
                  line = line.trim().split(' ');
                  if (fs_filter.indexOf(line[0]) === -1) { fs_filter.push(line[0]); }
                }
              });

              let output = fs_filter.join('|');
              exec('cat /proc/diskstats | egrep "' + output + '"', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
                if (!error) {
                  let lines = stdout.toString().split('\n');
                  lines.forEach(function (line) {
                    line = line.trim();
                    if (line !== '') {
                      line = line.replace(/ +/g, ' ').split(' ');

                      rx += parseInt(line[5]) * 512;
                      wx += parseInt(line[9]) * 512;
                    }
                  });
                  result = calcFsSpeed(rx, wx);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        }
        if (_darwin) {
          exec('ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,\n"', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              lines.forEach(function (line) {
                line = line.trim();
                if (line !== '') {
                  line = line.split(',');

                  rx += parseInt(line[2]);
                  wx += parseInt(line[9]);
                }
              });
              result = calcFsSpeed(rx, wx);
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        }
      } else {
        result.ms = _fs_speed.last_ms;
        result.rx = _fs_speed.bytes_read;
        result.wx = _fs_speed.bytes_write;
        result.tx = _fs_speed.bytes_read + _fs_speed.bytes_write;
        result.rx_sec = _fs_speed.rx_sec;
        result.wx_sec = _fs_speed.wx_sec;
        result.tx_sec = _fs_speed.tx_sec;
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}

exports.fsStats = fsStats;

function calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime) {
  let result = {
    rIO: 0,
    wIO: 0,
    tIO: 0,
    rIO_sec: null,
    wIO_sec: null,
    tIO_sec: null,
    rWaitTime: 0,
    wWaitTime: 0,
    tWaitTime: 0,
    rWaitPercent: null,
    wWaitPercent: null,
    tWaitPercent: null,
    ms: 0
  };
  if (_disk_io && _disk_io.ms) {
    result.rIO = rIO;
    result.wIO = wIO;
    result.tIO = rIO + wIO;
    result.ms = Date.now() - _disk_io.ms;
    result.rIO_sec = (result.rIO - _disk_io.rIO) / (result.ms / 1000);
    result.wIO_sec = (result.wIO - _disk_io.wIO) / (result.ms / 1000);
    result.tIO_sec = result.rIO_sec + result.wIO_sec;
    result.rWaitTime = rWaitTime;
    result.wWaitTime = wWaitTime;
    result.tWaitTime = tWaitTime;
    result.rWaitPercent = (result.rWaitTime - _disk_io.rWaitTime) * 100 / (result.ms);
    result.wWaitPercent = (result.wWaitTime - _disk_io.wWaitTime) * 100 / (result.ms);
    result.tWaitPercent = (result.tWaitTime - _disk_io.tWaitTime) * 100 / (result.ms);
    _disk_io.rIO = rIO;
    _disk_io.wIO = wIO;
    _disk_io.rIO_sec = result.rIO_sec;
    _disk_io.wIO_sec = result.wIO_sec;
    _disk_io.tIO_sec = result.tIO_sec;
    _disk_io.rWaitTime = rWaitTime;
    _disk_io.wWaitTime = wWaitTime;
    _disk_io.tWaitTime = tWaitTime;
    _disk_io.rWaitPercent = result.rWaitPercent;
    _disk_io.wWaitPercent = result.wWaitPercent;
    _disk_io.tWaitPercent = result.tWaitPercent;
    _disk_io.last_ms = result.ms;
    _disk_io.ms = Date.now();
  } else {
    result.rIO = rIO;
    result.wIO = wIO;
    result.tIO = rIO + wIO;
    result.rWaitTime = rWaitTime;
    result.wWaitTime = wWaitTime;
    result.tWaitTime = tWaitTime;
    _disk_io.rIO = rIO;
    _disk_io.wIO = wIO;
    _disk_io.rIO_sec = null;
    _disk_io.wIO_sec = null;
    _disk_io.tIO_sec = null;
    _disk_io.rWaitTime = rWaitTime;
    _disk_io.wWaitTime = wWaitTime;
    _disk_io.tWaitTime = tWaitTime;
    _disk_io.rWaitPercent = null;
    _disk_io.wWaitPercent = null;
    _disk_io.tWaitPercent = null;
    _disk_io.last_ms = 0;
    _disk_io.ms = Date.now();
  }
  return result;
}

function disksIO(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows) {
        return resolve(null);
      }
      if (_sunos) {
        return resolve(null);
      }

      let result = {
        rIO: 0,
        wIO: 0,
        tIO: 0,
        rIO_sec: null,
        wIO_sec: null,
        tIO_sec: null,
        rWaitTime: 0,
        wWaitTime: 0,
        tWaitTime: 0,
        rWaitPercent: null,
        wWaitPercent: null,
        tWaitPercent: null,
        ms: 0
      };
      let rIO = 0;
      let wIO = 0;
      let rWaitTime = 0;
      let wWaitTime = 0;
      let tWaitTime = 0;

      if ((_disk_io && !_disk_io.ms) || (_disk_io && _disk_io.ms && Date.now() - _disk_io.ms >= 500)) {
        if (_linux || _freebsd || _openbsd || _netbsd) {
          // prints Block layer statistics for all mounted volumes
          // var cmd = "for mount in `lsblk | grep / | sed -r 's/│ └─//' | cut -d ' ' -f 1`; do cat /sys/block/$mount/stat | sed -r 's/ +/;/g' | sed -r 's/^;//'; done";
          // var cmd = "for mount in `lsblk | grep / | sed 's/[│└─├]//g' | awk '{$1=$1};1' | cut -d ' ' -f 1 | sort -u`; do cat /sys/block/$mount/stat | sed -r 's/ +/;/g' | sed -r 's/^;//'; done";
          let cmd = 'for mount in `lsblk 2>/dev/null | grep " disk " | sed "s/[│└─├]//g" | awk \'{$1=$1};1\' | cut -d " " -f 1 | sort -u`; do cat /sys/block/$mount/stat | sed -r "s/ +/;/g" | sed -r "s/^;//"; done';

          exec(cmd, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
            if (!error) {
              let lines = stdout.split('\n');
              lines.forEach(function (line) {
                // ignore empty lines
                if (!line) { return; }

                // sum r/wIO of all disks to compute all disks IO
                let stats = line.split(';');
                rIO += parseInt(stats[0]);
                wIO += parseInt(stats[4]);
                rWaitTime += parseInt(stats[3]);
                wWaitTime += parseInt(stats[7]);
                tWaitTime += parseInt(stats[10]);
              });
              result = calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime);

              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        }
        if (_darwin) {
          exec('ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,\n"', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              lines.forEach(function (line) {
                line = line.trim();
                if (line !== '') {
                  line = line.split(',');

                  rIO += parseInt(line[10]);
                  wIO += parseInt(line[0]);
                }
              });
              result = calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime);
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        }
      } else {
        result.rIO = _disk_io.rIO;
        result.wIO = _disk_io.wIO;
        result.tIO = _disk_io.rIO + _disk_io.wIO;
        result.ms = _disk_io.last_ms;
        result.rIO_sec = _disk_io.rIO_sec;
        result.wIO_sec = _disk_io.wIO_sec;
        result.tIO_sec = _disk_io.tIO_sec;
        result.rWaitTime = _disk_io.rWaitTime;
        result.wWaitTime = _disk_io.wWaitTime;
        result.tWaitTime = _disk_io.tWaitTime;
        result.rWaitPercent = _disk_io.rWaitPercent;
        result.wWaitPercent = _disk_io.wWaitPercent;
        result.tWaitPercent = _disk_io.tWaitPercent;
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}

exports.disksIO = disksIO;

function diskLayout(callback) {

  function getVendorFromModel(model) {
    const diskManufacturers = [
      { pattern: 'WESTERN.*', manufacturer: 'Western Digital' },
      { pattern: '^WDC.*', manufacturer: 'Western Digital' },
      { pattern: 'WD.*', manufacturer: 'Western Digital' },
      { pattern: 'TOSHIBA.*', manufacturer: 'Toshiba' },
      { pattern: 'HITACHI.*', manufacturer: 'Hitachi' },
      { pattern: '^IC.*', manufacturer: 'Hitachi' },
      { pattern: '^HTS.*', manufacturer: 'Hitachi' },
      { pattern: 'SANDISK.*', manufacturer: 'SanDisk' },
      { pattern: 'KINGSTON.*', manufacturer: 'Kingston Technology' },
      { pattern: '^SONY.*', manufacturer: 'Sony' },
      { pattern: 'TRANSCEND.*', manufacturer: 'Transcend' },
      { pattern: 'SAMSUNG.*', manufacturer: 'Samsung' },
      { pattern: '^ST(?!I\\ ).*', manufacturer: 'Seagate' },
      { pattern: '^STI\\ .*', manufacturer: 'SimpleTech' },
      { pattern: '^D...-.*', manufacturer: 'IBM' },
      { pattern: '^IBM.*', manufacturer: 'IBM' },
      { pattern: '^FUJITSU.*', manufacturer: 'Fujitsu' },
      { pattern: '^MP.*', manufacturer: 'Fujitsu' },
      { pattern: '^MK.*', manufacturer: 'Toshiba' },
      { pattern: 'MAXTO.*', manufacturer: 'Maxtor' },
      { pattern: 'PIONEER.*', manufacturer: 'Pioneer' },
      { pattern: 'PHILIPS.*', manufacturer: 'Philips' },
      { pattern: 'QUANTUM.*', manufacturer: 'Quantum Technology' },
      { pattern: 'FIREBALL.*', manufacturer: 'Quantum Technology' },
      { pattern: '^VBOX.*', manufacturer: 'VirtualBox' },
      { pattern: 'CORSAIR.*', manufacturer: 'Corsair Components' },
      { pattern: 'CRUCIAL.*', manufacturer: 'Crucial' },
      { pattern: 'ECM.*', manufacturer: 'ECM' },
      { pattern: 'INTEL.*', manufacturer: 'INTEL' },
      { pattern: 'EVO.*', manufacturer: 'Samsung' },
      { pattern: 'APPLE.*', manufacturer: 'Apple' },
    ];

    let result = '';
    if (model) {
      model = model.toUpperCase();
      diskManufacturers.forEach((manufacturer) => {
        const re = RegExp(manufacturer.pattern);
        if (re.test(model)) { result = manufacturer.manufacturer; }
      });
    }
    return result;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {

      const commitResult = res => {
        for (let i = 0; i < res.length; i++) {
          delete res[i].BSDName;
        }
        if (callback) {
          callback(res);
        }
        resolve(res);
      };

      let result = [];
      let cmd = '';

      if (_linux) {
        let cmdFullSmart = '';

        exec('export LC_ALL=C; lsblk -ablJO 2>/dev/null; unset LC_ALL', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          if (!error) {
            try {
              const out = stdout.toString().trim();
              let devices = [];
              try {
                const outJSON = JSON.parse(out);
                if (outJSON && {}.hasOwnProperty.call(outJSON, 'blockdevices')) {
                  devices = outJSON.blockdevices.filter(item => { return (item.type === 'disk') && item.size > 0 && (item.model !== null || (item.mountpoint === null && item.label === null && item.fstype === null && item.parttype === null && item.path && item.path.indexOf('/ram') !== 0 && item.path.indexOf('/loop') !== 0 && item['disc-max'] && item['disc-max'] !== 0)); });
                }
              } catch (e) {
                // fallback to older version of lsblk
                try {
                  const out2 = execSync('export LC_ALL=C; lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER,GROUP 2>/dev/null; unset LC_ALL').toString();
                  let lines = blkStdoutToObject(out2).split('\n');
                  const data = parseBlk(lines);
                  devices = data.filter(item => { return (item.type === 'disk') && item.size > 0 && ((item.model !== null && item.model !== '') || (item.mount === '' && item.label === '' && item.fsType === '')); });
                } catch (e) {
                  util.noop();
                }
              }
              devices.forEach((device) => {
                let mediumType = '';
                const BSDName = '/dev/' + device.name;
                const logical = device.name;
                try {
                  mediumType = execSync('cat /sys/block/' + logical + '/queue/rotational 2>/dev/null').toString().split('\n')[0];
                } catch (e) {
                  util.noop();
                }
                let interfaceType = device.tran ? device.tran.toUpperCase().trim() : '';
                if (interfaceType === 'NVME') {
                  mediumType = '2';
                  interfaceType = 'PCIe';
                }
                result.push({
                  device: BSDName,
                  type: (mediumType === '0' ? 'SSD' : (mediumType === '1' ? 'HD' : (mediumType === '2' ? 'NVMe' : (device.model && device.model.indexOf('SSD') > -1 ? 'SSD' : (device.model && device.model.indexOf('NVM') > -1 ? 'NVMe' : 'HD'))))),
                  name: device.model || '',
                  vendor: getVendorFromModel(device.model) || (device.vendor ? device.vendor.trim() : ''),
                  size: device.size || 0,
                  bytesPerSector: null,
                  totalCylinders: null,
                  totalHeads: null,
                  totalSectors: null,
                  totalTracks: null,
                  tracksPerCylinder: null,
                  sectorsPerTrack: null,
                  firmwareRevision: device.rev ? device.rev.trim() : '',
                  serialNum: device.serial ? device.serial.trim() : '',
                  interfaceType: interfaceType,
                  smartStatus: 'unknown',
                  temperature: null,
                  BSDName: BSDName
                });
                cmd += `printf "\n${BSDName}|"; smartctl -H ${BSDName} | grep overall;`;
                cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ''}smartctl -a -j ${BSDName};`;
              });
            } catch (e) {
              util.noop();
            }
          }
          // check S.M.A.R.T. status
          if (cmdFullSmart) {
            exec(cmdFullSmart, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
              try {
                const data = JSON.parse(`[${stdout}]`);
                data.forEach(disk => {
                  const diskBSDName = disk.smartctl.argv[disk.smartctl.argv.length - 1];

                  for (let i = 0; i < result.length; i++) {
                    if (result[i].BSDName === diskBSDName) {
                      result[i].smartStatus = (disk.smart_status.passed ? 'Ok' : (disk.smart_status.passed === false ? 'Predicted Failure' : 'unknown'));
                      if (disk.temperature && disk.temperature.current) {
                        result[i].temperature = disk.temperature.current;
                      }
                      result[i].smartData = disk;
                    }
                  }
                });
                commitResult(result);
              } catch (e) {
                if (cmd) {
                  cmd = cmd + 'printf "\n"';
                  exec(cmd, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
                    let lines = stdout.toString().split('\n');
                    lines.forEach(line => {
                      if (line) {
                        let parts = line.split('|');
                        if (parts.length === 2) {
                          let BSDName = parts[0];
                          parts[1] = parts[1].trim();
                          let parts2 = parts[1].split(':');
                          if (parts2.length === 2) {
                            parts2[1] = parts2[1].trim();
                            let status = parts2[1].toLowerCase();
                            for (let i = 0; i < result.length; i++) {
                              if (result[i].BSDName === BSDName) {
                                result[i].smartStatus = (status === 'passed' ? 'Ok' : (status === 'failed!' ? 'Predicted Failure' : 'unknown'));
                              }
                            }
                          }
                        }
                      }
                    });
                    commitResult(result);
                  });
                } else {
                  commitResult(result);
                }
              }
            });
          } else {
            commitResult(result);
          }
        });
      }
      if (_freebsd || _openbsd || _netbsd) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_darwin) {
        exec('system_profiler SPSerialATADataType SPNVMeDataType SPUSBDataType', { maxBuffer: 1024 * 1024 }, function (error, stdout) {
          if (!error) {
            // split by type:
            let lines = stdout.toString().split('\n');
            let linesSATA = [];
            let linesNVMe = [];
            let linesUSB = [];
            let dataType = 'SATA';
            lines.forEach(line => {
              if (line === 'NVMExpress:') { dataType = 'NVMe'; }
              else if (line === 'USB:') { dataType = 'USB'; }
              else if (line === 'SATA/SATA Express:') { dataType = 'SATA'; }
              else if (dataType === 'SATA') { linesSATA.push(line); }
              else if (dataType === 'NVMe') { linesNVMe.push(line); }
              else if (dataType === 'USB') { linesUSB.push(line); }
            });
            try {
              // Serial ATA Drives
              let devices = linesSATA.join('\n').split(' Physical Interconnect: ');
              devices.shift();
              devices.forEach(function (device) {
                device = 'InterfaceType: ' + device;
                let lines = device.split('\n');
                const mediumType = util.getValue(lines, 'Medium Type', ':', true).trim();
                const sizeStr = util.getValue(lines, 'capacity', ':', true).trim();
                const BSDName = util.getValue(lines, 'BSD Name', ':', true).trim();
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf('(') >= 0) {
                    sizeValue = parseInt(sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, '').replace(/,/g, '').replace(/\s/g, ''));
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr);
                  }
                  if (sizeValue) {
                    const smartStatusString = util.getValue(lines, 'S.M.A.R.T. status', ':', true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: mediumType.startsWith('Solid') ? 'SSD' : 'HD',
                      name: util.getValue(lines, 'Model', ':', true).trim(),
                      vendor: getVendorFromModel(util.getValue(lines, 'Model', ':', true).trim()) || util.getValue(lines, 'Manufacturer', ':', true),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util.getValue(lines, 'Revision', ':', true).trim(),
                      serialNum: util.getValue(lines, 'Serial Number', ':', true).trim(),
                      interfaceType: util.getValue(lines, 'InterfaceType', ':', true).trim(),
                      smartStatus: smartStatusString === 'verified' ? 'OK' : smartStatusString || 'unknown',
                      temperature: null,
                      BSDName: BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + ' | grep SMART;';
                  }
                }
              });
            } catch (e) {
              util.noop();
            }

            // NVME Drives
            try {
              let devices = linesNVMe.join('\n').split('\n\n          Capacity:');
              devices.shift();
              devices.forEach(function (device) {
                device = '!Capacity: ' + device;
                let lines = device.split('\n');
                const linkWidth = util.getValue(lines, 'link width', ':', true).trim();
                const sizeStr = util.getValue(lines, '!capacity', ':', true).trim();
                const BSDName = util.getValue(lines, 'BSD Name', ':', true).trim();
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf('(') >= 0) {
                    sizeValue = parseInt(sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, '').replace(/,/g, '').replace(/\s/g, ''));
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr);
                  }
                  if (sizeValue) {
                    const smartStatusString = util.getValue(lines, 'S.M.A.R.T. status', ':', true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: 'NVMe',
                      name: util.getValue(lines, 'Model', ':', true).trim(),
                      vendor: getVendorFromModel(util.getValue(lines, 'Model', ':', true).trim()),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util.getValue(lines, 'Revision', ':', true).trim(),
                      serialNum: util.getValue(lines, 'Serial Number', ':', true).trim(),
                      interfaceType: ('PCIe ' + linkWidth).trim(),
                      smartStatus: smartStatusString === 'verified' ? 'OK' : smartStatusString || 'unknown',
                      temperature: null,
                      BSDName: BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + ' | grep SMART;';
                  }
                }
              });
            } catch (e) {
              util.noop();
            }
            // USB Drives
            try {
              let devices = linesUSB.join('\n').replaceAll('Media:\n ', 'Model:').split('\n\n          Product ID:');
              devices.shift();
              devices.forEach(function (device) {
                let lines = device.split('\n');
                const sizeStr = util.getValue(lines, 'Capacity', ':', true).trim();
                const BSDName = util.getValue(lines, 'BSD Name', ':', true).trim();
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf('(') >= 0) {
                    sizeValue = parseInt(sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, '').replace(/,/g, '').replace(/\s/g, ''));
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr);
                  }
                  if (sizeValue) {
                    const smartStatusString = util.getValue(lines, 'S.M.A.R.T. status', ':', true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: 'USB',
                      name: util.getValue(lines, 'Model', ':', true).trim().replaceAll(':', ''),
                      vendor: getVendorFromModel(util.getValue(lines, 'Model', ':', true).trim()),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util.getValue(lines, 'Revision', ':', true).trim(),
                      serialNum: util.getValue(lines, 'Serial Number', ':', true).trim(),
                      interfaceType: 'USB',
                      smartStatus: smartStatusString === 'verified' ? 'OK' : smartStatusString || 'unknown',
                      temperature: null,
                      BSDName: BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + ' | grep SMART;';
                  }
                }
              });
            } catch (e) {
              util.noop();
            }
            if (cmd) {
              cmd = cmd + 'printf "\n"';
              exec(cmd, { maxBuffer: 1024 * 1024 }, function (error, stdout) {
                let lines = stdout.toString().split('\n');
                lines.forEach(line => {
                  if (line) {
                    let parts = line.split('|');
                    if (parts.length === 2) {
                      let BSDName = parts[0];
                      parts[1] = parts[1].trim();
                      let parts2 = parts[1].split(':');
                      if (parts2.length === 2) {
                        parts2[1] = parts2[1].trim();
                        let status = parts2[1].toLowerCase();
                        for (let i = 0; i < result.length; i++) {
                          if (result[i].BSDName === BSDName) {
                            result[i].smartStatus = (status === 'not supported' ? 'not supported' : (status === 'verified' ? 'Ok' : (status === 'failing' ? 'Predicted Failure' : 'unknown')));
                          }
                        }
                      }
                    }
                  }
                });
                for (let i = 0; i < result.length; i++) {
                  delete result[i].BSDName;
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              for (let i = 0; i < result.length; i++) {
                delete result[i].BSDName;
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          }
        });
      }
      if (_windows) {
        try {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance Win32_DiskDrive | select Caption,Size,Status,PNPDeviceId,DeviceId,BytesPerSector,TotalCylinders,TotalHeads,TotalSectors,TotalTracks,TracksPerCylinder,SectorsPerTrack,FirmwareRevision,SerialNumber,InterfaceType | fl'));
          workload.push(util.powerShell('Get-PhysicalDisk | select BusType,MediaType,FriendlyName,Model,SerialNumber,Size | fl'));
          if (util.smartMonToolsInstalled()) {
            try {
              const smartDev = JSON.parse(execSync('smartctl --scan -j').toString());
              if (smartDev && smartDev.devices && smartDev.devices.length > 0) {
                smartDev.devices.forEach((dev) => {
                  workload.push(execPromiseSave(`smartctl -j -a ${dev.name}`, util.execOptsWin));
                });
              }
            } catch (e) {
              util.noop();
            }
          }
          util.promiseAll(
            workload
          ).then((data) => {
            let devices = data.results[0].toString().split(/\n\s*\n/);
            devices.forEach(function (device) {
              let lines = device.split('\r\n');
              const size = util.getValue(lines, 'Size', ':').trim();
              const status = util.getValue(lines, 'Status', ':').trim().toLowerCase();
              if (size) {
                result.push({
                  device: util.getValue(lines, 'DeviceId', ':'),  // changed from PNPDeviceId to DeviceID (be be able to match devices)
                  type: device.indexOf('SSD') > -1 ? 'SSD' : 'HD',  // just a starting point ... better: MSFT_PhysicalDisk - Media Type ... see below
                  name: util.getValue(lines, 'Caption', ':'),
                  vendor: getVendorFromModel(util.getValue(lines, 'Caption', ':', true).trim()),
                  size: parseInt(size),
                  bytesPerSector: parseInt(util.getValue(lines, 'BytesPerSector', ':')),
                  totalCylinders: parseInt(util.getValue(lines, 'TotalCylinders', ':')),
                  totalHeads: parseInt(util.getValue(lines, 'TotalHeads', ':')),
                  totalSectors: parseInt(util.getValue(lines, 'TotalSectors', ':')),
                  totalTracks: parseInt(util.getValue(lines, 'TotalTracks', ':')),
                  tracksPerCylinder: parseInt(util.getValue(lines, 'TracksPerCylinder', ':')),
                  sectorsPerTrack: parseInt(util.getValue(lines, 'SectorsPerTrack', ':')),
                  firmwareRevision: util.getValue(lines, 'FirmwareRevision', ':').trim(),
                  serialNum: util.getValue(lines, 'SerialNumber', ':').trim(),
                  interfaceType: util.getValue(lines, 'InterfaceType', ':').trim(),
                  smartStatus: (status === 'ok' ? 'Ok' : (status === 'degraded' ? 'Degraded' : (status === 'pred fail' ? 'Predicted Failure' : 'Unknown'))),
                  temperature: null,
                });
              }
            });
            devices = data.results[1].split(/\n\s*\n/);
            devices.forEach(function (device) {
              let lines = device.split('\r\n');
              const serialNum = util.getValue(lines, 'SerialNumber', ':').trim();
              const name = util.getValue(lines, 'FriendlyName', ':').trim().replace('Msft ', 'Microsoft');
              const size = util.getValue(lines, 'Size', ':').trim();
              const model = util.getValue(lines, 'Model', ':').trim();
              const interfaceType = util.getValue(lines, 'BusType', ':').trim();
              let mediaType = util.getValue(lines, 'MediaType', ':').trim();
              if (mediaType === '3' || mediaType === 'HDD') { mediaType = 'HD'; }
              if (mediaType === '4') { mediaType = 'SSD'; }
              if (mediaType === '5') { mediaType = 'SCM'; }
              if (mediaType === 'Unspecified' && (model.toLowerCase().indexOf('virtual') > -1 || model.toLowerCase().indexOf('vbox') > -1)) { mediaType = 'Virtual'; }
              if (size) {
                let i = util.findObjectByKey(result, 'serialNum', serialNum);
                if (i === -1 || serialNum === '') {
                  i = util.findObjectByKey(result, 'name', name);
                }
                if (i != -1) {
                  result[i].type = mediaType;
                  result[i].interfaceType = interfaceType;
                }
              }
            });
            // S.M.A.R.T
            data.results.shift();
            data.results.shift();
            if (data.results.length) {
              data.results.forEach((smartStr) => {
                try {
                  const smartData = JSON.parse(smartStr);
                  if (smartData.serial_number) {
                    const serialNum = smartData.serial_number;
                    let i = util.findObjectByKey(result, 'serialNum', serialNum);
                    if (i != -1) {
                      result[i].smartStatus = (smartData.smart_status && smartData.smart_status.passed ? 'Ok' : (smartData.smart_status && smartData.smart_status.passed === false ? 'Predicted Failure' : 'unknown'));
                      if (smartData.temperature && smartData.temperature.current) {
                        result[i].temperature = smartData.temperature.current;
                      }
                      result[i].smartData = smartData;
                    }
                  }
                } catch (e) {
                  util.noop();
                }
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.diskLayout = diskLayout;


/***/ }),

/***/ 3343:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// graphics.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 7. Graphics (controller, display)
// ----------------------------------------------------------------------------------

const fs = __nccwpck_require__(7147);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const util = __nccwpck_require__(7146);

let _platform = process.platform;
let _nvidiaSmiPath = '';

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

let _resolutionX = 0;
let _resolutionY = 0;
let _pixelDepth = 0;
let _refreshRate = 0;

const videoTypes = {
  '-2': 'UNINITIALIZED',
  '-1': 'OTHER',
  '0': 'HD15',
  '1': 'SVIDEO',
  '2': 'Composite video',
  '3': 'Component video',
  '4': 'DVI',
  '5': 'HDMI',
  '6': 'LVDS',
  '8': 'D_JPN',
  '9': 'SDI',
  '10': 'DP',
  '11': 'DP embedded',
  '12': 'UDI',
  '13': 'UDI embedded',
  '14': 'SDTVDONGLE',
  '15': 'MIRACAST',
  '2147483648': 'INTERNAL'
};

function getVendorFromModel(model) {
  const manufacturers = [
    { pattern: '^LG.+', manufacturer: 'LG' },
    { pattern: '^BENQ.+', manufacturer: 'BenQ' },
    { pattern: '^ASUS.+', manufacturer: 'Asus' },
    { pattern: '^DELL.+', manufacturer: 'Dell' },
    { pattern: '^SAMSUNG.+', manufacturer: 'Samsung' },
    { pattern: '^VIEWSON.+', manufacturer: 'ViewSonic' },
    { pattern: '^SONY.+', manufacturer: 'Sony' },
    { pattern: '^ACER.+', manufacturer: 'Acer' },
    { pattern: '^AOC.+', manufacturer: 'AOC Monitors' },
    { pattern: '^HP.+', manufacturer: 'HP' },
    { pattern: '^EIZO.?', manufacturer: 'Eizo' },
    { pattern: '^PHILIPS.?', manufacturer: 'Philips' },
    { pattern: '^IIYAMA.?', manufacturer: 'Iiyama' },
    { pattern: '^SHARP.?', manufacturer: 'Sharp' },
    { pattern: '^NEC.?', manufacturer: 'NEC' },
    { pattern: '^LENOVO.?', manufacturer: 'Lenovo' },
    { pattern: 'COMPAQ.?', manufacturer: 'Compaq' },
    { pattern: 'APPLE.?', manufacturer: 'Apple' },
    { pattern: 'INTEL.?', manufacturer: 'Intel' },
    { pattern: 'AMD.?', manufacturer: 'AMD' },
    { pattern: 'NVIDIA.?', manufacturer: 'NVDIA' },
  ];

  let result = '';
  if (model) {
    model = model.toUpperCase();
    manufacturers.forEach((manufacturer) => {
      const re = RegExp(manufacturer.pattern);
      if (re.test(model)) { result = manufacturer.manufacturer; }
    });
  }
  return result;
}

function getVendorFromId(id) {
  const vendors = {
    '610': 'Apple',
    '1e6d': 'LG',
    '10ac': 'DELL',
    '4dd9': 'Sony',
    '38a3': 'NEC',
  };
  return vendors[id] || '';
}

function vendorToId(str) {
  let result = '';
  str = (str || '').toLowerCase();
  if (str.indexOf('apple') >= 0) { result = '0x05ac'; }
  else if (str.indexOf('nvidia') >= 0) { result = '0x10de'; }
  else if (str.indexOf('intel') >= 0) { result = '0x8086'; }
  else if (str.indexOf('ati') >= 0 || str.indexOf('amd') >= 0) { result = '0x1002'; }

  return result;
}

function getMetalVersion(id) {
  const families = {
    'spdisplays_mtlgpufamilymac1': 'mac1',
    'spdisplays_mtlgpufamilymac2': 'mac2',
    'spdisplays_mtlgpufamilyapple1': 'apple1',
    'spdisplays_mtlgpufamilyapple2': 'apple2',
    'spdisplays_mtlgpufamilyapple3': 'apple3',
    'spdisplays_mtlgpufamilyapple4': 'apple4',
    'spdisplays_mtlgpufamilyapple5': 'apple5',
    'spdisplays_mtlgpufamilyapple6': 'apple6',
    'spdisplays_mtlgpufamilyapple7': 'apple7',
    'spdisplays_metalfeaturesetfamily11': 'family1_v1',
    'spdisplays_metalfeaturesetfamily12': 'family1_v2',
    'spdisplays_metalfeaturesetfamily13': 'family1_v3',
    'spdisplays_metalfeaturesetfamily14': 'family1_v4',
    'spdisplays_metalfeaturesetfamily21': 'family2_v1'
  };
  return families[id] || '';
}

function graphics(callback) {

  function parseLinesDarwin(graphicsArr) {
    const res = {
      controllers: [],
      displays: []
    };
    try {
      graphicsArr.forEach(function (item) {
        // controllers
        const bus = ((item.sppci_bus || '').indexOf('builtin') > -1 ? 'Built-In' : ((item.sppci_bus || '').indexOf('pcie') > -1 ? 'PCIe' : ''));
        const vram = (parseInt((item.spdisplays_vram || ''), 10) || 0) * (((item.spdisplays_vram || '').indexOf('GB') > -1) ? 1024 : 1);
        const vramDyn = (parseInt((item.spdisplays_vram_shared || ''), 10) || 0) * (((item.spdisplays_vram_shared || '').indexOf('GB') > -1) ? 1024 : 1);
        let metalVersion = getMetalVersion(item.spdisplays_metal || item.spdisplays_metalfamily || '');
        res.controllers.push({
          vendor: getVendorFromModel(item.spdisplays_vendor || '') || item.spdisplays_vendor || '',
          model: item.sppci_model || '',
          bus,
          vramDynamic: bus === 'Built-In',
          vram: vram || vramDyn || null,
          deviceId: item['spdisplays_device-id'] || '',
          vendorId: item['spdisplays_vendor-id'] || vendorToId((item['spdisplays_vendor'] || '') + (item.sppci_model || '')),
          external: (item.sppci_device_type === 'spdisplays_egpu'),
          cores: item['sppci_cores'] || null,
          metalVersion
        });

        // displays
        if (item.spdisplays_ndrvs && item.spdisplays_ndrvs.length) {
          item.spdisplays_ndrvs.forEach(function (displayItem) {
            const connectionType = displayItem['spdisplays_connection_type'] || '';
            const currentResolutionParts = (displayItem['_spdisplays_resolution'] || '').split('@');
            const currentResolution = currentResolutionParts[0].split('x');
            const pixelParts = (displayItem['_spdisplays_pixels'] || '').split('x');
            const pixelDepthString = displayItem['spdisplays_depth'] || '';
            const serial = displayItem['_spdisplays_display-serial-number'] || displayItem['_spdisplays_display-serial-number2'] || null;
            res.displays.push({
              vendor: getVendorFromId(displayItem['_spdisplays_display-vendor-id'] || '') || getVendorFromModel(displayItem['_name'] || ''),
              vendorId: displayItem['_spdisplays_display-vendor-id'] || '',
              model: displayItem['_name'] || '',
              productionYear: displayItem['_spdisplays_display-year'] || null,
              serial: serial !== '0' ? serial : null,
              displayId: displayItem['_spdisplays_displayID'] || null,
              main: displayItem['spdisplays_main'] ? displayItem['spdisplays_main'] === 'spdisplays_yes' : false,
              builtin: (displayItem['spdisplays_display_type'] || '').indexOf('built-in') > -1,
              connection: ((connectionType.indexOf('_internal') > -1) ? 'Internal' : ((connectionType.indexOf('_displayport') > -1) ? 'Display Port' : ((connectionType.indexOf('_hdmi') > -1) ? 'HDMI' : null))),
              sizeX: null,
              sizeY: null,
              pixelDepth: (pixelDepthString === 'CGSThirtyBitColor' ? 30 : (pixelDepthString === 'CGSThirtytwoBitColor' ? 32 : (pixelDepthString === 'CGSTwentyfourBitColor' ? 24 : null))),
              resolutionX: pixelParts.length > 1 ? parseInt(pixelParts[0], 10) : null,
              resolutionY: pixelParts.length > 1 ? parseInt(pixelParts[1], 10) : null,
              currentResX: currentResolution.length > 1 ? parseInt(currentResolution[0], 10) : null,
              currentResY: currentResolution.length > 1 ? parseInt(currentResolution[1], 10) : null,
              positionX: 0,
              positionY: 0,
              currentRefreshRate: currentResolutionParts.length > 1 ? parseInt(currentResolutionParts[1], 10) : null,

            });
          });
        }
      });
      return res;
    } catch (e) {
      return res;
    }
  }

  function parseLinesLinuxControllers(lines) {
    let controllers = [];
    let currentController = {
      vendor: '',
      subVendor: '',
      model: '',
      bus: '',
      busAddress: '',
      vram: null,
      vramDynamic: false,
      pciID: ''
    };
    let isGraphicsController = false;
    // PCI bus IDs
    let pciIDs = [];
    try {
      pciIDs = execSync('export LC_ALL=C; dmidecode -t 9 2>/dev/null; unset LC_ALL | grep "Bus Address: "').toString().split('\n');
      for (let i = 0; i < pciIDs.length; i++) {
        pciIDs[i] = pciIDs[i].replace('Bus Address:', '').replace('0000:', '').trim();
      }
      pciIDs = pciIDs.filter(function (el) {
        return el != null && el;
      });
    } catch (e) {
      util.noop();
    }
    let i = 1;
    lines.forEach((line) => {
      let subsystem = '';
      if (i < lines.length && lines[i]) {   // get next line;
        subsystem = lines[i];
        if (subsystem.indexOf(':') > 0) {
          subsystem = subsystem.split(':')[1];
        }
      }
      if ('' !== line.trim()) {
        if (' ' !== line[0] && '\t' !== line[0]) {        // first line of new entry
          let isExternal = (pciIDs.indexOf(line.split(' ')[0]) >= 0);
          let vgapos = line.toLowerCase().indexOf(' vga ');
          let _3dcontrollerpos = line.toLowerCase().indexOf('3d controller');
          if (vgapos !== -1 || _3dcontrollerpos !== -1) {         // VGA
            if (_3dcontrollerpos !== -1 && vgapos === -1) {
              vgapos = _3dcontrollerpos;
            }
            if (currentController.vendor || currentController.model || currentController.bus || currentController.vram !== null || currentController.vramDynamic) { // already a controller found
              controllers.push(currentController);
              currentController = {
                vendor: '',
                model: '',
                bus: '',
                busAddress: '',
                vram: null,
                vramDynamic: false,
              };
            }

            const pciIDCandidate = line.split(' ')[0];
            if (/[\da-fA-F]{2}:[\da-fA-F]{2}\.[\da-fA-F]/.test(pciIDCandidate)) {
              currentController.busAddress = pciIDCandidate;
            }
            isGraphicsController = true;
            let endpos = line.search(/\[[0-9a-f]{4}:[0-9a-f]{4}]|$/);
            let parts = line.substr(vgapos, endpos - vgapos).split(':');
            currentController.busAddress = line.substr(0, vgapos).trim();
            if (parts.length > 1) {
              parts[1] = parts[1].trim();
              if (parts[1].toLowerCase().indexOf('corporation') >= 0) {
                currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf('corporation') + 11).trim();
                currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf('corporation') + 11, 200).split('(')[0].trim();
                currentController.bus = (pciIDs.length > 0 && isExternal) ? 'PCIe' : 'Onboard';
                currentController.vram = null;
                currentController.vramDynamic = false;
              } else if (parts[1].toLowerCase().indexOf(' inc.') >= 0) {
                if ((parts[1].match(/]/g) || []).length > 1) {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(']') + 1).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(']') + 1, 200).trim().split('(')[0].trim();
                } else {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(' inc.') + 5).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(' inc.') + 5, 200).trim().split('(')[0].trim();
                }
                currentController.bus = (pciIDs.length > 0 && isExternal) ? 'PCIe' : 'Onboard';
                currentController.vram = null;
                currentController.vramDynamic = false;
              } else if (parts[1].toLowerCase().indexOf(' ltd.') >= 0) {
                if ((parts[1].match(/]/g) || []).length > 1) {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(']') + 1).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(']') + 1, 200).trim().split('(')[0].trim();
                } else {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(' ltd.') + 5).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(' ltd.') + 5, 200).trim().split('(')[0].trim();
                }
              }
              if (currentController.model && subsystem.indexOf(currentController.model) !== -1) {
                const subVendor = subsystem.split(currentController.model)[0].trim();
                if (subVendor) {
                  currentController.subVendor = subVendor;
                }
              }
            }

          } else {
            isGraphicsController = false;
          }
        }
        if (isGraphicsController) { // within VGA details
          let parts = line.split(':');
          if (parts.length > 1 && parts[0].replace(/ +/g, '').toLowerCase().indexOf('devicename') !== -1 && parts[1].toLowerCase().indexOf('onboard') !== -1) { currentController.bus = 'Onboard'; }
          if (parts.length > 1 && parts[0].replace(/ +/g, '').toLowerCase().indexOf('region') !== -1 && parts[1].toLowerCase().indexOf('memory') !== -1) {
            let memparts = parts[1].split('=');
            if (memparts.length > 1) {
              currentController.vram = parseInt(memparts[1]);
            }
          }
        }
      }
      i++;
    });

    if (currentController.vendor || currentController.model || currentController.bus || currentController.busAddress || currentController.vram !== null || currentController.vramDynamic) { // already a controller found
      controllers.push(currentController);
    }
    return (controllers);
  }

  function parseLinesLinuxClinfo(controllers, lines) {
    const fieldPattern = /\[([^\]]+)\]\s+(\w+)\s+(.*)/;
    const devices = lines.reduce((devices, line) => {
      const field = fieldPattern.exec(line.trim());
      if (field) {
        if (!devices[field[1]]) {
          devices[field[1]] = {};
        }
        devices[field[1]][field[2]] = field[3];
      }
      return devices;
    }, {});
    for (let deviceId in devices) {
      const device = devices[deviceId];
      if (device['CL_DEVICE_TYPE'] === 'CL_DEVICE_TYPE_GPU') {
        let busAddress;
        if (device['CL_DEVICE_TOPOLOGY_AMD']) {
          const bdf = device['CL_DEVICE_TOPOLOGY_AMD'].match(/[a-zA-Z0-9]+:\d+\.\d+/);
          if (bdf) {
            busAddress = bdf[0];
          }
        } else if (device['CL_DEVICE_PCI_BUS_ID_NV'] && device['CL_DEVICE_PCI_SLOT_ID_NV']) {
          const bus = parseInt(device['CL_DEVICE_PCI_BUS_ID_NV']);
          const slot = parseInt(device['CL_DEVICE_PCI_SLOT_ID_NV']);
          if (!isNaN(bus) && !isNaN(slot)) {
            const b = bus & 0xff;
            const d = (slot >> 3) & 0xff;
            const f = slot & 0x07;
            busAddress = `${b.toString().padStart(2, '0')}:${d.toString().padStart(2, '0')}.${f}`;
          }
        }
        if (busAddress) {
          let controller = controllers.find(controller => controller.busAddress === busAddress);
          if (!controller) {
            controller = {
              vendor: '',
              model: '',
              bus: '',
              busAddress,
              vram: null,
              vramDynamic: false
            };
            controllers.push(controller);
          }
          controller.vendor = device['CL_DEVICE_VENDOR'];
          if (device['CL_DEVICE_BOARD_NAME_AMD']) {
            controller.model = device['CL_DEVICE_BOARD_NAME_AMD'];
          } else {
            controller.model = device['CL_DEVICE_NAME'];
          }
          const memory = parseInt(device['CL_DEVICE_GLOBAL_MEM_SIZE']);
          if (!isNaN(memory)) {
            controller.vram = Math.round(memory / 1024 / 1024);
          }
        }
      }
    }
    return controllers;
  }

  function getNvidiaSmi() {
    if (_nvidiaSmiPath) {
      return _nvidiaSmiPath;
    }

    if (_windows) {
      try {
        const basePath = util.WINDIR + '\\System32\\DriverStore\\FileRepository';
        // find all directories that have an nvidia-smi.exe file
        const candidateDirs = fs.readdirSync(basePath).filter(dir => {
          return fs.readdirSync([basePath, dir].join('/')).includes('nvidia-smi.exe');
        });
        // use the directory with the most recently created nvidia-smi.exe file
        const targetDir = candidateDirs.reduce((prevDir, currentDir) => {
          const previousNvidiaSmi = fs.statSync([basePath, prevDir, 'nvidia-smi.exe'].join('/'));
          const currentNvidiaSmi = fs.statSync([basePath, currentDir, 'nvidia-smi.exe'].join('/'));
          return (previousNvidiaSmi.ctimeMs > currentNvidiaSmi.ctimeMs) ? prevDir : currentDir;
        });

        if (targetDir) {
          _nvidiaSmiPath = [basePath, targetDir, 'nvidia-smi.exe'].join('/');
        }
      } catch (e) {
        util.noop();
      }
    } else if (_linux) {
      _nvidiaSmiPath = 'nvidia-smi';
    }
    return _nvidiaSmiPath;
  }

  function nvidiaSmi(options) {
    const nvidiaSmiExe = getNvidiaSmi();
    options = options || util.execOptsWin;
    if (nvidiaSmiExe) {
      const nvidiaSmiOpts = '--query-gpu=driver_version,pci.sub_device_id,name,pci.bus_id,fan.speed,memory.total,memory.used,memory.free,utilization.gpu,utilization.memory,temperature.gpu,temperature.memory,power.draw,power.limit,clocks.gr,clocks.mem --format=csv,noheader,nounits';
      const cmd = nvidiaSmiExe + ' ' + nvidiaSmiOpts + (_linux ? '  2>/dev/null' : '');
      try {
        const res = execSync(cmd, options).toString();
        return res;
      } catch (e) {
        util.noop();
      }
    }
    return '';
  }

  function nvidiaDevices() {

    function safeParseNumber(value) {
      if ([null, undefined].includes(value)) {
        return value;
      }
      return parseFloat(value);
    }

    const stdout = nvidiaSmi();
    if (!stdout) {
      return [];
    }

    const gpus = stdout.split('\n').filter(Boolean);
    let results = gpus.map(gpu => {
      const splittedData = gpu.split(', ').map(value => value.includes('N/A') ? undefined : value);
      if (splittedData.length === 16) {
        return {
          driverVersion: splittedData[0],
          subDeviceId: splittedData[1],
          name: splittedData[2],
          pciBus: splittedData[3],
          fanSpeed: safeParseNumber(splittedData[4]),
          memoryTotal: safeParseNumber(splittedData[5]),
          memoryUsed: safeParseNumber(splittedData[6]),
          memoryFree: safeParseNumber(splittedData[7]),
          utilizationGpu: safeParseNumber(splittedData[8]),
          utilizationMemory: safeParseNumber(splittedData[9]),
          temperatureGpu: safeParseNumber(splittedData[10]),
          temperatureMemory: safeParseNumber(splittedData[11]),
          powerDraw: safeParseNumber(splittedData[12]),
          powerLimit: safeParseNumber(splittedData[13]),
          clockCore: safeParseNumber(splittedData[14]),
          clockMemory: safeParseNumber(splittedData[15]),
        };
      } else {
        return {};
      }
    });
    results = results.filter((item) => {
      return ('pciBus' in item);
    });
    return results;
  }

  function mergeControllerNvidia(controller, nvidia) {
    if (nvidia.driverVersion) { controller.driverVersion = nvidia.driverVersion; }
    if (nvidia.subDeviceId) { controller.subDeviceId = nvidia.subDeviceId; }
    if (nvidia.name) { controller.name = nvidia.name; }
    if (nvidia.pciBus) { controller.pciBus = nvidia.pciBus; }
    if (nvidia.fanSpeed) { controller.fanSpeed = nvidia.fanSpeed; }
    if (nvidia.memoryTotal) {
      controller.memoryTotal = nvidia.memoryTotal;
      controller.vram = nvidia.memoryTotal;
      controller.vramDynamic = false;
    }
    if (nvidia.memoryUsed) { controller.memoryUsed = nvidia.memoryUsed; }
    if (nvidia.memoryFree) { controller.memoryFree = nvidia.memoryFree; }
    if (nvidia.utilizationGpu) { controller.utilizationGpu = nvidia.utilizationGpu; }
    if (nvidia.utilizationMemory) { controller.utilizationMemory = nvidia.utilizationMemory; }
    if (nvidia.temperatureGpu) { controller.temperatureGpu = nvidia.temperatureGpu; }
    if (nvidia.temperatureMemory) { controller.temperatureMemory = nvidia.temperatureMemory; }
    if (nvidia.powerDraw) { controller.powerDraw = nvidia.powerDraw; }
    if (nvidia.powerLimit) { controller.powerLimit = nvidia.powerLimit; }
    if (nvidia.clockCore) { controller.clockCore = nvidia.clockCore; }
    if (nvidia.clockMemory) { controller.clockMemory = nvidia.clockMemory; }
    return controller;
  }

  function parseLinesLinuxEdid(edid) {
    // parsen EDID
    // --> model
    // --> resolutionx
    // --> resolutiony
    // --> builtin = false
    // --> pixeldepth (?)
    // --> sizex
    // --> sizey
    let result = {
      vendor: '',
      model: '',
      deviceName: '',
      main: false,
      builtin: false,
      connection: '',
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    };
    // find first "Detailed Timing Description"
    let start = 108;
    if (edid.substr(start, 6) === '000000') {
      start += 36;
    }
    if (edid.substr(start, 6) === '000000') {
      start += 36;
    }
    if (edid.substr(start, 6) === '000000') {
      start += 36;
    }
    if (edid.substr(start, 6) === '000000') {
      start += 36;
    }
    result.resolutionX = parseInt('0x0' + edid.substr(start + 8, 1) + edid.substr(start + 4, 2));
    result.resolutionY = parseInt('0x0' + edid.substr(start + 14, 1) + edid.substr(start + 10, 2));
    result.sizeX = parseInt('0x0' + edid.substr(start + 28, 1) + edid.substr(start + 24, 2));
    result.sizeY = parseInt('0x0' + edid.substr(start + 29, 1) + edid.substr(start + 26, 2));
    // monitor name
    start = edid.indexOf('000000fc00'); // find first "Monitor Description Data"
    if (start >= 0) {
      let model_raw = edid.substr(start + 10, 26);
      if (model_raw.indexOf('0a') !== -1) {
        model_raw = model_raw.substr(0, model_raw.indexOf('0a'));
      }
      try {
        if (model_raw.length > 2) {
          result.model = model_raw.match(/.{1,2}/g).map(function (v) {
            return String.fromCharCode(parseInt(v, 16));
          }).join('');
        }
      } catch (e) {
        util.noop();
      }
    } else {
      result.model = '';
    }
    return result;
  }

  function parseLinesLinuxDisplays(lines, depth) {
    let displays = [];
    let currentDisplay = {
      vendor: '',
      model: '',
      deviceName: '',
      main: false,
      builtin: false,
      connection: '',
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    };
    let is_edid = false;
    let is_current = false;
    let edid_raw = '';
    let start = 0;
    for (let i = 1; i < lines.length; i++) {        // start with second line
      if ('' !== lines[i].trim()) {
        if (' ' !== lines[i][0] && '\t' !== lines[i][0] && lines[i].toLowerCase().indexOf(' connected ') !== -1) {        // first line of new entry
          if (currentDisplay.model || currentDisplay.main || currentDisplay.builtin || currentDisplay.connection || currentDisplay.sizeX !== null || currentDisplay.pixelDepth !== null || currentDisplay.resolutionX !== null) {         // push last display to array
            displays.push(currentDisplay);
            currentDisplay = {
              vendor: '',
              model: '',
              main: false,
              builtin: false,
              connection: '',
              sizeX: null,
              sizeY: null,
              pixelDepth: null,
              resolutionX: null,
              resolutionY: null,
              currentResX: null,
              currentResY: null,
              positionX: 0,
              positionY: 0,
              currentRefreshRate: null
            };
          }
          let parts = lines[i].split(' ');
          currentDisplay.connection = parts[0];
          currentDisplay.main = lines[i].toLowerCase().indexOf(' primary ') >= 0;
          currentDisplay.builtin = (parts[0].toLowerCase().indexOf('edp') >= 0);
        }

        // try to read EDID information
        if (is_edid) {
          if (lines[i].search(/\S|$/) > start) {
            edid_raw += lines[i].toLowerCase().trim();
          } else {
            // parsen EDID
            let edid_decoded = parseLinesLinuxEdid(edid_raw);
            currentDisplay.vendor = edid_decoded.vendor;
            currentDisplay.model = edid_decoded.model;
            currentDisplay.resolutionX = edid_decoded.resolutionX;
            currentDisplay.resolutionY = edid_decoded.resolutionY;
            currentDisplay.sizeX = edid_decoded.sizeX;
            currentDisplay.sizeY = edid_decoded.sizeY;
            currentDisplay.pixelDepth = depth;
            is_edid = false;
          }
        }
        if (lines[i].toLowerCase().indexOf('edid:') >= 0) {
          is_edid = true;
          start = lines[i].search(/\S|$/);
        }
        if (lines[i].toLowerCase().indexOf('*current') >= 0) {
          const parts1 = lines[i].split('(');
          if (parts1 && parts1.length > 1 && parts1[0].indexOf('x') >= 0) {
            const resParts = parts1[0].trim().split('x');
            currentDisplay.currentResX = util.toInt(resParts[0]);
            currentDisplay.currentResY = util.toInt(resParts[1]);
          }
          is_current = true;
        }
        if (is_current && lines[i].toLowerCase().indexOf('clock') >= 0 && lines[i].toLowerCase().indexOf('hz') >= 0 && lines[i].toLowerCase().indexOf('v: height') >= 0) {
          const parts1 = lines[i].split('clock');
          if (parts1 && parts1.length > 1 && parts1[1].toLowerCase().indexOf('hz') >= 0) {
            currentDisplay.currentRefreshRate = util.toInt(parts1[1]);
          }
          is_current = false;
        }
      }
    }

    // pushen displays
    if (currentDisplay.model || currentDisplay.main || currentDisplay.builtin || currentDisplay.connection || currentDisplay.sizeX !== null || currentDisplay.pixelDepth !== null || currentDisplay.resolutionX !== null) {  // still information there
      displays.push(currentDisplay);
    }
    return displays;
  }

  // function starts here
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        controllers: [],
        displays: []
      };
      if (_darwin) {
        let cmd = 'system_profiler -xml -detailLevel full SPDisplaysDataType';
        exec(cmd, function (error, stdout) {
          if (!error) {
            try {
              const output = stdout.toString();
              result = parseLinesDarwin(util.plistParser(output)[0]._items);
            } catch (e) {
              util.noop();
            }
            try {
              stdout = execSync('defaults read /Library/Preferences/com.apple.windowserver.plist 2>/dev/null;defaults read /Library/Preferences/com.apple.windowserver.displays.plist 2>/dev/null; echo ""', { maxBuffer: 1024 * 20000 });
              const output = (stdout || '').toString();
              const obj = util.plistReader(output);
              if (obj['DisplayAnyUserSets'] && obj['DisplayAnyUserSets']['Configs'] && obj['DisplayAnyUserSets']['Configs'][0] && obj['DisplayAnyUserSets']['Configs'][0]['DisplayConfig']) {
                const current = obj['DisplayAnyUserSets']['Configs'][0]['DisplayConfig'];
                let i = 0;
                current.forEach((o) => {
                  if (o['CurrentInfo'] && o['CurrentInfo']['OriginX'] !== undefined && result.displays && result.displays[i]) {
                    result.displays[i].positionX = o['CurrentInfo']['OriginX'];
                  }
                  if (o['CurrentInfo'] && o['CurrentInfo']['OriginY'] !== undefined && result.displays && result.displays[i]) {
                    result.displays[i].positionY = o['CurrentInfo']['OriginY'];
                  }
                  i++;
                });
              }
              if (obj['DisplayAnyUserSets'] && obj['DisplayAnyUserSets'].length > 0 && obj['DisplayAnyUserSets'][0].length > 0 && obj['DisplayAnyUserSets'][0][0]['DisplayID']) {
                const current = obj['DisplayAnyUserSets'][0];
                let i = 0;
                current.forEach((o) => {
                  if ('OriginX' in o && result.displays && result.displays[i]) {
                    result.displays[i].positionX = o['OriginX'];
                  }
                  if ('OriginY' in o && result.displays && result.displays[i]) {
                    result.displays[i].positionY = o['OriginY'];
                  }
                  if (o['Mode'] && o['Mode']['BitsPerPixel'] !== undefined && result.displays && result.displays[i]) {
                    result.displays[i].pixelDepth = o['Mode']['BitsPerPixel'];
                  }
                  i++;
                });
              }
            } catch (e) {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux) {
        // Raspberry: https://elinux.org/RPI_vcgencmd_usage
        if (util.isRaspberry() && util.isRaspbian()) {
          let cmd = 'fbset -s | grep \'mode "\'; vcgencmd get_mem gpu; tvservice -s; tvservice -n;';
          exec(cmd, function (error, stdout) {
            let lines = stdout.toString().split('\n');
            if (lines.length > 3 && lines[0].indexOf('mode "') >= -1 && lines[2].indexOf('0x12000a') > -1) {
              const parts = lines[0].replace('mode', '').replace(/"/g, '').trim().split('x');
              if (parts.length === 2) {
                result.displays.push({
                  vendor: '',
                  model: util.getValue(lines, 'device_name', '='),
                  main: true,
                  builtin: false,
                  connection: 'HDMI',
                  sizeX: null,
                  sizeY: null,
                  pixelDepth: null,
                  resolutionX: parseInt(parts[0], 10),
                  resolutionY: parseInt(parts[1], 10),
                  currentResX: null,
                  currentResY: null,
                  positionX: 0,
                  positionY: 0,
                  currentRefreshRate: null
                });
              }
            }
            if (lines.length > 1 && stdout.toString().indexOf('gpu=') >= -1) {
              result.controllers.push({
                vendor: 'Broadcom',
                model: util.getRpiGpu(),
                bus: '',
                vram: util.getValue(lines, 'gpu', '=').replace('M', ''),
                vramDynamic: true
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } else {
          let cmd = 'lspci -vvv  2>/dev/null';
          exec(cmd, function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              result.controllers = parseLinesLinuxControllers(lines);
              const nvidiaData = nvidiaDevices();
              // needs to be rewritten ... using no spread operators
              result.controllers = result.controllers.map((controller) => { // match by busAddress
                return mergeControllerNvidia(controller, nvidiaData.find((contr) => contr.pciBus.toLowerCase().endsWith(controller.busAddress.toLowerCase())) || {});
              });
            }
            let cmd = 'clinfo --raw';
            exec(cmd, function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                result.controllers = parseLinesLinuxClinfo(result.controllers, lines);
              }
              let cmd = 'xdpyinfo 2>/dev/null | grep \'depth of root window\' | awk \'{ print $5 }\'';
              exec(cmd, function (error, stdout) {
                let depth = 0;
                if (!error) {
                  let lines = stdout.toString().split('\n');
                  depth = parseInt(lines[0]) || 0;
                }
                let cmd = 'xrandr --verbose 2>/dev/null';
                exec(cmd, function (error, stdout) {
                  if (!error) {
                    let lines = stdout.toString().split('\n');
                    result.displays = parseLinesLinuxDisplays(lines, depth);
                  }
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                });
              });
            });
          });
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        if (callback) { callback(null); }
        resolve(null);
      }
      if (_sunos) {
        if (callback) { callback(null); }
        resolve(null);
      }
      if (_windows) {

        // https://blogs.technet.microsoft.com/heyscriptingguy/2013/10/03/use-powershell-to-discover-multi-monitor-information/
        // https://devblogs.microsoft.com/scripting/use-powershell-to-discover-multi-monitor-information/
        try {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance win32_VideoController | fl *'));
          workload.push(util.powerShell('gp "HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\*" -ErrorAction SilentlyContinue | where MatchingDeviceId $null -NE | select MatchingDeviceId,HardwareInformation.qwMemorySize | fl'));
          workload.push(util.powerShell('Get-CimInstance win32_desktopmonitor | fl *'));
          workload.push(util.powerShell('Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams | fl'));
          workload.push(util.powerShell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens'));
          workload.push(util.powerShell('Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorConnectionParams | fl'));
          workload.push(util.powerShell('gwmi WmiMonitorID -Namespace root\\wmi | ForEach-Object {(($_.ManufacturerName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.ProductCodeID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.UserFriendlyName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.SerialNumberID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + $_.InstanceName}'));

          const nvidiaData = nvidiaDevices();

          Promise.all(
            workload
          ).then((data) => {
            // controller + vram
            let csections = data[0].replace(/\r/g, '').split(/\n\s*\n/);
            let vsections = data[1].replace(/\r/g, '').split(/\n\s*\n/);
            result.controllers = parseLinesWindowsControllers(csections, vsections);
            result.controllers = result.controllers.map((controller) => { // match by subDeviceId
              if (controller.vendor.toLowerCase() === 'nvidia') {
                return mergeControllerNvidia(controller, nvidiaData.find(device => {
                  let windowsSubDeviceId = (controller.subDeviceId || '').toLowerCase();
                  const nvidiaSubDeviceIdParts = device.subDeviceId.split('x');
                  let nvidiaSubDeviceId = nvidiaSubDeviceIdParts.length > 1 ? nvidiaSubDeviceIdParts[1].toLowerCase() : nvidiaSubDeviceIdParts[0].toLowerCase();
                  const lengthDifference = Math.abs(windowsSubDeviceId.length - nvidiaSubDeviceId.length);
                  if (windowsSubDeviceId.length > nvidiaSubDeviceId.length) {
                    for (let i = 0; i < lengthDifference; i++) {
                      nvidiaSubDeviceId = '0' + nvidiaSubDeviceId;
                    }
                  } else if (windowsSubDeviceId.length < nvidiaSubDeviceId.length) {
                    for (let i = 0; i < lengthDifference; i++) {
                      windowsSubDeviceId = '0' + windowsSubDeviceId;
                    }
                  }
                  return windowsSubDeviceId === nvidiaSubDeviceId;
                }) || {});
              } else {
                return controller;
              }
            });

            // displays
            let dsections = data[2].replace(/\r/g, '').split(/\n\s*\n/);
            // result.displays = parseLinesWindowsDisplays(dsections);
            if (dsections[0].trim() === '') { dsections.shift(); }
            if (dsections.length && dsections[dsections.length - 1].trim() === '') { dsections.pop(); }

            // monitor (powershell)
            let msections = data[3].replace(/\r/g, '').split('Active ');
            msections.shift();

            // forms.screens (powershell)
            let ssections = data[4].replace(/\r/g, '').split('BitsPerPixel ');
            ssections.shift();

            // connection params (powershell) - video type
            let tsections = data[5].replace(/\r/g, '').split(/\n\s*\n/);
            tsections.shift();

            // monitor ID (powershell) - model / vendor
            const res = data[6].replace(/\r/g, '').split(/\n/);
            let isections = [];
            res.forEach(element => {
              const parts = element.split('|');
              if (parts.length === 5) {
                isections.push({
                  vendor: parts[0],
                  code: parts[1],
                  model: parts[2],
                  serial: parts[3],
                  instanceId: parts[4]
                });
              }
            });

            result.displays = parseLinesWindowsDisplaysPowershell(ssections, msections, dsections, tsections, isections);

            if (result.displays.length === 1) {
              if (_resolutionX) {
                result.displays[0].resolutionX = _resolutionX;
                if (!result.displays[0].currentResX) {
                  result.displays[0].currentResX = _resolutionX;
                }
              }
              if (_resolutionY) {
                result.displays[0].resolutionY = _resolutionY;
                if (result.displays[0].currentResY === 0) {
                  result.displays[0].currentResY = _resolutionY;
                }
              }
              if (_pixelDepth) {
                result.displays[0].pixelDepth = _pixelDepth;
              }
            }
            result.displays = result.displays.map(element => {
              if (_refreshRate && !element.currentRefreshRate) {
                element.currentRefreshRate = _refreshRate;
              }
              return element;
            });

            if (callback) {
              callback(result);
            }
            resolve(result);
          })
            .catch(() => {
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });

  function parseLinesWindowsControllers(sections, vections) {
    const memorySizes = {};
    for (const i in vections) {
      if ({}.hasOwnProperty.call(vections, i)) {
        if (vections[i].trim() !== '') {
          const lines = vections[i].trim().split('\n');
          const matchingDeviceId = util.getValue(lines, 'MatchingDeviceId').match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
          if (matchingDeviceId) {
            const quadWordmemorySize = parseInt(util.getValue(lines, 'HardwareInformation.qwMemorySize'));
            if (!isNaN(quadWordmemorySize)) {
              let deviceId = matchingDeviceId[1].toUpperCase() + '&' + matchingDeviceId[2].toUpperCase();
              if (matchingDeviceId[3]) {
                deviceId += '&' + matchingDeviceId[3].toUpperCase();
              }
              if (matchingDeviceId[4]) {
                deviceId += '&' + matchingDeviceId[4].toUpperCase();
              }
              memorySizes[deviceId] = quadWordmemorySize;
            }
          }
        }
      }
    }

    let controllers = [];
    for (let i in sections) {
      if ({}.hasOwnProperty.call(sections, i)) {
        if (sections[i].trim() !== '') {
          let lines = sections[i].trim().split('\n');
          let pnpDeviceId = util.getValue(lines, 'PNPDeviceID', ':').match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
          let subDeviceId = null;
          let memorySize = null;
          if (pnpDeviceId) {
            subDeviceId = pnpDeviceId[3] || '';
            if (subDeviceId) {
              subDeviceId = subDeviceId.split('_')[1];
            }

            // Match PCI device identifier (there's an order of increasing generality):
            // https://docs.microsoft.com/en-us/windows-hardware/drivers/install/identifiers-for-pci-devices

            // PCI\VEN_v(4)&DEV_d(4)&SUBSYS_s(4)n(4)&REV_r(2)
            if (memorySize == null && pnpDeviceId[3] && pnpDeviceId[4]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + '&' + pnpDeviceId[2].toUpperCase() + '&' + pnpDeviceId[3].toUpperCase() + '&' + pnpDeviceId[4].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }

            // PCI\VEN_v(4)&DEV_d(4)&SUBSYS_s(4)n(4)
            if (memorySize == null && pnpDeviceId[3]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + '&' + pnpDeviceId[2].toUpperCase() + '&' + pnpDeviceId[3].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }

            // PCI\VEN_v(4)&DEV_d(4)&REV_r(2)
            if (memorySize == null && pnpDeviceId[4]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + '&' + pnpDeviceId[2].toUpperCase() + '&' + pnpDeviceId[4].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }

            // PCI\VEN_v(4)&DEV_d(4)
            if (memorySize == null) {
              const deviceId = pnpDeviceId[1].toUpperCase() + '&' + pnpDeviceId[2].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }
          }

          controllers.push({
            vendor: util.getValue(lines, 'AdapterCompatibility', ':'),
            model: util.getValue(lines, 'name', ':'),
            bus: util.getValue(lines, 'PNPDeviceID', ':').startsWith('PCI') ? 'PCI' : '',
            vram: (memorySize == null ? util.toInt(util.getValue(lines, 'AdapterRAM', ':')) : memorySize) / 1024 / 1024,
            vramDynamic: (util.getValue(lines, 'VideoMemoryType', ':') === '2'),
            subDeviceId
          });
          _resolutionX = util.toInt(util.getValue(lines, 'CurrentHorizontalResolution', ':')) || _resolutionX;
          _resolutionY = util.toInt(util.getValue(lines, 'CurrentVerticalResolution', ':')) || _resolutionY;
          _refreshRate = util.toInt(util.getValue(lines, 'CurrentRefreshRate', ':')) || _refreshRate;
          _pixelDepth = util.toInt(util.getValue(lines, 'CurrentBitsPerPixel', ':')) || _pixelDepth;
        }
      }
    }
    return controllers;
  }

  function parseLinesWindowsDisplaysPowershell(ssections, msections, dsections, tsections, isections) {
    let displays = [];
    let vendor = '';
    let model = '';
    let deviceID = '';
    let resolutionX = 0;
    let resolutionY = 0;
    if (dsections && dsections.length) {
      let linesDisplay = dsections[0].split('\n');
      vendor = util.getValue(linesDisplay, 'MonitorManufacturer', ':');
      model = util.getValue(linesDisplay, 'Name', ':');
      deviceID = util.getValue(linesDisplay, 'PNPDeviceID', ':').replace(/&amp;/g, '&').toLowerCase();
      resolutionX = util.toInt(util.getValue(linesDisplay, 'ScreenWidth', ':'));
      resolutionY = util.toInt(util.getValue(linesDisplay, 'ScreenHeight', ':'));
    }
    for (let i = 0; i < ssections.length; i++) {
      if (ssections[i].trim() !== '') {
        ssections[i] = 'BitsPerPixel ' + ssections[i];
        msections[i] = 'Active ' + msections[i];
        // tsections can be empty OR undefined on earlier versions of powershell (<=2.0)
        // Tag connection type as UNKNOWN by default if this information is missing
        if (tsections.length === 0 || tsections[i] === undefined) {
          tsections[i] = 'Unknown';
        }
        let linesScreen = ssections[i].split('\n');
        let linesMonitor = msections[i].split('\n');

        let linesConnection = tsections[i].split('\n');
        const bitsPerPixel = util.getValue(linesScreen, 'BitsPerPixel');
        const bounds = util.getValue(linesScreen, 'Bounds').replace('{', '').replace('}', '').replace(/=/g, ':').split(',');
        const primary = util.getValue(linesScreen, 'Primary');
        const sizeX = util.getValue(linesMonitor, 'MaxHorizontalImageSize');
        const sizeY = util.getValue(linesMonitor, 'MaxVerticalImageSize');
        const instanceName = util.getValue(linesMonitor, 'InstanceName').toLowerCase();
        const videoOutputTechnology = util.getValue(linesConnection, 'VideoOutputTechnology');
        const deviceName = util.getValue(linesScreen, 'DeviceName');
        let displayVendor = '';
        let displayModel = '';
        isections.forEach(element => {
          if (element.instanceId.toLowerCase().startsWith(instanceName) && vendor.startsWith('(') && model.startsWith('PnP')) {
            displayVendor = element.vendor;
            displayModel = element.model;
          }
        });
        displays.push({
          vendor: instanceName.startsWith(deviceID) && displayVendor === '' ? vendor : displayVendor,
          model: instanceName.startsWith(deviceID) && displayModel === '' ? model : displayModel,
          deviceName,
          main: primary.toLowerCase() === 'true',
          builtin: videoOutputTechnology === '2147483648',
          connection: videoOutputTechnology && videoTypes[videoOutputTechnology] ? videoTypes[videoOutputTechnology] : '',
          resolutionX: util.toInt(util.getValue(bounds, 'Width', ':')),
          resolutionY: util.toInt(util.getValue(bounds, 'Height', ':')),
          sizeX: sizeX ? parseInt(sizeX, 10) : null,
          sizeY: sizeY ? parseInt(sizeY, 10) : null,
          pixelDepth: bitsPerPixel,
          currentResX: util.toInt(util.getValue(bounds, 'Width', ':')),
          currentResY: util.toInt(util.getValue(bounds, 'Height', ':')),
          positionX: util.toInt(util.getValue(bounds, 'X', ':')),
          positionY: util.toInt(util.getValue(bounds, 'Y', ':')),
        });
      }
    }
    if (ssections.length === 0) {
      displays.push({
        vendor,
        model,
        main: true,
        sizeX: null,
        sizeY: null,
        resolutionX,
        resolutionY,
        pixelDepth: null,
        currentResX: resolutionX,
        currentResY: resolutionY,
        positionX: 0,
        positionY: 0
      });
    }
    return displays;
  }
}

exports.graphics = graphics;


/***/ }),

/***/ 2491:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// index.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// Contributors:  Guillaume Legrain (https://github.com/glegrain)
//                Riccardo Novaglia (https://github.com/richy24)
//                Quentin Busuttil (https://github.com/Buzut)
//                Lapsio (https://github.com/lapsio)
//                csy (https://github.com/csy1983)
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================

// ----------------------------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------------------------

const lib_version = (__nccwpck_require__(3435)/* .version */ .i8);
const util = __nccwpck_require__(7146);
const system = __nccwpck_require__(8935);
const osInfo = __nccwpck_require__(2448);
const cpu = __nccwpck_require__(2009);
const memory = __nccwpck_require__(8955);
const battery = __nccwpck_require__(6828);
const graphics = __nccwpck_require__(3343);
const filesystem = __nccwpck_require__(7177);
const network = __nccwpck_require__(3769);
const wifi = __nccwpck_require__(750);
const processes = __nccwpck_require__(6057);
const users = __nccwpck_require__(8032);
const internet = __nccwpck_require__(8644);
const docker = __nccwpck_require__(8953);
const vbox = __nccwpck_require__(9389);
const printer = __nccwpck_require__(6949);
const usb = __nccwpck_require__(6535);
const audio = __nccwpck_require__(9676);
const bluetooth = __nccwpck_require__(7378);

let _platform = process.platform;
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

// ----------------------------------------------------------------------------------
// init
// ----------------------------------------------------------------------------------

if (_windows) {
  util.getCodepage();
}

// ----------------------------------------------------------------------------------
// General
// ----------------------------------------------------------------------------------

function version() {
  return lib_version;
}

// ----------------------------------------------------------------------------------
// Get static and dynamic data (all)
// ----------------------------------------------------------------------------------

// --------------------------
// get static data - they should not change until restarted

function getStaticData(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let data = {};

      data.version = version();

      Promise.all([
        system.system(),
        system.bios(),
        system.baseboard(),
        system.chassis(),
        osInfo.osInfo(),
        osInfo.uuid(),
        osInfo.versions(),
        cpu.cpu(),
        cpu.cpuFlags(),
        graphics.graphics(),
        network.networkInterfaces(),
        memory.memLayout(),
        filesystem.diskLayout()
      ]).then((res) => {
        data.system = res[0];
        data.bios = res[1];
        data.baseboard = res[2];
        data.chassis = res[3];
        data.os = res[4];
        data.uuid = res[5];
        data.versions = res[6];
        data.cpu = res[7];
        data.cpu.flags = res[8];
        data.graphics = res[9];
        data.net = res[10];
        data.memLayout = res[11];
        data.diskLayout = res[12];
        if (callback) { callback(data); }
        resolve(data);
      });
    });
  });
}


// --------------------------
// get all dynamic data - e.g. for monitoring agents
// may take some seconds to get all data
// --------------------------
// 2 additional parameters needed
// - srv: 		comma separated list of services to monitor e.g. "mysql, apache, postgresql"
// - iface:	define network interface for which you like to monitor network speed e.g. "eth0"

function getDynamicData(srv, iface, callback) {

  if (util.isFunction(iface)) {
    callback = iface;
    iface = '';
  }
  if (util.isFunction(srv)) {
    callback = srv;
    srv = '';
  }

  return new Promise((resolve) => {
    process.nextTick(() => {

      iface = iface || network.getDefaultNetworkInterface();
      srv = srv || '';

      // use closure to track ƒ completion
      let functionProcessed = (function () {
        let totalFunctions = 15;
        if (_windows) { totalFunctions = 13; }
        if (_freebsd || _openbsd || _netbsd) { totalFunctions = 11; }
        if (_sunos) { totalFunctions = 6; }

        return function () {
          if (--totalFunctions === 0) {
            if (callback) {
              callback(data);
            }
            resolve(data);
          }
        };
      })();

      let data = {};

      // get time
      data.time = osInfo.time();

      /**
       * @namespace
       * @property {Object}  versions
       * @property {string}  versions.node
       * @property {string}  versions.v8
       */
      data.node = process.versions.node;
      data.v8 = process.versions.v8;

      cpu.cpuCurrentSpeed().then((res) => {
        data.cpuCurrentSpeed = res;
        functionProcessed();
      });

      users.users().then((res) => {
        data.users = res;
        functionProcessed();
      });

      processes.processes().then((res) => {
        data.processes = res;
        functionProcessed();
      });

      cpu.currentLoad().then((res) => {
        data.currentLoad = res;
        functionProcessed();
      });

      if (!_sunos) {
        cpu.cpuTemperature().then((res) => {
          data.temp = res;
          functionProcessed();
        });
      }

      if (!_openbsd && !_freebsd && !_netbsd && !_sunos) {
        network.networkStats(iface).then((res) => {
          data.networkStats = res;
          functionProcessed();
        });
      }

      if (!_sunos) {
        network.networkConnections().then((res) => {
          data.networkConnections = res;
          functionProcessed();
        });
      }

      memory.mem().then((res) => {
        data.mem = res;
        functionProcessed();
      });

      if (!_sunos) {
        battery().then((res) => {
          data.battery = res;
          functionProcessed();
        });
      }

      if (!_sunos) {
        processes.services(srv).then((res) => {
          data.services = res;
          functionProcessed();
        });
      }

      if (!_sunos) {
        filesystem.fsSize().then((res) => {
          data.fsSize = res;
          functionProcessed();
        });
      }

      if (!_windows && !_openbsd && !_freebsd && !_netbsd && !_sunos) {
        filesystem.fsStats().then((res) => {
          data.fsStats = res;
          functionProcessed();
        });
      }

      if (!_windows && !_openbsd && !_freebsd && !_netbsd && !_sunos) {
        filesystem.disksIO().then((res) => {
          data.disksIO = res;
          functionProcessed();
        });
      }

      if (!_openbsd && !_freebsd && !_netbsd && !_sunos) {
        wifi.wifiNetworks().then((res) => {
          data.wifiNetworks = res;
          functionProcessed();
        });
      }

      internet.inetLatency().then((res) => {
        data.inetLatency = res;
        functionProcessed();
      });
    });
  });
}

// --------------------------
// get all data at once
// --------------------------
// 2 additional parameters needed
// - srv: 		comma separated list of services to monitor e.g. "mysql, apache, postgresql"
// - iface:	define network interface for which you like to monitor network speed e.g. "eth0"

function getAllData(srv, iface, callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let data = {};

      if (iface && util.isFunction(iface) && !callback) {
        callback = iface;
        iface = '';
      }

      if (srv && util.isFunction(srv) && !iface && !callback) {
        callback = srv;
        srv = '';
        iface = '';
      }

      getStaticData().then((res) => {
        data = res;
        getDynamicData(srv, iface).then((res) => {
          for (let key in res) {
            if ({}.hasOwnProperty.call(res, key)) {
              data[key] = res[key];
            }
          }
          if (callback) { callback(data); }
          resolve(data);
        });
      });
    });
  });
}

function get(valueObject, callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const allPromises = Object.keys(valueObject)
        .filter(func => ({}.hasOwnProperty.call(exports, func)))
        .map(func => {
          const params = valueObject[func].substring(valueObject[func].lastIndexOf('(') + 1, valueObject[func].lastIndexOf(')'));
          let funcWithoutParams = func.indexOf(')') >= 0 ? func.split(')')[1].trim() : func;
          funcWithoutParams = func.indexOf('|') >= 0 ? func.split('|')[0].trim() : funcWithoutParams;
          if (params) {
            return exports[funcWithoutParams](params);
          } else {
            return exports[funcWithoutParams]('');
          }
        });

      Promise.all(allPromises).then((data) => {
        const result = {};
        let i = 0;
        for (let key in valueObject) {
          if ({}.hasOwnProperty.call(valueObject, key) && {}.hasOwnProperty.call(exports, key) && data.length > i) {
            if (valueObject[key] === '*' || valueObject[key] === 'all') {
              result[key] = data[i];
            } else {
              let keys = valueObject[key];
              let filter = '';
              let filterParts = [];
              // remove params
              if (keys.indexOf(')') >= 0) {
                keys = keys.split(')')[1].trim();
              }
              // extract filter and remove it from keys
              if (keys.indexOf('|') >= 0) {
                filter = keys.split('|')[1].trim();
                filterParts = filter.split(':');

                keys = keys.split('|')[0].trim();
              }
              keys = keys.replace(/,/g, ' ').replace(/ +/g, ' ').split(' ');
              if (data[i]) {
                if (Array.isArray(data[i])) {
                  // result is in an array, go through all elements of array and pick only the right ones
                  const partialArray = [];
                  data[i].forEach(element => {
                    let partialRes = {};
                    if (keys.length === 1 && (keys[0] === '*' || keys[0] === 'all')) {
                      partialRes = element;
                    } else {
                      keys.forEach(k => {
                        if ({}.hasOwnProperty.call(element, k)) {
                          partialRes[k] = element[k];
                        }
                      });
                    }
                    // if there is a filter, then just take those elements
                    if (filter && filterParts.length === 2) {
                      if ({}.hasOwnProperty.call(partialRes, filterParts[0].trim())) {
                        const val = partialRes[filterParts[0].trim()];
                        if (typeof val == 'number') {
                          if (val === parseFloat(filterParts[1].trim())) {
                            partialArray.push(partialRes);
                          }
                        } else if (typeof val == 'string') {
                          if (val.toLowerCase() === filterParts[1].trim().toLowerCase()) {
                            partialArray.push(partialRes);
                          }
                        }
                      }
                    } else {
                      partialArray.push(partialRes);
                    }

                  });
                  result[key] = partialArray;
                } else {
                  const partialRes = {};
                  keys.forEach(k => {
                    if ({}.hasOwnProperty.call(data[i], k)) {
                      partialRes[k] = data[i][k];
                    }
                  });
                  result[key] = partialRes;
                }
              } else {
                result[key] = {};
              }
            }
            i++;
          }
        }
        if (callback) { callback(result); }
        resolve(result);
      });
    });
  });
}

function observe(valueObject, interval, callback) {
  let _data = null;

  const result = setInterval(() => {
    get(valueObject).then((data) => {
      if (JSON.stringify(_data) !== JSON.stringify(data)) {
        _data = Object.assign({}, data);
        callback(data);
      }
    });
  }, interval);
  return result;
}

// ----------------------------------------------------------------------------------
// export all libs
// ----------------------------------------------------------------------------------

exports.version = version;
exports.system = system.system;
exports.bios = system.bios;
exports.baseboard = system.baseboard;
exports.chassis = system.chassis;

exports.time = osInfo.time;
exports.osInfo = osInfo.osInfo;
exports.versions = osInfo.versions;
exports.shell = osInfo.shell;
exports.uuid = osInfo.uuid;

exports.cpu = cpu.cpu;
exports.cpuFlags = cpu.cpuFlags;
exports.cpuCache = cpu.cpuCache;
exports.cpuCurrentSpeed = cpu.cpuCurrentSpeed;
exports.cpuTemperature = cpu.cpuTemperature;
exports.currentLoad = cpu.currentLoad;
exports.fullLoad = cpu.fullLoad;

exports.mem = memory.mem;
exports.memLayout = memory.memLayout;

exports.battery = battery;

exports.graphics = graphics.graphics;

exports.fsSize = filesystem.fsSize;
exports.fsOpenFiles = filesystem.fsOpenFiles;
exports.blockDevices = filesystem.blockDevices;
exports.fsStats = filesystem.fsStats;
exports.disksIO = filesystem.disksIO;
exports.diskLayout = filesystem.diskLayout;

exports.networkInterfaceDefault = network.networkInterfaceDefault;
exports.networkGatewayDefault = network.networkGatewayDefault;
exports.networkInterfaces = network.networkInterfaces;
exports.networkStats = network.networkStats;
exports.networkConnections = network.networkConnections;

exports.wifiNetworks = wifi.wifiNetworks;
exports.wifiInterfaces = wifi.wifiInterfaces;
exports.wifiConnections = wifi.wifiConnections;

exports.services = processes.services;
exports.processes = processes.processes;
exports.processLoad = processes.processLoad;

exports.users = users.users;

exports.inetChecksite = internet.inetChecksite;
exports.inetLatency = internet.inetLatency;

exports.dockerInfo = docker.dockerInfo;
exports.dockerImages = docker.dockerImages;
exports.dockerContainers = docker.dockerContainers;
exports.dockerContainerStats = docker.dockerContainerStats;
exports.dockerContainerProcesses = docker.dockerContainerProcesses;
exports.dockerVolumes = docker.dockerVolumes;
exports.dockerAll = docker.dockerAll;

exports.vboxInfo = vbox.vboxInfo;

exports.printer = printer.printer;

exports.usb = usb.usb;

exports.audio = audio.audio;
exports.bluetoothDevices = bluetooth.bluetoothDevices;

exports.getStaticData = getStaticData;
exports.getDynamicData = getDynamicData;
exports.getAllData = getAllData;
exports.get = get;
exports.observe = observe;

exports.powerShellStart = util.powerShellStart;
exports.powerShellRelease = util.powerShellRelease;


/***/ }),

/***/ 8644:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// internet.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 12. Internet
// ----------------------------------------------------------------------------------

const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

// --------------------------
// check if external site is available

function inetChecksite(url, callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        url: url,
        ok: false,
        status: 404,
        ms: null
      };
      if (typeof url !== 'string') {
        if (callback) { callback(result); }
        return resolve(result);
      }
      let urlSanitized = '';
      const s = util.sanitizeShellString(url, true);
      const l = util.mathMin(s.length, 2000);
      for (let i = 0; i <= l; i++) {
        if (s[i] !== undefined) {
          s[i].__proto__.toLowerCase = util.stringToLower;
          const sl = s[i].toLowerCase();
          if (sl && sl[0] && !sl[1] && sl[0].length === 1) {
            urlSanitized = urlSanitized + sl[0];
          }
        }
      }
      result.url = urlSanitized;
      try {
        if (urlSanitized && !util.isPrototypePolluted()) {
          urlSanitized.__proto__.startsWith = util.stringStartWith;
          if (urlSanitized.startsWith('file:') || urlSanitized.startsWith('gopher:') || urlSanitized.startsWith('telnet:') || urlSanitized.startsWith('mailto:') || urlSanitized.startsWith('news:') || urlSanitized.startsWith('nntp:')) {
            if (callback) { callback(result); }
            return resolve(result);
          }
          let t = Date.now();
          if (_linux || _freebsd || _openbsd || _netbsd || _darwin || _sunos) {
            let args = ['-I', '--connect-timeout', '5', '-m', '5'];
            args.push(urlSanitized);
            let cmd = 'curl';
            util.execSafe(cmd, args).then((stdout) => {
              const lines = stdout.split('\n');
              let statusCode = lines[0] && lines[0].indexOf(' ') >= 0 ? parseInt(lines[0].split(' ')[1], 10) : 404;
              result.status = statusCode || 404;
              result.ok = (statusCode === 200 || statusCode === 301 || statusCode === 302 || statusCode === 304);
              result.ms = (result.ok ? Date.now() - t : null);
              if (callback) { callback(result); }
              resolve(result);
            });
          }
          if (_windows) {   // if this is stable, this can be used for all OS types
            const http = (urlSanitized.startsWith('https:') ? __nccwpck_require__(5687) : __nccwpck_require__(3685));
            try {
              http.get(urlSanitized, (res) => {
                const statusCode = res.statusCode;

                result.status = statusCode || 404;
                result.ok = (statusCode === 200 || statusCode === 301 || statusCode === 302 || statusCode === 304);

                if (statusCode !== 200) {
                  res.resume();
                  result.ms = (result.ok ? Date.now() - t : null);
                  if (callback) { callback(result); }
                  resolve(result);
                } else {
                  res.on('data', () => { });
                  res.on('end', () => {
                    result.ms = (result.ok ? Date.now() - t : null);
                    if (callback) { callback(result); }
                    resolve(result);
                  });
                }
              }).on('error', () => {
                if (callback) { callback(result); }
                resolve(result);
              });
            } catch (err) {
              if (callback) { callback(result); }
              resolve(result);
            }
          }
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      } catch (err) {
        if (callback) { callback(result); }
        resolve(result);
      }
    });
  });
}

exports.inetChecksite = inetChecksite;

// --------------------------
// check inet latency

function inetLatency(host, callback) {

  // fallback - if only callback is given
  if (util.isFunction(host) && !callback) {
    callback = host;
    host = '';
  }

  host = host || '8.8.8.8';

  return new Promise((resolve) => {
    process.nextTick(() => {
      if (typeof host !== 'string') {
        if (callback) { callback(null); }
        return resolve(null);
      }
      let hostSanitized = '';
      const s = (util.isPrototypePolluted() ? '8.8.8.8' : util.sanitizeShellString(host, true)).trim();
      const l = util.mathMin(s.length, 2000);
      for (let i = 0; i <= l; i++) {
        if (!(s[i] === undefined)) {
          s[i].__proto__.toLowerCase = util.stringToLower;
          const sl = s[i].toLowerCase();
          if (sl && sl[0] && !sl[1]) {
            hostSanitized = hostSanitized + sl[0];
          }
        }
      }
      hostSanitized.__proto__.startsWith = util.stringStartWith;
      if (hostSanitized.startsWith('file:') || hostSanitized.startsWith('gopher:') || hostSanitized.startsWith('telnet:') || hostSanitized.startsWith('mailto:') || hostSanitized.startsWith('news:') || hostSanitized.startsWith('nntp:')) {
        if (callback) { callback(null); }
        return resolve(null);
      }
      let params;
      if (_linux || _freebsd || _openbsd || _netbsd || _darwin) {
        if (_linux) {
          params = ['-c', '2', '-w', '3', hostSanitized];
        }
        if (_freebsd || _openbsd || _netbsd) {
          params = ['-c', '2', '-t', '3', hostSanitized];
        }
        if (_darwin) {
          params = ['-c2', '-t3', hostSanitized];
        }
        util.execSafe('ping', params).then((stdout) => {
          let result = null;
          if (stdout) {
            const lines = stdout.split('\n').filter((line) => (line.indexOf('rtt') >= 0 || line.indexOf('round-trip') >= 0 || line.indexOf('avg') >= 0)).join('\n');

            const line = lines.split('=');
            if (line.length > 1) {
              const parts = line[1].split('/');
              if (parts.length > 1) {
                result = parseFloat(parts[1]);
              }
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        const params = ['-s', '-a', hostSanitized, '56', '2'];
        const filt = 'avg';
        util.execSafe('ping', params, { timeout: 3000 }).then((stdout) => {
          let result = null;
          if (stdout) {
            const lines = stdout.split('\n').filter(line => line.indexOf(filt) >= 0).join('\n');
            const line = lines.split('=');
            if (line.length > 1) {
              const parts = line[1].split('/');
              if (parts.length > 1) {
                result = parseFloat(parts[1].replace(',', '.'));
              }
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_windows) {
        let result = null;
        try {
          const params = [hostSanitized, '-n', '1'];
          util.execSafe('ping', params, util.execOptsWin).then((stdout) => {
            if (stdout) {
              let lines = stdout.split('\r\n');
              lines.shift();
              lines.forEach(function (line) {
                if ((line.toLowerCase().match(/ms/g) || []).length === 3) {
                  let l = line.replace(/ +/g, ' ').split(' ');
                  if (l.length > 6) {
                    result = parseFloat(l[l.length - 1]);
                  }
                }
              });
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.inetLatency = inetLatency;


/***/ }),

/***/ 8955:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// memory.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 5. Memory
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const util = __nccwpck_require__(7146);
const fs = __nccwpck_require__(7147);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

const OSX_RAM_manufacturers = {
  '0x014F': 'Transcend Information',
  '0x2C00': 'Micron Technology Inc.',
  '0x802C': 'Micron Technology Inc.',
  '0x80AD': 'Hynix Semiconductor Inc.',
  '0x80CE': 'Samsung Electronics Inc.',
  '0xAD00': 'Hynix Semiconductor Inc.',
  '0xCE00': 'Samsung Electronics Inc.',
  '0x02FE': 'Elpida',
  '0x5105': 'Qimonda AG i. In.',
  '0x8551': 'Qimonda AG i. In.',
  '0x859B': 'Crucial',
  '0x04CD': 'G-Skill'
};

const LINUX_RAM_manufacturers = {
  '017A': 'Apacer',
  '0198': 'HyperX',
  '029E': 'Corsair',
  '04CB': 'A-DATA',
  '04CD': 'G-Skill',
  '059B': 'Crucial',
  '00CE': 'Samsung',
  '1315': 'Crucial',
  '014F': 'Transcend Information',
  '2C00': 'Micron Technology Inc.',
  '802C': 'Micron Technology Inc.',
  '80AD': 'Hynix Semiconductor Inc.',
  '80CE': 'Samsung Electronics Inc.',
  'AD00': 'Hynix Semiconductor Inc.',
  'CE00': 'Samsung Electronics Inc.',
  '02FE': 'Elpida',
  '5105': 'Qimonda AG i. In.',
  '8551': 'Qimonda AG i. In.',
  '859B': 'Crucial'
};

// _______________________________________________________________________________________
// |                         R A M                              |          H D           |
// |______________________|_________________________|           |                        |
// |        active             buffers/cache        |           |                        |
// |________________________________________________|___________|_________|______________|
// |                     used                            free   |   used       free      |
// |____________________________________________________________|________________________|
// |                        total                               |          swap          |
// |____________________________________________________________|________________________|

// free (older versions)
// ----------------------------------
// # free
//              total       used        free     shared    buffers     cached
// Mem:         16038 (1)   15653 (2)   384 (3)  0 (4)     236 (5)     14788 (6)
// -/+ buffers/cache:       628 (7)     15409 (8)
// Swap:        16371         83      16288
//
// |------------------------------------------------------------|
// |                           R A M                            |
// |______________________|_____________________________________|
// | active (2-(5+6) = 7) |  available (3+5+6 = 8)              |
// |______________________|_________________________|___________|
// |        active        |  buffers/cache (5+6)    |           |
// |________________________________________________|___________|
// |                   used (2)                     | free (3)  |
// |____________________________________________________________|
// |                          total (1)                         |
// |____________________________________________________________|

//
// free (since free von procps-ng 3.3.10)
// ----------------------------------
// # free
//              total       used        free     shared    buffers/cache   available
// Mem:         16038 (1)   628 (2)     386 (3)  0 (4)     15024 (5)     14788 (6)
// Swap:        16371         83      16288
//
// |------------------------------------------------------------|
// |                           R A M                            |
// |______________________|_____________________________________|
// |                      |      available (6) estimated        |
// |______________________|_________________________|___________|
// |     active (2)       |   buffers/cache (5)     | free (3)  |
// |________________________________________________|___________|
// |                          total (1)                         |
// |____________________________________________________________|
//
// Reference: http://www.software-architect.net/blog/article/date/2015/06/12/-826c6e5052.html

// /procs/meminfo - sample (all in kB)
//
// MemTotal: 32806380 kB
// MemFree: 17977744 kB
// MemAvailable: 19768972 kB
// Buffers: 517028 kB
// Cached: 2161876 kB
// SwapCached: 456 kB
// Active: 12081176 kB
// Inactive: 2164616 kB
// Active(anon): 10832884 kB
// Inactive(anon): 1477272 kB
// Active(file): 1248292 kB
// Inactive(file): 687344 kB
// Unevictable: 0 kB
// Mlocked: 0 kB
// SwapTotal: 16768892 kB
// SwapFree: 16768304 kB
// Dirty: 268 kB
// Writeback: 0 kB
// AnonPages: 11568832 kB
// Mapped: 719992 kB
// Shmem: 743272 kB
// Slab: 335716 kB
// SReclaimable: 256364 kB
// SUnreclaim: 79352 kB

function mem(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),

        active: os.totalmem() - os.freemem(),     // temporarily (fallback)
        available: os.freemem(),                  // temporarily (fallback)
        buffers: 0,
        cached: 0,
        slab: 0,
        buffcache: 0,

        swaptotal: 0,
        swapused: 0,
        swapfree: 0,
        writeback: null,
        dirty: null
      };

      if (_linux) {
        try {
          fs.readFile('/proc/meminfo', function (error, stdout) {
            if (!error) {
              const lines = stdout.toString().split('\n');
              result.total = parseInt(util.getValue(lines, 'memtotal'), 10);
              result.total = result.total ? result.total * 1024 : os.totalmem();
              result.free = parseInt(util.getValue(lines, 'memfree'), 10);
              result.free = result.free ? result.free * 1024 : os.freemem();
              result.used = result.total - result.free;

              result.buffers = parseInt(util.getValue(lines, 'buffers'), 10);
              result.buffers = result.buffers ? result.buffers * 1024 : 0;
              result.cached = parseInt(util.getValue(lines, 'cached'), 10);
              result.cached = result.cached ? result.cached * 1024 : 0;
              result.slab = parseInt(util.getValue(lines, 'slab'), 10);
              result.slab = result.slab ? result.slab * 1024 : 0;
              result.buffcache = result.buffers + result.cached + result.slab;

              let available = parseInt(util.getValue(lines, 'memavailable'), 10);
              result.available = available ? available * 1024 : result.free + result.buffcache;
              result.active = result.total - result.available;

              result.swaptotal = parseInt(util.getValue(lines, 'swaptotal'), 10);
              result.swaptotal = result.swaptotal ? result.swaptotal * 1024 : 0;
              result.swapfree = parseInt(util.getValue(lines, 'swapfree'), 10);
              result.swapfree = result.swapfree ? result.swapfree * 1024 : 0;
              result.swapused = result.swaptotal - result.swapfree;
              result.writeback = parseInt(util.getValue(lines, 'writeback'), 10);
              result.writeback = result.writeback ? result.writeback * 1024 : 0;
              result.dirty = parseInt(util.getValue(lines, 'dirty'), 10);
              result.dirty = result.dirty ? result.dirty * 1024 : 0;
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_freebsd || _openbsd || _netbsd) {
        try {
          exec('/sbin/sysctl hw.realmem hw.physmem vm.stats.vm.v_page_count vm.stats.vm.v_wire_count vm.stats.vm.v_active_count vm.stats.vm.v_inactive_count vm.stats.vm.v_cache_count vm.stats.vm.v_free_count vm.stats.vm.v_page_size', function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              const pagesize = parseInt(util.getValue(lines, 'vm.stats.vm.v_page_size'), 10);
              const inactive = parseInt(util.getValue(lines, 'vm.stats.vm.v_inactive_count'), 10) * pagesize;
              const cache = parseInt(util.getValue(lines, 'vm.stats.vm.v_cache_count'), 10) * pagesize;

              result.total = parseInt(util.getValue(lines, 'hw.realmem'), 10);
              if (isNaN(result.total)) { result.total = parseInt(util.getValue(lines, 'hw.physmem'), 10); }
              result.free = parseInt(util.getValue(lines, 'vm.stats.vm.v_free_count'), 10) * pagesize;
              result.buffcache = inactive + cache;
              result.available = result.buffcache + result.free;
              result.active = result.total - result.free - result.buffcache;

              result.swaptotal = 0;
              result.swapfree = 0;
              result.swapused = 0;

            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_darwin) {
        let pageSize = 4096;
        try {
          let sysPpageSize = util.toInt(execSync('sysctl -n vm.pagesize').toString());
          pageSize = sysPpageSize || pageSize;
        } catch (e) {
          util.noop();
        }
        try {
          exec('vm_stat 2>/dev/null | grep "Pages active"', function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');

              result.active = parseInt(lines[0].split(':')[1], 10) * pageSize;
              result.buffcache = result.used - result.active;
              result.available = result.free + result.buffcache;
            }
            exec('sysctl -n vm.swapusage 2>/dev/null', function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                if (lines.length > 0) {
                  let firstline = lines[0].replace(/,/g, '.').replace(/M/g, '');
                  let lineArray = firstline.trim().split('  ');
                  lineArray.forEach(line => {
                    if (line.toLowerCase().indexOf('total') !== -1) { result.swaptotal = parseFloat(line.split('=')[1].trim()) * 1024 * 1024; }
                    if (line.toLowerCase().indexOf('used') !== -1) { result.swapused = parseFloat(line.split('=')[1].trim()) * 1024 * 1024; }
                    if (line.toLowerCase().indexOf('free') !== -1) { result.swapfree = parseFloat(line.split('=')[1].trim()) * 1024 * 1024; }
                  });
                }
              }
              if (callback) { callback(result); }
              resolve(result);
            });
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_windows) {
        let swaptotal = 0;
        let swapused = 0;
        try {
          util.powerShell('Get-CimInstance Win32_PageFileUsage | Select AllocatedBaseSize, CurrentUsage').then((stdout, error) => {
            if (!error) {
              let lines = stdout.split('\r\n').filter(line => line.trim() !== '').filter((line, idx) => idx > 0);
              lines.forEach(function (line) {
                if (line !== '') {
                  line = line.trim().split(/\s\s+/);
                  swaptotal = swaptotal + (parseInt(line[0], 10) || 0);
                  swapused = swapused + (parseInt(line[1], 10) || 0);
                }
              });
            }
            result.swaptotal = swaptotal * 1024 * 1024;
            result.swapused = swapused * 1024 * 1024;
            result.swapfree = result.swaptotal - result.swapused;

            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.mem = mem;

function memLayout(callback) {

  function getManufacturerDarwin(manId) {
    if ({}.hasOwnProperty.call(OSX_RAM_manufacturers, manId)) {
      return (OSX_RAM_manufacturers[manId]);
    }
    return manId;
  }

  function getManufacturerLinux(manId) {
    const manIdSearch = manId.replace('0x', '').toUpperCase();
    if (manIdSearch.length === 4 && {}.hasOwnProperty.call(LINUX_RAM_manufacturers, manIdSearch)) {
      return (LINUX_RAM_manufacturers[manIdSearch]);
    }
    return manId;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = [];

      if (_linux || _freebsd || _openbsd || _netbsd) {
        exec('export LC_ALL=C; dmidecode -t memory 2>/dev/null | grep -iE "Size:|Type|Speed|Manufacturer|Form Factor|Locator|Memory Device|Serial Number|Voltage|Part Number"; unset LC_ALL', function (error, stdout) {
          if (!error) {
            let devices = stdout.toString().split('Memory Device');
            devices.shift();
            devices.forEach(function (device) {
              let lines = device.split('\n');
              const sizeString = util.getValue(lines, 'Size');
              const size = sizeString.indexOf('GB') >= 0 ? parseInt(sizeString, 10) * 1024 * 1024 * 1024 : parseInt(sizeString, 10) * 1024 * 1024;
              let bank = util.getValue(lines, 'Bank Locator');
              if (bank.toLowerCase().indexOf('bad') >= 0) {
                bank = '';
              }
              if (parseInt(util.getValue(lines, 'Size'), 10) > 0) {
                const totalWidth = util.toInt(util.getValue(lines, 'Total Width'));
                const dataWidth = util.toInt(util.getValue(lines, 'Data Width'));
                result.push({
                  size,
                  bank,
                  type: util.getValue(lines, 'Type:'),
                  ecc: dataWidth && totalWidth ? totalWidth > dataWidth : false,
                  clockSpeed: (util.getValue(lines, 'Configured Clock Speed:') ? parseInt(util.getValue(lines, 'Configured Clock Speed:'), 10) : (util.getValue(lines, 'Speed:') ? parseInt(util.getValue(lines, 'Speed:'), 10) : null)),
                  formFactor: util.getValue(lines, 'Form Factor:'),
                  manufacturer: getManufacturerLinux(util.getValue(lines, 'Manufacturer:')),
                  partNum: util.getValue(lines, 'Part Number:'),
                  serialNum: util.getValue(lines, 'Serial Number:'),
                  voltageConfigured: parseFloat(util.getValue(lines, 'Configured Voltage:')) || null,
                  voltageMin: parseFloat(util.getValue(lines, 'Minimum Voltage:')) || null,
                  voltageMax: parseFloat(util.getValue(lines, 'Maximum Voltage:')) || null,
                });
              } else {
                result.push({
                  size: 0,
                  bank,
                  type: 'Empty',
                  ecc: null,
                  clockSpeed: 0,
                  formFactor: util.getValue(lines, 'Form Factor:'),
                  partNum: '',
                  serialNum: '',
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null,
                });
              }
            });
          }
          if (!result.length) {
            result.push({
              size: os.totalmem(),
              bank: '',
              type: '',
              ecc: null,
              clockSpeed: 0,
              formFactor: '',
              partNum: '',
              serialNum: '',
              voltageConfigured: null,
              voltageMin: null,
              voltageMax: null,
            });

            // Try Raspberry PI
            try {
              let stdout = execSync('cat /proc/cpuinfo 2>/dev/null');
              let lines = stdout.toString().split('\n');
              let model = util.getValue(lines, 'hardware', ':', true).toUpperCase();
              let version = util.getValue(lines, 'revision', ':', true).toLowerCase();

              if (model === 'BCM2835' || model === 'BCM2708' || model === 'BCM2709' || model === 'BCM2835' || model === 'BCM2837') {

                const clockSpeed = {
                  '0': 400,
                  '1': 450,
                  '2': 450,
                  '3': 3200
                };
                result[0].type = 'LPDDR2';
                result[0].type = version && version[2] && version[2] === '3' ? 'LPDDR4' : result[0].type;
                result[0].ecc = false;
                result[0].clockSpeed = version && version[2] && clockSpeed[version[2]] || 400;
                result[0].clockSpeed = version && version[4] && version[4] === 'd' ? 500 : result[0].clockSpeed;
                result[0].formFactor = 'SoC';

                stdout = execSync('vcgencmd get_config sdram_freq 2>/dev/null');
                lines = stdout.toString().split('\n');
                let freq = parseInt(util.getValue(lines, 'sdram_freq', '=', true), 10) || 0;
                if (freq) {
                  result[0].clockSpeed = freq;
                }

                stdout = execSync('vcgencmd measure_volts sdram_p 2>/dev/null');
                lines = stdout.toString().split('\n');
                let voltage = parseFloat(util.getValue(lines, 'volt', '=', true)) || 0;
                if (voltage) {
                  result[0].voltageConfigured = voltage;
                  result[0].voltageMin = voltage;
                  result[0].voltageMax = voltage;
                }
              }
            } catch (e) {
              util.noop();
            }

          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }

      if (_darwin) {
        exec('system_profiler SPMemoryDataType', function (error, stdout) {
          if (!error) {
            const allLines = stdout.toString().split('\n');
            const eccStatus = util.getValue(allLines, 'ecc', ':', true).toLowerCase();
            let devices = stdout.toString().split('        BANK ');
            let hasBank = true;
            if (devices.length === 1) {
              devices = stdout.toString().split('        DIMM');
              hasBank = false;
            }
            devices.shift();
            devices.forEach(function (device) {
              let lines = device.split('\n');
              const bank = (hasBank ? 'BANK ' : 'DIMM') + lines[0].trim().split('/')[0];
              const size = parseInt(util.getValue(lines, '          Size'));
              if (size) {
                result.push({
                  size: size * 1024 * 1024 * 1024,
                  bank: bank,
                  type: util.getValue(lines, '          Type:'),
                  ecc: eccStatus ? eccStatus === 'enabled' : null,
                  clockSpeed: parseInt(util.getValue(lines, '          Speed:'), 10),
                  formFactor: '',
                  manufacturer: getManufacturerDarwin(util.getValue(lines, '          Manufacturer:')),
                  partNum: util.getValue(lines, '          Part Number:'),
                  serialNum: util.getValue(lines, '          Serial Number:'),
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null,
                });
              } else {
                result.push({
                  size: 0,
                  bank: bank,
                  type: 'Empty',
                  ecc: null,
                  clockSpeed: 0,
                  formFactor: '',
                  manufacturer: '',
                  partNum: '',
                  serialNum: '',
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null,
                });
              }
            });
          }
          if (!result.length) {
            const lines = stdout.toString().split('\n');
            const size = parseInt(util.getValue(lines, '      Memory:'));
            const type = util.getValue(lines, '      Type:');
            if (size && type) {
              result.push({
                size: size * 1024 * 1024 * 1024,
                bank: '0',
                type,
                ecc: false,
                clockSpeed: 0,
                formFactor: '',
                manufacturer: 'Apple',
                partNum: '',
                serialNum: '',
                voltageConfigured: null,
                voltageMin: null,
                voltageMax: null,
              });

            }
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        // https://www.dmtf.org/sites/default/files/standards/documents/DSP0134_3.4.0a.pdf
        const memoryTypes = 'Unknown|Other|DRAM|Synchronous DRAM|Cache DRAM|EDO|EDRAM|VRAM|SRAM|RAM|ROM|FLASH|EEPROM|FEPROM|EPROM|CDRAM|3DRAM|SDRAM|SGRAM|RDRAM|DDR|DDR2|DDR2 FB-DIMM|Reserved|DDR3|FBD2|DDR4|LPDDR|LPDDR2|LPDDR3|LPDDR4|Logical non-volatile device|HBM|HBM2|DDR5|LPDDR5'.split('|');
        const FormFactors = 'Unknown|Other|SIP|DIP|ZIP|SOJ|Proprietary|SIMM|DIMM|TSOP|PGA|RIMM|SODIMM|SRIMM|SMD|SSMP|QFP|TQFP|SOIC|LCC|PLCC|BGA|FPBGA|LGA'.split('|');

        try {
          util.powerShell('Get-CimInstance Win32_PhysicalMemory | select DataWidth,TotalWidth,Capacity,BankLabel,MemoryType,SMBIOSMemoryType,ConfiguredClockSpeed,FormFactor,Manufacturer,PartNumber,SerialNumber,ConfiguredVoltage,MinVoltage,MaxVoltage,Tag | fl').then((stdout, error) => {
            if (!error) {
              let devices = stdout.toString().split(/\n\s*\n/);
              devices.shift();
              devices.forEach(function (device) {
                let lines = device.split('\r\n');
                const dataWidth = util.toInt(util.getValue(lines, 'DataWidth', ':'));
                const totalWidth = util.toInt(util.getValue(lines, 'TotalWidth', ':'));
                const size = parseInt(util.getValue(lines, 'Capacity', ':'), 10) || 0;
                const tag = util.getValue(lines, 'Tag', ':');
                const tagInt = util.splitByNumber(tag);
                if (size) {
                  result.push({
                    size,
                    bank: util.getValue(lines, 'BankLabel', ':') + (tagInt[1] ? '/' + tagInt[1] : ''), // BankLabel
                    type: memoryTypes[parseInt(util.getValue(lines, 'MemoryType', ':'), 10) || parseInt(util.getValue(lines, 'SMBIOSMemoryType', ':'), 10)],
                    ecc: dataWidth && totalWidth ? totalWidth > dataWidth : false,
                    clockSpeed: parseInt(util.getValue(lines, 'ConfiguredClockSpeed', ':'), 10) || parseInt(util.getValue(lines, 'Speed', ':'), 10) || 0,
                    formFactor: FormFactors[parseInt(util.getValue(lines, 'FormFactor', ':'), 10) || 0],
                    manufacturer: util.getValue(lines, 'Manufacturer', ':'),
                    partNum: util.getValue(lines, 'PartNumber', ':'),
                    serialNum: util.getValue(lines, 'SerialNumber', ':'),
                    voltageConfigured: (parseInt(util.getValue(lines, 'ConfiguredVoltage', ':'), 10) || 0) / 1000.0,
                    voltageMin: (parseInt(util.getValue(lines, 'MinVoltage', ':'), 10) || 0) / 1000.0,
                    voltageMax: (parseInt(util.getValue(lines, 'MaxVoltage', ':'), 10) || 0) / 1000.0,
                  });
                }
              });
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.memLayout = memLayout;



/***/ }),

/***/ 3769:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// network.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 9. Network
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const fs = __nccwpck_require__(7147);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

let _network = {};
let _default_iface = '';
let _ifaces = {};
let _dhcpNics = [];
let _networkInterfaces = [];
let _mac = {};
let pathToIp;

function getDefaultNetworkInterface() {

  let ifacename = '';
  let ifacenameFirst = '';
  try {
    let ifaces = os.networkInterfaces();

    let scopeid = 9999;

    // fallback - "first" external interface (sorted by scopeid)
    for (let dev in ifaces) {
      if ({}.hasOwnProperty.call(ifaces, dev)) {
        ifaces[dev].forEach(function (details) {
          if (details && details.internal === false) {
            ifacenameFirst = ifacenameFirst || dev; // fallback if no scopeid
            if (details.scopeid && details.scopeid < scopeid) {
              ifacename = dev;
              scopeid = details.scopeid;
            }
          }
        });
      }
    }
    ifacename = ifacename || ifacenameFirst || '';

    if (_windows) {
      // https://www.inetdaemon.com/tutorials/internet/ip/routing/default_route.shtml
      let defaultIp = '';
      const cmd = 'netstat -r';
      const result = execSync(cmd, util.execOptsWin);
      const lines = result.toString().split(os.EOL);
      lines.forEach(line => {
        line = line.replace(/\s+/g, ' ').trim();
        if (line.indexOf('0.0.0.0 0.0.0.0') > -1 && !(/[a-zA-Z]/.test(line))) {
          const parts = line.split(' ');
          if (parts.length >= 5) {
            defaultIp = parts[parts.length - 2];
          }
        }
      });
      if (defaultIp) {
        for (let dev in ifaces) {
          if ({}.hasOwnProperty.call(ifaces, dev)) {
            ifaces[dev].forEach(function (details) {
              if (details && details.address && details.address === defaultIp) {
                ifacename = dev;
              }
            });
          }
        }
      }
    }
    if (_linux) {
      let cmd = 'ip route 2> /dev/null | grep default';
      let result = execSync(cmd);
      let parts = result.toString().split('\n')[0].split(/\s+/);
      if (parts[0] === 'none' && parts[5]) {
        ifacename = parts[5];
      } else if (parts[4]) {
        ifacename = parts[4];
      }

      if (ifacename.indexOf(':') > -1) {
        ifacename = ifacename.split(':')[1].trim();
      }
    }
    if (_darwin || _freebsd || _openbsd || _netbsd || _sunos) {
      let cmd = '';
      if (_linux) { cmd = 'ip route 2> /dev/null | grep default | awk \'{print $5}\''; }
      if (_darwin) { cmd = 'route -n get default 2>/dev/null | grep interface: | awk \'{print $2}\''; }
      if (_freebsd || _openbsd || _netbsd || _sunos) { cmd = 'route get 0.0.0.0 | grep interface:'; }
      let result = execSync(cmd);
      ifacename = result.toString().split('\n')[0];
      if (ifacename.indexOf(':') > -1) {
        ifacename = ifacename.split(':')[1].trim();
      }
    }
  } catch (e) {
    util.noop();
  }
  if (ifacename) { _default_iface = ifacename; }
  return _default_iface;
}

exports.getDefaultNetworkInterface = getDefaultNetworkInterface;

function getMacAddresses() {
  let iface = '';
  let mac = '';
  let result = {};
  if (_linux || _freebsd || _openbsd || _netbsd) {
    if (typeof pathToIp === 'undefined') {
      try {
        const lines = execSync('which ip').toString().split('\n');
        if (lines.length && lines[0].indexOf(':') === -1 && lines[0].indexOf('/') === 0) {
          pathToIp = lines[0];
        } else {
          pathToIp = '';
        }
      } catch (e) {
        pathToIp = '';
      }
    }
    try {
      const cmd = 'export LC_ALL=C; ' + ((pathToIp) ? pathToIp + ' link show up' : '/sbin/ifconfig') + '; unset LC_ALL';
      let res = execSync(cmd);
      const lines = res.toString().split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i][0] !== ' ') {
          if (pathToIp) {
            let nextline = lines[i + 1].trim().split(' ');
            if (nextline[0] === 'link/ether') {
              iface = lines[i].split(' ')[1];
              iface = iface.slice(0, iface.length - 1);
              mac = nextline[1];
            }
          } else {
            iface = lines[i].split(' ')[0];
            mac = lines[i].split('HWaddr ')[1];
          }

          if (iface && mac) {
            result[iface] = mac.trim();
            iface = '';
            mac = '';
          }
        }
      }
    } catch (e) {
      util.noop();
    }
  }
  if (_darwin) {
    try {
      const cmd = '/sbin/ifconfig';
      let res = execSync(cmd);
      const lines = res.toString().split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i][0] !== '\t' && lines[i].indexOf(':') > 0) {
          iface = lines[i].split(':')[0];
        } else if (lines[i].indexOf('\tether ') === 0) {
          mac = lines[i].split('\tether ')[1];
          if (iface && mac) {
            result[iface] = mac.trim();
            iface = '';
            mac = '';
          }
        }
      }
    } catch (e) {
      util.noop();
    }
  }
  return result;
}

function networkInterfaceDefault(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = getDefaultNetworkInterface();
      if (callback) { callback(result); }
      resolve(result);
    });
  });
}

exports.networkInterfaceDefault = networkInterfaceDefault;

// --------------------------
// NET - interfaces

function parseLinesWindowsNics(sections, nconfigsections) {
  let nics = [];
  for (let i in sections) {
    if ({}.hasOwnProperty.call(sections, i)) {

      if (sections[i].trim() !== '') {

        let lines = sections[i].trim().split('\r\n');
        let linesNicConfig = nconfigsections && nconfigsections[i] ? nconfigsections[i].trim().split('\r\n') : [];
        let netEnabled = util.getValue(lines, 'NetEnabled', ':');
        let adapterType = util.getValue(lines, 'AdapterTypeID', ':') === '9' ? 'wireless' : 'wired';
        let ifacename = util.getValue(lines, 'Name', ':').replace(/\]/g, ')').replace(/\[/g, '(');
        let iface = util.getValue(lines, 'NetConnectionID', ':').replace(/\]/g, ')').replace(/\[/g, '(');
        if (ifacename.toLowerCase().indexOf('wi-fi') >= 0 || ifacename.toLowerCase().indexOf('wireless') >= 0) {
          adapterType = 'wireless';
        }
        if (netEnabled !== '') {
          const speed = parseInt(util.getValue(lines, 'speed', ':').trim(), 10) / 1000000;
          nics.push({
            mac: util.getValue(lines, 'MACAddress', ':').toLowerCase(),
            dhcp: util.getValue(linesNicConfig, 'dhcpEnabled', ':').toLowerCase() === 'true',
            name: ifacename,
            iface,
            netEnabled: netEnabled === 'TRUE',
            speed: isNaN(speed) ? null : speed,
            operstate: util.getValue(lines, 'NetConnectionStatus', ':') === '2' ? 'up' : 'down',
            type: adapterType
          });
        }
      }
    }
  }
  return nics;
}

function getWindowsNics() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let cmd = 'Get-CimInstance Win32_NetworkAdapter | fl *' + '; echo \'#-#-#-#\';';
      cmd += 'Get-CimInstance Win32_NetworkAdapterConfiguration | fl DHCPEnabled' + '';
      try {
        util.powerShell(cmd).then((data) => {
          data = data.split('#-#-#-#');
          const nsections = (data[0] || '').split(/\n\s*\n/);
          const nconfigsections = (data[1] || '').split(/\n\s*\n/);
          resolve(parseLinesWindowsNics(nsections, nconfigsections));
        });
      } catch (e) {
        resolve([]);
      }
    });
  });
}

function getWindowsDNSsuffixes() {

  let iface = {};

  let dnsSuffixes = {
    primaryDNS: '',
    exitCode: 0,
    ifaces: [],
  };

  try {
    const ipconfig = execSync('ipconfig /all', util.execOptsWin);
    const ipconfigArray = ipconfig.split('\r\n\r\n');

    ipconfigArray.forEach((element, index) => {

      if (index == 1) {
        const longPrimaryDNS = element.split('\r\n').filter((element) => {
          return element.toUpperCase().includes('DNS');
        });
        const primaryDNS = longPrimaryDNS[0].substring(longPrimaryDNS[0].lastIndexOf(':') + 1);
        dnsSuffixes.primaryDNS = primaryDNS.trim();
        if (!dnsSuffixes.primaryDNS) { dnsSuffixes.primaryDNS = 'Not defined'; }
      }
      if (index > 1) {
        if (index % 2 == 0) {
          const name = element.substring(element.lastIndexOf(' ') + 1).replace(':', '');
          iface.name = name;
        } else {
          const connectionSpecificDNS = element.split('\r\n').filter((element) => {
            return element.toUpperCase().includes('DNS');
          });
          const dnsSuffix = connectionSpecificDNS[0].substring(connectionSpecificDNS[0].lastIndexOf(':') + 1);
          iface.dnsSuffix = dnsSuffix.trim();
          dnsSuffixes.ifaces.push(iface);
          iface = {};
        }
      }
    });

    return dnsSuffixes;
  } catch (error) {
    return {
      primaryDNS: '',
      exitCode: 0,
      ifaces: [],
    };
  }
}

function getWindowsIfaceDNSsuffix(ifaces, ifacename) {
  let dnsSuffix = '';
  // Adding (.) to ensure ifacename compatibility when duplicated iface-names
  const interfaceName = ifacename + '.';
  try {
    const connectionDnsSuffix = ifaces.filter((iface) => {
      return interfaceName.includes(iface.name + '.');
    }).map((iface) => iface.dnsSuffix);
    if (connectionDnsSuffix[0]) {
      dnsSuffix = connectionDnsSuffix[0];
    }
    if (!dnsSuffix) { dnsSuffix = ''; }
    return dnsSuffix;
  } catch (error) {
    return 'Unknown';
  }
}

function getWindowsWiredProfilesInformation() {
  try {
    const result = execSync('netsh lan show profiles', util.execOptsWin);
    const profileList = result.split('\r\nProfile on interface');
    return profileList;
  } catch (error) {
    if (error.status === 1 && error.stdout.includes('AutoConfig')) {
      return 'Disabled';
    }
    return [];
  }
}

function getWindowsWirelessIfaceSSID(interfaceName) {
  try {
    const result = execSync(`netsh wlan show  interface name="${interfaceName}" | findstr "SSID"`, util.execOptsWin);
    const SSID = result.split('\r\n').shift();
    const parseSSID = SSID.split(':').pop();
    return parseSSID;
  } catch (error) {
    return 'Unknown';
  }
}
function getWindowsIEEE8021x(connectionType, iface, ifaces) {
  let i8021x = {
    state: 'Unknown',
    protocol: 'Unknown',
  };

  if (ifaces === 'Disabled') {
    i8021x.state = 'Disabled';
    i8021x.protocol = 'Not defined';
    return i8021x;
  }

  if (connectionType == 'wired' && ifaces.length > 0) {
    try {
      // Get 802.1x information by interface name
      const iface8021xInfo = ifaces.find((element) => {
        return element.includes(iface + '\r\n');
      });
      const arrayIface8021xInfo = iface8021xInfo.split('\r\n');
      const state8021x = arrayIface8021xInfo.find((element) => {
        return element.includes('802.1x');
      });

      if (state8021x.includes('Disabled')) {
        i8021x.state = 'Disabled';
        i8021x.protocol = 'Not defined';
      } else if (state8021x.includes('Enabled')) {
        const protocol8021x = arrayIface8021xInfo.find((element) => {
          return element.includes('EAP');
        });
        i8021x.protocol = protocol8021x.split(':').pop();
        i8021x.state = 'Enabled';
      }
    } catch (error) {
      return i8021x;
    }
  } else if (connectionType == 'wireless') {

    let i8021xState = '';
    let i8021xProtocol = '';



    try {
      const SSID = getWindowsWirelessIfaceSSID(iface);
      if (SSID !== 'Unknown') {
        i8021xState = execSync(`netsh wlan show profiles "${SSID}" | findstr "802.1X"`, util.execOptsWin);
        i8021xProtocol = execSync(`netsh wlan show profiles "${SSID}" | findstr "EAP"`, util.execOptsWin);
      }

      if (i8021xState.includes(':') && i8021xProtocol.includes(':')) {
        i8021x.state = i8021xState.split(':').pop();
        i8021x.protocol = i8021xProtocol.split(':').pop();
      }
    } catch (error) {
      if (error.status === 1 && error.stdout.includes('AutoConfig')) {
        i8021x.state = 'Disabled';
        i8021x.protocol = 'Not defined';
      }
      return i8021x;
    }
  }

  return i8021x;
}

function splitSectionsNics(lines) {
  const result = [];
  let section = [];
  lines.forEach(function (line) {
    if (!line.startsWith('\t') && !line.startsWith(' ')) {
      if (section.length) {
        result.push(section);
        section = [];
      }
    }
    section.push(line);
  });
  if (section.length) {
    result.push(section);
  }
  return result;
}

function parseLinesDarwinNics(sections) {
  let nics = [];
  sections.forEach(section => {
    let nic = {
      iface: '',
      mtu: null,
      mac: '',
      ip6: '',
      ip4: '',
      speed: null,
      type: '',
      operstate: '',
      duplex: '',
      internal: false
    };
    const first = section[0];
    nic.iface = first.split(':')[0].trim();
    let parts = first.split('> mtu');
    nic.mtu = parts.length > 1 ? parseInt(parts[1], 10) : null;
    if (isNaN(nic.mtu)) {
      nic.mtu = null;
    }
    nic.internal = parts[0].toLowerCase().indexOf('loopback') > -1;
    section.forEach(line => {
      if (line.trim().startsWith('ether ')) {
        nic.mac = line.split('ether ')[1].toLowerCase().trim();
      }
      if (line.trim().startsWith('inet6 ') && !nic.ip6) {
        nic.ip6 = line.split('inet6 ')[1].toLowerCase().split('%')[0].split(' ')[0];
      }
      if (line.trim().startsWith('inet ') && !nic.ip4) {
        nic.ip4 = line.split('inet ')[1].toLowerCase().split(' ')[0];
      }
    });
    let speed = util.getValue(section, 'link rate');
    nic.speed = speed ? parseFloat(speed) : null;
    if (nic.speed === null) {
      speed = util.getValue(section, 'uplink rate');
      nic.speed = speed ? parseFloat(speed) : null;
      if (nic.speed !== null && speed.toLowerCase().indexOf('gbps') >= 0) {
        nic.speed = nic.speed * 1000;
      }
    } else {
      if (speed.toLowerCase().indexOf('gbps') >= 0) {
        nic.speed = nic.speed * 1000;
      }
    }
    nic.type = util.getValue(section, 'type').toLowerCase().indexOf('wi-fi') > -1 ? 'wireless' : 'wired';
    const operstate = util.getValue(section, 'status').toLowerCase();
    nic.operstate = (operstate === 'active' ? 'up' : (operstate === 'inactive' ? 'down' : 'unknown'));
    nic.duplex = util.getValue(section, 'media').toLowerCase().indexOf('half-duplex') > -1 ? 'half' : 'full';
    if (nic.ip6 || nic.ip4 || nic.mac) {
      nics.push(nic);
    }
  });
  return nics;
}

function getDarwinNics() {
  const cmd = '/sbin/ifconfig -v';
  try {
    const lines = execSync(cmd, { maxBuffer: 1024 * 20000 }).toString().split('\n');
    const nsections = splitSectionsNics(lines);
    return (parseLinesDarwinNics(nsections));
  } catch (e) {
    return [];
  }
}

function getLinuxIfaceConnectionName(interfaceName) {
  const cmd = `nmcli device status 2>/dev/null | grep ${interfaceName}`;

  try {
    const result = execSync(cmd).toString();
    const resultFormat = result.replace(/\s+/g, ' ').trim();
    const connectionNameLines = resultFormat.split(' ').slice(3);
    const connectionName = connectionNameLines.join(' ');
    return connectionName != '--' ? connectionName : '';
  } catch (e) {
    return '';
  }
}

function checkLinuxDCHPInterfaces(file) {
  let result = [];
  try {
    let cmd = `cat ${file} 2> /dev/null | grep 'iface\\|source'`;
    const lines = execSync(cmd, { maxBuffer: 1024 * 20000 }).toString().split('\n');

    lines.forEach(line => {
      const parts = line.replace(/\s+/g, ' ').trim().split(' ');
      if (parts.length >= 4) {
        if (line.toLowerCase().indexOf(' inet ') >= 0 && line.toLowerCase().indexOf('dhcp') >= 0) {
          result.push(parts[1]);
        }
      }
      if (line.toLowerCase().includes('source')) {
        let file = line.split(' ')[1];
        result = result.concat(checkLinuxDCHPInterfaces(file));
      }
    });
  } catch (e) {
    util.noop();
  }
  return result;
}

function getLinuxDHCPNics() {
  // alternate methods getting interfaces using DHCP
  let cmd = 'ip a 2> /dev/null';
  let result = [];
  try {
    const lines = execSync(cmd, { maxBuffer: 1024 * 20000 }).toString().split('\n');
    const nsections = splitSectionsNics(lines);
    result = (parseLinuxDHCPNics(nsections));
  } catch (e) {
    util.noop();
  }
  try {
    result = checkLinuxDCHPInterfaces('/etc/network/interfaces');
  } catch (e) {
    util.noop();
  }
  return result;
}

function parseLinuxDHCPNics(sections) {
  const result = [];
  if (sections && sections.length) {
    sections.forEach(lines => {
      if (lines && lines.length) {
        const parts = lines[0].split(':');
        if (parts.length > 2) {
          for (let line of lines) {
            if (line.indexOf(' inet ') >= 0 && line.indexOf(' dynamic ') >= 0) {
              const parts2 = line.split(' ');
              const nic = parts2[parts2.length - 1].trim();
              result.push(nic);
              break;
            }
          }
        }
      }
    });
  }
  return result;
}

function getLinuxIfaceDHCPstatus(iface, connectionName, DHCPNics) {
  let result = false;
  if (connectionName) {
    const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep ipv4.method;`;
    try {
      const lines = execSync(cmd).toString();
      const resultFormat = lines.replace(/\s+/g, ' ').trim();

      let dhcStatus = resultFormat.split(' ').slice(1).toString();
      switch (dhcStatus) {
        case 'auto':
          result = true;
          break;

        default:
          result = false;
          break;
      }
      return result;
    } catch (e) {
      return (DHCPNics.indexOf(iface) >= 0);
    }
  } else {
    return (DHCPNics.indexOf(iface) >= 0);
  }
}

function getDarwinIfaceDHCPstatus(iface) {
  let result = false;
  const cmd = `ipconfig getpacket "${iface}" 2>/dev/null | grep lease_time;`;
  try {
    const lines = execSync(cmd).toString().split('\n');
    if (lines.length && lines[0].startsWith('lease_time')) {
      result = true;
    }
  } catch (e) {
    util.noop();
  }
  return result;
}

function getLinuxIfaceDNSsuffix(connectionName) {
  if (connectionName) {
    const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep ipv4.dns-search;`;
    try {
      const result = execSync(cmd).toString();
      const resultFormat = result.replace(/\s+/g, ' ').trim();
      const dnsSuffix = resultFormat.split(' ').slice(1).toString();
      return dnsSuffix == '--' ? 'Not defined' : dnsSuffix;
    } catch (e) {
      return 'Unknown';
    }
  } else {
    return 'Unknown';
  }
}

function getLinuxIfaceIEEE8021xAuth(connectionName) {
  if (connectionName) {
    const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep 802-1x.eap;`;
    try {
      const result = execSync(cmd).toString();
      const resultFormat = result.replace(/\s+/g, ' ').trim();
      const authenticationProtocol = resultFormat.split(' ').slice(1).toString();


      return authenticationProtocol == '--' ? '' : authenticationProtocol;
    } catch (e) {
      return 'Not defined';
    }
  } else {
    return 'Not defined';
  }
}

function getLinuxIfaceIEEE8021xState(authenticationProtocol) {
  if (authenticationProtocol) {
    if (authenticationProtocol == 'Not defined') {
      return 'Disabled';
    }
    return 'Enabled';
  } else {
    return 'Unknown';
  }
}

function testVirtualNic(iface, ifaceName, mac) {
  const virtualMacs = ['00:00:00:00:00:00', '00:03:FF', '00:05:69', '00:0C:29', '00:0F:4B', '00:13:07', '00:13:BE', '00:15:5d', '00:16:3E', '00:1C:42', '00:21:F6', '00:24:0B', '00:50:56', '00:A0:B1', '00:E0:C8', '08:00:27', '0A:00:27', '18:92:2C', '16:DF:49', '3C:F3:92', '54:52:00', 'FC:15:97'];
  if (mac) {
    return virtualMacs.filter(item => { return mac.toUpperCase().toUpperCase().startsWith(item.substring(0, mac.length)); }).length > 0 ||
      iface.toLowerCase().indexOf(' virtual ') > -1 ||
      ifaceName.toLowerCase().indexOf(' virtual ') > -1 ||
      iface.toLowerCase().indexOf('vethernet ') > -1 ||
      ifaceName.toLowerCase().indexOf('vethernet ') > -1 ||
      iface.toLowerCase().startsWith('veth') ||
      ifaceName.toLowerCase().startsWith('veth') ||
      iface.toLowerCase().startsWith('vboxnet') ||
      ifaceName.toLowerCase().startsWith('vboxnet');
  } else { return false; }
}

function networkInterfaces(callback, rescan, defaultString) {

  if (typeof callback === 'string') {
    defaultString = callback;
    rescan = true;
    callback = null;
  }

  if (typeof callback === 'boolean') {
    rescan = callback;
    callback = null;
    defaultString = '';
  }
  if (typeof rescan === 'undefined') {
    rescan = true;
  }
  defaultString = defaultString || '';
  defaultString = '' + defaultString;

  return new Promise((resolve) => {
    process.nextTick(() => {

      let ifaces = os.networkInterfaces();

      let result = [];
      let nics = [];
      let dnsSuffixes = [];
      let nics8021xInfo = [];
      // seperate handling in OSX
      if (_darwin || _freebsd || _openbsd || _netbsd) {
        if ((JSON.stringify(ifaces) === JSON.stringify(_ifaces)) && !rescan) {
          // no changes - just return object
          result = _networkInterfaces;

          if (callback) { callback(result); }
          resolve(result);
        } else {
          const defaultInterface = getDefaultNetworkInterface();
          _ifaces = JSON.parse(JSON.stringify(ifaces));

          nics = getDarwinNics();


          nics.forEach(nic => {

            if ({}.hasOwnProperty.call(ifaces, nic.iface)) {
              ifaces[nic.iface].forEach(function (details) {
                if (details.family === 'IPv4' || details.family === 4) {
                  nic.ip4subnet = details.netmask;
                }
                if (details.family === 'IPv6' || details.family === 6) {
                  nic.ip6subnet = details.netmask;
                }
              });
            }

            let ifaceSanitized = '';
            const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(nic.iface);
            const l = util.mathMin(s.length, 2000);
            for (let i = 0; i <= l; i++) {
              if (s[i] !== undefined) {
                ifaceSanitized = ifaceSanitized + s[i];
              }
            }

            result.push({
              iface: nic.iface,
              ifaceName: nic.iface,
              default: nic.iface === defaultInterface,
              ip4: nic.ip4,
              ip4subnet: nic.ip4subnet || '',
              ip6: nic.ip6,
              ip6subnet: nic.ip6subnet || '',
              mac: nic.mac,
              internal: nic.internal,
              virtual: nic.internal ? false : testVirtualNic(nic.iface, nic.iface, nic.mac),
              operstate: nic.operstate,
              type: nic.type,
              duplex: nic.duplex,
              mtu: nic.mtu,
              speed: nic.speed,
              dhcp: getDarwinIfaceDHCPstatus(ifaceSanitized),
              dnsSuffix: '',
              ieee8021xAuth: '',
              ieee8021xState: '',
              carrierChanges: 0
            });
          });
          _networkInterfaces = result;
          if (defaultString.toLowerCase().indexOf('default') >= 0) {
            result = result.filter(item => item.default);
            if (result.length > 0) {
              result = result[0];
            } else {
              result = [];
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_linux) {
        if ((JSON.stringify(ifaces) === JSON.stringify(_ifaces)) && !rescan) {
          // no changes - just return object
          result = _networkInterfaces;

          if (callback) { callback(result); }
          resolve(result);
        } else {
          _ifaces = JSON.parse(JSON.stringify(ifaces));
          _dhcpNics = getLinuxDHCPNics();
          const defaultInterface = getDefaultNetworkInterface();
          for (let dev in ifaces) {
            let ip4 = '';
            let ip4subnet = '';
            let ip6 = '';
            let ip6subnet = '';
            let mac = '';
            let duplex = '';
            let mtu = '';
            let speed = null;
            let carrierChanges = 0;
            let dhcp = false;
            let dnsSuffix = '';
            let ieee8021xAuth = '';
            let ieee8021xState = '';
            let type = '';

            if ({}.hasOwnProperty.call(ifaces, dev)) {
              let ifaceName = dev;
              ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4' || details.family === 4) {
                  ip4 = details.address;
                  ip4subnet = details.netmask;
                }
                if (details.family === 'IPv6' || details.family === 6) {
                  if (!ip6 || ip6.match(/^fe80::/i)) {
                    ip6 = details.address;
                    ip6subnet = details.netmask;
                  }
                }
                mac = details.mac;
                // fallback due to https://github.com/nodejs/node/issues/13581 (node 8.1 - node 8.2)
                const nodeMainVersion = parseInt(process.versions.node.split('.'), 10);
                if (mac.indexOf('00:00:0') > -1 && (_linux || _darwin) && (!details.internal) && nodeMainVersion >= 8 && nodeMainVersion <= 11) {
                  if (Object.keys(_mac).length === 0) {
                    _mac = getMacAddresses();
                  }
                  mac = _mac[dev] || '';
                }
              });
              let iface = dev.split(':')[0].trim().toLowerCase();
              let ifaceSanitized = '';
              const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(iface);
              const l = util.mathMin(s.length, 2000);
              for (let i = 0; i <= l; i++) {
                if (s[i] !== undefined) {
                  ifaceSanitized = ifaceSanitized + s[i];
                }
              }
              const cmd = `echo -n "addr_assign_type: "; cat /sys/class/net/${ifaceSanitized}/addr_assign_type 2>/dev/null; echo;
            echo -n "address: "; cat /sys/class/net/${ifaceSanitized}/address 2>/dev/null; echo;
            echo -n "addr_len: "; cat /sys/class/net/${ifaceSanitized}/addr_len 2>/dev/null; echo;
            echo -n "broadcast: "; cat /sys/class/net/${ifaceSanitized}/broadcast 2>/dev/null; echo;
            echo -n "carrier: "; cat /sys/class/net/${ifaceSanitized}/carrier 2>/dev/null; echo;
            echo -n "carrier_changes: "; cat /sys/class/net/${ifaceSanitized}/carrier_changes 2>/dev/null; echo;
            echo -n "dev_id: "; cat /sys/class/net/${ifaceSanitized}/dev_id 2>/dev/null; echo;
            echo -n "dev_port: "; cat /sys/class/net/${ifaceSanitized}/dev_port 2>/dev/null; echo;
            echo -n "dormant: "; cat /sys/class/net/${ifaceSanitized}/dormant 2>/dev/null; echo;
            echo -n "duplex: "; cat /sys/class/net/${ifaceSanitized}/duplex 2>/dev/null; echo;
            echo -n "flags: "; cat /sys/class/net/${ifaceSanitized}/flags 2>/dev/null; echo;
            echo -n "gro_flush_timeout: "; cat /sys/class/net/${ifaceSanitized}/gro_flush_timeout 2>/dev/null; echo;
            echo -n "ifalias: "; cat /sys/class/net/${ifaceSanitized}/ifalias 2>/dev/null; echo;
            echo -n "ifindex: "; cat /sys/class/net/${ifaceSanitized}/ifindex 2>/dev/null; echo;
            echo -n "iflink: "; cat /sys/class/net/${ifaceSanitized}/iflink 2>/dev/null; echo;
            echo -n "link_mode: "; cat /sys/class/net/${ifaceSanitized}/link_mode 2>/dev/null; echo;
            echo -n "mtu: "; cat /sys/class/net/${ifaceSanitized}/mtu 2>/dev/null; echo;
            echo -n "netdev_group: "; cat /sys/class/net/${ifaceSanitized}/netdev_group 2>/dev/null; echo;
            echo -n "operstate: "; cat /sys/class/net/${ifaceSanitized}/operstate 2>/dev/null; echo;
            echo -n "proto_down: "; cat /sys/class/net/${ifaceSanitized}/proto_down 2>/dev/null; echo;
            echo -n "speed: "; cat /sys/class/net/${ifaceSanitized}/speed 2>/dev/null; echo;
            echo -n "tx_queue_len: "; cat /sys/class/net/${ifaceSanitized}/tx_queue_len 2>/dev/null; echo;
            echo -n "type: "; cat /sys/class/net/${ifaceSanitized}/type 2>/dev/null; echo;
            echo -n "wireless: "; cat /proc/net/wireless 2>/dev/null | grep ${ifaceSanitized}; echo;
            echo -n "wirelessspeed: "; iw dev ${ifaceSanitized} link 2>&1 | grep bitrate; echo;`;

              let lines = [];
              try {
                lines = execSync(cmd).toString().split('\n');
                const connectionName = getLinuxIfaceConnectionName(ifaceSanitized);
                dhcp = getLinuxIfaceDHCPstatus(ifaceSanitized, connectionName, _dhcpNics);
                dnsSuffix = getLinuxIfaceDNSsuffix(connectionName);
                ieee8021xAuth = getLinuxIfaceIEEE8021xAuth(connectionName);
                ieee8021xState = getLinuxIfaceIEEE8021xState(ieee8021xAuth);
              } catch (e) {
                util.noop();
              }
              duplex = util.getValue(lines, 'duplex');
              duplex = duplex.startsWith('cat') ? '' : duplex;
              mtu = parseInt(util.getValue(lines, 'mtu'), 10);
              let myspeed = parseInt(util.getValue(lines, 'speed'), 10);
              speed = isNaN(myspeed) ? null : myspeed;
              let wirelessspeed = util.getValue(lines, 'wirelessspeed').split('tx bitrate: ');
              if (speed === null && wirelessspeed.length === 2) {
                myspeed = parseFloat(wirelessspeed[1]);
                speed = isNaN(myspeed) ? null : myspeed;
              }
              carrierChanges = parseInt(util.getValue(lines, 'carrier_changes'), 10);
              const operstate = util.getValue(lines, 'operstate');
              type = operstate === 'up' ? (util.getValue(lines, 'wireless').trim() ? 'wireless' : 'wired') : 'unknown';
              if (ifaceSanitized === 'lo' || ifaceSanitized.startsWith('bond')) { type = 'virtual'; }

              let internal = (ifaces[dev] && ifaces[dev][0]) ? ifaces[dev][0].internal : false;
              if (dev.toLowerCase().indexOf('loopback') > -1 || ifaceName.toLowerCase().indexOf('loopback') > -1) {
                internal = true;
              }
              const virtual = internal ? false : testVirtualNic(dev, ifaceName, mac);
              result.push({
                iface: ifaceSanitized,
                ifaceName,
                default: iface === defaultInterface,
                ip4,
                ip4subnet,
                ip6,
                ip6subnet,
                mac,
                internal,
                virtual,
                operstate,
                type,
                duplex,
                mtu,
                speed,
                dhcp,
                dnsSuffix,
                ieee8021xAuth,
                ieee8021xState,
                carrierChanges,
              });
            }
          }
          _networkInterfaces = result;
          if (defaultString.toLowerCase().indexOf('default') >= 0) {
            result = result.filter(item => item.default);
            if (result.length > 0) {
              result = result[0];
            } else {
              result = [];
            }
          }
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_windows) {
        if ((JSON.stringify(ifaces) === JSON.stringify(_ifaces)) && !rescan) {
          // no changes - just return object
          result = _networkInterfaces;

          if (callback) { callback(result); }
          resolve(result);
        } else {
          _ifaces = JSON.parse(JSON.stringify(ifaces));
          const defaultInterface = getDefaultNetworkInterface();

          getWindowsNics().then(function (nics) {
            nics.forEach(nic => {
              let found = false;
              Object.keys(ifaces).forEach(key => {
                if (!found) {
                  ifaces[key].forEach(value => {
                    if (Object.keys(value).indexOf('mac') >= 0) {
                      found = value['mac'] === nic.mac;
                    }
                  });
                }
              });

              if (!found) {
                ifaces[nic.name] = [{ mac: nic.mac }];
              }
            });
            nics8021xInfo = getWindowsWiredProfilesInformation();
            dnsSuffixes = getWindowsDNSsuffixes();
            for (let dev in ifaces) {

              let ifaceSanitized = '';
              const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(dev);
              const l = util.mathMin(s.length, 2000);
              for (let i = 0; i <= l; i++) {
                if (s[i] !== undefined) {
                  ifaceSanitized = ifaceSanitized + s[i];
                }
              }

              let iface = dev;
              let ip4 = '';
              let ip4subnet = '';
              let ip6 = '';
              let ip6subnet = '';
              let mac = '';
              let duplex = '';
              let mtu = '';
              let speed = null;
              let carrierChanges = 0;
              let operstate = 'down';
              let dhcp = false;
              let dnsSuffix = '';
              let ieee8021xAuth = '';
              let ieee8021xState = '';
              let type = '';

              if ({}.hasOwnProperty.call(ifaces, dev)) {
                let ifaceName = dev;
                ifaces[dev].forEach(function (details) {
                  if (details.family === 'IPv4' || details.family === 4) {
                    ip4 = details.address;
                    ip4subnet = details.netmask;
                  }
                  if (details.family === 'IPv6' || details.family === 6) {
                    if (!ip6 || ip6.match(/^fe80::/i)) {
                      ip6 = details.address;
                      ip6subnet = details.netmask;
                    }
                  }
                  mac = details.mac;
                  // fallback due to https://github.com/nodejs/node/issues/13581 (node 8.1 - node 8.2)
                  const nodeMainVersion = parseInt(process.versions.node.split('.'), 10);
                  if (mac.indexOf('00:00:0') > -1 && (_linux || _darwin) && (!details.internal) && nodeMainVersion >= 8 && nodeMainVersion <= 11) {
                    if (Object.keys(_mac).length === 0) {
                      _mac = getMacAddresses();
                    }
                    mac = _mac[dev] || '';
                  }
                });



                dnsSuffix = getWindowsIfaceDNSsuffix(dnsSuffixes.ifaces, ifaceSanitized);
                let foundFirst = false;
                nics.forEach(detail => {
                  if (detail.mac === mac && !foundFirst) {
                    iface = detail.iface || iface;
                    ifaceName = detail.name;
                    dhcp = detail.dhcp;
                    operstate = detail.operstate;
                    speed = operstate === 'up' ? detail.speed : 0;
                    type = detail.type;
                    foundFirst = true;
                  }
                });

                if (dev.toLowerCase().indexOf('wlan') >= 0 || ifaceName.toLowerCase().indexOf('wlan') >= 0 || ifaceName.toLowerCase().indexOf('802.11n') >= 0 || ifaceName.toLowerCase().indexOf('wireless') >= 0 || ifaceName.toLowerCase().indexOf('wi-fi') >= 0 || ifaceName.toLowerCase().indexOf('wifi') >= 0) {
                  type = 'wireless';
                }

                const IEEE8021x = getWindowsIEEE8021x(type, ifaceSanitized, nics8021xInfo);
                ieee8021xAuth = IEEE8021x.protocol;
                ieee8021xState = IEEE8021x.state;
                let internal = (ifaces[dev] && ifaces[dev][0]) ? ifaces[dev][0].internal : false;
                if (dev.toLowerCase().indexOf('loopback') > -1 || ifaceName.toLowerCase().indexOf('loopback') > -1) {
                  internal = true;
                }
                const virtual = internal ? false : testVirtualNic(dev, ifaceName, mac);
                result.push({
                  iface,
                  ifaceName,
                  default: iface === defaultInterface,
                  ip4,
                  ip4subnet,
                  ip6,
                  ip6subnet,
                  mac,
                  internal,
                  virtual,
                  operstate,
                  type,
                  duplex,
                  mtu,
                  speed,
                  dhcp,
                  dnsSuffix,
                  ieee8021xAuth,
                  ieee8021xState,
                  carrierChanges,
                });
              }
            }
            _networkInterfaces = result;
            if (defaultString.toLowerCase().indexOf('default') >= 0) {
              result = result.filter(item => item.default);
              if (result.length > 0) {
                result = result[0];
              } else {
                result = [];
              }
            }
            if (callback) { callback(result); }
            resolve(result);
          });
        }
      }
    });
  });
}

exports.networkInterfaces = networkInterfaces;

// --------------------------
// NET - Speed

function calcNetworkSpeed(iface, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors) {
  let result = {
    iface,
    operstate,
    rx_bytes,
    rx_dropped,
    rx_errors,
    tx_bytes,
    tx_dropped,
    tx_errors,
    rx_sec: null,
    tx_sec: null,
    ms: 0
  };

  if (_network[iface] && _network[iface].ms) {
    result.ms = Date.now() - _network[iface].ms;
    result.rx_sec = (rx_bytes - _network[iface].rx_bytes) >= 0 ? (rx_bytes - _network[iface].rx_bytes) / (result.ms / 1000) : 0;
    result.tx_sec = (tx_bytes - _network[iface].tx_bytes) >= 0 ? (tx_bytes - _network[iface].tx_bytes) / (result.ms / 1000) : 0;
    _network[iface].rx_bytes = rx_bytes;
    _network[iface].tx_bytes = tx_bytes;
    _network[iface].rx_sec = result.rx_sec;
    _network[iface].tx_sec = result.tx_sec;
    _network[iface].ms = Date.now();
    _network[iface].last_ms = result.ms;
    _network[iface].operstate = operstate;
  } else {
    if (!_network[iface]) { _network[iface] = {}; }
    _network[iface].rx_bytes = rx_bytes;
    _network[iface].tx_bytes = tx_bytes;
    _network[iface].rx_sec = null;
    _network[iface].tx_sec = null;
    _network[iface].ms = Date.now();
    _network[iface].last_ms = 0;
    _network[iface].operstate = operstate;
  }
  return result;
}

function networkStats(ifaces, callback) {

  let ifacesArray = [];

  return new Promise((resolve) => {
    process.nextTick(() => {

      // fallback - if only callback is given
      if (util.isFunction(ifaces) && !callback) {
        callback = ifaces;
        ifacesArray = [getDefaultNetworkInterface()];
      } else {
        if (typeof ifaces !== 'string' && ifaces !== undefined) {
          if (callback) { callback([]); }
          return resolve([]);
        }
        ifaces = ifaces || getDefaultNetworkInterface();

        ifaces.__proto__.toLowerCase = util.stringToLower;
        ifaces.__proto__.replace = util.stringReplace;
        ifaces.__proto__.trim = util.stringTrim;

        ifaces = ifaces.trim().toLowerCase().replace(/,+/g, '|');
        ifacesArray = ifaces.split('|');
      }

      const result = [];

      const workload = [];
      if (ifacesArray.length && ifacesArray[0].trim() === '*') {
        ifacesArray = [];
        networkInterfaces(false).then(allIFaces => {
          for (let iface of allIFaces) {
            ifacesArray.push(iface.iface);
          }
          networkStats(ifacesArray.join(',')).then(result => {
            if (callback) { callback(result); }
            resolve(result);
          });
        });
      } else {
        for (let iface of ifacesArray) {
          workload.push(networkStatsSingle(iface.trim()));
        }
        if (workload.length) {
          Promise.all(
            workload
          ).then((data) => {
            if (callback) { callback(data); }
            resolve(data);
          });
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

function networkStatsSingle(iface) {

  function parseLinesWindowsPerfData(sections) {
    let perfData = [];
    for (let i in sections) {
      if ({}.hasOwnProperty.call(sections, i)) {
        if (sections[i].trim() !== '') {
          let lines = sections[i].trim().split('\r\n');
          perfData.push({
            name: util.getValue(lines, 'Name', ':').replace(/[()[\] ]+/g, '').replace(/#|\//g, '_').toLowerCase(),
            rx_bytes: parseInt(util.getValue(lines, 'BytesReceivedPersec', ':'), 10),
            rx_errors: parseInt(util.getValue(lines, 'PacketsReceivedErrors', ':'), 10),
            rx_dropped: parseInt(util.getValue(lines, 'PacketsReceivedDiscarded', ':'), 10),
            tx_bytes: parseInt(util.getValue(lines, 'BytesSentPersec', ':'), 10),
            tx_errors: parseInt(util.getValue(lines, 'PacketsOutboundErrors', ':'), 10),
            tx_dropped: parseInt(util.getValue(lines, 'PacketsOutboundDiscarded', ':'), 10)
          });
        }
      }
    }
    return perfData;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      let ifaceSanitized = '';
      const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(iface);
      const l = util.mathMin(s.length, 2000);
      for (let i = 0; i <= l; i++) {
        if (s[i] !== undefined) {
          ifaceSanitized = ifaceSanitized + s[i];
        }
      }

      let result = {
        iface: ifaceSanitized,
        operstate: 'unknown',
        rx_bytes: 0,
        rx_dropped: 0,
        rx_errors: 0,
        tx_bytes: 0,
        tx_dropped: 0,
        tx_errors: 0,
        rx_sec: null,
        tx_sec: null,
        ms: 0
      };

      let operstate = 'unknown';
      let rx_bytes = 0;
      let tx_bytes = 0;
      let rx_dropped = 0;
      let rx_errors = 0;
      let tx_dropped = 0;
      let tx_errors = 0;

      let cmd, lines, stats;
      if (!_network[ifaceSanitized] || (_network[ifaceSanitized] && !_network[ifaceSanitized].ms) || (_network[ifaceSanitized] && _network[ifaceSanitized].ms && Date.now() - _network[ifaceSanitized].ms >= 500)) {
        if (_linux) {
          if (fs.existsSync('/sys/class/net/' + ifaceSanitized)) {
            cmd =
              'cat /sys/class/net/' + ifaceSanitized + '/operstate; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/rx_bytes; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/tx_bytes; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/rx_dropped; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/rx_errors; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/tx_dropped; ' +
              'cat /sys/class/net/' + ifaceSanitized + '/statistics/tx_errors; ';
            exec(cmd, function (error, stdout) {
              if (!error) {
                lines = stdout.toString().split('\n');
                operstate = lines[0].trim();
                rx_bytes = parseInt(lines[1], 10);
                tx_bytes = parseInt(lines[2], 10);
                rx_dropped = parseInt(lines[3], 10);
                rx_errors = parseInt(lines[4], 10);
                tx_dropped = parseInt(lines[5], 10);
                tx_errors = parseInt(lines[6], 10);

                result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);

              }
              resolve(result);
            });
          } else {
            resolve(result);
          }
        }
        if (_freebsd || _openbsd || _netbsd) {
          cmd = 'netstat -ibndI ' + ifaceSanitized;   // lgtm [js/shell-command-constructed-from-input]
          exec(cmd, function (error, stdout) {
            if (!error) {
              lines = stdout.toString().split('\n');
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace(/ +/g, ' ').split(' ');
                if (line && line[0] && line[7] && line[10]) {
                  rx_bytes = rx_bytes + parseInt(line[7]);
                  if (line[6].trim() !== '-') { rx_dropped = rx_dropped + parseInt(line[6]); }
                  if (line[5].trim() !== '-') { rx_errors = rx_errors + parseInt(line[5]); }
                  tx_bytes = tx_bytes + parseInt(line[10]);
                  if (line[12].trim() !== '-') { tx_dropped = tx_dropped + parseInt(line[12]); }
                  if (line[9].trim() !== '-') { tx_errors = tx_errors + parseInt(line[9]); }
                  operstate = 'up';
                }
              }
              result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
            }
            resolve(result);
          });
        }
        if (_darwin) {
          cmd = 'ifconfig ' + ifaceSanitized + ' | grep "status"';    // lgtm [js/shell-command-constructed-from-input]
          exec(cmd, function (error, stdout) {
            result.operstate = (stdout.toString().split(':')[1] || '').trim();
            result.operstate = (result.operstate || '').toLowerCase();
            result.operstate = (result.operstate === 'active' ? 'up' : (result.operstate === 'inactive' ? 'down' : 'unknown'));
            cmd = 'netstat -bdI ' + ifaceSanitized;   // lgtm [js/shell-command-constructed-from-input]
            exec(cmd, function (error, stdout) {
              if (!error) {
                lines = stdout.toString().split('\n');
                // if there is less than 2 lines, no information for this interface was found
                if (lines.length > 1 && lines[1].trim() !== '') {
                  // skip header line
                  // use the second line because it is tied to the NIC instead of the ipv4 or ipv6 address
                  stats = lines[1].replace(/ +/g, ' ').split(' ');
                  const offset = stats.length > 11 ? 1 : 0;
                  rx_bytes = parseInt(stats[offset + 5]);
                  rx_dropped = parseInt(stats[offset + 10]);
                  rx_errors = parseInt(stats[offset + 4]);
                  tx_bytes = parseInt(stats[offset + 8]);
                  tx_dropped = parseInt(stats[offset + 10]);
                  tx_errors = parseInt(stats[offset + 7]);
                  result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, result.operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
                }
              }
              resolve(result);
            });
          });
        }
        if (_windows) {
          let perfData = [];
          let ifaceName = ifaceSanitized;

          // Performance Data
          util.powerShell('Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | select Name,BytesReceivedPersec,PacketsReceivedErrors,PacketsReceivedDiscarded,BytesSentPersec,PacketsOutboundErrors,PacketsOutboundDiscarded | fl').then((stdout, error) => {
            if (!error) {
              const psections = stdout.toString().split(/\n\s*\n/);
              perfData = parseLinesWindowsPerfData(psections);
            }

            // Network Interfaces
            networkInterfaces(false).then(interfaces => {
              // get bytes sent, received from perfData by name
              rx_bytes = 0;
              tx_bytes = 0;
              perfData.forEach(detail => {
                interfaces.forEach(det => {
                  if ((det.iface.toLowerCase() === ifaceSanitized.toLowerCase() ||
                    det.mac.toLowerCase() === ifaceSanitized.toLowerCase() ||
                    det.ip4.toLowerCase() === ifaceSanitized.toLowerCase() ||
                    det.ip6.toLowerCase() === ifaceSanitized.toLowerCase() ||
                    det.ifaceName.replace(/[()[\] ]+/g, '').replace(/#|\//g, '_').toLowerCase() === ifaceSanitized.replace(/[()[\] ]+/g, '').replace('#', '_').toLowerCase()) &&
                    (det.ifaceName.replace(/[()[\] ]+/g, '').replace(/#|\//g, '_').toLowerCase() === detail.name)) {
                    ifaceName = det.iface;
                    rx_bytes = detail.rx_bytes;
                    rx_dropped = detail.rx_dropped;
                    rx_errors = detail.rx_errors;
                    tx_bytes = detail.tx_bytes;
                    tx_dropped = detail.tx_dropped;
                    tx_errors = detail.tx_errors;
                    operstate = det.operstate;
                  }
                });
              });
              if (rx_bytes && tx_bytes) {
                result = calcNetworkSpeed(ifaceName, parseInt(rx_bytes), parseInt(tx_bytes), operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
              }
              resolve(result);
            });
          });
        }
      } else {
        result.rx_bytes = _network[ifaceSanitized].rx_bytes;
        result.tx_bytes = _network[ifaceSanitized].tx_bytes;
        result.rx_sec = _network[ifaceSanitized].rx_sec;
        result.tx_sec = _network[ifaceSanitized].tx_sec;
        result.ms = _network[ifaceSanitized].last_ms;
        result.operstate = _network[ifaceSanitized].operstate;
        resolve(result);
      }
    });
  });
}

exports.networkStats = networkStats;

// --------------------------
// NET - connections (sockets)

function getProcessName(processes, pid) {
  let cmd = '';
  processes.forEach(line => {
    const parts = line.split(' ');
    const id = parseInt(parts[0], 10) || -1;
    if (id === pid) {
      parts.shift();
      cmd = parts.join(' ').split(':')[0];
    }
  });
  cmd = cmd.split(' -')[0];
  // return cmd;
  const cmdParts = cmd.split('/');
  return cmdParts[cmdParts.length - 1];
}

function networkConnections(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux || _freebsd || _openbsd || _netbsd) {
        let cmd = 'export LC_ALL=C; netstat -tunap | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL';
        if (_freebsd || _openbsd || _netbsd) { cmd = 'export LC_ALL=C; netstat -na | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL'; }
        exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
          let lines = stdout.toString().split('\n');
          if (!error && (lines.length > 1 || lines[0] != '')) {
            lines.forEach(function (line) {
              line = line.replace(/ +/g, ' ').split(' ');
              if (line.length >= 7) {
                let localip = line[3];
                let localport = '';
                let localaddress = line[3].split(':');
                if (localaddress.length > 1) {
                  localport = localaddress[localaddress.length - 1];
                  localaddress.pop();
                  localip = localaddress.join(':');
                }
                let peerip = line[4];
                let peerport = '';
                let peeraddress = line[4].split(':');
                if (peeraddress.length > 1) {
                  peerport = peeraddress[peeraddress.length - 1];
                  peeraddress.pop();
                  peerip = peeraddress.join(':');
                }
                let connstate = line[5];
                let proc = line[6].split('/');

                if (connstate) {
                  result.push({
                    protocol: line[0],
                    localAddress: localip,
                    localPort: localport,
                    peerAddress: peerip,
                    peerPort: peerport,
                    state: connstate,
                    pid: proc[0] && proc[0] !== '-' ? parseInt(proc[0], 10) : null,
                    process: proc[1] ? proc[1].split(' ')[0].split(':')[0] : ''
                  });
                }
              }
            });
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            cmd = 'ss -tunap | grep "ESTAB\\|SYN-SENT\\|SYN-RECV\\|FIN-WAIT1\\|FIN-WAIT2\\|TIME-WAIT\\|CLOSE\\|CLOSE-WAIT\\|LAST-ACK\\|LISTEN\\|CLOSING"';
            exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {

              if (!error) {
                let lines = stdout.toString().split('\n');
                lines.forEach(function (line) {
                  line = line.replace(/ +/g, ' ').split(' ');
                  if (line.length >= 6) {
                    let localip = line[4];
                    let localport = '';
                    let localaddress = line[4].split(':');
                    if (localaddress.length > 1) {
                      localport = localaddress[localaddress.length - 1];
                      localaddress.pop();
                      localip = localaddress.join(':');
                    }
                    let peerip = line[5];
                    let peerport = '';
                    let peeraddress = line[5].split(':');
                    if (peeraddress.length > 1) {
                      peerport = peeraddress[peeraddress.length - 1];
                      peeraddress.pop();
                      peerip = peeraddress.join(':');
                    }
                    let connstate = line[1];
                    if (connstate === 'ESTAB') { connstate = 'ESTABLISHED'; }
                    if (connstate === 'TIME-WAIT') { connstate = 'TIME_WAIT'; }
                    let pid = null;
                    let process = '';
                    if (line.length >= 7 && line[6].indexOf('users:') > -1) {
                      let proc = line[6].replace('users:(("', '').replace(/"/g, '').split(',');
                      if (proc.length > 2) {
                        process = proc[0].split(' ')[0].split(':')[0];
                        pid = parseInt(proc[1], 10);
                      }
                    }
                    if (connstate) {
                      result.push({
                        protocol: line[0],
                        localAddress: localip,
                        localPort: localport,
                        peerAddress: peerip,
                        peerPort: peerport,
                        state: connstate,
                        pid,
                        process
                      });
                    }
                  }
                });
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          }
        });
      }
      if (_darwin) {
        // let cmd = 'netstat -natv | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"';
        let cmd = 'netstat -natvln | grep "tcp4\\|tcp6\\|udp4\\|udp6"';
        const states = 'ESTABLISHED|SYN_SENT|SYN_RECV|FIN_WAIT1|FIN_WAIT2|TIME_WAIT|CLOSE|CLOSE_WAIT|LAST_ACK|LISTEN|CLOSING|UNKNOWN';
        exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
          if (!error) {
            exec('ps -axo pid,command', { maxBuffer: 1024 * 20000 }, function (err2, stdout2) {
              let processes = stdout2.toString().split('\n');
              processes = processes.map((line => { return line.trim().replace(/ +/g, ' '); }));
              let lines = stdout.toString().split('\n');

              lines.forEach(function (line) {
                line = line.replace(/ +/g, ' ').split(' ');
                if (line.length >= 8) {
                  let localip = line[3];
                  let localport = '';
                  let localaddress = line[3].split('.');
                  if (localaddress.length > 1) {
                    localport = localaddress[localaddress.length - 1];
                    localaddress.pop();
                    localip = localaddress.join('.');
                  }
                  let peerip = line[4];
                  let peerport = '';
                  let peeraddress = line[4].split('.');
                  if (peeraddress.length > 1) {
                    peerport = peeraddress[peeraddress.length - 1];
                    peeraddress.pop();
                    peerip = peeraddress.join('.');
                  }
                  const hasState = states.indexOf(line[5]) >= 0;
                  let connstate = hasState ? line[5] : 'UNKNOWN';
                  let pid = parseInt(line[8 + (hasState ? 0 : -1)], 10);
                  if (connstate) {
                    result.push({
                      protocol: line[0],
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: connstate,
                      pid: pid,
                      process: getProcessName(processes, pid)
                    });
                  }
                }
              });
              if (callback) {
                callback(result);
              }
              resolve(result);
            });

          }
        });
      }
      if (_windows) {
        let cmd = 'netstat -nao';
        try {
          exec(cmd, util.execOptsWin, function (error, stdout) {
            if (!error) {

              let lines = stdout.toString().split('\r\n');

              lines.forEach(function (line) {
                line = line.trim().replace(/ +/g, ' ').split(' ');
                if (line.length >= 4) {
                  let localip = line[1];
                  let localport = '';
                  let localaddress = line[1].split(':');
                  if (localaddress.length > 1) {
                    localport = localaddress[localaddress.length - 1];
                    localaddress.pop();
                    localip = localaddress.join(':');
                  }
                  localip = localip.replace(/\[/g, '').replace(/\]/g, '');
                  let peerip = line[2];
                  let peerport = '';
                  let peeraddress = line[2].split(':');
                  if (peeraddress.length > 1) {
                    peerport = peeraddress[peeraddress.length - 1];
                    peeraddress.pop();
                    peerip = peeraddress.join(':');
                  }
                  peerip = peerip.replace(/\[/g, '').replace(/\]/g, '');
                  let pid = util.toInt(line[4]);
                  let connstate = line[3];
                  if (connstate === 'HERGESTELLT') { connstate = 'ESTABLISHED'; }
                  if (connstate.startsWith('ABH')) { connstate = 'LISTEN'; }
                  if (connstate === 'SCHLIESSEN_WARTEN') { connstate = 'CLOSE_WAIT'; }
                  if (connstate === 'WARTEND') { connstate = 'TIME_WAIT'; }
                  if (connstate === 'SYN_GESENDET') { connstate = 'SYN_SENT'; }

                  if (connstate === 'LISTENING') { connstate = 'LISTEN'; }
                  if (connstate === 'SYN_RECEIVED') { connstate = 'SYN_RECV'; }
                  if (connstate === 'FIN_WAIT_1') { connstate = 'FIN_WAIT1'; }
                  if (connstate === 'FIN_WAIT_2') { connstate = 'FIN_WAIT2'; }
                  if (line[0].toLowerCase() !== 'udp' && connstate) {
                    result.push({
                      protocol: line[0].toLowerCase(),
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: connstate,
                      pid,
                      process: ''
                    });
                  } else if (line[0].toLowerCase() === 'udp') {
                    result.push({
                      protocol: line[0].toLowerCase(),
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: '',
                      pid: parseInt(line[3], 10),
                      process: ''
                    });
                  }
                }
              });
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.networkConnections = networkConnections;

function networkGatewayDefault(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = '';
      if (_linux || _freebsd || _openbsd || _netbsd) {
        let cmd = 'ip route get 1';
        try {
          exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              const line = lines && lines[0] ? lines[0] : '';
              let parts = line.split(' via ');
              if (parts && parts[1]) {
                parts = parts[1].split(' ');
                result = parts[0];
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_darwin) {
        let cmd = 'route -n get default';
        try {
          exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
            if (!error) {
              const lines = stdout.toString().split('\n').map(line => line.trim());
              result = util.getValue(lines, 'gateway');
            }
            if (!result) {
              cmd = 'netstat -rn | awk \'/default/ {print $2}\'';
              exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                const lines = stdout.toString().split('\n').map(line => line.trim());
                result = lines.find(line => (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(line)));
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
      if (_windows) {
        try {
          exec('netstat -r', util.execOptsWin, function (error, stdout) {
            const lines = stdout.toString().split(os.EOL);
            lines.forEach(line => {
              line = line.replace(/\s+/g, ' ').trim();
              if (line.indexOf('0.0.0.0 0.0.0.0') > -1 && !(/[a-zA-Z]/.test(line))) {
                const parts = line.split(' ');
                if (parts.length >= 5 && (parts[parts.length - 3]).indexOf('.') > -1) {
                  result = parts[parts.length - 3];
                }
              }
            });
            if (!result) {
              util.powerShell('Get-CimInstance -ClassName Win32_IP4RouteTable | Where-Object { $_.Destination -eq \'0.0.0.0\' -and $_.Mask -eq \'0.0.0.0\' }')
                .then((data) => {
                  let lines = data.toString().split('\r\n');
                  if (lines.length > 1 && !result) {
                    result = util.getValue(lines, 'NextHop');
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                    // } else {
                    //   exec('ipconfig', util.execOptsWin, function (error, stdout) {
                    //     let lines = stdout.toString().split('\r\n');
                    //     lines.forEach(function (line) {
                    //       line = line.trim().replace(/\. /g, '');
                    //       line = line.trim().replace(/ +/g, '');
                    //       const parts = line.split(':');
                    //       if ((parts[0].toLowerCase().startsWith('standardgate') || parts[0].toLowerCase().indexOf('gateway') > -1 || parts[0].toLowerCase().indexOf('enlace') > -1) && parts[1]) {
                    //         result = parts[1];
                    //       }
                    //     });
                    //     if (callback) { callback(result); }
                    //     resolve(result);
                    //   });
                  }
                });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.networkGatewayDefault = networkGatewayDefault;


/***/ }),

/***/ 2448:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// osinfo.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 3. Operating System
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const fs = __nccwpck_require__(7147);
const util = __nccwpck_require__(7146);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

// --------------------------
// Get current time and OS uptime

function time() {
  let t = new Date().toString().split(' ');
  return {
    current: Date.now(),
    uptime: os.uptime(),
    timezone: (t.length >= 7) ? t[5] : '',
    timezoneName: Intl ? Intl.DateTimeFormat().resolvedOptions().timeZone : (t.length >= 7) ? t.slice(6).join(' ').replace(/\(/g, '').replace(/\)/g, '') : ''
  };
}

exports.time = time;

// --------------------------
// Get logo filename of OS distribution

function getLogoFile(distro) {
  distro = distro || '';
  distro = distro.toLowerCase();
  let result = _platform;
  if (_windows) {
    result = 'windows';
  }
  else if (distro.indexOf('mac os') !== -1) {
    result = 'apple';
  }
  else if (distro.indexOf('arch') !== -1) {
    result = 'arch';
  }
  else if (distro.indexOf('centos') !== -1) {
    result = 'centos';
  }
  else if (distro.indexOf('coreos') !== -1) {
    result = 'coreos';
  }
  else if (distro.indexOf('debian') !== -1) {
    result = 'debian';
  }
  else if (distro.indexOf('deepin') !== -1) {
    result = 'deepin';
  }
  else if (distro.indexOf('elementary') !== -1) {
    result = 'elementary';
  }
  else if (distro.indexOf('fedora') !== -1) {
    result = 'fedora';
  }
  else if (distro.indexOf('gentoo') !== -1) {
    result = 'gentoo';
  }
  else if (distro.indexOf('mageia') !== -1) {
    result = 'mageia';
  }
  else if (distro.indexOf('mandriva') !== -1) {
    result = 'mandriva';
  }
  else if (distro.indexOf('manjaro') !== -1) {
    result = 'manjaro';
  }
  else if (distro.indexOf('mint') !== -1) {
    result = 'mint';
  }
  else if (distro.indexOf('mx') !== -1) {
    result = 'mx';
  }
  else if (distro.indexOf('openbsd') !== -1) {
    result = 'openbsd';
  }
  else if (distro.indexOf('freebsd') !== -1) {
    result = 'freebsd';
  }
  else if (distro.indexOf('opensuse') !== -1) {
    result = 'opensuse';
  }
  else if (distro.indexOf('pclinuxos') !== -1) {
    result = 'pclinuxos';
  }
  else if (distro.indexOf('puppy') !== -1) {
    result = 'puppy';
  }
  else if (distro.indexOf('raspbian') !== -1) {
    result = 'raspbian';
  }
  else if (distro.indexOf('reactos') !== -1) {
    result = 'reactos';
  }
  else if (distro.indexOf('redhat') !== -1) {
    result = 'redhat';
  }
  else if (distro.indexOf('slackware') !== -1) {
    result = 'slackware';
  }
  else if (distro.indexOf('sugar') !== -1) {
    result = 'sugar';
  }
  else if (distro.indexOf('steam') !== -1) {
    result = 'steam';
  }
  else if (distro.indexOf('suse') !== -1) {
    result = 'suse';
  }
  else if (distro.indexOf('mate') !== -1) {
    result = 'ubuntu-mate';
  }
  else if (distro.indexOf('lubuntu') !== -1) {
    result = 'lubuntu';
  }
  else if (distro.indexOf('xubuntu') !== -1) {
    result = 'xubuntu';
  }
  else if (distro.indexOf('ubuntu') !== -1) {
    result = 'ubuntu';
  }
  else if (distro.indexOf('solaris') !== -1) {
    result = 'solaris';
  }
  else if (distro.indexOf('tails') !== -1) {
    result = 'tails';
  }
  else if (distro.indexOf('feren') !== -1) {
    result = 'ferenos';
  }
  else if (distro.indexOf('robolinux') !== -1) {
    result = 'robolinux';
  } else if (_linux && distro) {
    result = distro.toLowerCase().trim().replace(/\s+/g, '-');
  }
  return result;
}

// --------------------------
// FQDN

function getFQDN() {
  let fqdn = os.hostname;
  if (_linux || _darwin) {
    try {
      const stdout = execSync('hostnamectl --json short 2>/dev/null');
      const json = JSON.parse(stdout.toString());

      fqdn = json['StaticHostname'];
    } catch (e) {
      try {
        const stdout = execSync('hostname -f 2>/dev/null');
        fqdn = stdout.toString().split(os.EOL)[0];
      } catch (e) {
        util.noop();
      }
    }
  }
  if (_freebsd || _openbsd || _netbsd) {
    try {
      const stdout = execSync('hostname 2>/dev/null');
      fqdn = stdout.toString().split(os.EOL)[0];
    } catch (e) {
      util.noop();
    }
  }
  if (_windows) {
    try {
      const stdout = execSync('echo %COMPUTERNAME%.%USERDNSDOMAIN%', util.execOptsWin);
      fqdn = stdout.toString().replace('.%USERDNSDOMAIN%', '').split(os.EOL)[0];
    } catch (e) {
      util.noop();
    }
  }
  return fqdn;
}

// --------------------------
// OS Information

function osInfo(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {

        platform: (_platform === 'win32' ? 'Windows' : _platform),
        distro: 'unknown',
        release: 'unknown',
        codename: '',
        kernel: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        fqdn: getFQDN(),
        codepage: '',
        logofile: '',
        serial: '',
        build: '',
        servicepack: '',
        uefi: false
      };

      if (_linux) {

        exec('cat /etc/*-release; cat /usr/lib/os-release; cat /etc/openwrt_release', function (error, stdout) {
          /**
           * @namespace
           * @property {string}  DISTRIB_ID
           * @property {string}  NAME
           * @property {string}  DISTRIB_RELEASE
           * @property {string}  VERSION_ID
           * @property {string}  DISTRIB_CODENAME
           */
          let release = {};
          let lines = stdout.toString().split('\n');
          lines.forEach(function (line) {
            if (line.indexOf('=') !== -1) {
              release[line.split('=')[0].trim().toUpperCase()] = line.split('=')[1].trim();
            }
          });
          result.distro = (release.DISTRIB_ID || release.NAME || 'unknown').replace(/"/g, '');
          result.logofile = getLogoFile(result.distro);
          let releaseVersion = (release.VERSION || '').replace(/"/g, '');
          let codename = (release.DISTRIB_CODENAME || release.VERSION_CODENAME || '').replace(/"/g, '');
          const prettyName = (release.PRETTY_NAME || '').replace(/"/g, '');
          if (prettyName.indexOf(result.distro + ' ') === 0) {
            releaseVersion = prettyName.replace(result.distro + ' ', '').trim();
          }
          if (releaseVersion.indexOf('(') >= 0) {
            codename = releaseVersion.split('(')[1].replace(/[()]/g, '').trim();
            releaseVersion = releaseVersion.split('(')[0].trim();
          }
          result.release = (releaseVersion || release.DISTRIB_RELEASE || release.VERSION_ID || 'unknown').replace(/"/g, '');
          result.codename = codename;
          result.codepage = util.getCodepage();
          result.build = (release.BUILD_ID || '').replace(/"/g, '').trim();
          isUefiLinux().then(uefi => {
            result.uefi = uefi;
            uuid().then((data) => {
              result.serial = data.os;
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          });
        });
      }
      if (_freebsd || _openbsd || _netbsd) {

        exec('sysctl kern.ostype kern.osrelease kern.osrevision kern.hostuuid machdep.bootmethod kern.geom.confxml', function (error, stdout) {
          let lines = stdout.toString().split('\n');
          const distro = util.getValue(lines, 'kern.ostype');
          const logofile = getLogoFile(distro);
          const release = util.getValue(lines, 'kern.osrelease').split('-')[0];
          const serial = util.getValue(lines, 'kern.uuid');
          const bootmethod = util.getValue(lines, 'machdep.bootmethod');
          const uefiConf = stdout.toString().indexOf('<type>efi</type>') >= 0;
          const uefi = bootmethod ? bootmethod.toLowerCase().indexOf('uefi') >= 0 : (uefiConf ? uefiConf : null);
          result.distro = distro || result.distro;
          result.logofile = logofile || result.logofile;
          result.release = release || result.release;
          result.serial = serial || result.serial;
          result.codename = '';
          result.codepage = util.getCodepage();
          result.uefi = uefi || null;
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin) {
        exec('sw_vers; sysctl kern.ostype kern.osrelease kern.osrevision kern.uuid', function (error, stdout) {
          let lines = stdout.toString().split('\n');
          result.serial = util.getValue(lines, 'kern.uuid');
          result.distro = util.getValue(lines, 'ProductName');
          result.release = (util.getValue(lines, 'ProductVersion', ':', true, true) + ' ' + util.getValue(lines, 'ProductVersionExtra', ':', true, true)).trim();
          result.build = util.getValue(lines, 'BuildVersion');
          result.logofile = getLogoFile(result.distro);
          result.codename = 'macOS';
          result.codename = (result.release.indexOf('10.4') > -1 ? 'Mac OS X Tiger' : result.codename);
          result.codename = (result.release.indexOf('10.5') > -1 ? 'Mac OS X Leopard' : result.codename);
          result.codename = (result.release.indexOf('10.6') > -1 ? 'Mac OS X Snow Leopard' : result.codename);
          result.codename = (result.release.indexOf('10.7') > -1 ? 'Mac OS X Lion' : result.codename);
          result.codename = (result.release.indexOf('10.8') > -1 ? 'OS X Mountain Lion' : result.codename);
          result.codename = (result.release.indexOf('10.9') > -1 ? 'OS X Mavericks' : result.codename);
          result.codename = (result.release.indexOf('10.10') > -1 ? 'OS X Yosemite' : result.codename);
          result.codename = (result.release.indexOf('10.11') > -1 ? 'OS X El Capitan' : result.codename);
          result.codename = (result.release.indexOf('10.12') > -1 ? 'macOS Sierra' : result.codename);
          result.codename = (result.release.indexOf('10.13') > -1 ? 'macOS High Sierra' : result.codename);
          result.codename = (result.release.indexOf('10.14') > -1 ? 'macOS Mojave' : result.codename);
          result.codename = (result.release.indexOf('10.15') > -1 ? 'macOS Catalina' : result.codename);
          result.codename = (result.release.startsWith('11.') ? 'macOS Big Sur' : result.codename);
          result.codename = (result.release.startsWith('12.') ? 'macOS Monterey' : result.codename);
          result.codename = (result.release.startsWith('13.') ? 'macOS Ventura' : result.codename);
          result.codename = (result.release.startsWith('14.') ? 'macOS Sonoma' : result.codename);
          result.codename = (result.release.startsWith('15.') ? 'macOS Sequoia' : result.codename);
          result.uefi = true;
          result.codepage = util.getCodepage();
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos) {
        result.release = result.kernel;
        exec('uname -o', function (error, stdout) {
          let lines = stdout.toString().split('\n');
          result.distro = lines[0];
          result.logofile = getLogoFile(result.distro);
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_windows) {
        result.logofile = getLogoFile();
        result.release = result.kernel;
        try {
          const workload = [];
          workload.push(util.powerShell('Get-CimInstance Win32_OperatingSystem | select Caption,SerialNumber,BuildNumber,ServicePackMajorVersion,ServicePackMinorVersion | fl'));
          workload.push(util.powerShell('(Get-CimInstance Win32_ComputerSystem).HypervisorPresent'));
          workload.push(util.powerShell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SystemInformation]::TerminalServerSession'));
          util.promiseAll(
            workload
          ).then((data) => {
            let lines = data.results[0] ? data.results[0].toString().split('\r\n') : [''];
            result.distro = util.getValue(lines, 'Caption', ':').trim();
            result.serial = util.getValue(lines, 'SerialNumber', ':').trim();
            result.build = util.getValue(lines, 'BuildNumber', ':').trim();
            result.servicepack = util.getValue(lines, 'ServicePackMajorVersion', ':').trim() + '.' + util.getValue(lines, 'ServicePackMinorVersion', ':').trim();
            result.codepage = util.getCodepage();
            const hyperv = data.results[1] ? data.results[1].toString().toLowerCase() : '';
            result.hypervisor = hyperv.indexOf('true') !== -1;
            const term = data.results[2] ? data.results[2].toString() : '';
            result.remoteSession = (term.toString().toLowerCase().indexOf('true') >= 0);
            isUefiWindows().then(uefi => {
              result.uefi = uefi;
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.osInfo = osInfo;

function isUefiLinux() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      fs.stat('/sys/firmware/efi', function (err) {
        if (!err) {
          return resolve(true);
        } else {
          exec('dmesg | grep -E "EFI v"', function (error, stdout) {
            if (!error) {
              const lines = stdout.toString().split('\n');
              return resolve(lines.length > 0);
            }
            return resolve(false);
          });
        }
      });
    });
  });
}

function isUefiWindows() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        exec('findstr /C:"Detected boot environment" "%windir%\\Panther\\setupact.log"', util.execOptsWin, function (error, stdout) {
          if (!error) {
            const line = stdout.toString().split('\n\r')[0];
            return resolve(line.toLowerCase().indexOf('efi') >= 0);
          } else {
            exec('echo %firmware_type%', util.execOptsWin, function (error, stdout) {
              if (!error) {
                const line = stdout.toString() || '';
                return resolve(line.toLowerCase().indexOf('efi') >= 0);
              } else {
                return resolve(false);
              }
            });
          }
        });
      } catch (e) {
        return resolve(false);
      }
    });
  });
}

function versions(apps, callback) {
  let versionObject = {
    kernel: os.release(),
    openssl: '',
    systemOpenssl: '',
    systemOpensslLib: '',
    node: process.versions.node,
    v8: process.versions.v8,
    npm: '',
    yarn: '',
    pm2: '',
    gulp: '',
    grunt: '',
    git: '',
    tsc: '',
    mysql: '',
    redis: '',
    mongodb: '',
    apache: '',
    nginx: '',
    php: '',
    docker: '',
    postfix: '',
    postgresql: '',
    perl: '',
    python: '',
    python3: '',
    pip: '',
    pip3: '',
    java: '',
    gcc: '',
    virtualbox: '',
    bash: '',
    zsh: '',
    fish: '',
    powershell: '',
    dotnet: ''
  };

  function checkVersionParam(apps) {
    if (apps === '*') {
      return {
        versions: versionObject,
        counter: 30
      };
    }
    if (!Array.isArray(apps)) {
      apps = apps.trim().toLowerCase().replace(/,+/g, '|').replace(/ /g, '|');
      apps = apps.split('|');
      const result = {
        versions: {},
        counter: 0
      };
      apps.forEach(el => {
        if (el) {
          for (let key in versionObject) {
            if ({}.hasOwnProperty.call(versionObject, key)) {
              if (key.toLowerCase() === el.toLowerCase() && !{}.hasOwnProperty.call(result.versions, key)) {
                result.versions[key] = versionObject[key];
                if (key === 'openssl') {
                  result.versions.systemOpenssl = '';
                  result.versions.systemOpensslLib = '';
                }

                if (!result.versions[key]) { result.counter++; }
              }
            }
          }
        }
      });
      return result;
    }
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      if (util.isFunction(apps) && !callback) {
        callback = apps;
        apps = '*';
      } else {
        apps = apps || '*';
        if (typeof apps !== 'string') {
          if (callback) { callback({}); }
          return resolve({});
        }
      }
      const appsObj = checkVersionParam(apps);
      let totalFunctions = appsObj.counter;

      let functionProcessed = (function () {
        return function () {
          if (--totalFunctions === 0) {
            if (callback) {
              callback(appsObj.versions);
            }
            resolve(appsObj.versions);
          }
        };
      })();

      let cmd = '';
      try {
        if ({}.hasOwnProperty.call(appsObj.versions, 'openssl')) {
          appsObj.versions.openssl = process.versions.openssl;
          exec('openssl version', function (error, stdout) {
            if (!error) {
              let openssl_string = stdout.toString().split('\n')[0].trim();
              let openssl = openssl_string.split(' ');
              appsObj.versions.systemOpenssl = openssl.length > 0 ? openssl[1] : openssl[0];
              appsObj.versions.systemOpensslLib = openssl.length > 0 ? openssl[0] : 'openssl';
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'npm')) {
          exec('npm -v', function (error, stdout) {
            if (!error) {
              appsObj.versions.npm = stdout.toString().split('\n')[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'pm2')) {
          cmd = 'pm2';
          if (_windows) {
            cmd += '.cmd';
          }
          exec(`${cmd} -v`, function (error, stdout) {
            if (!error) {
              let pm2 = stdout.toString().split('\n')[0].trim();
              if (!pm2.startsWith('[PM2]')) {
                appsObj.versions.pm2 = pm2;
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'yarn')) {
          exec('yarn --version', function (error, stdout) {
            if (!error) {
              appsObj.versions.yarn = stdout.toString().split('\n')[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'gulp')) {
          cmd = 'gulp';
          if (_windows) {
            cmd += '.cmd';
          }
          exec(`${cmd} --version`, function (error, stdout) {
            if (!error) {
              const gulp = stdout.toString().split('\n')[0] || '';
              appsObj.versions.gulp = (gulp.toLowerCase().split('version')[1] || '').trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'tsc')) {
          cmd = 'tsc';
          if (_windows) {
            cmd += '.cmd';
          }
          exec(`${cmd} --version`, function (error, stdout) {
            if (!error) {
              const tsc = stdout.toString().split('\n')[0] || '';
              appsObj.versions.tsc = (tsc.toLowerCase().split('version')[1] || '').trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'grunt')) {
          cmd = 'grunt';
          if (_windows) {
            cmd += '.cmd';
          }
          exec(`${cmd} --version`, function (error, stdout) {
            if (!error) {
              const grunt = stdout.toString().split('\n')[0] || '';
              appsObj.versions.grunt = (grunt.toLowerCase().split('cli v')[1] || '').trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'git')) {
          if (_darwin) {
            const gitHomebrewExists = fs.existsSync('/usr/local/Cellar/git') || fs.existsSync('/opt/homebrew/bin/git');
            if (util.darwinXcodeExists() || gitHomebrewExists) {
              exec('git --version', function (error, stdout) {
                if (!error) {
                  let git = stdout.toString().split('\n')[0] || '';
                  git = (git.toLowerCase().split('version')[1] || '').trim();
                  appsObj.versions.git = (git.split(' ')[0] || '').trim();
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec('git --version', function (error, stdout) {
              if (!error) {
                let git = stdout.toString().split('\n')[0] || '';
                git = (git.toLowerCase().split('version')[1] || '').trim();
                appsObj.versions.git = (git.split(' ')[0] || '').trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'apache')) {
          exec('apachectl -v 2>&1', function (error, stdout) {
            if (!error) {
              const apache = (stdout.toString().split('\n')[0] || '').split(':');
              appsObj.versions.apache = (apache.length > 1 ? apache[1].replace('Apache', '').replace('/', '').split('(')[0].trim() : '');
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'nginx')) {
          exec('nginx -v 2>&1', function (error, stdout) {
            if (!error) {
              const nginx = stdout.toString().split('\n')[0] || '';
              appsObj.versions.nginx = (nginx.toLowerCase().split('/')[1] || '').trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'mysql')) {
          exec('mysql -V', function (error, stdout) {
            if (!error) {
              let mysql = stdout.toString().split('\n')[0] || '';
              mysql = mysql.toLowerCase();
              if (mysql.indexOf(',') > -1) {
                mysql = (mysql.split(',')[0] || '').trim();
                const parts = mysql.split(' ');
                appsObj.versions.mysql = (parts[parts.length - 1] || '').trim();
              } else {
                if (mysql.indexOf(' ver ') > -1) {
                  mysql = mysql.split(' ver ')[1];
                  appsObj.versions.mysql = mysql.split(' ')[0];
                }
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'php')) {
          exec('php -v', function (error, stdout) {
            if (!error) {
              const php = stdout.toString().split('\n')[0] || '';
              let parts = php.split('(');
              if (parts[0].indexOf('-')) {
                parts = parts[0].split('-');
              }
              appsObj.versions.php = parts[0].replace(/[^0-9.]/g, '');
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'redis')) {
          exec('redis-server --version', function (error, stdout) {
            if (!error) {
              const redis = stdout.toString().split('\n')[0] || '';
              const parts = redis.split(' ');
              appsObj.versions.redis = util.getValue(parts, 'v', '=', true);
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'docker')) {
          exec('docker --version', function (error, stdout) {
            if (!error) {
              const docker = stdout.toString().split('\n')[0] || '';
              const parts = docker.split(' ');
              appsObj.versions.docker = parts.length > 2 && parts[2].endsWith(',') ? parts[2].slice(0, -1) : '';
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'postfix')) {
          exec('postconf -d | grep mail_version', function (error, stdout) {
            if (!error) {
              const postfix = stdout.toString().split('\n') || [];
              appsObj.versions.postfix = util.getValue(postfix, 'mail_version', '=', true);
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'mongodb')) {
          exec('mongod --version', function (error, stdout) {
            if (!error) {
              const mongodb = stdout.toString().split('\n')[0] || '';
              appsObj.versions.mongodb = (mongodb.toLowerCase().split(',')[0] || '').replace(/[^0-9.]/g, '');
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'postgresql')) {
          if (_linux) {
            exec('locate bin/postgres', function (error, stdout) {
              if (!error) {
                const postgresqlBin = stdout.toString().split('\n').sort();
                if (postgresqlBin.length) {
                  exec(postgresqlBin[postgresqlBin.length - 1] + ' -V', function (error, stdout) {
                    if (!error) {
                      const postgresql = stdout.toString().split('\n')[0].split(' ') || [];
                      appsObj.versions.postgresql = postgresql.length ? postgresql[postgresql.length - 1] : '';
                    }
                    functionProcessed();
                  });
                } else {
                  functionProcessed();
                }
              } else {
                exec('psql -V', function (error, stdout) {
                  if (!error) {
                    const postgresql = stdout.toString().split('\n')[0].split(' ') || [];
                    appsObj.versions.postgresql = postgresql.length ? postgresql[postgresql.length - 1] : '';
                    appsObj.versions.postgresql = appsObj.versions.postgresql.split('-')[0];
                  }
                  functionProcessed();
                });
              }
            });
          } else {
            if (_windows) {
              util.powerShell('Get-CimInstance Win32_Service | select caption | fl').then((stdout) => {
                let serviceSections = stdout.split(/\n\s*\n/);
                serviceSections.forEach((item) => {
                  if (item.trim() !== '') {
                    let lines = item.trim().split('\r\n');
                    let srvCaption = util.getValue(lines, 'caption', ':', true).toLowerCase();
                    if (srvCaption.indexOf('postgresql') > -1) {
                      const parts = srvCaption.split(' server ');
                      if (parts.length > 1) {
                        appsObj.versions.postgresql = parts[1];
                      }
                    }
                  }
                });
                functionProcessed();
              });
            } else {
              exec('postgres -V', function (error, stdout) {
                if (!error) {
                  const postgresql = stdout.toString().split('\n')[0].split(' ') || [];
                  appsObj.versions.postgresql = postgresql.length ? postgresql[postgresql.length - 1] : '';
                }
                functionProcessed();
              });
            }
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'perl')) {
          exec('perl -v', function (error, stdout) {
            if (!error) {
              const perl = stdout.toString().split('\n') || '';
              while (perl.length > 0 && perl[0].trim() === '') {
                perl.shift();
              }
              if (perl.length > 0) {
                appsObj.versions.perl = perl[0].split('(').pop().split(')')[0].replace('v', '');
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'python')) {
          if (_darwin) {
            try {
              const stdout = execSync('sw_vers');
              const lines = stdout.toString().split('\n');
              const osVersion = util.getValue(lines, 'ProductVersion', ':');
              const gitHomebrewExists1 = fs.existsSync('/usr/local/Cellar/python');
              const gitHomebrewExists2 = fs.existsSync('/opt/homebrew/bin/python');
              if ((util.darwinXcodeExists() && util.semverCompare('12.0.1', osVersion) < 0) || gitHomebrewExists1 || gitHomebrewExists2) {
                const cmd = gitHomebrewExists1 ? '/usr/local/Cellar/python -V 2>&1' : (gitHomebrewExists2 ? '/opt/homebrew/bin/python -V 2>&1' : 'python -V 2>&1');
                exec(cmd, function (error, stdout) {
                  if (!error) {
                    const python = stdout.toString().split('\n')[0] || '';
                    appsObj.versions.python = python.toLowerCase().replace('python', '').trim();
                  }
                  functionProcessed();
                });
              } else {
                functionProcessed();
              }
            } catch (e) {
              functionProcessed();
            }

          } else {
            exec('python -V 2>&1', function (error, stdout) {
              if (!error) {
                const python = stdout.toString().split('\n')[0] || '';
                appsObj.versions.python = python.toLowerCase().replace('python', '').trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'python3')) {
          if (_darwin) {
            const gitHomebrewExists = fs.existsSync('/usr/local/Cellar/python3') || fs.existsSync('/opt/homebrew/bin/python3');
            if (util.darwinXcodeExists() || gitHomebrewExists) {
              exec('python3 -V 2>&1', function (error, stdout) {
                if (!error) {
                  const python = stdout.toString().split('\n')[0] || '';
                  appsObj.versions.python3 = python.toLowerCase().replace('python', '').trim();
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec('python3 -V 2>&1', function (error, stdout) {
              if (!error) {
                const python = stdout.toString().split('\n')[0] || '';
                appsObj.versions.python3 = python.toLowerCase().replace('python', '').trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'pip')) {
          if (_darwin) {
            const gitHomebrewExists = fs.existsSync('/usr/local/Cellar/pip') || fs.existsSync('/opt/homebrew/bin/pip');
            if (util.darwinXcodeExists() || gitHomebrewExists) {
              exec('pip -V 2>&1', function (error, stdout) {
                if (!error) {
                  const pip = stdout.toString().split('\n')[0] || '';
                  const parts = pip.split(' ');
                  appsObj.versions.pip = parts.length >= 2 ? parts[1] : '';
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec('pip -V 2>&1', function (error, stdout) {
              if (!error) {
                const pip = stdout.toString().split('\n')[0] || '';
                const parts = pip.split(' ');
                appsObj.versions.pip = parts.length >= 2 ? parts[1] : '';
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'pip3')) {
          if (_darwin) {
            const gitHomebrewExists = fs.existsSync('/usr/local/Cellar/pip3') || fs.existsSync('/opt/homebrew/bin/pip3');
            if (util.darwinXcodeExists() || gitHomebrewExists) {
              exec('pip3 -V 2>&1', function (error, stdout) {
                if (!error) {
                  const pip = stdout.toString().split('\n')[0] || '';
                  const parts = pip.split(' ');
                  appsObj.versions.pip3 = parts.length >= 2 ? parts[1] : '';
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec('pip3 -V 2>&1', function (error, stdout) {
              if (!error) {
                const pip = stdout.toString().split('\n')[0] || '';
                const parts = pip.split(' ');
                appsObj.versions.pip3 = parts.length >= 2 ? parts[1] : '';
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'java')) {
          if (_darwin) {
            // check if any JVM is installed but avoid dialog box that Java needs to be installed
            exec('/usr/libexec/java_home -V 2>&1', function (error, stdout) {
              if (!error && stdout.toString().toLowerCase().indexOf('no java runtime') === -1) {
                // now this can be done savely
                exec('java -version 2>&1', function (error, stdout) {
                  if (!error) {
                    const java = stdout.toString().split('\n')[0] || '';
                    const parts = java.split('"');
                    appsObj.versions.java = parts.length === 3 ? parts[1].trim() : '';
                  }
                  functionProcessed();
                });
              } else {
                functionProcessed();
              }
            });
          } else {
            exec('java -version 2>&1', function (error, stdout) {
              if (!error) {
                const java = stdout.toString().split('\n')[0] || '';
                const parts = java.split('"');
                appsObj.versions.java = parts.length === 3 ? parts[1].trim() : '';
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'gcc')) {
          if ((_darwin && util.darwinXcodeExists()) || !_darwin) {
            exec('gcc -dumpversion', function (error, stdout) {
              if (!error) {
                appsObj.versions.gcc = stdout.toString().split('\n')[0].trim() || '';
              }
              if (appsObj.versions.gcc.indexOf('.') > -1) {
                functionProcessed();
              } else {
                exec('gcc --version', function (error, stdout) {
                  if (!error) {
                    const gcc = stdout.toString().split('\n')[0].trim();
                    if (gcc.indexOf('gcc') > -1 && gcc.indexOf(')') > -1) {
                      const parts = gcc.split(')');
                      appsObj.versions.gcc = parts[1].trim() || appsObj.versions.gcc;
                    }
                  }
                  functionProcessed();
                });
              }
            });
          } else {
            functionProcessed();
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'virtualbox')) {
          exec(util.getVboxmanage() + ' -v 2>&1', function (error, stdout) {
            if (!error) {
              const vbox = stdout.toString().split('\n')[0] || '';
              const parts = vbox.split('r');
              appsObj.versions.virtualbox = parts[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'bash')) {
          exec('bash --version', function (error, stdout) {
            if (!error) {
              const line = stdout.toString().split('\n')[0];
              const parts = line.split(' version ');
              if (parts.length > 1) {
                appsObj.versions.bash = parts[1].split(' ')[0].split('(')[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'zsh')) {
          exec('zsh --version', function (error, stdout) {
            if (!error) {
              const line = stdout.toString().split('\n')[0];
              const parts = line.split('zsh ');
              if (parts.length > 1) {
                appsObj.versions.zsh = parts[1].split(' ')[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'fish')) {
          exec('fish --version', function (error, stdout) {
            if (!error) {
              const line = stdout.toString().split('\n')[0];
              const parts = line.split(' version ');
              if (parts.length > 1) {
                appsObj.versions.fish = parts[1].split(' ')[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'powershell')) {
          if (_windows) {
            util.powerShell('$PSVersionTable').then(stdout => {
              const lines = stdout.toString().split('\n').map(line => line.replace(/ +/g, ' ').replace(/ +/g, ':'));
              appsObj.versions.powershell = util.getValue(lines, 'psversion');
              functionProcessed();
            });
          } else {
            functionProcessed();
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, 'dotnet')) {
          if (_windows) {
            util.powerShell('gci "HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP" -recurse | gp -name Version,Release -EA 0 | where { $_.PSChildName -match "^(?!S)\\p{L}"} | select PSChildName, Version, Release').then(stdout => {
              const lines = stdout.toString().split('\r\n');
              let dotnet = '';
              lines.forEach(line => {
                line = line.replace(/ +/g, ' ');
                const parts = line.split(' ');
                dotnet = dotnet || (parts[0].toLowerCase().startsWith('client') && parts.length > 2 ? parts[1].trim() : (parts[0].toLowerCase().startsWith('full') && parts.length > 2 ? parts[1].trim() : ''));
              });
              appsObj.versions.dotnet = dotnet.trim();
              functionProcessed();
            });
          } else {
            functionProcessed();
          }
        }
      } catch (e) {
        if (callback) { callback(appsObj.versions); }
        resolve(appsObj.versions);
      }
    });
  });
}

exports.versions = versions;

function shell(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows) {
        resolve('cmd');
      } else {
        let result = '';
        exec('echo $SHELL', function (error, stdout) {
          if (!error) {
            result = stdout.toString().split('\n')[0];
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
    });
  });
}

exports.shell = shell;

function getUniqueMacAdresses() {
  let macs = [];
  try {
    const ifaces = os.networkInterfaces();
    for (let dev in ifaces) {
      if ({}.hasOwnProperty.call(ifaces, dev)) {
        ifaces[dev].forEach(function (details) {
          if (details && details.mac && details.mac !== '00:00:00:00:00:00') {
            const mac = details.mac.toLowerCase();
            if (macs.indexOf(mac) === -1) {
              macs.push(mac);
            }
          }
        });
      }
    }
    macs = macs.sort(function (a, b) {
      if (a < b) { return -1; }
      if (a > b) { return 1; }
      return 0;
    });
  } catch (e) {
    macs.push('00:00:00:00:00:00');
  }
  return macs;
}

function uuid(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        os: '',
        hardware: '',
        macs: getUniqueMacAdresses()
      };
      let parts;

      if (_darwin) {
        exec('system_profiler SPHardwareDataType -json', function (error, stdout) {
          if (!error) {
            try {
              const jsonObj = JSON.parse(stdout.toString());
              if (jsonObj.SPHardwareDataType && jsonObj.SPHardwareDataType.length > 0) {
                const spHardware = jsonObj.SPHardwareDataType[0];
                result.os = spHardware.platform_UUID.toLowerCase();
                result.hardware = spHardware.serial_number;
              }
            } catch (e) {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux) {
        const cmd = `echo -n "os: "; cat /var/lib/dbus/machine-id 2> /dev/null ||
cat /etc/machine-id 2> /dev/null; echo;
echo -n "hardware: "; cat /sys/class/dmi/id/product_uuid 2> /dev/null; echo;`;
        exec(cmd, function (error, stdout) {
          const lines = stdout.toString().split('\n');
          result.os = util.getValue(lines, 'os').toLowerCase();
          result.hardware = util.getValue(lines, 'hardware').toLowerCase();
          if (!result.hardware) {
            const lines = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' }).toString().split('\n');
            const serial = util.getValue(lines, 'serial');
            result.hardware = serial || '';
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('sysctl -i kern.hostid kern.hostuuid', function (error, stdout) {
          const lines = stdout.toString().split('\n');
          result.os = util.getValue(lines, 'kern.hostid', ':').toLowerCase();
          result.hardware = util.getValue(lines, 'kern.hostuuid', ':').toLowerCase();
          if (result.os.indexOf('unknown') >= 0) { result.os = ''; }
          if (result.hardware.indexOf('unknown') >= 0) { result.hardware = ''; }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        let sysdir = '%windir%\\System32';
        if (process.arch === 'ia32' && Object.prototype.hasOwnProperty.call(process.env, 'PROCESSOR_ARCHITEW6432')) {
          sysdir = '%windir%\\sysnative\\cmd.exe /c %windir%\\System32';
        }
        util.powerShell('Get-CimInstance Win32_ComputerSystemProduct | select UUID | fl').then((stdout) => {
          let lines = stdout.split('\r\n');
          result.hardware = util.getValue(lines, 'uuid', ':').toLowerCase();
          exec(`${sysdir}\\reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid`, util.execOptsWin, function (error, stdout) {
            parts = stdout.toString().split('\n\r')[0].split('REG_SZ');
            result.os = parts.length > 1 ? parts[1].replace(/\r+|\n+|\s+/ig, '').toLowerCase() : '';
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        });
      }
    });
  });
}

exports.uuid = uuid;


/***/ }),

/***/ 6949:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// printers.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 15. printers
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

const winPrinterStatus = {
  1: 'Other',
  2: 'Unknown',
  3: 'Idle',
  4: 'Printing',
  5: 'Warmup',
  6: 'Stopped Printing',
  7: 'Offline',
};

function parseLinuxCupsHeader(lines) {
  const result = {};
  if (lines && lines.length) {
    if (lines[0].indexOf(' CUPS v') > 0) {
      const parts = lines[0].split(' CUPS v');
      result.cupsVersion = parts[1];
    }
  }
  return result;
}

function parseLinuxCupsPrinter(lines) {
  const result = {};
  const printerId = util.getValue(lines, 'PrinterId', ' ');
  result.id = printerId ? parseInt(printerId, 10) : null;
  result.name = util.getValue(lines, 'Info', ' ');
  result.model = lines.length > 0 && lines[0] ? lines[0].split(' ')[0] : '';
  result.uri = util.getValue(lines, 'DeviceURI', ' ');
  result.uuid = util.getValue(lines, 'UUID', ' ');
  result.status = util.getValue(lines, 'State', ' ');
  result.local = util.getValue(lines, 'Location', ' ').toLowerCase().startsWith('local');
  result.default = null;
  result.shared = util.getValue(lines, 'Shared', ' ').toLowerCase().startsWith('yes');

  return result;
}

function parseLinuxLpstatPrinter(lines, id) {
  const result = {};
  result.id = id;
  result.name = util.getValue(lines, 'Description', ':', true);
  result.model = lines.length > 0 && lines[0] ? lines[0].split(' ')[0] : '';
  result.uri = null;
  result.uuid = null;
  result.status = lines.length > 0 && lines[0] ? (lines[0].indexOf(' idle') > 0 ? 'idle' : (lines[0].indexOf(' printing') > 0 ? 'printing' : 'unknown')) : null;
  result.local = util.getValue(lines, 'Location', ':', true).toLowerCase().startsWith('local');
  result.default = null;
  result.shared = util.getValue(lines, 'Shared', ' ').toLowerCase().startsWith('yes');

  return result;
}

function parseDarwinPrinters(printerObject, id) {
  const result = {};
  const uriParts = printerObject.uri.split('/');
  result.id = id;
  result.name = printerObject._name;
  result.model = uriParts.length ? uriParts[uriParts.length - 1] : '';
  result.uri = printerObject.uri;
  result.uuid = null;
  result.status = printerObject.status;
  result.local = printerObject.printserver === 'local';
  result.default = printerObject.default === 'yes';
  result.shared = printerObject.shared === 'yes';

  return result;
}

function parseWindowsPrinters(lines, id) {
  const result = {};
  const status = parseInt(util.getValue(lines, 'PrinterStatus', ':'), 10);

  result.id = id;
  result.name = util.getValue(lines, 'name', ':');
  result.model = util.getValue(lines, 'DriverName', ':');
  result.uri = null;
  result.uuid = null;
  result.status = winPrinterStatus[status] ? winPrinterStatus[status] : null;
  result.local = util.getValue(lines, 'Local', ':').toUpperCase() === 'TRUE';
  result.default = util.getValue(lines, 'Default', ':').toUpperCase() === 'TRUE';
  result.shared = util.getValue(lines, 'Shared', ':').toUpperCase() === 'TRUE';

  return result;
}

function printer(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux || _freebsd || _openbsd || _netbsd) {
        let cmd = 'cat /etc/cups/printers.conf 2>/dev/null';
        exec(cmd, function (error, stdout) {
          // printers.conf
          if (!error) {
            const parts = stdout.toString().split('<Printer ');
            const printerHeader = parseLinuxCupsHeader(parts[0]);
            for (let i = 1; i < parts.length; i++) {
              const printers = parseLinuxCupsPrinter(parts[i].split('\n'));
              if (printers.name) {
                printers.engine = 'CUPS';
                printers.engineVersion = printerHeader.cupsVersion;
                result.push(printers);
              }
            }
          }
          if (result.length === 0) {
            if (_linux) {
              cmd = 'export LC_ALL=C; lpstat -lp 2>/dev/null; unset LC_ALL';
              // lpstat
              exec(cmd, function (error, stdout) {
                const parts = ('\n' + stdout.toString()).split('\nprinter ');
                for (let i = 1; i < parts.length; i++) {
                  const printers = parseLinuxLpstatPrinter(parts[i].split('\n'), i);
                  result.push(printers);
                }
              });
              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_darwin) {
        let cmd = 'system_profiler SPPrintersDataType -json';
        exec(cmd, function (error, stdout) {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPPrintersDataType && outObj.SPPrintersDataType.length) {
                for (let i = 0; i < outObj.SPPrintersDataType.length; i++) {
                  const printer = parseDarwinPrinters(outObj.SPPrintersDataType[i], i);
                  result.push(printer);
                }
              }
            } catch (e) {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        util.powerShell('Get-CimInstance Win32_Printer | select PrinterStatus,Name,DriverName,Local,Default,Shared | fl').then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            for (let i = 0; i < parts.length; i++) {
              const printer = parseWindowsPrinters(parts[i].split('\n'), i);
              if (printer.name || printer.model) {
                result.push(printer);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos) {
        resolve(null);
      }
    });
  });
}

exports.printer = printer;


/***/ }),

/***/ 6057:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// processes.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 10. Processes
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const fs = __nccwpck_require__(7147);
const path = __nccwpck_require__(1017);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);

const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

const _processes_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
};
const _services_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
};
const _process_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
};

const _winStatusValues = {
  '0': 'unknown',
  '1': 'other',
  '2': 'ready',
  '3': 'running',
  '4': 'blocked',
  '5': 'suspended blocked',
  '6': 'suspended ready',
  '7': 'terminated',
  '8': 'stopped',
  '9': 'growing',
};

function parseTimeUnix(time) {
  let result = time;
  let parts = time.replace(/ +/g, ' ').split(' ');
  if (parts.length === 5) {
    result = parts[4] + '-' + ('0' + ('JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC'.indexOf(parts[1].toUpperCase()) / 3 + 1)).slice(-2) + '-' + ('0' + parts[2]).slice(-2) + ' ' + parts[3];
  }
  return result;
}

function parseElapsedTime(etime) {
  let current = new Date();
  current = new Date(current.getTime() - current.getTimezoneOffset() * 60000);

  const elapsed = etime.split('-');

  const timeIndex = elapsed.length - 1;
  const days = timeIndex > 0 ? parseInt(elapsed[timeIndex - 1]) : 0;

  const timeStr = elapsed[timeIndex].split(':');
  const hours = timeStr.length === 3 ? parseInt(timeStr[0] || 0) : 0;
  const mins = parseInt(timeStr[timeStr.length === 3 ? 1 : 0] || 0);
  const secs = parseInt(timeStr[timeStr.length === 3 ? 2 : 1] || 0);
  const ms = (((((days * 24 + hours) * 60) + mins) * 60 + secs) * 1000);

  let res = new Date(current.getTime());
  let result = res.toISOString().substring(0, 10) + ' ' + res.toISOString().substring(11, 19);
  try {
    res = new Date(current.getTime() - ms);
    result = res.toISOString().substring(0, 10) + ' ' + res.toISOString().substring(11, 19);
  } catch (e) {
    util.noop();
  }
  return result;
}

// --------------------------
// PS - services
// pass a comma separated string with services to check (mysql, apache, postgresql, ...)
// this function gives an array back, if the services are running.

function services(srv, callback) {

  // fallback - if only callback is given
  if (util.isFunction(srv) && !callback) {
    callback = srv;
    srv = '';
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      if (typeof srv !== 'string') {
        if (callback) { callback([]); }
        return resolve([]);
      }

      if (srv) {
        let srvString = '';
        srvString.__proto__.toLowerCase = util.stringToLower;
        srvString.__proto__.replace = util.stringReplace;
        srvString.__proto__.trim = util.stringTrim;

        const s = util.sanitizeShellString(srv);
        const l = util.mathMin(s.length, 2000);
        for (let i = 0; i <= l; i++) {
          if (s[i] !== undefined) {
            srvString = srvString + s[i];
          }
        }

        srvString = srvString.trim().toLowerCase().replace(/, /g, '|').replace(/,+/g, '|');
        if (srvString === '') {
          srvString = '*';
        }
        if (util.isPrototypePolluted() && srvString !== '*') {
          srvString = '------';
        }
        let srvs = srvString.split('|');
        let result = [];
        let dataSrv = [];

        if (_linux || _freebsd || _openbsd || _netbsd || _darwin) {
          if ((_linux || _freebsd || _openbsd || _netbsd) && srvString === '*') {
            try {
              const tmpsrv = execSync('systemctl --all --type=service --no-legend 2> /dev/null').toString().split('\n');
              srvs = [];
              for (const s of tmpsrv) {
                const name = s.split('.service')[0];
                if (name && s.indexOf(' not-found ') === -1) {
                  srvs.push(name.trim());
                }
              }
              srvString = srvs.join('|');
            } catch (d) {
              try {
                srvString = '';
                const tmpsrv = execSync('service --status-all 2> /dev/null').toString().split('\n');
                for (const s of tmpsrv) {
                  const parts = s.split(']');
                  if (parts.length === 2) {
                    srvString += (srvString !== '' ? '|' : '') + parts[1].trim();
                  }
                }
                srvs = srvString.split('|');
              } catch (e) {
                try {
                  const srvStr = execSync('ls /etc/init.d/ -m 2> /dev/null').toString().split('\n').join('');
                  srvString = '';
                  if (srvStr) {
                    const tmpsrv = srvStr.split(',');
                    for (const s of tmpsrv) {
                      const name = s.trim();
                      if (name) {
                        srvString += (srvString !== '' ? '|' : '') + name;
                      }
                    }
                    srvs = srvString.split('|');
                  }
                } catch (f) {
                  srvString = '';
                  srvs = [];
                }
              }
            }
          }
          if ((_darwin) && srvString === '*') { // service enumeration not yet suported on mac OS
            if (callback) { callback(result); }
            resolve(result);
          }
          let args = (_darwin) ? ['-caxo', 'pcpu,pmem,pid,command'] : ['-axo', 'pcpu,pmem,pid,command'];
          if (srvString !== '' && srvs.length > 0) {
            util.execSafe('ps', args).then((stdout) => {
              if (stdout) {
                let lines = stdout.replace(/ +/g, ' ').replace(/,+/g, '.').split('\n');
                srvs.forEach(function (srv) {
                  let ps;
                  if (_darwin) {
                    ps = lines.filter(function (e) {
                      return (e.toLowerCase().indexOf(srv) !== -1);
                    });

                  } else {
                    ps = lines.filter(function (e) {
                      return (e.toLowerCase().indexOf(' ' + srv.toLowerCase() + ':') !== -1) || (e.toLowerCase().indexOf('/' + srv.toLowerCase()) !== -1);
                    });
                  }
                  const pids = [];
                  for (const p of ps) {
                    const pid = p.trim().split(' ')[2];
                    if (pid) {
                      pids.push(parseInt(pid, 10));
                    }
                  }
                  result.push({
                    name: srv,
                    running: ps.length > 0,
                    startmode: '',
                    pids: pids,
                    cpu: parseFloat((ps.reduce(function (pv, cv) {
                      return pv + parseFloat(cv.trim().split(' ')[0]);
                    }, 0)).toFixed(2)),
                    mem: parseFloat((ps.reduce(function (pv, cv) {
                      return pv + parseFloat(cv.trim().split(' ')[1]);
                    }, 0)).toFixed(2))
                  });
                });
                if (_linux) {
                  // calc process_cpu - ps is not accurate in linux!
                  let cmd = 'cat /proc/stat | grep "cpu "';
                  for (let i in result) {
                    for (let j in result[i].pids) {
                      cmd += (';cat /proc/' + result[i].pids[j] + '/stat');
                    }
                  }
                  exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                    let curr_processes = stdout.toString().split('\n');

                    // first line (all - /proc/stat)
                    let all = parseProcStat(curr_processes.shift());

                    // process
                    let list_new = {};
                    let resultProcess = {};
                    curr_processes.forEach((element) => {
                      resultProcess = calcProcStatLinux(element, all, _services_cpu);

                      if (resultProcess.pid) {
                        let listPos = -1;
                        for (let i in result) {
                          for (let j in result[i].pids) {
                            if (parseInt(result[i].pids[j]) === parseInt(resultProcess.pid)) {
                              listPos = i;
                            }
                          }
                        }
                        if (listPos >= 0) {
                          result[listPos].cpu += resultProcess.cpuu + resultProcess.cpus;
                        }

                        // save new values
                        list_new[resultProcess.pid] = {
                          cpuu: resultProcess.cpuu,
                          cpus: resultProcess.cpus,
                          utime: resultProcess.utime,
                          stime: resultProcess.stime,
                          cutime: resultProcess.cutime,
                          cstime: resultProcess.cstime
                        };
                      }
                    });

                    // store old values
                    _services_cpu.all = all;
                    _services_cpu.list = Object.assign({}, list_new);
                    _services_cpu.ms = Date.now() - _services_cpu.ms;
                    _services_cpu.result = Object.assign({}, result);
                    if (callback) { callback(result); }
                    resolve(result);
                  });
                } else {
                  if (callback) { callback(result); }
                  resolve(result);
                }
              } else {
                args = ['-o', 'comm'];
                util.execSafe('ps', args).then((stdout) => {
                  if (stdout) {
                    let lines = stdout.replace(/ +/g, ' ').replace(/,+/g, '.').split('\n');
                    srvs.forEach(function (srv) {
                      let ps = lines.filter(function (e) {
                        return e.indexOf(srv) !== -1;
                      });
                      result.push({
                        name: srv,
                        running: ps.length > 0,
                        startmode: '',
                        cpu: 0,
                        mem: 0
                      });
                    });
                    if (callback) { callback(result); }
                    resolve(result);
                  } else {
                    srvs.forEach(function (srv) {
                      result.push({
                        name: srv,
                        running: false,
                        startmode: '',
                        cpu: 0,
                        mem: 0
                      });
                    });
                    if (callback) { callback(result); }
                    resolve(result);
                  }
                });
              }
            });
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        }
        if (_windows) {
          try {
            let wincommand = 'Get-CimInstance Win32_Service';
            if (srvs[0] !== '*') {
              wincommand += ' -Filter "';
              srvs.forEach((srv) => {
                wincommand += `Name='${srv}' or `;
              });
              wincommand = `${wincommand.slice(0, -4)}"`;
            }
            wincommand += ' | select Name,Caption,Started,StartMode,ProcessId | fl';
            util.powerShell(wincommand).then((stdout, error) => {
              if (!error) {
                let serviceSections = stdout.split(/\n\s*\n/);
                serviceSections.forEach((element) => {
                  if (element.trim() !== '') {
                    let lines = element.trim().split('\r\n');
                    let srvName = util.getValue(lines, 'Name', ':', true).toLowerCase();
                    let srvCaption = util.getValue(lines, 'Caption', ':', true).toLowerCase();
                    let started = util.getValue(lines, 'Started', ':', true);
                    let startMode = util.getValue(lines, 'StartMode', ':', true);
                    let pid = util.getValue(lines, 'ProcessId', ':', true);
                    if (srvString === '*' || srvs.indexOf(srvName) >= 0 || srvs.indexOf(srvCaption) >= 0) {
                      result.push({
                        name: srvName,
                        running: (started.toLowerCase() === 'true'),
                        startmode: startMode,
                        pids: [pid],
                        cpu: 0,
                        mem: 0
                      });
                      dataSrv.push(srvName);
                      dataSrv.push(srvCaption);
                    }
                  }

                });

                if (srvString !== '*') {
                  let srvsMissing = srvs.filter(function (e) {
                    return dataSrv.indexOf(e) === -1;
                  });
                  srvsMissing.forEach(function (srvName) {
                    result.push({
                      name: srvName,
                      running: false,
                      startmode: '',
                      pids: [],
                      cpu: 0,
                      mem: 0
                    });
                  });
                }
                if (callback) { callback(result); }
                resolve(result);
              } else {
                srvs.forEach(function (srvName) {
                  result.push({
                    name: srvName,
                    running: false,
                    startmode: '',
                    cpu: 0,
                    mem: 0
                  });
                });
                if (callback) { callback(result); }
                resolve(result);
              }
            });
          } catch (e) {
            if (callback) { callback(result); }
            resolve(result);
          }
        }
      } else {
        if (callback) { callback([]); }
        resolve([]);
      }
    });
  });
}

exports.services = services;

function parseProcStat(line) {
  let parts = line.replace(/ +/g, ' ').split(' ');
  let user = (parts.length >= 2 ? parseInt(parts[1]) : 0);
  let nice = (parts.length >= 3 ? parseInt(parts[2]) : 0);
  let system = (parts.length >= 4 ? parseInt(parts[3]) : 0);
  let idle = (parts.length >= 5 ? parseInt(parts[4]) : 0);
  let iowait = (parts.length >= 6 ? parseInt(parts[5]) : 0);
  let irq = (parts.length >= 7 ? parseInt(parts[6]) : 0);
  let softirq = (parts.length >= 8 ? parseInt(parts[7]) : 0);
  let steal = (parts.length >= 9 ? parseInt(parts[8]) : 0);
  let guest = (parts.length >= 10 ? parseInt(parts[9]) : 0);
  let guest_nice = (parts.length >= 11 ? parseInt(parts[10]) : 0);
  return user + nice + system + idle + iowait + irq + softirq + steal + guest + guest_nice;
}

function calcProcStatLinux(line, all, _cpu_old) {
  let statparts = line.replace(/ +/g, ' ').split(')');
  if (statparts.length >= 2) {
    let parts = statparts[1].split(' ');
    if (parts.length >= 16) {
      let pid = parseInt(statparts[0].split(' ')[0]);
      let utime = parseInt(parts[12]);
      let stime = parseInt(parts[13]);
      let cutime = parseInt(parts[14]);
      let cstime = parseInt(parts[15]);

      // calc
      let cpuu = 0;
      let cpus = 0;
      if (_cpu_old.all > 0 && _cpu_old.list[pid]) {
        cpuu = (utime + cutime - _cpu_old.list[pid].utime - _cpu_old.list[pid].cutime) / (all - _cpu_old.all) * 100; // user
        cpus = (stime + cstime - _cpu_old.list[pid].stime - _cpu_old.list[pid].cstime) / (all - _cpu_old.all) * 100; // system
      } else {
        cpuu = (utime + cutime) / (all) * 100; // user
        cpus = (stime + cstime) / (all) * 100; // system
      }
      return {
        pid: pid,
        utime: utime,
        stime: stime,
        cutime: cutime,
        cstime: cstime,
        cpuu: cpuu,
        cpus: cpus
      };
    } else {
      return {
        pid: 0,
        utime: 0,
        stime: 0,
        cutime: 0,
        cstime: 0,
        cpuu: 0,
        cpus: 0
      };
    }
  } else {
    return {
      pid: 0,
      utime: 0,
      stime: 0,
      cutime: 0,
      cstime: 0,
      cpuu: 0,
      cpus: 0
    };
  }
}

function calcProcStatWin(procStat, all, _cpu_old) {
  // calc
  let cpuu = 0;
  let cpus = 0;
  if (_cpu_old.all > 0 && _cpu_old.list[procStat.pid]) {
    cpuu = (procStat.utime - _cpu_old.list[procStat.pid].utime) / (all - _cpu_old.all) * 100; // user
    cpus = (procStat.stime - _cpu_old.list[procStat.pid].stime) / (all - _cpu_old.all) * 100; // system
  } else {
    cpuu = (procStat.utime) / (all) * 100; // user
    cpus = (procStat.stime) / (all) * 100; // system
  }
  return {
    pid: procStat.pid,
    utime: procStat.utime,
    stime: procStat.stime,
    cpuu: cpuu > 0 ? cpuu : 0,
    cpus: cpus > 0 ? cpus : 0
  };
}



// --------------------------
// running processes

function processes(callback) {

  let parsedhead = [];

  function getName(command) {
    command = command || '';
    let result = command.split(' ')[0];
    if (result.substr(-1) === ':') {
      result = result.substr(0, result.length - 1);
    }
    if (result.substr(0, 1) !== '[') {
      let parts = result.split('/');
      if (isNaN(parseInt(parts[parts.length - 1]))) {
        result = parts[parts.length - 1];
      } else {
        result = parts[0];
      }
    }
    return result;
  }

  function parseLine(line) {

    let offset = 0;
    let offset2 = 0;

    function checkColumn(i) {
      offset = offset2;
      if (parsedhead[i]) {
        offset2 = line.substring(parsedhead[i].to + offset, 10000).indexOf(' ');
      } else {
        offset2 = 10000;
      }
    }

    checkColumn(0);
    const pid = parseInt(line.substring(parsedhead[0].from + offset, parsedhead[0].to + offset2));
    checkColumn(1);
    const ppid = parseInt(line.substring(parsedhead[1].from + offset, parsedhead[1].to + offset2));
    checkColumn(2);
    const cpu = parseFloat(line.substring(parsedhead[2].from + offset, parsedhead[2].to + offset2).replace(/,/g, '.'));
    checkColumn(3);
    const mem = parseFloat(line.substring(parsedhead[3].from + offset, parsedhead[3].to + offset2).replace(/,/g, '.'));
    checkColumn(4);
    const priority = parseInt(line.substring(parsedhead[4].from + offset, parsedhead[4].to + offset2));
    checkColumn(5);
    const vsz = parseInt(line.substring(parsedhead[5].from + offset, parsedhead[5].to + offset2));
    checkColumn(6);
    const rss = parseInt(line.substring(parsedhead[6].from + offset, parsedhead[6].to + offset2));
    checkColumn(7);
    const nice = parseInt(line.substring(parsedhead[7].from + offset, parsedhead[7].to + offset2)) || 0;
    checkColumn(8);
    const started = !_sunos ? parseElapsedTime(line.substring(parsedhead[8].from + offset, parsedhead[8].to + offset2).trim()) : parseTimeUnix(line.substring(parsedhead[8].from + offset, parsedhead[8].to + offset2).trim());
    checkColumn(9);
    let state = line.substring(parsedhead[9].from + offset, parsedhead[9].to + offset2).trim();
    state = (state[0] === 'R' ? 'running' : (state[0] === 'S' ? 'sleeping' : (state[0] === 'T' ? 'stopped' : (state[0] === 'W' ? 'paging' : (state[0] === 'X' ? 'dead' : (state[0] === 'Z' ? 'zombie' : ((state[0] === 'D' || state[0] === 'U') ? 'blocked' : 'unknown')))))));
    checkColumn(10);
    let tty = line.substring(parsedhead[10].from + offset, parsedhead[10].to + offset2).trim();
    if (tty === '?' || tty === '??') { tty = ''; }
    checkColumn(11);
    const user = line.substring(parsedhead[11].from + offset, parsedhead[11].to + offset2).trim();
    checkColumn(12);
    let cmdPath = '';
    let command = '';
    let params = '';
    let fullcommand = line.substring(parsedhead[12].from + offset, parsedhead[12].to + offset2).trim();
    if (fullcommand.substr(fullcommand.length - 1) === ']') { fullcommand = fullcommand.slice(0, -1); }
    if (fullcommand.substr(0, 1) === '[') { command = fullcommand.substring(1); }
    else {
      const p1 = fullcommand.indexOf('(');
      const p2 = fullcommand.indexOf(')');
      const p3 = fullcommand.indexOf('/');
      const p4 = fullcommand.indexOf(':');
      if (p1 < p2 && p1 < p3 && p3 < p2) {
        command = fullcommand.split(' ')[0];
        command = command.replace(/:/g, '');
      } else {
        if (p4 > 0 && (p3 === -1 || p3 > 3)) {
          command = fullcommand.split(' ')[0];
          command = command.replace(/:/g, '');
        } else {
          // try to figure out where parameter starts
          let firstParamPos = fullcommand.indexOf(' -');
          let firstParamPathPos = fullcommand.indexOf(' /');
          firstParamPos = (firstParamPos >= 0 ? firstParamPos : 10000);
          firstParamPathPos = (firstParamPathPos >= 0 ? firstParamPathPos : 10000);
          const firstPos = Math.min(firstParamPos, firstParamPathPos);
          let tmpCommand = fullcommand.substr(0, firstPos);
          const tmpParams = fullcommand.substr(firstPos);
          const lastSlashPos = tmpCommand.lastIndexOf('/');
          if (lastSlashPos >= 0) {
            cmdPath = tmpCommand.substr(0, lastSlashPos);
            tmpCommand = tmpCommand.substr(lastSlashPos + 1);
          }

          if (firstPos === 10000 && tmpCommand.indexOf(' ') > -1) {
            const parts = tmpCommand.split(' ');
            if (fs.existsSync(path.join(cmdPath, parts[0]))) {
              command = parts.shift();
              params = (parts.join(' ') + ' ' + tmpParams).trim();
            } else {
              command = tmpCommand.trim();
              params = tmpParams.trim();
            }
          } else {
            command = tmpCommand.trim();
            params = tmpParams.trim();
          }
        }
      }

    }

    return ({
      pid: pid,
      parentPid: ppid,
      name: _linux ? getName(command) : command,
      cpu: cpu,
      cpuu: 0,
      cpus: 0,
      mem: mem,
      priority: priority,
      memVsz: vsz,
      memRss: rss,
      nice: nice,
      started: started,
      state: state,
      tty: tty,
      user: user,
      command: command,
      params: params,
      path: cmdPath
    });
  }

  function parseProcesses(lines) {
    let result = [];
    if (lines.length > 1) {
      let head = lines[0];
      parsedhead = util.parseHead(head, 8);
      lines.shift();
      lines.forEach(function (line) {
        if (line.trim() !== '') {
          result.push(parseLine(line));
        }
      });
    }
    return result;
  }
  function parseProcesses2(lines) {

    function formatDateTime(time) {
      const month = ('0' + (time.getMonth() + 1).toString()).slice(-2);
      const year = time.getFullYear().toString();
      const day = ('0' + time.getDate().toString()).slice(-2);
      const hours = ('0' + time.getHours().toString()).slice(-2);
      const mins = ('0' + time.getMinutes().toString()).slice(-2);
      const secs = ('0' + time.getSeconds().toString()).slice(-2);

      return (year + '-' + month + '-' + day + ' ' + hours + ':' + mins + ':' + secs);
    }

    function parseElapsed(etime) {
      let started = '';
      if (etime.indexOf('d') >= 0) {
        const elapsed_parts = etime.split('d');
        started = formatDateTime(new Date(Date.now() - (elapsed_parts[0] * 24 + elapsed_parts[1] * 1) * 60 * 60 * 1000));
      } else if (etime.indexOf('h') >= 0) {
        const elapsed_parts = etime.split('h');
        started = formatDateTime(new Date(Date.now() - (elapsed_parts[0] * 60 + elapsed_parts[1] * 1) * 60 * 1000));
      } else if (etime.indexOf(':') >= 0) {
        const elapsed_parts = etime.split(':');
        started = formatDateTime(new Date(Date.now() - (elapsed_parts.length > 1 ? (elapsed_parts[0] * 60 + elapsed_parts[1]) * 1000 : elapsed_parts[0] * 1000)));
      }
      return started;
    }

    let result = [];
    lines.forEach(function (line) {
      if (line.trim() !== '') {
        line = line.trim().replace(/ +/g, ' ').replace(/,+/g, '.');
        const parts = line.split(' ');
        const command = parts.slice(9).join(' ');
        const pmem = parseFloat((1.0 * parseInt(parts[3]) * 1024 / os.totalmem()).toFixed(1));
        const started = parseElapsed(parts[5]);

        result.push({
          pid: parseInt(parts[0]),
          parentPid: parseInt(parts[1]),
          name: getName(command),
          cpu: 0,
          cpuu: 0,
          cpus: 0,
          mem: pmem,
          priority: 0,
          memVsz: parseInt(parts[2]),
          memRss: parseInt(parts[3]),
          nice: parseInt(parts[4]),
          started: started,
          state: (parts[6] === 'R' ? 'running' : (parts[6] === 'S' ? 'sleeping' : (parts[6] === 'T' ? 'stopped' : (parts[6] === 'W' ? 'paging' : (parts[6] === 'X' ? 'dead' : (parts[6] === 'Z' ? 'zombie' : ((parts[6] === 'D' || parts[6] === 'U') ? 'blocked' : 'unknown'))))))),
          tty: parts[7],
          user: parts[8],
          command: command
        });
      }
    });
    return result;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        all: 0,
        running: 0,
        blocked: 0,
        sleeping: 0,
        unknown: 0,
        list: []
      };

      let cmd = '';

      if ((_processes_cpu.ms && Date.now() - _processes_cpu.ms >= 500) || _processes_cpu.ms === 0) {
        if (_linux || _freebsd || _openbsd || _netbsd || _darwin || _sunos) {
          if (_linux) { cmd = 'export LC_ALL=C; ps -axo pid:11,ppid:11,pcpu:6,pmem:6,pri:5,vsz:11,rss:11,ni:5,etime:30,state:5,tty:15,user:20,command; unset LC_ALL'; }
          if (_freebsd || _openbsd || _netbsd) { cmd = 'export LC_ALL=C; ps -axo pid,ppid,pcpu,pmem,pri,vsz,rss,ni,etime,state,tty,user,command; unset LC_ALL'; }
          if (_darwin) { cmd = 'ps -axo pid,ppid,pcpu,pmem,pri,vsz=temp_title_1,rss=temp_title_2,nice,etime=temp_title_3,state,tty,user,command -r'; }
          if (_sunos) { cmd = 'ps -Ao pid,ppid,pcpu,pmem,pri,vsz,rss,nice,stime,s,tty,user,comm'; }
          exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
            if (!error && stdout.toString().trim()) {
              result.list = (parseProcesses(stdout.toString().split('\n'))).slice();
              result.all = result.list.length;
              result.running = result.list.filter(function (e) {
                return e.state === 'running';
              }).length;
              result.blocked = result.list.filter(function (e) {
                return e.state === 'blocked';
              }).length;
              result.sleeping = result.list.filter(function (e) {
                return e.state === 'sleeping';
              }).length;

              if (_linux) {
                // calc process_cpu - ps is not accurate in linux!
                cmd = 'cat /proc/stat | grep "cpu "';
                result.list.forEach((element) => {
                  cmd += (';cat /proc/' + element.pid + '/stat');
                });
                exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                  let curr_processes = stdout.toString().split('\n');

                  // first line (all - /proc/stat)
                  let all = parseProcStat(curr_processes.shift());

                  // process
                  let list_new = {};
                  let resultProcess = {};
                  curr_processes.forEach((element) => {
                    resultProcess = calcProcStatLinux(element, all, _processes_cpu);

                    if (resultProcess.pid) {

                      // store pcpu in outer array
                      let listPos = result.list.map(function (e) { return e.pid; }).indexOf(resultProcess.pid);
                      if (listPos >= 0) {
                        result.list[listPos].cpu = resultProcess.cpuu + resultProcess.cpus;
                        result.list[listPos].cpuu = resultProcess.cpuu;
                        result.list[listPos].cpus = resultProcess.cpus;
                      }

                      // save new values
                      list_new[resultProcess.pid] = {
                        cpuu: resultProcess.cpuu,
                        cpus: resultProcess.cpus,
                        utime: resultProcess.utime,
                        stime: resultProcess.stime,
                        cutime: resultProcess.cutime,
                        cstime: resultProcess.cstime
                      };
                    }
                  });

                  // store old values
                  _processes_cpu.all = all;
                  _processes_cpu.list = Object.assign({}, list_new);
                  _processes_cpu.ms = Date.now() - _processes_cpu.ms;
                  _processes_cpu.result = Object.assign({}, result);
                  if (callback) { callback(result); }
                  resolve(result);
                });
              } else {
                if (callback) { callback(result); }
                resolve(result);
              }
            } else {
              cmd = 'ps -o pid,ppid,vsz,rss,nice,etime,stat,tty,user,comm';
              if (_sunos) {
                cmd = 'ps -o pid,ppid,vsz,rss,nice,etime,s,tty,user,comm';
              }
              exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                if (!error) {
                  let lines = stdout.toString().split('\n');
                  lines.shift();

                  result.list = parseProcesses2(lines).slice();
                  result.all = result.list.length;
                  result.running = result.list.filter(function (e) {
                    return e.state === 'running';
                  }).length;
                  result.blocked = result.list.filter(function (e) {
                    return e.state === 'blocked';
                  }).length;
                  result.sleeping = result.list.filter(function (e) {
                    return e.state === 'sleeping';
                  }).length;
                  if (callback) { callback(result); }
                  resolve(result);
                } else {
                  if (callback) { callback(result); }
                  resolve(result);
                }
              });
            }
          });
        } else if (_windows) {
          try {
            util.powerShell('Get-CimInstance Win32_Process | select-Object ProcessId,ParentProcessId,ExecutionState,Caption,CommandLine,ExecutablePath,UserModeTime,KernelModeTime,WorkingSetSize,Priority,PageFileUsage, @{n="CreationDate";e={$_.CreationDate.ToString("yyyy-MM-dd HH:mm:ss")}} | fl').then((stdout, error) => {
              if (!error) {
                let processSections = stdout.split(/\n\s*\n/);
                let procs = [];
                let procStats = [];
                let list_new = {};
                let allcpuu = 0;
                let allcpus = 0;
                processSections.forEach((element) => {
                  if (element.trim() !== '') {
                    let lines = element.trim().split('\r\n');
                    let pid = parseInt(util.getValue(lines, 'ProcessId', ':', true), 10);
                    let parentPid = parseInt(util.getValue(lines, 'ParentProcessId', ':', true), 10);
                    let statusValue = util.getValue(lines, 'ExecutionState', ':');
                    let name = util.getValue(lines, 'Caption', ':', true);
                    let commandLine = util.getValue(lines, 'CommandLine', ':', true);
                    // get additional command line data
                    let additionalCommand = false;
                    lines.forEach((line) => {
                      if (additionalCommand && line.toLowerCase().startsWith(' ')) {
                        commandLine += ' ' + line.trim();
                      } else {
                        additionalCommand = false;
                      }
                      if (line.toLowerCase().startsWith('commandline')) {
                        additionalCommand = true;
                      }
                    });
                    let commandPath = util.getValue(lines, 'ExecutablePath', ':', true);
                    let utime = parseInt(util.getValue(lines, 'UserModeTime', ':', true), 10);
                    let stime = parseInt(util.getValue(lines, 'KernelModeTime', ':', true), 10);
                    let memw = parseInt(util.getValue(lines, 'WorkingSetSize', ':', true), 10);
                    allcpuu = allcpuu + utime;
                    allcpus = allcpus + stime;
                    result.all++;
                    if (!statusValue) { result.unknown++; }
                    if (statusValue === '3') { result.running++; }
                    if (statusValue === '4' || statusValue === '5') { result.blocked++; }

                    procStats.push({
                      pid: pid,
                      utime: utime,
                      stime: stime,
                      cpu: 0,
                      cpuu: 0,
                      cpus: 0,
                    });
                    procs.push({
                      pid: pid,
                      parentPid: parentPid,
                      name: name,
                      cpu: 0,
                      cpuu: 0,
                      cpus: 0,
                      mem: memw / os.totalmem() * 100,
                      priority: parseInt(util.getValue(lines, 'Priority', ':', true), 10),
                      memVsz: parseInt(util.getValue(lines, 'PageFileUsage', ':', true), 10),
                      memRss: Math.floor(parseInt(util.getValue(lines, 'WorkingSetSize', ':', true), 10) / 1024),
                      nice: 0,
                      started: util.getValue(lines, 'CreationDate', ':', true),
                      state: (!statusValue ? _winStatusValues[0] : _winStatusValues[statusValue]),
                      tty: '',
                      user: '',
                      command: commandLine || name,
                      path: commandPath,
                      params: ''
                    });
                  }
                });

                result.sleeping = result.all - result.running - result.blocked - result.unknown;
                result.list = procs;
                procStats.forEach((element) => {
                  let resultProcess = calcProcStatWin(element, allcpuu + allcpus, _processes_cpu);

                  // store pcpu in outer array
                  let listPos = result.list.map(function (e) { return e.pid; }).indexOf(resultProcess.pid);
                  if (listPos >= 0) {
                    result.list[listPos].cpu = resultProcess.cpuu + resultProcess.cpus;
                    result.list[listPos].cpuu = resultProcess.cpuu;
                    result.list[listPos].cpus = resultProcess.cpus;
                  }

                  // save new values
                  list_new[resultProcess.pid] = {
                    cpuu: resultProcess.cpuu,
                    cpus: resultProcess.cpus,
                    utime: resultProcess.utime,
                    stime: resultProcess.stime
                  };
                });

                // store old values
                _processes_cpu.all = allcpuu + allcpus;
                _processes_cpu.all_utime = allcpuu;
                _processes_cpu.all_stime = allcpus;
                _processes_cpu.list = Object.assign({}, list_new);
                _processes_cpu.ms = Date.now() - _processes_cpu.ms;
                _processes_cpu.result = Object.assign({}, result);
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } catch (e) {
            if (callback) { callback(result); }
            resolve(result);
          }
        } else {
          if (callback) { callback(result); }
          resolve(result);
        }
      } else {
        if (callback) { callback(_processes_cpu.result); }
        resolve(_processes_cpu.result);
      }
    });
  });
}

exports.processes = processes;

// --------------------------
// PS - process load
// get detailed information about a certain process
// (PID, CPU-Usage %, Mem-Usage %)

function processLoad(proc, callback) {

  // fallback - if only callback is given
  if (util.isFunction(proc) && !callback) {
    callback = proc;
    proc = '';
  }

  return new Promise((resolve) => {
    process.nextTick(() => {

      proc = proc || '';

      if (typeof proc !== 'string') {
        if (callback) { callback([]); }
        return resolve([]);
      }

      let processesString = '';
      processesString.__proto__.toLowerCase = util.stringToLower;
      processesString.__proto__.replace = util.stringReplace;
      processesString.__proto__.trim = util.stringTrim;

      const s = util.sanitizeShellString(proc);
      const l = util.mathMin(s.length, 2000);

      for (let i = 0; i <= l; i++) {
        if (s[i] !== undefined) {
          processesString = processesString + s[i];
        }
      }

      processesString = processesString.trim().toLowerCase().replace(/, /g, '|').replace(/,+/g, '|');
      if (processesString === '') {
        processesString = '*';
      }
      if (util.isPrototypePolluted() && processesString !== '*') {
        processesString = '------';
      }
      let processes = processesString.split('|');
      let result = [];

      const procSanitized = util.isPrototypePolluted() ? '' : util.sanitizeShellString(proc);

      // from here new
      // let result = {
      //   'proc': procSanitized,
      //   'pid': null,
      //   'cpu': 0,
      //   'mem': 0
      // };
      if (procSanitized && processes.length && processes[0] !== '------') {
        if (_windows) {
          try {
            util.powerShell('Get-CimInstance Win32_Process | select ProcessId,Caption,UserModeTime,KernelModeTime,WorkingSetSize | fl').then((stdout, error) => {
              if (!error) {
                let processSections = stdout.split(/\n\s*\n/);
                let procStats = [];
                let list_new = {};
                let allcpuu = 0;
                let allcpus = 0;

                // go through all processes
                processSections.forEach((element) => {
                  if (element.trim() !== '') {
                    let lines = element.trim().split('\r\n');
                    let pid = parseInt(util.getValue(lines, 'ProcessId', ':', true), 10);
                    let name = util.getValue(lines, 'Caption', ':', true);
                    let utime = parseInt(util.getValue(lines, 'UserModeTime', ':', true), 10);
                    let stime = parseInt(util.getValue(lines, 'KernelModeTime', ':', true), 10);
                    let mem = parseInt(util.getValue(lines, 'WorkingSetSize', ':', true), 10);
                    allcpuu = allcpuu + utime;
                    allcpus = allcpus + stime;

                    procStats.push({
                      pid: pid,
                      name,
                      utime: utime,
                      stime: stime,
                      cpu: 0,
                      cpuu: 0,
                      cpus: 0,
                      mem
                    });
                    let pname = '';
                    let inList = false;
                    processes.forEach(function (proc) {
                      if (name.toLowerCase().indexOf(proc.toLowerCase()) >= 0 && !inList) {
                        inList = true;
                        pname = proc;
                      }
                    });

                    if (processesString === '*' || inList) {
                      let processFound = false;
                      result.forEach(function (item) {
                        if (item.proc.toLowerCase() === pname.toLowerCase()) {
                          item.pids.push(pid);
                          item.mem += mem / os.totalmem() * 100;
                          processFound = true;
                        }
                      });
                      if (!processFound) {
                        result.push({
                          proc: pname,
                          pid: pid,
                          pids: [pid],
                          cpu: 0,
                          mem: mem / os.totalmem() * 100
                        });
                      }
                    }
                  }
                });

                // add missing processes
                if (processesString !== '*') {
                  let processesMissing = processes.filter(function (name) {
                    return procStats.filter(function (item) { return item.name.toLowerCase().indexOf(name) >= 0; }).length === 0;

                  });
                  processesMissing.forEach(function (procName) {
                    result.push({
                      proc: procName,
                      pid: null,
                      pids: [],
                      cpu: 0,
                      mem: 0
                    });
                  });
                }

                // calculate proc stats for each proc
                procStats.forEach((element) => {
                  let resultProcess = calcProcStatWin(element, allcpuu + allcpus, _process_cpu);

                  let listPos = -1;
                  for (let j = 0; j < result.length; j++) {
                    if (result[j].pid === resultProcess.pid || result[j].pids.indexOf(resultProcess.pid) >= 0) { listPos = j; }
                  }
                  if (listPos >= 0) {
                    result[listPos].cpu += resultProcess.cpuu + resultProcess.cpus;
                  }

                  // save new values
                  list_new[resultProcess.pid] = {
                    cpuu: resultProcess.cpuu,
                    cpus: resultProcess.cpus,
                    utime: resultProcess.utime,
                    stime: resultProcess.stime
                  };
                });

                // store old values
                _process_cpu.all = allcpuu + allcpus;
                _process_cpu.all_utime = allcpuu;
                _process_cpu.all_stime = allcpus;
                _process_cpu.list = Object.assign({}, list_new);
                _process_cpu.ms = Date.now() - _process_cpu.ms;
                _process_cpu.result = JSON.parse(JSON.stringify(result));
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            });
          } catch (e) {
            if (callback) { callback(result); }
            resolve(result);
          }
        }

        if (_darwin || _linux || _freebsd || _openbsd || _netbsd) {
          const params = ['-axo', 'pid,ppid,pcpu,pmem,comm'];
          util.execSafe('ps', params).then((stdout) => {
            if (stdout) {
              let procStats = [];
              let lines = stdout.toString().split('\n').filter(function (line) {
                if (processesString === '*') { return true; }
                if (line.toLowerCase().indexOf('grep') !== -1) { return false; } // remove this??
                let found = false;
                processes.forEach(function (item) {
                  found = found || (line.toLowerCase().indexOf(item.toLowerCase()) >= 0);
                });
                return found;
              });

              lines.forEach(function (line) {
                let data = line.trim().replace(/ +/g, ' ').split(' ');
                if (data.length > 4) {
                  procStats.push({
                    name: data[4].substring(data[4].lastIndexOf('/') + 1),
                    pid: parseInt(data[0]) || 0,
                    ppid: parseInt(data[1]) || 0,
                    cpu: parseFloat(data[2].replace(',', '.')),
                    mem: parseFloat(data[3].replace(',', '.'))
                  });
                }
              });

              procStats.forEach(function (item) {
                let listPos = -1;
                let inList = false;
                let name = '';
                for (let j = 0; j < result.length; j++) {
                  if (item.name.toLowerCase().indexOf(result[j].proc.toLowerCase()) >= 0) {
                    listPos = j;
                  }
                }
                processes.forEach(function (proc) {

                  if (item.name.toLowerCase().indexOf(proc.toLowerCase()) >= 0 && !inList) {
                    inList = true;
                    name = proc;
                  }
                });
                if ((processesString === '*') || inList) {
                  if (listPos < 0) {
                    result.push({
                      proc: name,
                      pid: item.pid,
                      pids: [item.pid],
                      cpu: item.cpu,
                      mem: item.mem
                    });
                  } else {
                    if (item.ppid < 10) {
                      result[listPos].pid = item.pid;
                    }
                    result[listPos].pids.push(item.pid);
                    result[listPos].cpu += item.cpu;
                    result[listPos].mem += item.mem;
                  }
                }
              });

              if (processesString !== '*') {
                // add missing processes
                let processesMissing = processes.filter(function (name) {
                  return procStats.filter(function (item) { return item.name.toLowerCase().indexOf(name) >= 0; }).length === 0;
                });
                processesMissing.forEach(function (procName) {
                  result.push({
                    proc: procName,
                    pid: null,
                    pids: [],
                    cpu: 0,
                    mem: 0
                  });
                });
              }
              if (_linux) {
                // calc process_cpu - ps is not accurate in linux!
                result.forEach(function (item) {
                  item.cpu = 0;
                });
                let cmd = 'cat /proc/stat | grep "cpu "';
                for (let i in result) {
                  for (let j in result[i].pids) {
                    cmd += (';cat /proc/' + result[i].pids[j] + '/stat');
                  }
                }
                exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                  let curr_processes = stdout.toString().split('\n');

                  // first line (all - /proc/stat)
                  let all = parseProcStat(curr_processes.shift());

                  // process
                  let list_new = {};
                  let resultProcess = {};
                  curr_processes.forEach((element) => {
                    resultProcess = calcProcStatLinux(element, all, _process_cpu);

                    if (resultProcess.pid) {

                      // find result item
                      let resultItemId = -1;
                      for (let i in result) {
                        if (result[i].pids.indexOf(resultProcess.pid) >= 0) {
                          resultItemId = i;
                        }
                      }
                      // store pcpu in outer result
                      if (resultItemId >= 0) {
                        result[resultItemId].cpu += resultProcess.cpuu + resultProcess.cpus;
                      }

                      // save new values
                      list_new[resultProcess.pid] = {
                        cpuu: resultProcess.cpuu,
                        cpus: resultProcess.cpus,
                        utime: resultProcess.utime,
                        stime: resultProcess.stime,
                        cutime: resultProcess.cutime,
                        cstime: resultProcess.cstime
                      };
                    }
                  });

                  result.forEach(function (item) {
                    item.cpu = Math.round(item.cpu * 100) / 100;
                  });

                  _process_cpu.all = all;
                  _process_cpu.list = Object.assign({}, list_new);
                  _process_cpu.ms = Date.now() - _process_cpu.ms;
                  _process_cpu.result = Object.assign({}, result);
                  if (callback) { callback(result); }
                  resolve(result);
                });
              } else {
                if (callback) { callback(result); }
                resolve(result);
              }
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          });
        }
      }
    });
  });
}

exports.processLoad = processLoad;


/***/ }),

/***/ 8935:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// system.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 2. System (Hardware, BIOS, Base Board)
// ----------------------------------------------------------------------------------

const fs = __nccwpck_require__(7147);
const os = __nccwpck_require__(2037);
const util = __nccwpck_require__(7146);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const execPromise = util.promisify((__nccwpck_require__(2081).exec));

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function system(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        manufacturer: '',
        model: 'Computer',
        version: '',
        serial: '-',
        uuid: '-',
        sku: '-',
        virtual: false
      };

      if (_linux || _freebsd || _openbsd || _netbsd) {
        exec('export LC_ALL=C; dmidecode -t system 2>/dev/null; unset LC_ALL', function (error, stdout) {
          let lines = stdout.toString().split('\n');
          result.manufacturer = util.getValue(lines, 'manufacturer');
          result.model = util.getValue(lines, 'product name');
          result.version = util.getValue(lines, 'version');
          result.serial = util.getValue(lines, 'serial number');
          result.uuid = util.getValue(lines, 'uuid').toLowerCase();
          result.sku = util.getValue(lines, 'sku number');
          // Non-Root values
          const cmd = `echo -n "product_name: "; cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null; echo;
            echo -n "product_serial: "; cat /sys/devices/virtual/dmi/id/product_serial 2>/dev/null; echo;
            echo -n "product_uuid: "; cat /sys/devices/virtual/dmi/id/product_uuid 2>/dev/null; echo;
            echo -n "product_version: "; cat /sys/devices/virtual/dmi/id/product_version 2>/dev/null; echo;
            echo -n "sys_vendor: "; cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null; echo;`;
          try {
            lines = execSync(cmd).toString().split('\n');
            result.manufacturer = result.manufacturer === '' ? util.getValue(lines, 'sys_vendor') : result.manufacturer;
            result.model = result.model === '' ? util.getValue(lines, 'product_name') : result.model;
            result.version = result.version === '' ? util.getValue(lines, 'product_version') : result.version;
            result.serial = result.serial === '' ? util.getValue(lines, 'product_serial') : result.serial;
            result.uuid = result.uuid === '' ? util.getValue(lines, 'product_uuid').toLowerCase() : result.uuid;
          } catch (e) {
            util.noop();
          }
          if (!result.serial || result.serial.toLowerCase().indexOf('o.e.m.') !== -1) { result.serial = '-'; }
          if (!result.manufacturer || result.manufacturer.toLowerCase().indexOf('o.e.m.') !== -1) { result.manufacturer = ''; }
          if (!result.model || result.model.toLowerCase().indexOf('o.e.m.') !== -1) { result.model = 'Computer'; }
          if (!result.version || result.version.toLowerCase().indexOf('o.e.m.') !== -1) { result.version = ''; }
          if (!result.sku || result.sku.toLowerCase().indexOf('o.e.m.') !== -1) { result.sku = '-'; }

          // detect virtual (1)
          if (result.model.toLowerCase() === 'virtualbox' || result.model.toLowerCase() === 'kvm' || result.model.toLowerCase() === 'virtual machine' || result.model.toLowerCase() === 'bochs' || result.model.toLowerCase().startsWith('vmware') || result.model.toLowerCase().startsWith('droplet')) {
            result.virtual = true;
            switch (result.model.toLowerCase()) {
              case 'virtualbox':
                result.virtualHost = 'VirtualBox';
                break;
              case 'vmware':
                result.virtualHost = 'VMware';
                break;
              case 'kvm':
                result.virtualHost = 'KVM';
                break;
              case 'bochs':
                result.virtualHost = 'bochs';
                break;
            }
          }
          if (result.manufacturer.toLowerCase().startsWith('vmware') || result.manufacturer.toLowerCase() === 'xen') {
            result.virtual = true;
            switch (result.manufacturer.toLowerCase()) {
              case 'vmware':
                result.virtualHost = 'VMware';
                break;
              case 'xen':
                result.virtualHost = 'Xen';
                break;
            }
          }
          if (!result.virtual) {
            try {
              const disksById = execSync('ls -1 /dev/disk/by-id/ 2>/dev/null').toString();
              if (disksById.indexOf('_QEMU_') >= 0) {
                result.virtual = true;
                result.virtualHost = 'QEMU';
              }
              if (disksById.indexOf('_VBOX_') >= 0) {
                result.virtual = true;
                result.virtualHost = 'VirtualBox';
              }
            } catch (e) {
              util.noop();
            }
          }
          if (!result.virtual && (os.release().toLowerCase().indexOf('microsoft') >= 0 || os.release().toLowerCase().endsWith('wsl2'))) {
            const kernelVersion = parseFloat(os.release().toLowerCase());
            result.virtual = true;
            result.manufacturer = 'Microsoft';
            result.model = 'WSL';
            result.version = kernelVersion < 4.19 ? '1' : '2';
          }
          if ((_freebsd || _openbsd || _netbsd) && !result.virtualHost) {
            try {
              const procInfo = execSync('dmidecode -t 4');
              const procLines = procInfo.toString().split('\n');
              const procManufacturer = util.getValue(procLines, 'manufacturer', ':', true);
              switch (procManufacturer.toLowerCase()) {
                case 'virtualbox':
                  result.virtualHost = 'VirtualBox';
                  break;
                case 'vmware':
                  result.virtualHost = 'VMware';
                  break;
                case 'kvm':
                  result.virtualHost = 'KVM';
                  break;
                case 'bochs':
                  result.virtualHost = 'bochs';
                  break;
              }
            } catch (e) {
              util.noop();
            }
          }
          // detect docker
          if (fs.existsSync('/.dockerenv') || fs.existsSync('/.dockerinit')) {
            result.model = 'Docker Container';
          }
          try {
            const stdout = execSync('dmesg 2>/dev/null | grep -iE "virtual|hypervisor" | grep -iE "vmware|qemu|kvm|xen" | grep -viE "Nested Virtualization|/virtual/"');
            // detect virtual machines
            let lines = stdout.toString().split('\n');
            if (lines.length > 0) {
              if (result.model === 'Computer') { result.model = 'Virtual machine'; }
              result.virtual = true;
              if (stdout.toString().toLowerCase().indexOf('vmware') >= 0 && !result.virtualHost) {
                result.virtualHost = 'VMware';
              }
              if (stdout.toString().toLowerCase().indexOf('qemu') >= 0 && !result.virtualHost) {
                result.virtualHost = 'QEMU';
              }
              if (stdout.toString().toLowerCase().indexOf('xen') >= 0 && !result.virtualHost) {
                result.virtualHost = 'Xen';
              }
              if (stdout.toString().toLowerCase().indexOf('kvm') >= 0 && !result.virtualHost) {
                result.virtualHost = 'KVM';
              }
            }
          } catch (e) {
            util.noop();
          }

          if (result.manufacturer === '' && result.model === 'Computer' && result.version === '') {
            // Check Raspberry Pi
            fs.readFile('/proc/cpuinfo', function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                result.model = util.getValue(lines, 'hardware', ':', true).toUpperCase();
                result.version = util.getValue(lines, 'revision', ':', true).toLowerCase();
                result.serial = util.getValue(lines, 'serial', ':', true);
                const model = util.getValue(lines, 'model:', ':', true);
                // reference values: https://elinux.org/RPi_HardwareHistory
                // https://www.raspberrypi.org/documentation/hardware/raspberrypi/revision-codes/README.md
                if ((result.model === 'BCM2835' || result.model === 'BCM2708' || result.model === 'BCM2709' || result.model === 'BCM2710' || result.model === 'BCM2711' || result.model === 'BCM2836' || result.model === 'BCM2837') && model.toLowerCase().indexOf('raspberry') >= 0) {
                  const rPIRevision = util.decodePiCpuinfo(lines);
                  result.model = rPIRevision.model;
                  result.version = rPIRevision.revisionCode;
                  result.manufacturer = 'Raspberry Pi Foundation';
                  result.raspberry = {
                    manufacturer: rPIRevision.manufacturer,
                    processor: rPIRevision.processor,
                    type: rPIRevision.type,
                    revision: rPIRevision.revision
                  };
                }
              }
              if (callback) { callback(result); }
              resolve(result);
            });
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        });
      }
      if (_darwin) {
        exec('ioreg -c IOPlatformExpertDevice -d 2', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().replace(/[<>"]/g, '').split('\n');
            const model = util.splitByNumber(util.getValue(lines, 'model', '=', true));
            const version = util.getValue(lines, 'version', '=', true);
            result.manufacturer = util.getValue(lines, 'manufacturer', '=', true);
            result.model = version ? util.getValue(lines, 'model', '=', true) : model[0];
            result.version = version || model[1];
            result.serial = util.getValue(lines, 'ioplatformserialnumber', '=', true);
            result.uuid = util.getValue(lines, 'ioplatformuuid', '=', true).toLowerCase();
            result.sku = util.getValue(lines, 'board-id', '=', true) || util.getValue(lines, 'target-sub-type', '=', true);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          util.powerShell('Get-CimInstance Win32_ComputerSystemProduct | select Name,Vendor,Version,IdentifyingNumber,UUID | fl').then((stdout, error) => {
            if (!error) {
              let lines = stdout.split('\r\n');
              result.manufacturer = util.getValue(lines, 'vendor', ':');
              result.model = util.getValue(lines, 'name', ':');
              result.version = util.getValue(lines, 'version', ':');
              result.serial = util.getValue(lines, 'identifyingnumber', ':');
              result.uuid = util.getValue(lines, 'uuid', ':').toLowerCase();
              // detect virtual (1)
              const model = result.model.toLowerCase();
              if (model === 'virtualbox' || model === 'kvm' || model === 'virtual machine' || model === 'bochs' || model.startsWith('vmware') || model.startsWith('qemu') || model.startsWith('parallels')) {
                result.virtual = true;
                if (model.startsWith('virtualbox')) { result.virtualHost = 'VirtualBox'; }
                if (model.startsWith('vmware')) { result.virtualHost = 'VMware'; }
                if (model.startsWith('kvm')) { result.virtualHost = 'KVM'; }
                if (model.startsWith('bochs')) { result.virtualHost = 'bochs'; }
                if (model.startsWith('qemu')) { result.virtualHost = 'KVM'; }
                if (model.startsWith('parallels')) { result.virtualHost = 'Parallels'; }
              }
              const manufacturer = result.manufacturer.toLowerCase();
              if (manufacturer.startsWith('vmware') || manufacturer.startsWith('qemu') || manufacturer === 'xen' || manufacturer.startsWith('parallels')) {
                result.virtual = true;
                if (manufacturer.startsWith('vmware')) { result.virtualHost = 'VMware'; }
                if (manufacturer.startsWith('xen')) { result.virtualHost = 'Xen'; }
                if (manufacturer.startsWith('qemu')) { result.virtualHost = 'KVM'; }
                if (manufacturer.startsWith('parallels')) { result.virtualHost = 'Parallels'; }
              }
              util.powerShell('Get-CimInstance MS_Systeminformation -Namespace "root/wmi" | select systemsku | fl ').then((stdout, error) => {
                if (!error) {
                  let lines = stdout.split('\r\n');
                  result.sku = util.getValue(lines, 'systemsku', ':');
                }
                if (!result.virtual) {
                  util.powerShell('Get-CimInstance Win32_bios | select Version, SerialNumber, SMBIOSBIOSVersion').then((stdout, error) => {
                    if (!error) {
                      let lines = stdout.toString();
                      if (lines.indexOf('VRTUAL') >= 0 || lines.indexOf('A M I ') >= 0 || lines.indexOf('VirtualBox') >= 0 || lines.indexOf('VMWare') >= 0 || lines.indexOf('Xen') >= 0 || lines.indexOf('Parallels') >= 0) {
                        result.virtual = true;
                        if (lines.indexOf('VirtualBox') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'VirtualBox';
                        }
                        if (lines.indexOf('VMware') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'VMware';
                        }
                        if (lines.indexOf('Xen') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'Xen';
                        }
                        if (lines.indexOf('VRTUAL') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'Hyper-V';
                        }
                        if (lines.indexOf('A M I') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'Virtual PC';
                        }
                        if (lines.indexOf('Parallels') >= 0 && !result.virtualHost) {
                          result.virtualHost = 'Parallels';
                        }
                      }
                      if (callback) { callback(result); }
                      resolve(result);
                    } else {
                      if (callback) { callback(result); }
                      resolve(result);
                    }
                  });
                } else {
                  if (callback) { callback(result); }
                  resolve(result);
                }
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.system = system;

function cleanDefaults(s) {
  const cmpStr = s.toLowerCase();
  if (cmpStr.indexOf('o.e.m.') === -1 && cmpStr.indexOf('default string') === -1 && cmpStr !== 'default') {
    return s || '';
  }
  return '';
}
function bios(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        vendor: '',
        version: '',
        releaseDate: '',
        revision: '',
      };
      let cmd = '';
      if (_linux || _freebsd || _openbsd || _netbsd) {
        if (process.arch === 'arm') {
          cmd = 'cat /proc/cpuinfo | grep Serial';
        } else {
          cmd = 'export LC_ALL=C; dmidecode -t bios 2>/dev/null; unset LC_ALL';
        }
        exec(cmd, function (error, stdout) {
          let lines = stdout.toString().split('\n');
          result.vendor = util.getValue(lines, 'Vendor');
          result.version = util.getValue(lines, 'Version');
          let datetime = util.getValue(lines, 'Release Date');
          result.releaseDate = util.parseDateTime(datetime).date;
          result.revision = util.getValue(lines, 'BIOS Revision');
          result.serial = util.getValue(lines, 'SerialNumber');
          let language = util.getValue(lines, 'Currently Installed Language').split('|')[0];
          if (language) {
            result.language = language;
          }
          if (lines.length && stdout.toString().indexOf('Characteristics:') >= 0) {
            const features = [];
            lines.forEach(line => {
              if (line.indexOf(' is supported') >= 0) {
                const feature = line.split(' is supported')[0].trim();
                features.push(feature);
              }
            });
            result.features = features;
          }
          // Non-Root values
          const cmd = `echo -n "bios_date: "; cat /sys/devices/virtual/dmi/id/bios_date 2>/dev/null; echo;
            echo -n "bios_vendor: "; cat /sys/devices/virtual/dmi/id/bios_vendor 2>/dev/null; echo;
            echo -n "bios_version: "; cat /sys/devices/virtual/dmi/id/bios_version 2>/dev/null; echo;`;
          try {
            lines = execSync(cmd).toString().split('\n');
            result.vendor = !result.vendor ? util.getValue(lines, 'bios_vendor') : result.vendor;
            result.version = !result.version ? util.getValue(lines, 'bios_version') : result.version;
            datetime = util.getValue(lines, 'bios_date');
            result.releaseDate = !result.releaseDate ? util.parseDateTime(datetime).date : result.releaseDate;
          } catch (e) {
            util.noop();
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        result.vendor = 'Apple Inc.';
        exec(
          'system_profiler SPHardwareDataType -json', function (error, stdout) {
            try {
              const hardwareData = JSON.parse(stdout.toString());
              if (hardwareData && hardwareData.SPHardwareDataType && hardwareData.SPHardwareDataType.length) {
                let bootRomVersion = hardwareData.SPHardwareDataType[0].boot_rom_version;
                bootRomVersion = bootRomVersion ? bootRomVersion.split('(')[0].trim() : null;
                result.version = bootRomVersion;
              }
            } catch (e) {
              util.noop();
            }
            if (callback) { callback(result); }
            resolve(result);
          });
      }
      if (_sunos) {
        result.vendor = 'Sun Microsystems';
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          util.powerShell('Get-CimInstance Win32_bios | select Description,Version,Manufacturer,@{n="ReleaseDate";e={$_.ReleaseDate.ToString("yyyy-MM-dd")}},BuildNumber,SerialNumber,SMBIOSBIOSVersion | fl').then((stdout, error) => {
            if (!error) {
              let lines = stdout.toString().split('\r\n');
              const description = util.getValue(lines, 'description', ':');
              const version = util.getValue(lines, 'SMBIOSBIOSVersion', ':');
              if (description.indexOf(' Version ') !== -1) {
                // ... Phoenix ROM BIOS PLUS Version 1.10 A04
                result.vendor = description.split(' Version ')[0].trim();
                result.version = description.split(' Version ')[1].trim();
              } else if (description.indexOf(' Ver: ') !== -1) {
                // ... BIOS Date: 06/27/16 17:50:16 Ver: 1.4.5
                result.vendor = util.getValue(lines, 'manufacturer', ':');
                result.version = description.split(' Ver: ')[1].trim();
              } else {
                result.vendor = util.getValue(lines, 'manufacturer', ':');
                result.version = version || util.getValue(lines, 'version', ':');
              }
              result.releaseDate = util.getValue(lines, 'releasedate', ':');
              result.revision = util.getValue(lines, 'buildnumber', ':');
              result.serial = cleanDefaults(util.getValue(lines, 'serialnumber', ':'));
            }

            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.bios = bios;

function baseboard(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        manufacturer: '',
        model: '',
        version: '',
        serial: '-',
        assetTag: '-',
        memMax: null,
        memSlots: null
      };
      let cmd = '';
      if (_linux || _freebsd || _openbsd || _netbsd) {
        if (process.arch === 'arm') {
          cmd = 'cat /proc/cpuinfo | grep Serial';
          // 'BCM2709', 'BCM2835', 'BCM2708' -->
        } else {
          cmd = 'export LC_ALL=C; dmidecode -t 2 2>/dev/null; unset LC_ALL';
        }
        const workload = [];
        workload.push(execPromise(cmd));
        workload.push(execPromise('export LC_ALL=C; dmidecode -t memory 2>/dev/null'));
        util.promiseAll(
          workload
        ).then((data) => {
          let lines = data.results[0] ? data.results[0].toString().split('\n') : [''];
          result.manufacturer = util.getValue(lines, 'Manufacturer');
          result.model = util.getValue(lines, 'Product Name');
          result.version = util.getValue(lines, 'Version');
          result.serial = util.getValue(lines, 'Serial Number');
          result.assetTag = util.getValue(lines, 'Asset Tag');
          // Non-Root values
          const cmd = `echo -n "board_asset_tag: "; cat /sys/devices/virtual/dmi/id/board_asset_tag 2>/dev/null; echo;
            echo -n "board_name: "; cat /sys/devices/virtual/dmi/id/board_name 2>/dev/null; echo;
            echo -n "board_serial: "; cat /sys/devices/virtual/dmi/id/board_serial 2>/dev/null; echo;
            echo -n "board_vendor: "; cat /sys/devices/virtual/dmi/id/board_vendor 2>/dev/null; echo;
            echo -n "board_version: "; cat /sys/devices/virtual/dmi/id/board_version 2>/dev/null; echo;`;
          try {
            lines = execSync(cmd).toString().split('\n');
            result.manufacturer = !result.manufacturer ? util.getValue(lines, 'board_vendor') : result.manufacturer;
            result.model = !result.model ? util.getValue(lines, 'board_name') : result.model;
            result.version = !result.version ? util.getValue(lines, 'board_version') : result.version;
            result.serial = !result.serial ? util.getValue(lines, 'board_serial') : result.serial;
            result.assetTag = !result.assetTag ? util.getValue(lines, 'board_asset_tag') : result.assetTag;
          } catch (e) {
            util.noop();
          }
          if (result.serial.toLowerCase().indexOf('o.e.m.') !== -1) { result.serial = '-'; }
          if (result.assetTag.toLowerCase().indexOf('o.e.m.') !== -1) { result.assetTag = '-'; }

          // mem
          lines = data.results[1] ? data.results[1].toString().split('\n') : [''];
          result.memMax = util.toInt(util.getValue(lines, 'Maximum Capacity')) * 1024 * 1024 * 1024 || null;
          result.memSlots = util.toInt(util.getValue(lines, 'Number Of Devices')) || null;

          // raspberry
          let linesRpi = '';
          try {
            linesRpi = fs.readFileSync('/proc/cpuinfo').toString().split('\n');
          } catch (e) {
            util.noop();
          }
          if (linesRpi) {
            const hardware = util.getValue(linesRpi, 'hardware');
            if (hardware.startsWith('BCM')) {
              const rpi = util.decodePiCpuinfo(linesRpi);
              result.manufacturer = rpi.manufacturer;
              result.model = 'Raspberry Pi';
              result.serial = rpi.serial;
              result.version = rpi.type + ' - ' + rpi.revision;
              result.memMax = os.totalmem();
              result.memSlots = 0;
            }
          }

          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        const workload = [];
        workload.push(execPromise('ioreg -c IOPlatformExpertDevice -d 2'));
        workload.push(execPromise('system_profiler SPMemoryDataType'));
        util.promiseAll(
          workload
        ).then((data) => {
          let lines = data.results[0] ? data.results[0].toString().replace(/[<>"]/g, '').split('\n') : [''];
          result.manufacturer = util.getValue(lines, 'manufacturer', '=', true);
          result.model = util.getValue(lines, 'model', '=', true);
          result.version = util.getValue(lines, 'version', '=', true);
          result.serial = util.getValue(lines, 'ioplatformserialnumber', '=', true);
          result.assetTag = util.getValue(lines, 'board-id', '=', true);

          // mem
          let devices = data.results[1] ? data.results[1].toString().split('        BANK ') : [''];
          if (devices.length === 1) {
            devices = data.results[1] ? data.results[1].toString().split('        DIMM') : [''];
          }
          devices.shift();
          result.memSlots = devices.length;

          if (os.arch() === 'arm64') {
            result.memSlots = 0;
            result.memMax = os.totalmem();
          }

          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          const workload = [];
          const win10plus = parseInt(os.release()) >= 10;
          const maxCapacityAttribute = win10plus ? 'MaxCapacityEx' : 'MaxCapacity';
          workload.push(util.powerShell('Get-CimInstance Win32_baseboard | select Model,Manufacturer,Product,Version,SerialNumber,PartNumber,SKU | fl'));
          workload.push(util.powerShell(`Get-CimInstance Win32_physicalmemoryarray | select ${maxCapacityAttribute}, MemoryDevices | fl`));
          util.promiseAll(
            workload
          ).then((data) => {
            let lines = data.results[0] ? data.results[0].toString().split('\r\n') : [''];

            result.manufacturer = cleanDefaults(util.getValue(lines, 'manufacturer', ':'));
            result.model = cleanDefaults(util.getValue(lines, 'model', ':'));
            if (!result.model) {
              result.model = cleanDefaults(util.getValue(lines, 'product', ':'));
            }
            result.version = cleanDefaults(util.getValue(lines, 'version', ':'));
            result.serial = cleanDefaults(util.getValue(lines, 'serialnumber', ':'));
            result.assetTag = cleanDefaults(util.getValue(lines, 'partnumber', ':'));
            if (!result.assetTag) {
              result.assetTag = cleanDefaults(util.getValue(lines, 'sku', ':'));
            }

            // memphysical
            lines = data.results[1] ? data.results[1].toString().split('\r\n') : [''];
            result.memMax = util.toInt(util.getValue(lines, maxCapacityAttribute, ':')) * (win10plus ? 1024 : 1) || null;
            result.memSlots = util.toInt(util.getValue(lines, 'MemoryDevices', ':')) || null;

            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.baseboard = baseboard;

function macOsChassisType(model) {
  model = model.toLowerCase();
  if (model.startsWith('macbookair')) { return 'Notebook'; }
  if (model.startsWith('macbookpro')) { return 'Laptop'; }
  if (model.startsWith('macbook')) { return 'Notebook'; }
  if (model.startsWith('macmini')) { return 'Desktop'; }
  if (model.startsWith('imac')) { return 'Desktop'; }
  if (model.startsWith('macstudio')) { return 'Desktop'; }
  if (model.startsWith('macpro')) { return 'Tower'; }
  return 'Other';
}

function chassis(callback) {
  const chassisTypes = ['Other',
    'Unknown',
    'Desktop',
    'Low Profile Desktop',
    'Pizza Box',
    'Mini Tower',
    'Tower',
    'Portable',
    'Laptop',
    'Notebook',
    'Hand Held',
    'Docking Station',
    'All in One',
    'Sub Notebook',
    'Space-Saving',
    'Lunch Box',
    'Main System Chassis',
    'Expansion Chassis',
    'SubChassis',
    'Bus Expansion Chassis',
    'Peripheral Chassis',
    'Storage Chassis',
    'Rack Mount Chassis',
    'Sealed-Case PC',
    'Multi-System Chassis',
    'Compact PCI',
    'Advanced TCA',
    'Blade',
    'Blade Enclosure',
    'Tablet',
    'Convertible',
    'Detachable',
    'IoT Gateway ',
    'Embedded PC',
    'Mini PC',
    'Stick PC',
  ];

  return new Promise((resolve) => {
    process.nextTick(() => {

      let result = {
        manufacturer: '',
        model: '',
        type: '',
        version: '',
        serial: '-',
        assetTag: '-',
        sku: '',
      };
      if (_linux || _freebsd || _openbsd || _netbsd) {
        const cmd = `echo -n "chassis_asset_tag: "; cat /sys/devices/virtual/dmi/id/chassis_asset_tag 2>/dev/null; echo;
            echo -n "chassis_serial: "; cat /sys/devices/virtual/dmi/id/chassis_serial 2>/dev/null; echo;
            echo -n "chassis_type: "; cat /sys/devices/virtual/dmi/id/chassis_type 2>/dev/null; echo;
            echo -n "chassis_vendor: "; cat /sys/devices/virtual/dmi/id/chassis_vendor 2>/dev/null; echo;
            echo -n "chassis_version: "; cat /sys/devices/virtual/dmi/id/chassis_version 2>/dev/null; echo;`;
        exec(cmd, function (error, stdout) {
          let lines = stdout.toString().split('\n');
          result.manufacturer = util.getValue(lines, 'chassis_vendor');
          const ctype = parseInt(util.getValue(lines, 'chassis_type').replace(/\D/g, ''));
          result.type = (ctype && !isNaN(ctype) && ctype < chassisTypes.length) ? chassisTypes[ctype - 1] : '';
          result.version = util.getValue(lines, 'chassis_version');
          result.serial = util.getValue(lines, 'chassis_serial');
          result.assetTag = util.getValue(lines, 'chassis_asset_tag');
          if (result.manufacturer.toLowerCase().indexOf('o.e.m.') !== -1) { result.manufacturer = '-'; }
          if (result.version.toLowerCase().indexOf('o.e.m.') !== -1) { result.version = '-'; }
          if (result.serial.toLowerCase().indexOf('o.e.m.') !== -1) { result.serial = '-'; }
          if (result.assetTag.toLowerCase().indexOf('o.e.m.') !== -1) { result.assetTag = '-'; }

          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_darwin) {
        exec('ioreg -c IOPlatformExpertDevice -d 2', function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().replace(/[<>"]/g, '').split('\n');
            const model = util.getValue(lines, 'model', '=', true);
            const modelParts = util.splitByNumber(model);
            const version = util.getValue(lines, 'version', '=', true);
            result.manufacturer = util.getValue(lines, 'manufacturer', '=', true);
            result.model = version ? util.getValue(lines, 'model', '=', true) : modelParts[0];
            result.type = macOsChassisType(result.model);
            result.version = version || model;
            result.serial = util.getValue(lines, 'ioplatformserialnumber', '=', true);
            result.assetTag = util.getValue(lines, 'board-id', '=', true) || util.getValue(lines, 'target-type', '=', true);
            result.sku = util.getValue(lines, 'target-sub-type', '=', true);
          }

          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        if (callback) { callback(result); }
        resolve(result);
      }
      if (_windows) {
        try {
          util.powerShell('Get-CimInstance Win32_SystemEnclosure | select Model,Manufacturer,ChassisTypes,Version,SerialNumber,PartNumber,SKU,SMBIOSAssetTag | fl').then((stdout, error) => {
            if (!error) {
              let lines = stdout.toString().split('\r\n');

              result.manufacturer = cleanDefaults(util.getValue(lines, 'manufacturer', ':'));
              result.model = cleanDefaults(util.getValue(lines, 'model', ':'));
              const ctype = parseInt(util.getValue(lines, 'ChassisTypes', ':').replace(/\D/g, ''));
              result.type = (ctype && !isNaN(ctype) && ctype < chassisTypes.length) ? chassisTypes[ctype - 1] : '';
              result.version = cleanDefaults(util.getValue(lines, 'version', ':'));
              result.serial = cleanDefaults(util.getValue(lines, 'serialnumber', ':'));
              result.assetTag = cleanDefaults(util.getValue(lines, 'partnumber', ':'));
              if (!result.assetTag) {
                result.assetTag = cleanDefaults(util.getValue(lines, 'SMBIOSAssetTag', ':'));
              }
              result.sku = cleanDefaults(util.getValue(lines, 'sku', ':'));
            }

            if (callback) { callback(result); }
            resolve(result);
          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

exports.chassis = chassis;


/***/ }),

/***/ 6535:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// usb.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 16. usb
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function getLinuxUsbType(type, name) {
  let result = type;
  const str = (name + ' ' + type).toLowerCase();
  if (str.indexOf('camera') >= 0) { result = 'Camera'; }
  else if (str.indexOf('hub') >= 0) { result = 'Hub'; }
  else if (str.indexOf('keybrd') >= 0) { result = 'Keyboard'; }
  else if (str.indexOf('keyboard') >= 0) { result = 'Keyboard'; }
  else if (str.indexOf('mouse') >= 0) { result = 'Mouse'; }
  else if (str.indexOf('stora') >= 0) { result = 'Storage'; }
  else if (str.indexOf('mic') >= 0) { result = 'Microphone'; }
  else if (str.indexOf('headset') >= 0) { result = 'Audio'; }
  else if (str.indexOf('audio') >= 0) { result = 'Audio'; }

  return result;
}

function parseLinuxUsb(usb) {
  const result = {};
  const lines = usb.split('\n');
  if (lines && lines.length && lines[0].indexOf('Device') >= 0) {
    const parts = lines[0].split(' ');
    result.bus = parseInt(parts[0], 10);
    if (parts[2]) {
      result.deviceId = parseInt(parts[2], 10);
    } else {
      result.deviceId = null;
    }
  } else {
    result.bus = null;
    result.deviceId = null;
  }
  const idVendor = util.getValue(lines, 'idVendor', ' ', true).trim();
  let vendorParts = idVendor.split(' ');
  vendorParts.shift();
  const vendor = vendorParts.join(' ');

  const idProduct = util.getValue(lines, 'idProduct', ' ', true).trim();
  let productParts = idProduct.split(' ');
  productParts.shift();
  const product = productParts.join(' ');

  const interfaceClass = util.getValue(lines, 'bInterfaceClass', ' ', true).trim();
  let interfaceClassParts = interfaceClass.split(' ');
  interfaceClassParts.shift();
  const usbType = interfaceClassParts.join(' ');

  const iManufacturer = util.getValue(lines, 'iManufacturer', ' ', true).trim();
  let iManufacturerParts = iManufacturer.split(' ');
  iManufacturerParts.shift();
  const manufacturer = iManufacturerParts.join(' ');

  result.id = (idVendor.startsWith('0x') ? idVendor.split(' ')[0].substr(2, 10) : '') + ':' + (idProduct.startsWith('0x') ? idProduct.split(' ')[0].substr(2, 10) : '');
  result.name = product;
  result.type = getLinuxUsbType(usbType, product);
  result.removable = null;
  result.vendor = vendor;
  result.manufacturer = manufacturer;
  result.maxPower = util.getValue(lines, 'MaxPower', ' ', true);
  result.serialNumber = null;

  return result;
}

function getDarwinUsbType(name) {
  let result = '';
  if (name.indexOf('camera') >= 0) { result = 'Camera'; }
  else if (name.indexOf('touch bar') >= 0) { result = 'Touch Bar'; }
  else if (name.indexOf('controller') >= 0) { result = 'Controller'; }
  else if (name.indexOf('headset') >= 0) { result = 'Audio'; }
  else if (name.indexOf('keyboard') >= 0) { result = 'Keyboard'; }
  else if (name.indexOf('trackpad') >= 0) { result = 'Trackpad'; }
  else if (name.indexOf('sensor') >= 0) { result = 'Sensor'; }
  else if (name.indexOf('bthusb') >= 0) { result = 'Bluetooth'; }
  else if (name.indexOf('bth') >= 0) { result = 'Bluetooth'; }
  else if (name.indexOf('rfcomm') >= 0) { result = 'Bluetooth'; }
  else if (name.indexOf('usbhub') >= 0) { result = 'Hub'; }
  else if (name.indexOf(' hub') >= 0) { result = 'Hub'; }
  else if (name.indexOf('mouse') >= 0) { result = 'Mouse'; }
  else if (name.indexOf('mic') >= 0) { result = 'Microphone'; }
  else if (name.indexOf('removable') >= 0) { result = 'Storage'; }
  return result;
}


function parseDarwinUsb(usb, id) {
  const result = {};
  result.id = id;

  usb = usb.replace(/ \|/g, '');
  usb = usb.trim();
  let lines = usb.split('\n');
  lines.shift();
  try {
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].trim();
      lines[i] = lines[i].replace(/=/g, ':');
      if (lines[i] !== '{' && lines[i] !== '}' && lines[i + 1] && lines[i + 1].trim() !== '}') {
        lines[i] = lines[i] + ',';
      }

      lines[i] = lines[i].replace(':Yes,', ':"Yes",');
      lines[i] = lines[i].replace(': Yes,', ': "Yes",');
      lines[i] = lines[i].replace(': Yes', ': "Yes"');
      lines[i] = lines[i].replace(':No,', ':"No",');
      lines[i] = lines[i].replace(': No,', ': "No",');
      lines[i] = lines[i].replace(': No', ': "No"');

      // In this case (("com.apple.developer.driverkit.transport.usb"))
      lines[i] = lines[i].replace('((', '').replace('))', '');

      // In case we have <923c11> we need make it "<923c11>" for correct JSON parse
      const match = /<(\w+)>/.exec(lines[i]);
      if (match) {
        const number = match[0];
        lines[i] = lines[i].replace(number, `"${number}"`);
      }
    }
    const usbObj = JSON.parse(lines.join('\n'));
    const removableDrive = (usbObj['Built-In'] ? usbObj['Built-In'].toLowerCase() !== 'yes' : true) && (usbObj['non-removable'] ? usbObj['non-removable'].toLowerCase() === 'no' : true);

    result.bus = null;
    result.deviceId = null;
    result.id = usbObj['USB Address'] || null;
    result.name = usbObj['kUSBProductString'] || usbObj['USB Product Name'] || null;
    result.type = getDarwinUsbType((usbObj['kUSBProductString'] || usbObj['USB Product Name'] || '').toLowerCase() + (removableDrive ? ' removable' : ''));
    result.removable = usbObj['non-removable'] ? usbObj['non-removable'].toLowerCase() || '' === 'no' : true;
    result.vendor = usbObj['kUSBVendorString'] || usbObj['USB Vendor Name'] || null;
    result.manufacturer = usbObj['kUSBVendorString'] || usbObj['USB Vendor Name'] || null;

    result.maxPower = null;
    result.serialNumber = usbObj['kUSBSerialNumberString'] || null;

    if (result.name) {
      return result;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

function getWindowsUsbTypeCreation(creationclass, name) {
  let result = '';
  if (name.indexOf('storage') >= 0) { result = 'Storage'; }
  else if (name.indexOf('speicher') >= 0) { result = 'Storage'; }
  else if (creationclass.indexOf('usbhub') >= 0) { result = 'Hub'; }
  else if (creationclass.indexOf('storage') >= 0) { result = 'Storage'; }
  else if (creationclass.indexOf('usbcontroller') >= 0) { result = 'Controller'; }
  else if (creationclass.indexOf('keyboard') >= 0) { result = 'Keyboard'; }
  else if (creationclass.indexOf('pointing') >= 0) { result = 'Mouse'; }
  else if (creationclass.indexOf('disk') >= 0) { result = 'Storage'; }
  return result;
}

function parseWindowsUsb(lines, id) {
  const usbType = getWindowsUsbTypeCreation(util.getValue(lines, 'CreationClassName', ':').toLowerCase(), util.getValue(lines, 'name', ':').toLowerCase());

  if (usbType) {
    const result = {};
    result.bus = null;
    result.deviceId = util.getValue(lines, 'deviceid', ':');
    result.id = id;
    result.name = util.getValue(lines, 'name', ':');
    result.type = usbType;
    result.removable = null;
    result.vendor = null;
    result.manufacturer = util.getValue(lines, 'Manufacturer', ':');
    result.maxPower = null;
    result.serialNumber = null;

    return result;
  } else {
    return null;
  }
}

function usb(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux) {
        const cmd = 'export LC_ALL=C; lsusb -v 2>/dev/null; unset LC_ALL';
        exec(cmd, { maxBuffer: 1024 * 1024 * 128 }, function (error, stdout) {
          if (!error) {
            const parts = ('\n\n' + stdout.toString()).split('\n\nBus ');
            for (let i = 1; i < parts.length; i++) {
              const usb = parseLinuxUsb(parts[i]);
              result.push(usb);
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin) {
        let cmd = 'ioreg -p IOUSB -c AppleUSBRootHubDevice -w0 -l';
        exec(cmd, { maxBuffer: 1024 * 1024 * 128 }, function (error, stdout) {
          if (!error) {
            const parts = (stdout.toString()).split(' +-o ');
            for (let i = 1; i < parts.length; i++) {
              const usb = parseDarwinUsb(parts[i]);
              if (usb) {
                result.push(usb);
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        util.powerShell('Get-CimInstance CIM_LogicalDevice | where { $_.Description -match "USB"} | select Name,CreationClassName,DeviceId,Manufacturer | fl').then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            for (let i = 0; i < parts.length; i++) {
              const usb = parseWindowsUsb(parts[i].split('\n'), i);
              if (usb) {
                result.push(usb);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos || _freebsd || _openbsd || _netbsd) {
        resolve(null);
      }
    });
  });
}

exports.usb = usb;



/***/ }),

/***/ 8032:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// users.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 11. Users/Sessions
// ----------------------------------------------------------------------------------

const exec = (__nccwpck_require__(2081).exec);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

function parseUsersLinux(lines, phase) {
  let result = [];
  let result_who = [];
  let result_w = {};
  let w_first = true;
  let w_header = [];
  let w_pos = [];
  let who_line = {};

  let is_whopart = true;
  lines.forEach(function (line) {
    if (line === '---') {
      is_whopart = false;
    } else {
      let l = line.replace(/ +/g, ' ').split(' ');

      // who part
      if (is_whopart) {
        result_who.push({
          user: l[0],
          tty: l[1],
          date: l[2],
          time: l[3],
          ip: (l && l.length > 4) ? l[4].replace(/\(/g, '').replace(/\)/g, '') : ''
        });
      } else {
        // w part
        if (w_first) {    // header
          w_header = l;
          w_header.forEach(function (item) {
            w_pos.push(line.indexOf(item));
          });
          w_first = false;
        } else {
          // split by w_pos
          result_w.user = line.substring(w_pos[0], w_pos[1] - 1).trim();
          result_w.tty = line.substring(w_pos[1], w_pos[2] - 1).trim();
          result_w.ip = line.substring(w_pos[2], w_pos[3] - 1).replace(/\(/g, '').replace(/\)/g, '').trim();
          result_w.command = line.substring(w_pos[7], 1000).trim();
          // find corresponding 'who' line
          who_line = result_who.filter(function (obj) {
            return (obj.user.substring(0, 8).trim() === result_w.user && obj.tty === result_w.tty);
          });
          if (who_line.length === 1) {
            result.push({
              user: who_line[0].user,
              tty: who_line[0].tty,
              date: who_line[0].date,
              time: who_line[0].time,
              ip: who_line[0].ip,
              command: result_w.command
            });
          }
        }
      }
    }
  });
  if (result.length === 0 && phase === 2) {
    return result_who;
  } else {
    return result;
  }
}

function parseUsersDarwin(lines) {
  let result = [];
  let result_who = [];
  let result_w = {};
  let who_line = {};

  let is_whopart = true;
  lines.forEach(function (line) {
    if (line === '---') {
      is_whopart = false;
    } else {
      let l = line.replace(/ +/g, ' ').split(' ');

      // who part
      if (is_whopart) {
        result_who.push({
          user: l[0],
          tty: l[1],
          date: ('' + new Date().getFullYear()) + '-' + ('0' + ('JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC'.indexOf(l[2].toUpperCase()) / 3 + 1)).slice(-2) + '-' + ('0' + l[3]).slice(-2),
          time: l[4],
        });
      } else {
        // w part
        // split by w_pos
        result_w.user = l[0];
        result_w.tty = l[1];
        result_w.ip = (l[2] !== '-') ? l[2] : '';
        result_w.command = l.slice(5, 1000).join(' ');
        // find corresponding 'who' line
        who_line = result_who.filter(function (obj) {
          return (obj.user === result_w.user && (obj.tty.substring(3, 1000) === result_w.tty || obj.tty === result_w.tty));
        });
        if (who_line.length === 1) {
          result.push({
            user: who_line[0].user,
            tty: who_line[0].tty,
            date: who_line[0].date,
            time: who_line[0].time,
            ip: result_w.ip,
            command: result_w.command
          });
        }
      }
    }
  });
  return result;
}

function users(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];

      // linux
      if (_linux) {
        exec('who --ips; echo "---"; w | tail -n +2', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersLinux(lines, 1);
            if (result.length === 0) {
              exec('who; echo "---"; w | tail -n +2', function (error, stdout) {
                if (!error) {
                  // lines / split
                  lines = stdout.toString().split('\n');
                  result = parseUsersLinux(lines, 2);
                }
                if (callback) { callback(result); }
                resolve(result);
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        });
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('who; echo "---"; w -ih', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        exec('who; echo "---"; w -h', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }

      if (_darwin) {
        exec('who; echo "---"; w -ih', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_windows) {
        try {
          let cmd = 'Get-CimInstance Win32_LogonSession | select LogonId,@{n="StartTime";e={$_.StartTime.ToString("yyyy-MM-dd HH:mm:ss")}} | fl' + '; echo \'#-#-#-#\';';
          cmd += 'Get-CimInstance Win32_LoggedOnUser | select antecedent,dependent | fl ' + '; echo \'#-#-#-#\';';
          cmd += '$process = (Get-CimInstance Win32_Process -Filter "name = \'explorer.exe\'"); Invoke-CimMethod -InputObject $process[0] -MethodName GetOwner | select user, domain | fl; get-process -name explorer | select-object sessionid | fl; echo \'#-#-#-#\';';
          cmd += 'query user';
          util.powerShell(cmd).then((data) => {
            if (data) {
              data = data.split('#-#-#-#');
              let sessions = parseWinSessions((data[0] || '').split(/\n\s*\n/));
              let loggedons = parseWinLoggedOn((data[1] || '').split(/\n\s*\n/));
              let queryUser = parseWinUsersQuery((data[3] || '').split('\r\n'));
              let users = parseWinUsers((data[2] || '').split(/\n\s*\n/), queryUser);
              for (let id in loggedons) {
                if ({}.hasOwnProperty.call(loggedons, id)) {
                  loggedons[id].dateTime = {}.hasOwnProperty.call(sessions, id) ? sessions[id] : '';
                }
              }
              users.forEach(user => {
                let dateTime = '';
                for (let id in loggedons) {
                  if ({}.hasOwnProperty.call(loggedons, id)) {
                    if (loggedons[id].user === user.user && (!dateTime || dateTime < loggedons[id].dateTime)) {
                      dateTime = loggedons[id].dateTime;
                    }
                  }
                }

                result.push({
                  user: user.user,
                  tty: user.tty,
                  date: `${dateTime.substring(0, 10)}`,
                  time: `${dateTime.substring(11, 19)}`,
                  ip: '',
                  command: ''
                });
              });
            }
            if (callback) { callback(result); }
            resolve(result);

          });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }
    });
  });
}

function parseWinSessions(sessionParts) {
  const sessions = {};
  sessionParts.forEach(session => {
    const lines = session.split('\r\n');
    const id = util.getValue(lines, 'LogonId');
    const starttime = util.getValue(lines, 'starttime');
    if (id) {
      sessions[id] = starttime;
    }
  });
  return sessions;
}

function fuzzyMatch(name1, name2) {
  name1 = name1.toLowerCase();
  name2 = name2.toLowerCase();
  let eq = 0;
  let len = name1.length;
  if (name2.length > len) { len = name2.length; }

  for (let i = 0; i < len; i++) {
    const c1 = name1[i] || '';
    const c2 = name2[i] || '';
    if (c1 === c2) { eq++; }
  }
  return (len > 10 ? eq / len > 0.9 : (len > 0 ? eq / len > 0.8 : false));
}

function parseWinUsers(userParts, userQuery) {
  const users = [];
  userParts.forEach(user => {
    const lines = user.split('\r\n');

    const domain = util.getValue(lines, 'domain', ':', true);
    const username = util.getValue(lines, 'user', ':', true);
    const sessionid = util.getValue(lines, 'sessionid', ':', true);

    if (username) {
      const quser = userQuery.filter(item => fuzzyMatch(item.user, username));
      users.push({
        domain,
        user: username,
        tty: quser && quser[0] && quser[0].tty ? quser[0].tty : sessionid
      });
    }
  });
  return users;
}

function parseWinLoggedOn(loggedonParts) {
  const loggedons = {};
  loggedonParts.forEach(loggedon => {
    const lines = loggedon.split('\r\n');

    const antecendent = util.getValue(lines, 'antecedent', ':', true);
    let parts = antecendent.split('=');
    const name = parts.length > 2 ? parts[1].split(',')[0].replace(/"/g, '').trim() : '';
    const domain = parts.length > 2 ? parts[2].replace(/"/g, '').replace(/\)/g, '').trim() : '';
    const dependent = util.getValue(lines, 'dependent', ':', true);
    parts = dependent.split('=');
    const id = parts.length > 1 ? parts[1].replace(/"/g, '').replace(/\)/g, '').trim() : '';
    if (id) {
      loggedons[id] = {
        domain,
        user: name
      };
    }
  });
  return loggedons;
}

function parseWinUsersQuery(lines) {
  lines = lines.filter(item => item);
  let result = [];
  const header = lines[0];
  const headerDelimiter = [];
  if (header) {
    const start = (header[0] === ' ') ? 1 : 0;
    headerDelimiter.push(start - 1);
    let nextSpace = 0;
    for (let i = start + 1; i < header.length; i++) {
      if (header[i] === ' ' && ((header[i - 1] === ' ') || (header[i - 1] === '.'))) {
        nextSpace = i;
      } else {
        if (nextSpace) {
          headerDelimiter.push(nextSpace);
          nextSpace = 0;
        }
      }
    }
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const user = lines[i].substring(headerDelimiter[0] + 1, headerDelimiter[1]).trim() || '';
        const tty = lines[i].substring(headerDelimiter[1] + 1, headerDelimiter[2] - 2).trim() || '';
        result.push({
          user: user,
          tty: tty,
        });
      }
    }
  }
  return result;
}

exports.users = users;


/***/ }),

/***/ 7146:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// utils.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 0. helper functions
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const fs = __nccwpck_require__(7147);
const path = __nccwpck_require__(1017);
const spawn = (__nccwpck_require__(2081).spawn);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const util = __nccwpck_require__(3837);

let _platform = process.platform;
const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');

let _cores = 0;
let wmicPath = '';
let codepage = '';
let _smartMonToolsInstalled = null;
let _rpi_cpuinfo = null;

const WINDIR = process.env.WINDIR || 'C:\\Windows';

// powerShell
let _psChild;
let _psResult = '';
let _psCmds = [];
let _psPersistent = false;
const _psToUTF8 = '$OutputEncoding = [System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8 ; ';
const _psCmdStart = '--###START###--';
const _psError = '--ERROR--';
const _psCmdSeperator = '--###ENDCMD###--';
const _psIdSeperator = '--##ID##--';

const execOptsWin = {
  windowsHide: true,
  maxBuffer: 1024 * 20000,
  encoding: 'UTF-8',
  env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' })
};

function toInt(value) {
  let result = parseInt(value, 10);
  if (isNaN(result)) {
    result = 0;
  }
  return result;
}

function splitByNumber(str) {
  let numberStarted = false;
  let num = '';
  let cpart = '';
  for (const c of str) {
    if ((c >= '0' && c <= '9') || numberStarted) {
      numberStarted = true;
      num += c;
    } else {
      cpart += c;
    }
  }
  return [cpart, num];
}

const stringReplace = new String().replace;
const stringToLower = new String().toLowerCase;
const stringToString = new String().toString;
const stringSubstr = new String().substr;
const stringTrim = new String().trim;
const stringStartWith = new String().startsWith;
const mathMin = Math.min;

function isFunction(functionToCheck) {
  let getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function unique(obj) {
  let uniques = [];
  let stringify = {};
  for (let i = 0; i < obj.length; i++) {
    let keys = Object.keys(obj[i]);
    keys.sort(function (a, b) { return a - b; });
    let str = '';
    for (let j = 0; j < keys.length; j++) {
      str += JSON.stringify(keys[j]);
      str += JSON.stringify(obj[i][keys[j]]);
    }
    if (!{}.hasOwnProperty.call(stringify, str)) {
      uniques.push(obj[i]);
      stringify[str] = true;
    }
  }
  return uniques;
}

function sortByKey(array, keys) {
  return array.sort(function (a, b) {
    let x = '';
    let y = '';
    keys.forEach(function (key) {
      x = x + a[key]; y = y + b[key];
    });
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
}

function cores() {
  if (_cores === 0) {
    _cores = os.cpus().length;
  }
  return _cores;
}

function getValue(lines, property, separator, trimmed, lineMatch) {
  separator = separator || ':';
  property = property.toLowerCase();
  trimmed = trimmed || false;
  lineMatch = lineMatch || false;
  let result = '';
  lines.some((line) => {
    let lineLower = line.toLowerCase().replace(/\t/g, '');
    if (trimmed) {
      lineLower = lineLower.trim();
    }
    if (lineLower.startsWith(property) && (lineMatch ? (lineLower.match(property + separator)) || (lineLower.match(property + ' ' + separator)) : true)) {
      const parts = trimmed ? line.trim().split(separator) : line.split(separator);
      if (parts.length >= 2) {
        parts.shift();
        result = parts.join(separator).trim();
        return true;
      }
    }
  });
  return result;
}

function decodeEscapeSequence(str, base) {
  base = base || 16;
  return str.replace(/\\x([0-9A-Fa-f]{2})/g, function () {
    return String.fromCharCode(parseInt(arguments[1], base));
  });
}

function detectSplit(str) {
  let seperator = '';
  let part = 0;
  str.split('').forEach(element => {
    if (element >= '0' && element <= '9') {
      if (part === 1) { part++; }
    } else {
      if (part === 0) { part++; }
      if (part === 1) {
        seperator += element;
      }
    }
  });
  return seperator;
}

function parseTime(t, pmDesignator) {
  pmDesignator = pmDesignator || '';
  t = t.toUpperCase();
  let hour = 0;
  let min = 0;
  let splitter = detectSplit(t);
  let parts = t.split(splitter);
  if (parts.length >= 2) {
    if (parts[2]) {
      parts[1] += parts[2];
    }
    let isPM = (parts[1] && (parts[1].toLowerCase().indexOf('pm') > -1) || (parts[1].toLowerCase().indexOf('p.m.') > -1) || (parts[1].toLowerCase().indexOf('p. m.') > -1) || (parts[1].toLowerCase().indexOf('n') > -1) || (parts[1].toLowerCase().indexOf('ch') > -1) || (parts[1].toLowerCase().indexOf('ös') > -1) || (pmDesignator && parts[1].toLowerCase().indexOf(pmDesignator) > -1));
    hour = parseInt(parts[0], 10);
    min = parseInt(parts[1], 10);
    hour = isPM && hour < 12 ? hour + 12 : hour;
    return ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
  }
}

function parseDateTime(dt, culture) {
  const result = {
    date: '',
    time: ''
  };
  culture = culture || {};
  let dateFormat = (culture.dateFormat || '').toLowerCase();
  let pmDesignator = (culture.pmDesignator || '');

  const parts = dt.split(' ');
  if (parts[0]) {
    if (parts[0].indexOf('/') >= 0) {
      // Dateformat: mm/dd/yyyy or dd/mm/yyyy or dd/mm/yy or yyyy/mm/dd
      const dtparts = parts[0].split('/');
      if (dtparts.length === 3) {
        if (dtparts[0].length === 4) {
          // Dateformat: yyyy/mm/dd
          result.date = dtparts[0] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[2]).substr(-2);
        } else if (dtparts[2].length === 2) {
          if ((dateFormat.indexOf('/d/') > -1 || dateFormat.indexOf('/dd/') > -1)) {
            // Dateformat: mm/dd/yy
            result.date = '20' + dtparts[2] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[0]).substr(-2);
          } else {
            // Dateformat: dd/mm/yy
            result.date = '20' + dtparts[2] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[0]).substr(-2);
          }
        } else {
          // Dateformat: mm/dd/yyyy or dd/mm/yyyy
          const isEN = ((dt.toLowerCase().indexOf('pm') > -1) || (dt.toLowerCase().indexOf('p.m.') > -1) || (dt.toLowerCase().indexOf('p. m.') > -1) || (dt.toLowerCase().indexOf('am') > -1) || (dt.toLowerCase().indexOf('a.m.') > -1) || (dt.toLowerCase().indexOf('a. m.') > -1));
          if ((isEN || dateFormat.indexOf('/d/') > -1 || dateFormat.indexOf('/dd/') > -1) && dateFormat.indexOf('dd/') !== 0) {
            // Dateformat: mm/dd/yyyy
            result.date = dtparts[2] + '-' + ('0' + dtparts[0]).substr(-2) + '-' + ('0' + dtparts[1]).substr(-2);
          } else {
            // Dateformat: dd/mm/yyyy
            result.date = dtparts[2] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[0]).substr(-2);
          }
        }
      }
    }
    if (parts[0].indexOf('.') >= 0) {
      const dtparts = parts[0].split('.');
      if (dtparts.length === 3) {
        if (dateFormat.indexOf('.d.') > -1 || dateFormat.indexOf('.dd.') > -1) {
          // Dateformat: mm.dd.yyyy
          result.date = dtparts[2] + '-' + ('0' + dtparts[0]).substr(-2) + '-' + ('0' + dtparts[1]).substr(-2);
        } else {
          // Dateformat: dd.mm.yyyy
          result.date = dtparts[2] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[0]).substr(-2);
        }
      }
    }
    if (parts[0].indexOf('-') >= 0) {
      // Dateformat: yyyy-mm-dd
      const dtparts = parts[0].split('-');
      if (dtparts.length === 3) {
        result.date = dtparts[0] + '-' + ('0' + dtparts[1]).substr(-2) + '-' + ('0' + dtparts[2]).substr(-2);
      }
    }
  }
  if (parts[1]) {
    parts.shift();
    let time = parts.join(' ');
    result.time = parseTime(time, pmDesignator);
  }
  return result;
}

function parseHead(head, rights) {
  let space = (rights > 0);
  let count = 1;
  let from = 0;
  let to = 0;
  let result = [];
  for (let i = 0; i < head.length; i++) {
    if (count <= rights) {
      if (/\s/.test(head[i]) && !space) {
        to = i - 1;
        result.push({
          from: from,
          to: to + 1,
          cap: head.substring(from, to + 1)
        });
        from = to + 2;
        count++;
      }
      space = head[i] === ' ';
    } else {
      if (!/\s/.test(head[i]) && space) {
        to = i - 1;
        if (from < to) {
          result.push({
            from: from,
            to: to,
            cap: head.substring(from, to)
          });
        }
        from = to + 1;
        count++;
      }
      space = head[i] === ' ';
    }
  }
  to = 5000;
  result.push({
    from: from,
    to: to,
    cap: head.substring(from, to)
  });
  let len = result.length;
  for (let i = 0; i < len; i++) {
    if (result[i].cap.replace(/\s/g, '').length === 0) {
      if (i + 1 < len) {
        result[i].to = result[i + 1].to;
        result[i].cap = result[i].cap + result[i + 1].cap;
        result.splice(i + 1, 1);
        len = len - 1;
      }
    }
  }
  return result;
}

function findObjectByKey(array, key, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][key] === value) {
      return i;
    }
  }
  return -1;
}

function getWmic() {
  if (os.type() === 'Windows_NT' && !wmicPath) {
    wmicPath = WINDIR + '\\system32\\wbem\\wmic.exe';
    if (!fs.existsSync(wmicPath)) {
      try {
        const wmicPathArray = execSync('WHERE WMIC', execOptsWin).toString().split('\r\n');
        if (wmicPathArray && wmicPathArray.length) {
          wmicPath = wmicPathArray[0];
        } else {
          wmicPath = 'wmic';
        }
      } catch (e) {
        wmicPath = 'wmic';
      }
    }
  }
  return wmicPath;
}

function wmic(command) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        powerShell(getWmic() + ' ' + command).then(stdout => {
          resolve(stdout, '');
        });
      } catch (e) {
        resolve('', e);
      }
    });
  });
}

function getVboxmanage() {
  return _windows ? `"${process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH}\\VBoxManage.exe"` : 'vboxmanage';
}

function powerShellProceedResults(data) {
  let id = '';
  let parts;
  let res = '';
  // startID
  if (data.indexOf(_psCmdStart) >= 0) {
    parts = data.split(_psCmdStart);
    const parts2 = parts[1].split(_psIdSeperator);
    id = parts2[0];
    if (parts2.length > 1) {
      data = parts2.slice(1).join(_psIdSeperator);
    }
  }
  // result;
  if (data.indexOf(_psCmdSeperator) >= 0) {
    parts = data.split(_psCmdSeperator);
    res = parts[0];
  }
  let remove = -1;
  for (let i = 0; i < _psCmds.length; i++) {
    if (_psCmds[i].id === id) {
      remove = i;
      _psCmds[i].callback(res);
    }
  }
  if (remove >= 0) {
    _psCmds.splice(remove, 1);
  }
}

function powerShellStart() {
  if (!_psChild) {
    _psChild = spawn('powershell.exe', ['-NoProfile', '-NoLogo', '-InputFormat', 'Text', '-NoExit', '-Command', '-'], {
      stdio: 'pipe',
      windowsHide: true,
      maxBuffer: 1024 * 20000,
      encoding: 'UTF-8',
      env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' })
    });
    if (_psChild && _psChild.pid) {
      _psPersistent = true;
      _psChild.stdout.on('data', function (data) {
        _psResult = _psResult + data.toString('utf8');
        if (data.indexOf(_psCmdSeperator) >= 0) {
          powerShellProceedResults(_psResult);
          _psResult = '';
        }
      });
      _psChild.stderr.on('data', function () {
        powerShellProceedResults(_psResult + _psError);
      });
      _psChild.on('error', function () {
        powerShellProceedResults(_psResult + _psError);
      });
      _psChild.on('close', function () {
        if (_psChild) { _psChild.kill(); }
      });
    }
  }
}

function powerShellRelease() {
  try {
    if (_psChild) {
      _psChild.stdin.write('exit' + os.EOL);
      _psChild.stdin.end();
      _psPersistent = false;
    }
  } catch (e) {
    if (_psChild) { _psChild.kill(); }
  }
  _psChild = null;
}

function powerShell(cmd) {

  /// const pattern = [
  ///   '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  ///   '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  /// ].join('|');

  if (_psPersistent) {
    const id = Math.random().toString(36).substring(2, 12);
    return new Promise((resolve) => {
      process.nextTick(() => {
        function callback(data) {
          resolve(data);
        }
        _psCmds.push({
          id,
          cmd,
          callback,
          start: new Date()
        });
        try {
          if (_psChild && _psChild.pid) {
            _psChild.stdin.write(_psToUTF8 + 'echo ' + _psCmdStart + id + _psIdSeperator + '; ' + os.EOL + cmd + os.EOL + 'echo ' + _psCmdSeperator + os.EOL);
          }
        } catch (e) {
          resolve('');
        }
      });
    });

  } else {
    let result = '';

    return new Promise((resolve) => {
      process.nextTick(() => {
        try {
          const child = spawn('powershell.exe', ['-NoProfile', '-NoLogo', '-InputFormat', 'Text', '-NoExit', '-ExecutionPolicy', 'Unrestricted', '-Command', '-'], {
            stdio: 'pipe',
            windowsHide: true,
            maxBuffer: 1024 * 20000,
            encoding: 'UTF-8',
            env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' })
          });

          if (child && !child.pid) {
            child.on('error', function () {
              resolve(result);
            });
          }
          if (child && child.pid) {
            child.stdout.on('data', function (data) {
              result = result + data.toString('utf8');
            });
            child.stderr.on('data', function () {
              child.kill();
              resolve(result);
            });
            child.on('close', function () {
              child.kill();

              resolve(result);
            });
            child.on('error', function () {
              child.kill();
              resolve(result);
            });
            try {
              child.stdin.write(_psToUTF8 + cmd + os.EOL);
              child.stdin.write('exit' + os.EOL);
              child.stdin.end();
            } catch (e) {
              child.kill();
              resolve(result);
            }
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve(result);
        }
      });
    });
  }
}

function execSafe(cmd, args, options) {
  let result = '';
  options = options || {};

  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        const child = spawn(cmd, args, options);

        if (child && !child.pid) {
          child.on('error', function () {
            resolve(result);
          });
        }
        if (child && child.pid) {
          child.stdout.on('data', function (data) {
            result += data.toString();
          });
          child.on('close', function () {
            child.kill();
            resolve(result);
          });
          child.on('error', function () {
            child.kill();
            resolve(result);
          });
        } else {
          resolve(result);
        }
      } catch (e) {
        resolve(result);
      }
    });
  });
}

function getCodepage() {
  if (_windows) {
    if (!codepage) {
      try {
        const stdout = execSync('chcp', execOptsWin);
        const lines = stdout.toString().split('\r\n');
        const parts = lines[0].split(':');
        codepage = parts.length > 1 ? parts[1].replace('.', '').trim() : '';
      } catch (err) {
        codepage = '437';
      }
    }
    return codepage;
  }
  if (_linux || _darwin || _freebsd || _openbsd || _netbsd) {
    if (!codepage) {
      try {
        const stdout = execSync('echo $LANG');
        const lines = stdout.toString().split('\r\n');
        const parts = lines[0].split('.');
        codepage = parts.length > 1 ? parts[1].trim() : '';
        if (!codepage) {
          codepage = 'UTF-8';
        }
      } catch (err) {
        codepage = 'UTF-8';
      }
    }
    return codepage;
  }
}

function smartMonToolsInstalled() {
  if (_smartMonToolsInstalled !== null) {
    return _smartMonToolsInstalled;
  }
  _smartMonToolsInstalled = false;
  if (_windows) {
    try {
      const pathArray = execSync('WHERE smartctl 2>nul', execOptsWin).toString().split('\r\n');
      if (pathArray && pathArray.length) {
        _smartMonToolsInstalled = pathArray[0].indexOf(':\\') >= 0;
      } else {
        _smartMonToolsInstalled = false;
      }
    } catch (e) {
      _smartMonToolsInstalled = false;
    }
  }
  if (_linux || _darwin || _freebsd || _openbsd || _netbsd) {
    try {
      const pathArray = execSync('which smartctl 2>/dev/null', execOptsWin).toString().split('\r\n');
      _smartMonToolsInstalled = pathArray.length > 0;
    } catch (e) {
      util.noop();
    }
  }
  return _smartMonToolsInstalled;
}

function isRaspberry() {
  const PI_MODEL_NO = [
    'BCM2708',
    'BCM2709',
    'BCM2710',
    'BCM2711',
    'BCM2712',
    'BCM2835',
    'BCM2836',
    'BCM2837',
    'BCM2837B0'
  ];
  let cpuinfo = [];

  if (_rpi_cpuinfo !== null) {
    cpuinfo = _rpi_cpuinfo;
  } else {
    try {
      cpuinfo = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' }).toString().split('\n');
      _rpi_cpuinfo = cpuinfo;
    } catch (e) {
      return false;
    }
  }

  const hardware = getValue(cpuinfo, 'hardware');
  return (hardware && PI_MODEL_NO.indexOf(hardware) > -1);
}

function isRaspbian() {
  let osrelease = [];
  try {
    osrelease = fs.readFileSync('/etc/os-release', { encoding: 'utf8' }).toString().split('\n');
  } catch (e) {
    return false;
  }
  const id = getValue(osrelease, 'id', '=');
  return (id && id.indexOf('raspbian') > -1);
}

function execWin(cmd, opts, callback) {
  if (!callback) {
    callback = opts;
    opts = execOptsWin;
  }
  let newCmd = 'chcp 65001 > nul && cmd /C ' + cmd + ' && chcp ' + codepage + ' > nul';
  exec(newCmd, opts, function (error, stdout) {
    callback(error, stdout);
  });
}

function darwinXcodeExists() {
  const cmdLineToolsExists = fs.existsSync('/Library/Developer/CommandLineTools/usr/bin/');
  const xcodeAppExists = fs.existsSync('/Applications/Xcode.app/Contents/Developer/Tools');
  const xcodeExists = fs.existsSync('/Library/Developer/Xcode/');
  return (cmdLineToolsExists || xcodeExists || xcodeAppExists);
}

function nanoSeconds() {
  const time = process.hrtime();
  if (!Array.isArray(time) || time.length !== 2) {
    return 0;
  }
  return +time[0] * 1e9 + +time[1];
}

function countUniqueLines(lines, startingWith) {
  startingWith = startingWith || '';
  const uniqueLines = [];
  lines.forEach(line => {
    if (line.startsWith(startingWith)) {
      if (uniqueLines.indexOf(line) === -1) {
        uniqueLines.push(line);
      }
    }
  });
  return uniqueLines.length;
}

function countLines(lines, startingWith) {
  startingWith = startingWith || '';
  const uniqueLines = [];
  lines.forEach(line => {
    if (line.startsWith(startingWith)) {
      uniqueLines.push(line);
    }
  });
  return uniqueLines.length;
}

function sanitizeShellString(str, strict) {
  if (typeof strict === 'undefined') { strict = false; }
  const s = str || '';
  let result = '';
  const l = mathMin(s.length, 2000);
  for (let i = 0; i <= l; i++) {
    if (!(s[i] === undefined ||
      s[i] === '>' ||
      s[i] === '<' ||
      s[i] === '*' ||
      s[i] === '?' ||
      s[i] === '[' ||
      s[i] === ']' ||
      s[i] === '|' ||
      s[i] === '˚' ||
      s[i] === '$' ||
      s[i] === ';' ||
      s[i] === '&' ||
      s[i] === ']' ||
      s[i] === '#' ||
      s[i] === '\\' ||
      s[i] === '\t' ||
      s[i] === '\n' ||
      s[i] === '\r' ||
      s[i] === '\'' ||
      s[i] === '`' ||
      s[i] === '"' ||
      s[i].length > 1 ||
      (strict && s[i] === '(') ||
      (strict && s[i] === ')') ||
      (strict && s[i] === '@') ||
      (strict && s[i] === ' ') ||
      (strict && s[i] == '{') ||
      (strict && s[i] == ';') ||
      (strict && s[i] == '}'))) {
      result = result + s[i];
    }
  }
  return result;
}

function isPrototypePolluted() {
  const s = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let notPolluted = true;
  let st = '';

  st.__proto__.replace = stringReplace;
  st.__proto__.toLowerCase = stringToLower;
  st.__proto__.toString = stringToString;
  st.__proto__.substr = stringSubstr;

  notPolluted = notPolluted || (s.length !== 62);
  const ms = Date.now();
  if (typeof ms === 'number' && ms > 1600000000000) {
    const l = ms % 100 + 15;
    for (let i = 0; i < l; i++) {
      const r = Math.random() * 61.99999999 + 1;
      const rs = parseInt(Math.floor(r).toString(), 10);
      const rs2 = parseInt(r.toString().split('.')[0], 10);
      const q = Math.random() * 61.99999999 + 1;
      const qs = parseInt(Math.floor(q).toString(), 10);
      const qs2 = parseInt(q.toString().split('.')[0], 10);
      notPolluted = notPolluted && (r !== q);
      notPolluted = notPolluted && rs === rs2 && qs === qs2;
      st += s[rs - 1];
    }
    notPolluted = notPolluted && st.length === l;
    // string manipulation
    let p = Math.random() * l * 0.9999999999;
    let stm = st.substr(0, p) + ' ' + st.substr(p, 2000);
    stm.__proto__.replace = stringReplace;
    let sto = stm.replace(/ /g, '');
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + '{' + st.substr(p, 2000);
    sto = stm.replace(/{/g, '');
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + '*' + st.substr(p, 2000);
    sto = stm.replace(/\*/g, '');
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + '$' + st.substr(p, 2000);
    sto = stm.replace(/\$/g, '');
    notPolluted = notPolluted && st === sto;

    // lower
    const stl = st.toLowerCase();
    notPolluted = notPolluted && (stl.length === l) && stl[l - 1] && !(stl[l]);
    for (let i = 0; i < l; i++) {
      const s1 = st[i];
      s1.__proto__.toLowerCase = stringToLower;
      const s2 = stl ? stl[i] : '';
      const s1l = s1.toLowerCase();
      notPolluted = notPolluted && s1l[0] === s2 && s1l[0] && !(s1l[1]);
    }
  }
  return !notPolluted;
}

function hex2bin(hex) {
  return ('00000000' + (parseInt(hex, 16)).toString(2)).substr(-8);
}

function getFilesInPath(source) {
  const lstatSync = fs.lstatSync;
  const readdirSync = fs.readdirSync;
  const join = path.join;

  function isDirectory(source) {
    return lstatSync(source).isDirectory();
  }
  function isFile(source) { return lstatSync(source).isFile(); }

  function getDirectories(source) {
    return readdirSync(source).map(function (name) { return join(source, name); }).filter(isDirectory);
  }
  function getFiles(source) {
    return readdirSync(source).map(function (name) { return join(source, name); }).filter(isFile);
  }

  function getFilesRecursively(source) {
    try {
      let dirs = getDirectories(source);
      let files = dirs
        .map(function (dir) { return getFilesRecursively(dir); })
        .reduce(function (a, b) { return a.concat(b); }, []);
      return files.concat(getFiles(source));
    } catch (e) {
      return [];
    }
  }

  if (fs.existsSync(source)) {
    return getFilesRecursively(source);
  } else {
    return [];
  }
}

function decodePiCpuinfo(lines) {

  if (_rpi_cpuinfo === null) {
    _rpi_cpuinfo = lines;
  }

  // https://www.raspberrypi.org/documentation/hardware/raspberrypi/revision-codes/README.md

  const oldRevisionCodes = {
    '0002': {
      type: 'B',
      revision: '1.0',
      memory: 256,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '0003': {
      type: 'B',
      revision: '1.0',
      memory: 256,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '0004': {
      type: 'B',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '0005': {
      type: 'B',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Qisda',
      processor: 'BCM2835'
    },
    '0006': {
      type: 'B',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '0007': {
      type: 'A',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '0008': {
      type: 'A',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '0009': {
      type: 'A',
      revision: '2.0',
      memory: 256,
      manufacturer: 'Qisda',
      processor: 'BCM2835'
    },
    '000d': {
      type: 'B',
      revision: '2.0',
      memory: 512,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '000e': {
      type: 'B',
      revision: '2.0',
      memory: 512,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '000f': {
      type: 'B',
      revision: '2.0',
      memory: 512,
      manufacturer: 'Egoman',
      processor: 'BCM2835'
    },
    '0010': {
      type: 'B+',
      revision: '1.2',
      memory: 512,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '0011': {
      type: 'CM1',
      revision: '1.0',
      memory: 512,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '0012': {
      type: 'A+',
      revision: '1.1',
      memory: 256,
      manufacturer: 'Sony UK',
      processor: 'BCM2835'
    },
    '0013': {
      type: 'B+',
      revision: '1.2',
      memory: 512,
      manufacturer: 'Embest',
      processor: 'BCM2835'
    },
    '0014': {
      type: 'CM1',
      revision: '1.0',
      memory: 512,
      manufacturer: 'Embest',
      processor: 'BCM2835'
    },
    '0015': {
      type: 'A+',
      revision: '1.1',
      memory: 256,
      manufacturer: '512MB	Embest',
      processor: 'BCM2835'
    }
  };

  const processorList = [
    'BCM2835',
    'BCM2836',
    'BCM2837',
    'BCM2711',
    'BCM2712',
  ];
  const manufacturerList = [
    'Sony UK',
    'Egoman',
    'Embest',
    'Sony Japan',
    'Embest',
    'Stadium'
  ];
  const typeList = {
    '00': 'A',
    '01': 'B',
    '02': 'A+',
    '03': 'B+',
    '04': '2B',
    '05': 'Alpha (early prototype)',
    '06': 'CM1',
    '08': '3B',
    '09': 'Zero',
    '0a': 'CM3',
    '0c': 'Zero W',
    '0d': '3B+',
    '0e': '3A+',
    '0f': 'Internal use only',
    '10': 'CM3+',
    '11': '4B',
    '12': 'Zero 2 W',
    '13': '400',
    '14': 'CM4',
    '15': 'CM4S',
    '17': '5',
  };

  const revisionCode = getValue(lines, 'revision', ':', true);
  const model = getValue(lines, 'model:', ':', true);
  const serial = getValue(lines, 'serial', ':', true);

  let result = {};
  if ({}.hasOwnProperty.call(oldRevisionCodes, revisionCode)) {
    // old revision codes
    result = {
      model,
      serial,
      revisionCode,
      memory: oldRevisionCodes[revisionCode].memory,
      manufacturer: oldRevisionCodes[revisionCode].manufacturer,
      processor: oldRevisionCodes[revisionCode].processor,
      type: oldRevisionCodes[revisionCode].type,
      revision: oldRevisionCodes[revisionCode].revision,
    };

  } else {
    // new revision code
    const revision = ('00000000' + getValue(lines, 'revision', ':', true).toLowerCase()).substr(-8);
    const memSizeCode = parseInt(hex2bin(revision.substr(2, 1)).substr(5, 3), 2) || 0;
    const manufacturer = manufacturerList[parseInt(revision.substr(3, 1), 10)];
    const processor = processorList[parseInt(revision.substr(4, 1), 10)];
    const typeCode = revision.substr(5, 2);


    result = {
      model,
      serial,
      revisionCode,
      memory: 256 * Math.pow(2, memSizeCode),
      manufacturer,
      processor,
      type: {}.hasOwnProperty.call(typeList, typeCode) ? typeList[typeCode] : '',
      revision: '1.' + revision.substr(7, 1),
    };
  }
  return result;
}

function getRpiGpu() {
  let cpuinfo = null;
  if (_rpi_cpuinfo !== null) {
    cpuinfo = _rpi_cpuinfo;
  } else {
    try {
      cpuinfo = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' }).toString().split('\n');
      _rpi_cpuinfo = cpuinfo;
    } catch (e) {
      return false;
    }
  }

  const rpi = decodePiCpuinfo(cpuinfo);
  if (rpi.type === '4B' || rpi.type === 'CM4' || rpi.type === 'CM4S' || rpi.type === '400') { return 'VideoCore VI'; }
  if (rpi.type === '5') { return 'VideoCore VII'; }
  return 'VideoCore IV';
}

function promiseAll(promises) {
  const resolvingPromises = promises.map(function (promise) {
    return new Promise(function (resolve) {
      let payload = new Array(2);
      promise.then(function (result) {
        payload[0] = result;
      })
        .catch(function (error) {
          payload[1] = error;
        })
        .then(function () {
          // The wrapped Promise returns an array: 0 = result, 1 = error ... we resolve all
          resolve(payload);
        });
    });
  });
  const errors = [];
  const results = [];

  // Execute all wrapped Promises
  return Promise.all(resolvingPromises)
    .then(function (items) {
      items.forEach(function (payload) {
        if (payload[1]) {
          errors.push(payload[1]);
          results.push(null);
        } else {
          errors.push(null);
          results.push(payload[0]);
        }
      });

      return {
        errors: errors,
        results: results
      };
    });
}

function promisify(nodeStyleFunction) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
      nodeStyleFunction.apply(null, args);
    });
  };
}

function promisifySave(nodeStyleFunction) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve) {
      args.push(function (err, data) {
        resolve(data);
      });
      nodeStyleFunction.apply(null, args);
    });
  };
}

function linuxVersion() {
  let result = '';
  if (_linux) {
    try {
      result = execSync('uname -v').toString();
    } catch (e) {
      result = '';
    }
  }
  return result;
}

function plistParser(xmlStr) {
  const tags = ['array', 'dict', 'key', 'string', 'integer', 'date', 'real', 'data', 'boolean', 'arrayEmpty'];
  const startStr = '<plist version';

  let pos = xmlStr.indexOf(startStr);
  let len = xmlStr.length;
  while (xmlStr[pos] !== '>' && pos < len) {
    pos++;
  }

  let depth = 0;
  let inTagStart = false;
  let inTagContent = false;
  let inTagEnd = false;
  let metaData = [{ tagStart: '', tagEnd: '', tagContent: '', key: '', data: null }];
  let c = '';
  let cn = xmlStr[pos];

  while (pos < len) {
    c = cn;
    if (pos + 1 < len) { cn = xmlStr[pos + 1]; }
    if (c === '<') {
      inTagContent = false;
      if (cn === '/') { inTagEnd = true; }
      else if (metaData[depth].tagStart) {
        metaData[depth].tagContent = '';
        if (!metaData[depth].data) { metaData[depth].data = metaData[depth].tagStart === 'array' ? [] : {}; }
        depth++;
        metaData.push({ tagStart: '', tagEnd: '', tagContent: '', key: null, data: null });
        inTagStart = true;
        inTagContent = false;
      }
      else if (!inTagStart) { inTagStart = true; }
    } else if (c === '>') {
      if (metaData[depth].tagStart === 'true/') { inTagStart = false; inTagEnd = true; metaData[depth].tagStart = ''; metaData[depth].tagEnd = '/boolean'; metaData[depth].data = true; }
      if (metaData[depth].tagStart === 'false/') { inTagStart = false; inTagEnd = true; metaData[depth].tagStart = ''; metaData[depth].tagEnd = '/boolean'; metaData[depth].data = false; }
      if (metaData[depth].tagStart === 'array/') { inTagStart = false; inTagEnd = true; metaData[depth].tagStart = ''; metaData[depth].tagEnd = '/arrayEmpty'; metaData[depth].data = []; }
      if (inTagContent) { inTagContent = false; }
      if (inTagStart) {
        inTagStart = false;
        inTagContent = true;
        if (metaData[depth].tagStart === 'array') {
          metaData[depth].data = [];
        }
        if (metaData[depth].tagStart === 'dict') {
          metaData[depth].data = {};
        }
      }
      if (inTagEnd) {
        inTagEnd = false;
        if (metaData[depth].tagEnd && tags.indexOf(metaData[depth].tagEnd.substr(1)) >= 0) {
          if (metaData[depth].tagEnd === '/dict' || metaData[depth].tagEnd === '/array') {
            if (depth > 1 && metaData[depth - 2].tagStart === 'array') {
              metaData[depth - 2].data.push(metaData[depth - 1].data);
            }
            if (depth > 1 && metaData[depth - 2].tagStart === 'dict') {
              metaData[depth - 2].data[metaData[depth - 1].key] = metaData[depth - 1].data;
            }
            depth--;
            metaData.pop();
            metaData[depth].tagContent = '';
            metaData[depth].tagStart = '';
            metaData[depth].tagEnd = '';
          }
          else {
            if (metaData[depth].tagEnd === '/key' && metaData[depth].tagContent) {
              metaData[depth].key = metaData[depth].tagContent;
            } else {
              if (metaData[depth].tagEnd === '/real' && metaData[depth].tagContent) { metaData[depth].data = parseFloat(metaData[depth].tagContent) || 0; }
              if (metaData[depth].tagEnd === '/integer' && metaData[depth].tagContent) { metaData[depth].data = parseInt(metaData[depth].tagContent) || 0; }
              if (metaData[depth].tagEnd === '/string' && metaData[depth].tagContent) { metaData[depth].data = metaData[depth].tagContent || ''; }
              if (metaData[depth].tagEnd === '/boolean') { metaData[depth].data = metaData[depth].tagContent || false; }
              if (metaData[depth].tagEnd === '/arrayEmpty') { metaData[depth].data = metaData[depth].tagContent || []; }
              if (depth > 0 && metaData[depth - 1].tagStart === 'array') { metaData[depth - 1].data.push(metaData[depth].data); }
              if (depth > 0 && metaData[depth - 1].tagStart === 'dict') { metaData[depth - 1].data[metaData[depth].key] = metaData[depth].data; }
            }
            metaData[depth].tagContent = '';
            metaData[depth].tagStart = '';
            metaData[depth].tagEnd = '';
          }
        }
        metaData[depth].tagEnd = '';
        inTagStart = false;
        inTagContent = false;
      }
    } else {
      if (inTagStart) { metaData[depth].tagStart += c; }
      if (inTagEnd) { metaData[depth].tagEnd += c; }
      if (inTagContent) { metaData[depth].tagContent += c; }
    }
    pos++;
  }
  return metaData[0].data;
}

function strIsNumeric(str) {
  return typeof str === 'string' && !isNaN(str) && !isNaN(parseFloat(str));
}

function plistReader(output) {
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(' = ') >= 0) {
      const lineParts = lines[i].split(' = ');
      lineParts[0] = lineParts[0].trim();
      if (!lineParts[0].startsWith('"')) {
        lineParts[0] = '"' + lineParts[0] + '"';
      }
      lineParts[1] = lineParts[1].trim();
      if (lineParts[1].indexOf('"') === -1 && lineParts[1].endsWith(';')) {
        const valueString = lineParts[1].substring(0, lineParts[1].length - 1);
        if (!strIsNumeric(valueString)) {
          lineParts[1] = `"${valueString}";`;
        }
      }
      if (lineParts[1].indexOf('"') >= 0 && lineParts[1].endsWith(';')) {
        const valueString = lineParts[1].substring(0, lineParts[1].length - 1).replace(/"/g, '');
        if (strIsNumeric(valueString)) {
          lineParts[1] = `${valueString};`;
        }
      }
      lines[i] = lineParts.join(' : ');
    }
    lines[i] = lines[i].replace(/\(/g, '[').replace(/\)/g, ']').replace(/;/g, ',').trim();
    if (lines[i].startsWith('}') && lines[i - 1] && lines[i - 1].endsWith(',')) {
      lines[i - 1] = lines[i - 1].substring(0, lines[i - 1].length - 1);
    }
  }
  output = lines.join('');
  let obj = {};
  try {
    obj = JSON.parse(output);
  } catch (e) {
    noop();
  }
  return obj;
}

function semverCompare(v1, v2) {
  let res = 0;
  const parts1 = v1.split('.');
  const parts2 = v2.split('.');
  if (parts1[0] < parts2[0]) { res = 1; }
  else if (parts1[0] > parts2[0]) { res = -1; }
  else if (parts1[0] === parts2[0] && parts1.length >= 2 && parts2.length >= 2) {
    if (parts1[1] < parts2[1]) { res = 1; }
    else if (parts1[1] > parts2[1]) { res = -1; }
    else if (parts1[1] === parts2[1]) {
      if (parts1.length >= 3 && parts2.length >= 3) {
        if (parts1[2] < parts2[2]) { res = 1; }
        else if (parts1[2] > parts2[2]) { res = -1; }
      } else if (parts2.length >= 3) {
        res = 1;
      }
    }
  }
  return res;
}

function noop() { }

exports.toInt = toInt;
exports.splitByNumber = splitByNumber;
exports.execOptsWin = execOptsWin;
exports.getCodepage = getCodepage;
exports.execWin = execWin;
exports.isFunction = isFunction;
exports.unique = unique;
exports.sortByKey = sortByKey;
exports.cores = cores;
exports.getValue = getValue;
exports.decodeEscapeSequence = decodeEscapeSequence;
exports.parseDateTime = parseDateTime;
exports.parseHead = parseHead;
exports.findObjectByKey = findObjectByKey;
exports.getWmic = getWmic;
exports.wmic = wmic;
exports.darwinXcodeExists = darwinXcodeExists;
exports.getVboxmanage = getVboxmanage;
exports.powerShell = powerShell;
exports.powerShellStart = powerShellStart;
exports.powerShellRelease = powerShellRelease;
exports.execSafe = execSafe;
exports.nanoSeconds = nanoSeconds;
exports.countUniqueLines = countUniqueLines;
exports.countLines = countLines;
exports.noop = noop;
exports.isRaspberry = isRaspberry;
exports.isRaspbian = isRaspbian;
exports.sanitizeShellString = sanitizeShellString;
exports.isPrototypePolluted = isPrototypePolluted;
exports.decodePiCpuinfo = decodePiCpuinfo;
exports.getRpiGpu = getRpiGpu;
exports.promiseAll = promiseAll;
exports.promisify = promisify;
exports.promisifySave = promisifySave;
exports.smartMonToolsInstalled = smartMonToolsInstalled;
exports.linuxVersion = linuxVersion;
exports.plistParser = plistParser;
exports.plistReader = plistReader;
exports.stringReplace = stringReplace;
exports.stringToLower = stringToLower;
exports.stringToString = stringToString;
exports.stringSubstr = stringSubstr;
exports.stringTrim = stringTrim;
exports.stringStartWith = stringStartWith;
exports.mathMin = mathMin;
exports.WINDIR = WINDIR;
exports.getFilesInPath = getFilesInPath;
exports.semverCompare = semverCompare;


/***/ }),

/***/ 9389:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// virtualbox.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 14. Docker
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const exec = (__nccwpck_require__(2081).exec);
const util = __nccwpck_require__(7146);

function vboxInfo(callback) {

  // fallback - if only callback is given
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        exec(util.getVboxmanage() + ' list vms --long', function (error, stdout) {
          let parts = (os.EOL + stdout.toString()).split(os.EOL + 'Name:');
          parts.shift();
          parts.forEach(part => {
            const lines = ('Name:' + part).split(os.EOL);
            const state = util.getValue(lines, 'State');
            const running = state.startsWith('running');
            const runningSinceString = running ? state.replace('running (since ', '').replace(')', '').trim() : '';
            let runningSince = 0;
            try {
              if (running) {
                const sinceDateObj = new Date(runningSinceString);
                const offset = sinceDateObj.getTimezoneOffset();
                runningSince = Math.round((Date.now() - Date.parse(sinceDateObj)) / 1000) + offset * 60;
              }
            } catch (e) {
              util.noop();
            }
            const stoppedSinceString = !running ? state.replace('powered off (since', '').replace(')', '').trim() : '';
            let stoppedSince = 0;
            try {
              if (!running) {
                const sinceDateObj = new Date(stoppedSinceString);
                const offset = sinceDateObj.getTimezoneOffset();
                stoppedSince = Math.round((Date.now() - Date.parse(sinceDateObj)) / 1000) + offset * 60;
              }
            } catch (e) {
              util.noop();
            }
            result.push({
              id: util.getValue(lines, 'UUID'),
              name: util.getValue(lines, 'Name'),
              running,
              started: runningSinceString,
              runningSince,
              stopped: stoppedSinceString,
              stoppedSince,
              guestOS: util.getValue(lines, 'Guest OS'),
              hardwareUUID: util.getValue(lines, 'Hardware UUID'),
              memory: parseInt(util.getValue(lines, 'Memory size', '     '), 10),
              vram: parseInt(util.getValue(lines, 'VRAM size'), 10),
              cpus: parseInt(util.getValue(lines, 'Number of CPUs'), 10),
              cpuExepCap: util.getValue(lines, 'CPU exec cap'),
              cpuProfile: util.getValue(lines, 'CPUProfile'),
              chipset: util.getValue(lines, 'Chipset'),
              firmware: util.getValue(lines, 'Firmware'),
              pageFusion: util.getValue(lines, 'Page Fusion') === 'enabled',
              configFile: util.getValue(lines, 'Config file'),
              snapshotFolder: util.getValue(lines, 'Snapshot folder'),
              logFolder: util.getValue(lines, 'Log folder'),
              hpet: util.getValue(lines, 'HPET') === 'enabled',
              pae: util.getValue(lines, 'PAE') === 'enabled',
              longMode: util.getValue(lines, 'Long Mode') === 'enabled',
              tripleFaultReset: util.getValue(lines, 'Triple Fault Reset') === 'enabled',
              apic: util.getValue(lines, 'APIC') === 'enabled',
              x2Apic: util.getValue(lines, 'X2APIC') === 'enabled',
              acpi: util.getValue(lines, 'ACPI') === 'enabled',
              ioApic: util.getValue(lines, 'IOAPIC') === 'enabled',
              biosApicMode: util.getValue(lines, 'BIOS APIC mode'),
              bootMenuMode: util.getValue(lines, 'Boot menu mode'),
              bootDevice1: util.getValue(lines, 'Boot Device 1'),
              bootDevice2: util.getValue(lines, 'Boot Device 2'),
              bootDevice3: util.getValue(lines, 'Boot Device 3'),
              bootDevice4: util.getValue(lines, 'Boot Device 4'),
              timeOffset: util.getValue(lines, 'Time offset'),
              rtc: util.getValue(lines, 'RTC'),
            });
          });

          if (callback) { callback(result); }
          resolve(result);
        });
      } catch (e) {
        if (callback) { callback(result); }
        resolve(result);
      }
    });
  });
}

exports.vboxInfo = vboxInfo;


/***/ }),

/***/ 750:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// @ts-check
// ==================================================================================
// wifi.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2024
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 9. wifi
// ----------------------------------------------------------------------------------

const os = __nccwpck_require__(2037);
const exec = (__nccwpck_require__(2081).exec);
const execSync = (__nccwpck_require__(2081).execSync);
const util = __nccwpck_require__(7146);

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');

function wifiDBFromQuality(quality) {
  const qual = parseFloat(quality);
  if (qual < 0) { return 0; }
  if (qual >= 100) { return -50; }
  return (qual / 2 - 100);
}

function wifiQualityFromDB(db) {
  const result = 2 * (parseFloat(db) + 100);
  return result <= 100 ? result : 100;
}

const _wifi_frequencies = {
  1: 2412,
  2: 2417,
  3: 2422,
  4: 2427,
  5: 2432,
  6: 2437,
  7: 2442,
  8: 2447,
  9: 2452,
  10: 2457,
  11: 2462,
  12: 2467,
  13: 2472,
  14: 2484,
  32: 5160,
  34: 5170,
  36: 5180,
  38: 5190,
  40: 5200,
  42: 5210,
  44: 5220,
  46: 5230,
  48: 5240,
  50: 5250,
  52: 5260,
  54: 5270,
  56: 5280,
  58: 5290,
  60: 5300,
  62: 5310,
  64: 5320,
  68: 5340,
  96: 5480,
  100: 5500,
  102: 5510,
  104: 5520,
  106: 5530,
  108: 5540,
  110: 5550,
  112: 5560,
  114: 5570,
  116: 5580,
  118: 5590,
  120: 5600,
  122: 5610,
  124: 5620,
  126: 5630,
  128: 5640,
  132: 5660,
  134: 5670,
  136: 5680,
  138: 5690,
  140: 5700,
  142: 5710,
  144: 5720,
  149: 5745,
  151: 5755,
  153: 5765,
  155: 5775,
  157: 5785,
  159: 5795,
  161: 5805,
  165: 5825,
  169: 5845,
  173: 5865,
  183: 4915,
  184: 4920,
  185: 4925,
  187: 4935,
  188: 4940,
  189: 4945,
  192: 4960,
  196: 4980
};

function wifiFrequencyFromChannel(channel) {
  return {}.hasOwnProperty.call(_wifi_frequencies, channel) ? _wifi_frequencies[channel] : null;
}

function wifiChannelFromFrequencs(frequency) {
  let channel = 0;
  for (let key in _wifi_frequencies) {
    if ({}.hasOwnProperty.call(_wifi_frequencies, key)) {
      if (_wifi_frequencies[key] === frequency) { channel = util.toInt(key); }
    }
  }
  return channel;
}

function ifaceListLinux() {
  const result = [];
  const cmd = 'iw dev 2>/dev/null';
  try {
    const all = execSync(cmd).toString().split('\n').map(line => line.trim()).join('\n');
    const parts = all.split('\nInterface ');
    parts.shift();
    parts.forEach(ifaceDetails => {
      const lines = ifaceDetails.split('\n');
      const iface = lines[0];
      const id = util.toInt(util.getValue(lines, 'ifindex', ' '));
      const mac = util.getValue(lines, 'addr', ' ');
      const channel = util.toInt(util.getValue(lines, 'channel', ' '));
      result.push({
        id,
        iface,
        mac,
        channel
      });
    });
    return result;
  } catch (e) {
    try {
      const all = execSync('nmcli -t -f general,wifi-properties,wired-properties,interface-flags,capabilities,nsp device show 2>/dev/null').toString();
      const parts = all.split('\n\n');
      let i = 1;
      parts.forEach(ifaceDetails => {
        const lines = ifaceDetails.split('\n');
        const iface = util.getValue(lines, 'GENERAL.DEVICE');
        const type = util.getValue(lines, 'GENERAL.TYPE');
        const id = i++; // // util.getValue(lines, 'GENERAL.PATH');
        const mac = util.getValue(lines, 'GENERAL.HWADDR');
        const channel = '';
        if (type.toLowerCase() === 'wifi') {
          result.push({
            id,
            iface,
            mac,
            channel
          });
        }
      });
      return result;
    } catch (e) {
      return [];
    }
  }
}

function nmiDeviceLinux(iface) {
  const cmd = `nmcli -t -f general,wifi-properties,capabilities,ip4,ip6 device show ${iface} 2>/dev/null`;
  try {
    const lines = execSync(cmd).toString().split('\n');
    const ssid = util.getValue(lines, 'GENERAL.CONNECTION');
    return {
      iface,
      type: util.getValue(lines, 'GENERAL.TYPE'),
      vendor: util.getValue(lines, 'GENERAL.VENDOR'),
      product: util.getValue(lines, 'GENERAL.PRODUCT'),
      mac: util.getValue(lines, 'GENERAL.HWADDR').toLowerCase(),
      ssid: ssid !== '--' ? ssid : null
    };
  } catch (e) {
    return {};
  }
}

function nmiConnectionLinux(ssid) {
  const cmd = `nmcli -t --show-secrets connection show ${ssid} 2>/dev/null`;
  try {
    const lines = execSync(cmd).toString().split('\n');
    const bssid = util.getValue(lines, '802-11-wireless.seen-bssids').toLowerCase();
    return {
      ssid: ssid !== '--' ? ssid : null,
      uuid: util.getValue(lines, 'connection.uuid'),
      type: util.getValue(lines, 'connection.type'),
      autoconnect: util.getValue(lines, 'connection.autoconnect') === 'yes',
      security: util.getValue(lines, '802-11-wireless-security.key-mgmt'),
      bssid: bssid !== '--' ? bssid : null
    };
  } catch (e) {
    return {};
  }
}

function wpaConnectionLinux(iface) {
  if (!iface) {
    return {};
  }
  const cmd = `wpa_cli -i ${iface} status 2>&1`;
  try {
    const lines = execSync(cmd).toString().split('\n');
    const freq = util.toInt(util.getValue(lines, 'freq', '='));
    return {
      ssid: util.getValue(lines, 'ssid', '='),
      uuid: util.getValue(lines, 'uuid', '='),
      security: util.getValue(lines, 'key_mgmt', '='),
      freq,
      channel: wifiChannelFromFrequencs(freq),
      bssid: util.getValue(lines, 'bssid', '=').toLowerCase()
    };
  } catch (e) {
    return {};
  }
}

function getWifiNetworkListNmi() {
  const result = [];
  const cmd = 'nmcli -t -m multiline --fields active,ssid,bssid,mode,chan,freq,signal,security,wpa-flags,rsn-flags device wifi list 2>/dev/null';
  try {
    const stdout = execSync(cmd, { maxBuffer: 1024 * 20000 });
    const parts = stdout.toString().split('ACTIVE:');
    parts.shift();
    parts.forEach(part => {
      part = 'ACTIVE:' + part;
      const lines = part.split(os.EOL);
      const channel = util.getValue(lines, 'CHAN');
      const frequency = util.getValue(lines, 'FREQ').toLowerCase().replace('mhz', '').trim();
      const security = util.getValue(lines, 'SECURITY').replace('(', '').replace(')', '');
      const wpaFlags = util.getValue(lines, 'WPA-FLAGS').replace('(', '').replace(')', '');
      const rsnFlags = util.getValue(lines, 'RSN-FLAGS').replace('(', '').replace(')', '');
      const quality = util.getValue(lines, 'SIGNAL');
      result.push({
        ssid: util.getValue(lines, 'SSID'),
        bssid: util.getValue(lines, 'BSSID').toLowerCase(),
        mode: util.getValue(lines, 'MODE'),
        channel: channel ? parseInt(channel, 10) : null,
        frequency: frequency ? parseInt(frequency, 10) : null,
        signalLevel: wifiDBFromQuality(quality),
        quality: quality ? parseInt(quality, 10) : null,
        security: security && security !== 'none' ? security.split(' ') : [],
        wpaFlags: wpaFlags && wpaFlags !== 'none' ? wpaFlags.split(' ') : [],
        rsnFlags: rsnFlags && rsnFlags !== 'none' ? rsnFlags.split(' ') : []
      });
    });
    return result;
  } catch (e) {
    return [];
  }
}

function getWifiNetworkListIw(iface) {
  const result = [];
  try {
    let iwlistParts = execSync(`export LC_ALL=C; iwlist ${iface} scan 2>&1; unset LC_ALL`).toString().split('        Cell ');
    if (iwlistParts[0].indexOf('resource busy') >= 0) { return -1; }
    if (iwlistParts.length > 1) {
      iwlistParts.shift();
      iwlistParts.forEach(element => {
        const lines = element.split('\n');
        const channel = util.getValue(lines, 'channel', ':', true);
        const address = (lines && lines.length && lines[0].indexOf('Address:') >= 0 ? lines[0].split('Address:')[1].trim().toLowerCase() : '');
        const mode = util.getValue(lines, 'mode', ':', true);
        const frequency = util.getValue(lines, 'frequency', ':', true);
        const qualityString = util.getValue(lines, 'Quality', '=', true);
        const dbParts = qualityString.toLowerCase().split('signal level=');
        const db = dbParts.length > 1 ? util.toInt(dbParts[1]) : 0;
        const quality = db ? wifiQualityFromDB(db) : 0;
        const ssid = util.getValue(lines, 'essid', ':', true);

        // security and wpa-flags
        const isWpa = element.indexOf(' WPA ') >= 0;
        const isWpa2 = element.indexOf('WPA2 ') >= 0;
        const security = [];
        if (isWpa) { security.push('WPA'); }
        if (isWpa2) { security.push('WPA2'); }
        const wpaFlags = [];
        let wpaFlag = '';
        lines.forEach(function (line) {
          const l = line.trim().toLowerCase();
          if (l.indexOf('group cipher') >= 0) {
            if (wpaFlag) {
              wpaFlags.push(wpaFlag);
            }
            const parts = l.split(':');
            if (parts.length > 1) {
              wpaFlag = parts[1].trim().toUpperCase();
            }
          }
          if (l.indexOf('pairwise cipher') >= 0) {
            const parts = l.split(':');
            if (parts.length > 1) {
              if (parts[1].indexOf('tkip')) { wpaFlag = (wpaFlag ? 'TKIP/' + wpaFlag : 'TKIP'); }
              else if (parts[1].indexOf('ccmp')) { wpaFlag = (wpaFlag ? 'CCMP/' + wpaFlag : 'CCMP'); }
              else if (parts[1].indexOf('proprietary')) { wpaFlag = (wpaFlag ? 'PROP/' + wpaFlag : 'PROP'); }
            }
          }
          if (l.indexOf('authentication suites') >= 0) {
            const parts = l.split(':');
            if (parts.length > 1) {
              if (parts[1].indexOf('802.1x')) { wpaFlag = (wpaFlag ? '802.1x/' + wpaFlag : '802.1x'); }
              else if (parts[1].indexOf('psk')) { wpaFlag = (wpaFlag ? 'PSK/' + wpaFlag : 'PSK'); }
            }
          }
        });
        if (wpaFlag) {
          wpaFlags.push(wpaFlag);
        }

        result.push({
          ssid,
          bssid: address,
          mode,
          channel: channel ? util.toInt(channel) : null,
          frequency: frequency ? util.toInt(frequency.replace('.', '')) : null,
          signalLevel: db,
          quality,
          security,
          wpaFlags,
          rsnFlags: []
        });
      });
    }
    return result;
  } catch (e) {
    return -1;
  }
}

function parseWifiDarwin(wifiObj) {
  const result = [];
  if (wifiObj) {
    wifiObj.forEach(function (wifiItem) {
      const signalLevel = wifiItem.RSSI;
      let security = [];
      let wpaFlags = [];
      let ssid = wifiItem.SSID_STR || '';
      if (wifiItem.WPA_IE) {
        security.push('WPA');
        if (wifiItem.WPA_IE.IE_KEY_WPA_UCIPHERS) {
          wifiItem.WPA_IE.IE_KEY_WPA_UCIPHERS.forEach(function (ciphers) {
            if (ciphers === 0 && wpaFlags.indexOf('unknown/TKIP') === -1) { wpaFlags.push('unknown/TKIP'); }
            if (ciphers === 2 && wpaFlags.indexOf('PSK/TKIP') === -1) { wpaFlags.push('PSK/TKIP'); }
            if (ciphers === 4 && wpaFlags.indexOf('PSK/AES') === -1) { wpaFlags.push('PSK/AES'); }
          });
        }
      }
      if (wifiItem.RSN_IE) {
        security.push('WPA2');
        if (wifiItem.RSN_IE.IE_KEY_RSN_UCIPHERS) {
          wifiItem.RSN_IE.IE_KEY_RSN_UCIPHERS.forEach(function (ciphers) {
            if (ciphers === 0 && wpaFlags.indexOf('unknown/TKIP') === -1) { wpaFlags.push('unknown/TKIP'); }
            if (ciphers === 2 && wpaFlags.indexOf('TKIP/TKIP') === -1) { wpaFlags.push('TKIP/TKIP'); }
            if (ciphers === 4 && wpaFlags.indexOf('PSK/AES') === -1) { wpaFlags.push('PSK/AES'); }
          });
        }
      }
      if (wifiItem.SSID && ssid === '') {
        try {
          ssid = Buffer.from(wifiItem.SSID, 'base64').toString('utf8');
        } catch (err) {
          util.noop();
        }
      }
      result.push({
        ssid,
        bssid: wifiItem.BSSID || '',
        mode: '',
        channel: wifiItem.CHANNEL,
        frequency: wifiFrequencyFromChannel(wifiItem.CHANNEL),
        signalLevel: signalLevel ? parseInt(signalLevel, 10) : null,
        quality: wifiQualityFromDB(signalLevel),
        security,
        wpaFlags,
        rsnFlags: []
      });
    });
  }
  return result;
}
function wifiNetworks(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux) {
        result = getWifiNetworkListNmi();
        if (result.length === 0) {
          try {
            const iwconfigParts = execSync('export LC_ALL=C; iwconfig 2>/dev/null; unset LC_ALL').toString().split('\n\n');
            let iface = '';
            iwconfigParts.forEach(element => {
              if (element.indexOf('no wireless') === -1 && element.trim() !== '') {
                iface = element.split(' ')[0];
              }
            });
            if (iface) {
              let ifaceSanitized = '';
              const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(iface, true);
              const l = util.mathMin(s.length, 2000);

              for (let i = 0; i <= l; i++) {
                if (s[i] !== undefined) {
                  ifaceSanitized = ifaceSanitized + s[i];
                }
              }

              const res = getWifiNetworkListIw(ifaceSanitized);
              if (res === -1) {
                // try again after 4 secs
                setTimeout(function (iface) {
                  const res = getWifiNetworkListIw(iface);
                  if (res != -1) { result = res; }
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }, 4000);
              } else {
                result = res;
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } catch (e) {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else if (_darwin) {
        let cmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s -x';
        exec(cmd, { maxBuffer: 1024 * 40000 }, function (error, stdout) {
          const output = stdout.toString();
          result = parseWifiDarwin(util.plistParser(output));
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else if (_windows) {
        let cmd = 'netsh wlan show networks mode=Bssid';
        util.powerShell(cmd).then((stdout) => {
          const ssidParts = stdout.toString('utf8').split(os.EOL + os.EOL + 'SSID ');
          ssidParts.shift();

          ssidParts.forEach(ssidPart => {
            const ssidLines = ssidPart.split(os.EOL);
            if (ssidLines && ssidLines.length >= 8 && ssidLines[0].indexOf(':') >= 0) {
              const bssidsParts = ssidPart.split(' BSSID');
              bssidsParts.shift();

              bssidsParts.forEach((bssidPart) => {
                const bssidLines = bssidPart.split(os.EOL);
                const bssidLine = bssidLines[0].split(':');
                bssidLine.shift();
                const bssid = bssidLine.join(':').trim().toLowerCase();
                const channel = bssidLines[3].split(':').pop().trim();
                const quality = bssidLines[1].split(':').pop().trim();

                result.push({
                  ssid: ssidLines[0].split(':').pop().trim(),
                  bssid,
                  mode: '',
                  channel: channel ? parseInt(channel, 10) : null,
                  frequency: wifiFrequencyFromChannel(channel),
                  signalLevel: wifiDBFromQuality(quality),
                  quality: quality ? parseInt(quality, 10) : null,
                  security: [ssidLines[2].split(':').pop().trim()],
                  wpaFlags: [ssidLines[3].split(':').pop().trim()],
                  rsnFlags: []
                });
              });
            }
          });

          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}

exports.wifiNetworks = wifiNetworks;

function getVendor(model) {
  model = model.toLowerCase();
  let result = '';
  if (model.indexOf('intel') >= 0) { result = 'Intel'; }
  else if (model.indexOf('realtek') >= 0) { result = 'Realtek'; }
  else if (model.indexOf('qualcom') >= 0) { result = 'Qualcom'; }
  else if (model.indexOf('broadcom') >= 0) { result = 'Broadcom'; }
  else if (model.indexOf('cavium') >= 0) { result = 'Cavium'; }
  else if (model.indexOf('cisco') >= 0) { result = 'Cisco'; }
  else if (model.indexOf('marvel') >= 0) { result = 'Marvel'; }
  else if (model.indexOf('zyxel') >= 0) { result = 'Zyxel'; }
  else if (model.indexOf('melanox') >= 0) { result = 'Melanox'; }
  else if (model.indexOf('d-link') >= 0) { result = 'D-Link'; }
  else if (model.indexOf('tp-link') >= 0) { result = 'TP-Link'; }
  else if (model.indexOf('asus') >= 0) { result = 'Asus'; }
  else if (model.indexOf('linksys') >= 0) { result = 'Linksys'; }
  return result;
}

function formatBssid(s) {
  s = s.replace(/</g, '').replace(/>/g, '').match(/.{1,2}/g) || [];
  return s.join(':');
}

function wifiConnections(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];

      if (_linux) {
        const ifaces = ifaceListLinux();
        const networkList = getWifiNetworkListNmi();
        ifaces.forEach(ifaceDetail => {
          let ifaceSanitized = '';
          const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(ifaceDetail.iface, true);
          const ll = util.mathMin(s.length, 2000);

          for (let i = 0; i <= ll; i++) {
            if (s[i] !== undefined) {
              ifaceSanitized = ifaceSanitized + s[i];
            }
          }

          const nmiDetails = nmiDeviceLinux(ifaceSanitized);
          const wpaDetails = wpaConnectionLinux(ifaceSanitized);
          const ssid = nmiDetails.ssid || wpaDetails.ssid;
          const network = networkList.filter(nw => nw.ssid === ssid);
          let ssidSanitized = '';
          const t = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(ssid, true);
          const l = util.mathMin(t.length, 2000);
          for (let i = 0; i <= l; i++) {
            if (t[i] !== undefined) {
              ssidSanitized = ssidSanitized + t[i];
            }
          }

          const nmiConnection = nmiConnectionLinux(ssidSanitized);
          const channel = network && network.length && network[0].channel ? network[0].channel : (wpaDetails.channel ? wpaDetails.channel : null);
          const bssid = network && network.length && network[0].bssid ? network[0].bssid : (wpaDetails.bssid ? wpaDetails.bssid : null);
          const signalLevel = network && network.length && network[0].signalLevel ? network[0].signalLevel : null;
          if (ssid && bssid) {
            result.push({
              id: ifaceDetail.id,
              iface: ifaceDetail.iface,
              model: nmiDetails.product,
              ssid,
              bssid: network && network.length && network[0].bssid ? network[0].bssid : (wpaDetails.bssid ? wpaDetails.bssid : null),
              channel,
              frequency: channel ? wifiFrequencyFromChannel(channel) : null,
              type: nmiConnection.type ? nmiConnection.type : '802.11',
              security: nmiConnection.security ? nmiConnection.security : (wpaDetails.security ? wpaDetails.security : null),
              signalLevel,
              quality: wifiQualityFromDB(signalLevel),
              txRate: null
            });
          }
        });
        if (callback) {
          callback(result);
        }
        resolve(result);
      } else if (_darwin) {
        let cmd = 'system_profiler SPNetworkDataType';
        exec(cmd, function (error, stdout) {
          const parts1 = stdout.toString().split('\n\n    Wi-Fi:\n\n');
          if (parts1.length > 1) {
            const lines = parts1[1].split('\n\n')[0].split('\n');
            const iface = util.getValue(lines, 'BSD Device Name', ':', true);
            const model = util.getValue(lines, 'hardware', ':', true);
            cmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null; echo "######" ; ioreg -n AppleBCMWLANSkywalkInterface -r 2>/dev/null';
            exec(cmd, function (error, stdout) {
              const parts = stdout.toString().split('######');
              const lines2 = parts[0].split('\n');
              let lines3 = [];
              if (parts[1].indexOf('  | {') > 0 && parts[1].indexOf('  | }') > parts[1].indexOf('  | {')) {
                lines3 = parts[1].split('  | {')[1].split('  | }')[0].replace(/ \| /g, '').replace(/"/g, '').split('\n');
              }
              if (lines2.length > 10) {
                const ssid = util.getValue(lines2, 'ssid', ':', true);
                const bssid = util.getValue(lines2, 'bssid', ':', true) || formatBssid(util.getValue(lines3, 'IO80211BSSID', '=', true));
                const security = util.getValue(lines2, 'link auth', ':', true);
                const txRate = util.getValue(lines2, 'lastTxRate', ':', true);
                const channel = util.getValue(lines2, 'channel', ':', true).split(',')[0];
                const type = '802.11';
                const rssi = util.toInt(util.getValue(lines2, 'agrCtlRSSI', ':', true));
                /// const noise = util.toInt(util.getValue(lines2, 'agrCtlNoise', ':', true));
                const signalLevel = rssi;
                if (ssid || bssid) {
                  result.push({
                    id: 'Wi-Fi',
                    iface,
                    model,
                    ssid,
                    bssid,
                    channel: util.toInt(channel),
                    frequency: channel ? wifiFrequencyFromChannel(channel) : null,
                    type,
                    security,
                    signalLevel,
                    quality: wifiQualityFromDB(signalLevel),
                    txRate
                  });
                }
              }
              if (lines3.length > 10) {
                const ssid = util.getValue(lines3, 'IO80211SSID', '=', true);
                const bssid = formatBssid(util.getValue(lines3, 'IO80211BSSID', '=', true));
                const security = '';
                const txRate = -1;
                const signalLevel = -1;
                const quality = -1;
                const channel = util.getValue(lines3, 'IO80211Channel', '=', true);
                const type = '802.11';
                if ((ssid || bssid) && !result.length) {
                  result.push({
                    id: 'Wi-Fi',
                    iface,
                    model,
                    ssid,
                    bssid,
                    channel: util.toInt(channel),
                    frequency: channel ? wifiFrequencyFromChannel(channel) : null,
                    type,
                    security,
                    signalLevel,
                    quality,
                    txRate
                  });
                }
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      } else if (_windows) {
        let cmd = 'netsh wlan show interfaces';
        util.powerShell(cmd).then(function (stdout) {
          const allLines = stdout.toString().split('\r\n');
          for (let i = 0; i < allLines.length; i++) {
            allLines[i] = allLines[i].trim();
          }
          const parts = allLines.join('\r\n').split(':\r\n\r\n');
          parts.shift();
          parts.forEach(part => {
            const lines = part.split('\r\n');
            if (lines.length >= 5) {
              const iface = lines[0].indexOf(':') >= 0 ? lines[0].split(':')[1].trim() : '';
              const model = lines[1].indexOf(':') >= 0 ? lines[1].split(':')[1].trim() : '';
              const id = lines[2].indexOf(':') >= 0 ? lines[2].split(':')[1].trim() : '';
              const ssid = util.getValue(lines, 'SSID', ':', true);
              const bssid = util.getValue(lines, 'BSSID', ':', true);
              const quality = util.getValue(lines, 'Signal', ':', true);
              const signalLevel = wifiDBFromQuality(quality);
              const type = util.getValue(lines, 'Radio type', ':', true) || util.getValue(lines, 'Type de radio', ':', true) || util.getValue(lines, 'Funktyp', ':', true) || null;
              const security = util.getValue(lines, 'authentication', ':', true) || util.getValue(lines, 'Authentification', ':', true) || util.getValue(lines, 'Authentifizierung', ':', true) || null;
              const channel = util.getValue(lines, 'Channel', ':', true) || util.getValue(lines, 'Canal', ':', true) || util.getValue(lines, 'Kanal', ':', true) || null;
              const txRate = util.getValue(lines, 'Transmit rate (mbps)', ':', true) || util.getValue(lines, 'Transmission (mbit/s)', ':', true) || util.getValue(lines, 'Empfangsrate (MBit/s)', ':', true) || null;
              if (model && id && ssid && bssid) {
                result.push({
                  id,
                  iface,
                  model,
                  ssid,
                  bssid,
                  channel: util.toInt(channel),
                  frequency: channel ? wifiFrequencyFromChannel(channel) : null,
                  type,
                  security,
                  signalLevel,
                  quality: quality ? parseInt(quality, 10) : null,
                  txRate: util.toInt(txRate) || null
                });
              }
            }
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}

exports.wifiConnections = wifiConnections;

function wifiInterfaces(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];

      if (_linux) {
        const ifaces = ifaceListLinux();
        ifaces.forEach(ifaceDetail => {
          const nmiDetails = nmiDeviceLinux(ifaceDetail.iface);
          result.push({
            id: ifaceDetail.id,
            iface: ifaceDetail.iface,
            model: nmiDetails.product ? nmiDetails.product : null,
            vendor: nmiDetails.vendor ? nmiDetails.vendor : null,
            mac: ifaceDetail.mac,
          });
        });
        if (callback) {
          callback(result);
        }
        resolve(result);
      } else if (_darwin) {
        let cmd = 'system_profiler SPNetworkDataType';
        exec(cmd, function (error, stdout) {
          const parts1 = stdout.toString().split('\n\n    Wi-Fi:\n\n');
          if (parts1.length > 1) {
            const lines = parts1[1].split('\n\n')[0].split('\n');
            const iface = util.getValue(lines, 'BSD Device Name', ':', true);
            const mac = util.getValue(lines, 'MAC Address', ':', true);
            const model = util.getValue(lines, 'hardware', ':', true);
            result.push({
              id: 'Wi-Fi',
              iface,
              model,
              vendor: '',
              mac
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else if (_windows) {
        let cmd = 'netsh wlan show interfaces';
        util.powerShell(cmd).then(function (stdout) {
          const allLines = stdout.toString().split('\r\n');
          for (let i = 0; i < allLines.length; i++) {
            allLines[i] = allLines[i].trim();
          }
          const parts = allLines.join('\r\n').split(':\r\n\r\n');
          parts.shift();
          parts.forEach(part => {
            const lines = part.split('\r\n');
            if (lines.length >= 5) {
              const iface = lines[0].indexOf(':') >= 0 ? lines[0].split(':')[1].trim() : '';
              const model = lines[1].indexOf(':') >= 0 ? lines[1].split(':')[1].trim() : '';
              const id = lines[2].indexOf(':') >= 0 ? lines[2].split(':')[1].trim() : '';
              const macParts = lines[3].indexOf(':') >= 0 ? lines[3].split(':') : [];
              macParts.shift();
              const mac = macParts.join(':').trim();
              const vendor = getVendor(model);
              if (iface && model && id && mac) {
                result.push({
                  id,
                  iface,
                  model,
                  vendor,
                  mac,
                });
              }
            }
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}

exports.wifiInterfaces = wifiInterfaces;


/***/ }),

/***/ 9991:
/***/ ((module) => {

module.exports = eval("require")("debug");


/***/ }),

/***/ 4616:
/***/ ((module) => {

module.exports = eval("require")("osx-temperature-sensor");


/***/ }),

/***/ 9491:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 2081:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 2361:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 7147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 3685:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 5687:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 1808:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 2037:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 1017:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 2781:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 7310:
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ 3837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 9796:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),

/***/ 2223:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Axios v1.7.2 Copyright (c) 2024 Matt Zabriskie and contributors


const FormData$1 = __nccwpck_require__(5676);
const url = __nccwpck_require__(7310);
const proxyFromEnv = __nccwpck_require__(7229);
const http = __nccwpck_require__(3685);
const https = __nccwpck_require__(5687);
const util = __nccwpck_require__(3837);
const followRedirects = __nccwpck_require__(2803);
const zlib = __nccwpck_require__(9796);
const stream = __nccwpck_require__(2781);
const events = __nccwpck_require__(2361);

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

const FormData__default = /*#__PURE__*/_interopDefaultLegacy(FormData$1);
const url__default = /*#__PURE__*/_interopDefaultLegacy(url);
const http__default = /*#__PURE__*/_interopDefaultLegacy(http);
const https__default = /*#__PURE__*/_interopDefaultLegacy(https);
const util__default = /*#__PURE__*/_interopDefaultLegacy(util);
const followRedirects__default = /*#__PURE__*/_interopDefaultLegacy(followRedirects);
const zlib__default = /*#__PURE__*/_interopDefaultLegacy(zlib);
const stream__default = /*#__PURE__*/_interopDefaultLegacy(stream);

function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// utils is a library of generic helper functions non-specific to axios

const {toString} = Object.prototype;
const {getPrototypeOf} = Object;

const kindOf = (cache => thing => {
    const str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type
};

const typeOfTest = type => thing => typeof thing === type;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 *
 * @returns {boolean} True if value is an Array, otherwise false
 */
const {isArray} = Array;

/**
 * Determine if a value is undefined
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if the value is undefined, otherwise false
 */
const isUndefined = typeOfTest('undefined');

/**
 * Determine if a value is a Buffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
const isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  let result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a String, otherwise false
 */
const isString = typeOfTest('string');

/**
 * Determine if a value is a Function
 *
 * @param {*} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
const isFunction = typeOfTest('function');

/**
 * Determine if a value is a Number
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Number, otherwise false
 */
const isNumber = typeOfTest('number');

/**
 * Determine if a value is an Object
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an Object, otherwise false
 */
const isObject = (thing) => thing !== null && typeof thing === 'object';

/**
 * Determine if a value is a Boolean
 *
 * @param {*} thing The value to test
 * @returns {boolean} True if value is a Boolean, otherwise false
 */
const isBoolean = thing => thing === true || thing === false;

/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
const isPlainObject = (val) => {
  if (kindOf(val) !== 'object') {
    return false;
  }

  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
};

/**
 * Determine if a value is a Date
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Date, otherwise false
 */
const isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Blob, otherwise false
 */
const isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Stream
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Stream, otherwise false
 */
const isStream = (val) => isObject(val) && isFunction(val.pipe);

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
const isFormData = (thing) => {
  let kind;
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) || (
      isFunction(thing.append) && (
        (kind = kindOf(thing)) === 'formdata' ||
        // detect form-data instance
        (kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]')
      )
    )
  )
};

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
const isURLSearchParams = kindOfTest('URLSearchParams');

const [isReadableStream, isRequest, isResponse, isHeaders] = ['ReadableStream', 'Request', 'Response', 'Headers'].map(kindOfTest);

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 *
 * @returns {String} The String freed of excess whitespace
 */
const trim = (str) => str.trim ?
  str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 *
 * @param {Boolean} [allOwnKeys = false]
 * @returns {any}
 */
function forEach(obj, fn, {allOwnKeys = false} = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;

    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}

const _global = (() => {
  /*eslint no-undef:0*/
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
})();

const isContextDefined = (context) => !isUndefined(context) && context !== _global;

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 *
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  const {caseless} = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };

  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Boolean} [allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, {allOwnKeys});
  return a;
};

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 *
 * @returns {string} content value without BOM
 */
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 *
 * @returns {void}
 */
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, 'super', {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function|Boolean} [filter]
 * @param {Function} [propFilter]
 *
 * @returns {Object}
 */
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};

  destObj = destObj || {};
  // eslint-disable-next-line no-eq-null,eqeqeq
  if (sourceObj == null) return destObj;

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
};

/**
 * Determines whether a string ends with the characters of a specified string
 *
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 *
 * @returns {boolean}
 */
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};


/**
 * Returns new array from array like object or null if failed
 *
 * @param {*} [thing]
 *
 * @returns {?Array}
 */
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};

/**
 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
 * thing passed in is an instance of Uint8Array
 *
 * @param {TypedArray}
 *
 * @returns {Array}
 */
// eslint-disable-next-line func-names
const isTypedArray = (TypedArray => {
  // eslint-disable-next-line func-names
  return thing => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

/**
 * For each entry in the object, call the function with the key and value.
 *
 * @param {Object<any, any>} obj - The object to iterate over.
 * @param {Function} fn - The function to call for each entry.
 *
 * @returns {void}
 */
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[Symbol.iterator];

  const iterator = generator.call(obj);

  let result;

  while ((result = iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};

/**
 * It takes a regular expression and a string, and returns an array of all the matches
 *
 * @param {string} regExp - The regular expression to match against.
 * @param {string} str - The string to search.
 *
 * @returns {Array<boolean>}
 */
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];

  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }

  return arr;
};

/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
const isHTMLForm = kindOfTest('HTMLFormElement');

const toCamelCase = str => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};

/* Creating a function that will check if an object has a property. */
const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

/**
 * Determine if a value is a RegExp object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a RegExp object, otherwise false
 */
const isRegExp = kindOfTest('RegExp');

const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};

  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });

  Object.defineProperties(obj, reducedDescriptors);
};

/**
 * Makes all methods read-only
 * @param {Object} obj
 */

const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    // skip restricted props in strict mode
    if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
      return false;
    }

    const value = obj[name];

    if (!isFunction(value)) return;

    descriptor.enumerable = false;

    if ('writable' in descriptor) {
      descriptor.writable = false;
      return;
    }

    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error('Can not rewrite read-only method \'' + name + '\'');
      };
    }
  });
};

const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};

  const define = (arr) => {
    arr.forEach(value => {
      obj[value] = true;
    });
  };

  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

  return obj;
};

const noop = () => {};

const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

const DIGIT = '0123456789';

const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};

const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = '';
  const {length} = alphabet;
  while (size--) {
    str += alphabet[Math.random() * length|0];
  }

  return str;
};

/**
 * If the thing is a FormData object, return true, otherwise return false.
 *
 * @param {unknown} thing - The thing to check.
 *
 * @returns {boolean}
 */
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
}

const toJSONObject = (obj) => {
  const stack = new Array(10);

  const visit = (source, i) => {

    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }

      if(!('toJSON' in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};

        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });

        stack[i] = undefined;

        return target;
      }
    }

    return source;
  };

  return visit(obj, 0);
};

const isAsyncFn = kindOfTest('AsyncFunction');

const isThenable = (thing) =>
  thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  ALPHABET,
  generateString,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable
};

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 *
 * @returns {Error} The created error.
 */
function AxiosError(message, code, config, request, response) {
  Error.call(this);

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error()).stack;
  }

  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

utils$1.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils$1.toJSONObject(this.config),
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});

const prototype$1 = AxiosError.prototype;
const descriptors = {};

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED',
  'ERR_NOT_SUPPORT',
  'ERR_INVALID_URL'
// eslint-disable-next-line func-names
].forEach(code => {
  descriptors[code] = {value: code};
});

Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

// eslint-disable-next-line func-names
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype$1);

  utils$1.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  }, prop => {
    return prop !== 'isAxiosError';
  });

  AxiosError.call(axiosError, error.message, code, config, request, response);

  axiosError.cause = error;

  axiosError.name = error.name;

  customProps && Object.assign(axiosError, customProps);

  return axiosError;
};

/**
 * Determines if the given thing is a array or js object.
 *
 * @param {string} thing - The object or array to be visited.
 *
 * @returns {boolean}
 */
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}

/**
 * It removes the brackets from the end of a string
 *
 * @param {string} key - The key of the parameter.
 *
 * @returns {string} the key without the brackets.
 */
function removeBrackets(key) {
  return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * It takes a path, a key, and a boolean, and returns a string
 *
 * @param {string} path - The path to the current key.
 * @param {string} key - The key of the current object being iterated over.
 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
 *
 * @returns {string} The path to the current key.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    // eslint-disable-next-line no-param-reassign
    token = removeBrackets(token);
    return !dots && i ? '[' + token + ']' : token;
  }).join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 *
 * @param {Array<any>} arr - The array to check
 *
 * @returns {boolean}
 */
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}

const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});

/**
 * Convert a data object to FormData
 *
 * @param {Object} obj
 * @param {?Object} [formData]
 * @param {?Object} [options]
 * @param {Function} [options.visitor]
 * @param {Boolean} [options.metaTokens = true]
 * @param {Boolean} [options.dots = false]
 * @param {?Boolean} [options.indexes = false]
 *
 * @returns {Object}
 **/

/**
 * It converts an object into a FormData object
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (FormData__default["default"] || FormData)();

  // eslint-disable-next-line no-param-reassign
  options = utils$1.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    return !utils$1.isUndefined(source[option]);
  });

  const metaTokens = options.metaTokens;
  // eslint-disable-next-line no-use-before-define
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);

  if (!utils$1.isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }

  function convertValue(value) {
    if (value === null) return '';

    if (utils$1.isDate(value)) {
      return value.toISOString();
    }

    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError('Blob is not supported. Use a Buffer instead.');
    }

    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  /**
   * Default visitor.
   *
   * @param {*} value
   * @param {String|Number} key
   * @param {Array<String|Number>} path
   * @this {FormData}
   *
   * @returns {boolean} return true to visit the each prop of the value recursively
   */
  function defaultVisitor(value, key, path) {
    let arr = value;

    if (value && !path && typeof value === 'object') {
      if (utils$1.endsWith(key, '{}')) {
        // eslint-disable-next-line no-param-reassign
        key = metaTokens ? key : key.slice(0, -2);
        // eslint-disable-next-line no-param-reassign
        value = JSON.stringify(value);
      } else if (
        (utils$1.isArray(value) && isFlatArray(value)) ||
        ((utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value))
        )) {
        // eslint-disable-next-line no-param-reassign
        key = removeBrackets(key);

        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
            convertValue(el)
          );
        });
        return false;
      }
    }

    if (isVisitable(value)) {
      return true;
    }

    formData.append(renderKey(path, key, dots), convertValue(value));

    return false;
  }

  const stack = [];

  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });

  function build(value, path) {
    if (utils$1.isUndefined(value)) return;

    if (stack.indexOf(value) !== -1) {
      throw Error('Circular reference detected in ' + path.join('.'));
    }

    stack.push(value);

    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
        formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers
      );

      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });

    stack.pop();
  }

  if (!utils$1.isObject(obj)) {
    throw new TypeError('data must be an object');
  }

  build(obj);

  return formData;
}

/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode$1(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00'
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * It takes a params object and converts it to a FormData object
 *
 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
 *
 * @returns {void}
 */
function AxiosURLSearchParams(params, options) {
  this._pairs = [];

  params && toFormData(params, this, options);
}

const prototype = AxiosURLSearchParams.prototype;

prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};

prototype.toString = function toString(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;

  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + '=' + _encode(pair[1]);
  }, '').join('&');
};

/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?object} options
 *
 * @returns {string} The formatted url
 */
function buildURL(url, params, options) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }
  
  const _encode = options && options.encode || encode;

  const serializeFn = options && options.serialize;

  let serializedParams;

  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ?
      params.toString() :
      new AxiosURLSearchParams(params, options).toString(_encode);
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}

const InterceptorManager$1 = InterceptorManager;

const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

const URLSearchParams = url__default["default"].URLSearchParams;

const platform$1 = {
  isNode: true,
  classes: {
    URLSearchParams,
    FormData: FormData__default["default"],
    Blob: typeof Blob !== 'undefined' && Blob || null
  },
  protocols: [ 'http', 'https', 'file', 'data' ]
};

const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 *
 * @returns {boolean}
 */
const hasStandardBrowserEnv = (
  (product) => {
    return hasBrowserEnv && ['ReactNative', 'NativeScript', 'NS'].indexOf(product) < 0
  })(typeof navigator !== 'undefined' && navigator.product);

/**
 * Determine if we're running in a standard browser webWorker environment
 *
 * Although the `isStandardBrowserEnv` method indicates that
 * `allows axios to run in a web worker`, the WebWorker will still be
 * filtered out due to its judgment standard
 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
 * This leads to a problem when axios post `FormData` in webWorker
 */
const hasStandardBrowserWebWorkerEnv = (() => {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts === 'function'
  );
})();

const origin = hasBrowserEnv && window.location.href || 'http://localhost';

const utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  hasBrowserEnv: hasBrowserEnv,
  hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
  hasStandardBrowserEnv: hasStandardBrowserEnv,
  origin: origin
});

const platform = {
  ...utils,
  ...platform$1
};

function toURLEncodedForm(data, options) {
  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }

      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}

/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param {string} name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name) {
  // foo[x][y][z]
  // foo.x.y.z
  // foo-x-y-z
  // foo x y z
  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
    return match[0] === '[]' ? '' : match[1] || match[0];
  });
}

/**
 * Convert an array to an object.
 *
 * @param {Array<any>} arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param {string} formData The FormData object to convert to JSON.
 *
 * @returns {Object<string, any> | null} The converted object.
 */
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];

    if (name === '__proto__') return true;

    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;

    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }

      return !isNumericKey;
    }

    if (!target[name] || !utils$1.isObject(target[name])) {
      target[name] = [];
    }

    const result = buildPath(path, value, target[name], index);

    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }

    return !isNumericKey;
  }

  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};

    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });

    return obj;
  }

  return null;
}

/**
 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
 * of the input
 *
 * @param {any} rawValue - The value to be stringified.
 * @param {Function} parser - A function that parses a string into a JavaScript object.
 * @param {Function} encoder - A function that takes a value and returns a string.
 *
 * @returns {string} A stringified version of the rawValue.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

const defaults = {

  transitional: transitionalDefaults,

  adapter: ['xhr', 'http', 'fetch'],

  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.indexOf('application/json') > -1;
    const isObjectPayload = utils$1.isObject(data);

    if (isObjectPayload && utils$1.isHTMLForm(data)) {
      data = new FormData(data);
    }

    const isFormData = utils$1.isFormData(data);

    if (isFormData) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }

    if (utils$1.isArrayBuffer(data) ||
      utils$1.isBuffer(data) ||
      utils$1.isStream(data) ||
      utils$1.isFile(data) ||
      utils$1.isBlob(data) ||
      utils$1.isReadableStream(data)
    ) {
      return data;
    }
    if (utils$1.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils$1.isURLSearchParams(data)) {
      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
      return data.toString();
    }

    let isFileList;

    if (isObjectPayload) {
      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }

      if ((isFileList = utils$1.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
        const _FormData = this.env && this.env.FormData;

        return toFormData(
          isFileList ? {'files[]': data} : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }

    if (isObjectPayload || hasJSONContentType ) {
      headers.setContentType('application/json', false);
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === 'json';

    if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
      return data;
    }

    if (data && utils$1.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;

      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': undefined
    }
  }
};

utils$1.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], (method) => {
  defaults.headers[method] = {};
});

const defaults$1 = defaults;

// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = utils$1.toObjectSet([
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]);

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders Headers needing to be parsed
 *
 * @returns {Object} Headers parsed into an object
 */
const parseHeaders = rawHeaders => {
  const parsed = {};
  let key;
  let val;
  let i;

  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
    i = line.indexOf(':');
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();

    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
      return;
    }

    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

const $internals = Symbol('internals');

function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }

  return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
}

function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;

  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }

  return tokens;
}

const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (utils$1.isFunction(filter)) {
    return filter.call(this, value, header);
  }

  if (isHeaderNameFilter) {
    value = header;
  }

  if (!utils$1.isString(value)) return;

  if (utils$1.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }

  if (utils$1.isRegExp(filter)) {
    return filter.test(value);
  }
}

function formatHeader(header) {
  return header.trim()
    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
}

function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach(methodName => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = utils$1.findKey(self, lHeader);

      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if(utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isHeaders(header)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = utils$1.findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];

          deleted = true;
        }
      }
    }

    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format) {
    const self = this;
    const headers = {};

    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : String(header).trim();

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }

  toJSON(asStrings) {
    const obj = Object.create(null);

    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }

  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }

  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first, ...targets) {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header) {
    const internals = this[$internals] = (this[$internals] = {
      accessors: {}
    });

    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);

      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

    return this;
  }
}

AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

// reserved names hotfix
utils$1.reduceDescriptors(AxiosHeaders.prototype, ({value}, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  }
});

utils$1.freezeMethods(AxiosHeaders);

const AxiosHeaders$1 = AxiosHeaders;

/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 *
 * @returns {*} The resulting transformed data
 */
function transformData(fns, response) {
  const config = this || defaults$1;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;

  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  headers.normalize();

  return data;
}

function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @param {string=} message The message.
 * @param {Object=} config The config.
 * @param {Object=} request The request.
 *
 * @returns {CanceledError} The created error.
 */
function CanceledError(message, config, request) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
  this.name = 'CanceledError';
}

utils$1.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status code ' + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 *
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 *
 * @returns {string} The combined URL
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 *
 * @returns {string} The combined full path
 */
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

const VERSION = "1.7.2";

function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}

const DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;

/**
 * Parse data uri to a Buffer or Blob
 *
 * @param {String} uri
 * @param {?Boolean} asBlob
 * @param {?Object} options
 * @param {?Function} options.Blob
 *
 * @returns {Buffer|Blob}
 */
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform.classes.Blob;
  const protocol = parseProtocol(uri);

  if (asBlob === undefined && _Blob) {
    asBlob = true;
  }

  if (protocol === 'data') {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;

    const match = DATA_URL_PATTERN.exec(uri);

    if (!match) {
      throw new AxiosError('Invalid URL', AxiosError.ERR_INVALID_URL);
    }

    const mime = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? 'base64' : 'utf8');

    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError('Blob is not supported', AxiosError.ERR_NOT_SUPPORT);
      }

      return new _Blob([buffer], {type: mime});
    }

    return buffer;
  }

  throw new AxiosError('Unsupported protocol ' + protocol, AxiosError.ERR_NOT_SUPPORT);
}

/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Function}
 */
function throttle(fn, freq) {
  let timestamp = 0;
  const threshold = 1000 / freq;
  let timer = null;
  return function throttled() {
    const force = this === true;

    const now = Date.now();
    if (force || now - timestamp > threshold) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      timestamp = now;
      return fn.apply(null, arguments);
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        timestamp = Date.now();
        return fn.apply(null, arguments);
      }, threshold - (now - timestamp));
    }
  };
}

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;

  min = min !== undefined ? min : 1000;

  return function push(chunkLength) {
    const now = Date.now();

    const startedAt = timestamps[tail];

    if (!firstSampleTS) {
      firstSampleTS = now;
    }

    bytes[head] = chunkLength;
    timestamps[head] = now;

    let i = tail;
    let bytesCount = 0;

    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }

    head = (head + 1) % samplesCount;

    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }

    if (now - firstSampleTS < min) {
      return;
    }

    const passed = startedAt && now - startedAt;

    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}

const kInternals = Symbol('internals');

class AxiosTransformStream extends stream__default["default"].Transform{
  constructor(options) {
    options = utils$1.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils$1.isUndefined(source[prop]);
    });

    super({
      readableHighWaterMark: options.chunkSize
    });

    const self = this;

    const internals = this[kInternals] = {
      length: options.length,
      timeWindow: options.timeWindow,
      ticksRate: options.ticksRate,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };

    const _speedometer = speedometer(internals.ticksRate * options.samplesCount, internals.timeWindow);

    this.on('newListener', event => {
      if (event === 'progress') {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });

    let bytesNotified = 0;

    internals.updateProgress = throttle(function throttledHandler() {
      const totalBytes = internals.length;
      const bytesTransferred = internals.bytesSeen;
      const progressBytes = bytesTransferred - bytesNotified;
      if (!progressBytes || self.destroyed) return;

      const rate = _speedometer(progressBytes);

      bytesNotified = bytesTransferred;

      process.nextTick(() => {
        self.emit('progress', {
          loaded: bytesTransferred,
          total: totalBytes,
          progress: totalBytes ? (bytesTransferred / totalBytes) : undefined,
          bytes: progressBytes,
          rate: rate ? rate : undefined,
          estimated: rate && totalBytes && bytesTransferred <= totalBytes ?
            (totalBytes - bytesTransferred) / rate : undefined,
          lengthComputable: totalBytes != null
        });
      });
    }, internals.ticksRate);

    const onFinish = () => {
      internals.updateProgress.call(true);
    };

    this.once('end', onFinish);
    this.once('error', onFinish);
  }

  _read(size) {
    const internals = this[kInternals];

    if (internals.onReadCallback) {
      internals.onReadCallback();
    }

    return super._read(size);
  }

  _transform(chunk, encoding, callback) {
    const self = this;
    const internals = this[kInternals];
    const maxRate = internals.maxRate;

    const readableHighWaterMark = this.readableHighWaterMark;

    const timeWindow = internals.timeWindow;

    const divider = 1000 / timeWindow;
    const bytesThreshold = (maxRate / divider);
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;

    function pushChunk(_chunk, _callback) {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;

      if (internals.isCaptured) {
        internals.updateProgress();
      }

      if (self.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    }

    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;

      if (maxRate) {
        const now = Date.now();

        if (!internals.ts || (passed = (now - internals.ts)) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }

        bytesLeft = bytesThreshold - internals.bytes;
      }

      if (maxRate) {
        if (bytesLeft <= 0) {
          // next time window
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }

        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }

      if (maxChunkSize && chunkSize > maxChunkSize && (chunkSize - maxChunkSize) > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }

      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : _callback);
    };

    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }

      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }

  setLength(length) {
    this[kInternals].length = +length;
    return this;
  }
}

const AxiosTransformStream$1 = AxiosTransformStream;

const {asyncIterator} = Symbol;

const readBlob = async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
};

const readBlob$1 = readBlob;

const BOUNDARY_ALPHABET = utils$1.ALPHABET.ALPHA_DIGIT + '-_';

const textEncoder = new util.TextEncoder();

const CRLF = '\r\n';
const CRLF_BYTES = textEncoder.encode(CRLF);
const CRLF_BYTES_COUNT = 2;

class FormDataPart {
  constructor(name, value) {
    const {escapeName} = this.constructor;
    const isStringValue = utils$1.isString(value);

    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${
      !isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ''
    }${CRLF}`;

    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
    }

    this.headers = textEncoder.encode(headers + CRLF);

    this.contentLength = isStringValue ? value.byteLength : value.size;

    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;

    this.name = name;
    this.value = value;
  }

  async *encode(){
    yield this.headers;

    const {value} = this;

    if(utils$1.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob$1(value);
    }

    yield CRLF_BYTES;
  }

  static escapeName(name) {
      return String(name).replace(/[\r\n"]/g, (match) => ({
        '\r' : '%0D',
        '\n' : '%0A',
        '"' : '%22',
      }[match]));
  }
}

const formDataToStream = (form, headersHandler, options) => {
  const {
    tag = 'form-data-boundary',
    size = 25,
    boundary = tag + '-' + utils$1.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};

  if(!utils$1.isFormData(form)) {
    throw TypeError('FormData instance required');
  }

  if (boundary.length < 1 || boundary.length > 70) {
    throw Error('boundary must be 10-70 characters long')
  }

  const boundaryBytes = textEncoder.encode('--' + boundary + CRLF);
  const footerBytes = textEncoder.encode('--' + boundary + '--' + CRLF + CRLF);
  let contentLength = footerBytes.byteLength;

  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });

  contentLength += boundaryBytes.byteLength * parts.length;

  contentLength = utils$1.toFiniteNumber(contentLength);

  const computedHeaders = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  };

  if (Number.isFinite(contentLength)) {
    computedHeaders['Content-Length'] = contentLength;
  }

  headersHandler && headersHandler(computedHeaders);

  return stream.Readable.from((async function *() {
    for(const part of parts) {
      yield boundaryBytes;
      yield* part.encode();
    }

    yield footerBytes;
  })());
};

const formDataToStream$1 = formDataToStream;

class ZlibHeaderTransformStream extends stream__default["default"].Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }

  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;

      // Add Default Compression headers if no zlib headers are present
      if (chunk[0] !== 120) { // Hex: 78
        const header = Buffer.alloc(2);
        header[0] = 120; // Hex: 78
        header[1] = 156; // Hex: 9C 
        this.push(header, encoding);
      }
    }

    this.__transform(chunk, encoding, callback);
  }
}

const ZlibHeaderTransformStream$1 = ZlibHeaderTransformStream;

const callbackify = (fn, reducer) => {
  return utils$1.isAsyncFn(fn) ? function (...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
};

const callbackify$1 = callbackify;

const zlibOptions = {
  flush: zlib__default["default"].constants.Z_SYNC_FLUSH,
  finishFlush: zlib__default["default"].constants.Z_SYNC_FLUSH
};

const brotliOptions = {
  flush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH
};

const isBrotliSupported = utils$1.isFunction(zlib__default["default"].createBrotliDecompress);

const {http: httpFollow, https: httpsFollow} = followRedirects__default["default"];

const isHttps = /https:?/;

const supportedProtocols = platform.protocols.map(protocol => {
  return protocol + ':';
});

/**
 * If the proxy or config beforeRedirects functions are defined, call them with the options
 * object.
 *
 * @param {Object<string, any>} options - The options object that was passed to the request.
 *
 * @returns {Object<string, any>}
 */
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}

/**
 * If the proxy or config afterRedirects functions are defined, call them with the options
 *
 * @param {http.ClientRequestArgs} options
 * @param {AxiosProxyConfig} configProxy configuration from Axios options object
 * @param {string} location
 *
 * @returns {http.ClientRequestArgs}
 */
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = proxyFromEnv.getProxyForUrl(location);
    if (proxyUrl) {
      proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    // Basic proxy authorization
    if (proxy.username) {
      proxy.auth = (proxy.username || '') + ':' + (proxy.password || '');
    }

    if (proxy.auth) {
      // Support proxy auth object form
      if (proxy.auth.username || proxy.auth.password) {
        proxy.auth = (proxy.auth.username || '') + ':' + (proxy.auth.password || '');
      }
      const base64 = Buffer
        .from(proxy.auth, 'utf8')
        .toString('base64');
      options.headers['Proxy-Authorization'] = 'Basic ' + base64;
    }

    options.headers.host = options.hostname + (options.port ? ':' + options.port : '');
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    // Replace 'host' since options is not a URL object
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(':') ? proxy.protocol : `${proxy.protocol}:`;
    }
  }

  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    // Configure proxy for redirected request, passing the original config proxy to apply
    // the exact same logic as if the redirected request was performed by axios directly.
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}

const isHttpAdapterSupported = typeof process !== 'undefined' && utils$1.kindOf(process) === 'process';

// temporary hotfix

const wrapAsync = (asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;

    const done = (value, isRejected) => {
      if (isDone) return;
      isDone = true;
      onDone && onDone(value, isRejected);
    };

    const _resolve = (value) => {
      done(value);
      resolve(value);
    };

    const _reject = (reason) => {
      done(reason, true);
      reject(reason);
    };

    asyncExecutor(_resolve, _reject, (onDoneHandler) => (onDone = onDoneHandler)).catch(_reject);
  })
};

const resolveFamily = ({address, family}) => {
  if (!utils$1.isString(address)) {
    throw TypeError('address must be a string');
  }
  return ({
    address,
    family: family || (address.indexOf('.') < 0 ? 6 : 4)
  });
};

const buildAddressEntry = (address, family) => resolveFamily(utils$1.isObject(address) ? address : {address, family});

/*eslint consistent-return:0*/
const httpAdapter = isHttpAdapterSupported && function httpAdapter(config) {
  return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
    let {data, lookup, family} = config;
    const {responseType, responseEncoding} = config;
    const method = config.method.toUpperCase();
    let isDone;
    let rejected = false;
    let req;

    if (lookup) {
      const _lookup = callbackify$1(lookup, (value) => utils$1.isArray(value) ? value : [value]);
      // hotfix to support opt.all option which is required for node 20.x
      lookup = (hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) {
            return cb(err);
          }

          const addresses = utils$1.isArray(arg0) ? arg0.map(addr => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];

          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
        });
      };
    }

    // temporary internal emitter until the AxiosRequest class will be implemented
    const emitter = new events.EventEmitter();

    const onFinished = () => {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', abort);
      }

      emitter.removeAllListeners();
    };

    onDone((value, isRejected) => {
      isDone = true;
      if (isRejected) {
        rejected = true;
        onFinished();
      }
    });

    function abort(reason) {
      emitter.emit('abort', !reason || reason.type ? new CanceledError(null, config, req) : reason);
    }

    emitter.once('abort', reject);

    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort);
      if (config.signal) {
        config.signal.aborted ? abort() : config.signal.addEventListener('abort', abort);
      }
    }

    // Parse url
    const fullPath = buildFullPath(config.baseURL, config.url);
    const parsed = new URL(fullPath, 'http://localhost');
    const protocol = parsed.protocol || supportedProtocols[0];

    if (protocol === 'data:') {
      let convertedData;

      if (method !== 'GET') {
        return settle(resolve, reject, {
          status: 405,
          statusText: 'method not allowed',
          headers: {},
          config
        });
      }

      try {
        convertedData = fromDataURI(config.url, responseType === 'blob', {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError.from(err, AxiosError.ERR_BAD_REQUEST, config);
      }

      if (responseType === 'text') {
        convertedData = convertedData.toString(responseEncoding);

        if (!responseEncoding || responseEncoding === 'utf8') {
          convertedData = utils$1.stripBOM(convertedData);
        }
      } else if (responseType === 'stream') {
        convertedData = stream__default["default"].Readable.from(convertedData);
      }

      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders$1(),
        config
      });
    }

    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(new AxiosError(
        'Unsupported protocol ' + protocol,
        AxiosError.ERR_BAD_REQUEST,
        config
      ));
    }

    const headers = AxiosHeaders$1.from(config.headers).normalize();

    // Set User-Agent (required by some servers)
    // See https://github.com/axios/axios/issues/69
    // User-Agent is specified; handle case where no UA header is desired
    // Only set header if it hasn't been set in config
    headers.set('User-Agent', 'axios/' + VERSION, false);

    const onDownloadProgress = config.onDownloadProgress;
    const onUploadProgress = config.onUploadProgress;
    const maxRate = config.maxRate;
    let maxUploadRate = undefined;
    let maxDownloadRate = undefined;

    // support for spec compliant FormData objects
    if (utils$1.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);

      data = formDataToStream$1(data, (formHeaders) => {
        headers.set(formHeaders);
      }, {
        tag: `axios-${VERSION}-boundary`,
        boundary: userBoundary && userBoundary[1] || undefined
      });
      // support for https://www.npmjs.com/package/form-data api
    } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders());

      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util__default["default"].promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
          /*eslint no-empty:0*/
        } catch (e) {
        }
      }
    } else if (utils$1.isBlob(data)) {
      data.size && headers.setContentType(data.type || 'application/octet-stream');
      headers.setContentLength(data.size || 0);
      data = stream__default["default"].Readable.from(readBlob$1(data));
    } else if (data && !utils$1.isStream(data)) {
      if (Buffer.isBuffer(data)) ; else if (utils$1.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils$1.isString(data)) {
        data = Buffer.from(data, 'utf-8');
      } else {
        return reject(new AxiosError(
          'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
          AxiosError.ERR_BAD_REQUEST,
          config
        ));
      }

      // Add Content-Length header if data exists
      headers.setContentLength(data.length, false);

      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        return reject(new AxiosError(
          'Request body larger than maxBodyLength limit',
          AxiosError.ERR_BAD_REQUEST,
          config
        ));
      }
    }

    const contentLength = utils$1.toFiniteNumber(headers.getContentLength());

    if (utils$1.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }

    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils$1.isStream(data)) {
        data = stream__default["default"].Readable.from(data, {objectMode: false});
      }

      data = stream__default["default"].pipeline([data, new AxiosTransformStream$1({
        length: contentLength,
        maxRate: utils$1.toFiniteNumber(maxUploadRate)
      })], utils$1.noop);

      onUploadProgress && data.on('progress', progress => {
        onUploadProgress(Object.assign(progress, {
          upload: true
        }));
      });
    }

    // HTTP basic authentication
    let auth = undefined;
    if (config.auth) {
      const username = config.auth.username || '';
      const password = config.auth.password || '';
      auth = username + ':' + password;
    }

    if (!auth && parsed.username) {
      const urlUsername = parsed.username;
      const urlPassword = parsed.password;
      auth = urlUsername + ':' + urlPassword;
    }

    auth && headers.delete('authorization');

    let path;

    try {
      path = buildURL(
        parsed.pathname + parsed.search,
        config.params,
        config.paramsSerializer
      ).replace(/^\?/, '');
    } catch (err) {
      const customErr = new Error(err.message);
      customErr.config = config;
      customErr.url = config.url;
      customErr.exists = true;
      return reject(customErr);
    }

    headers.set(
      'Accept-Encoding',
      'gzip, compress, deflate' + (isBrotliSupported ? ', br' : ''), false
      );

    const options = {
      path,
      method: method,
      headers: headers.toJSON(),
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {}
    };

    // cacheable-lookup integration hotfix
    !utils$1.isUndefined(lookup) && (options.lookup = lookup);

    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname;
      options.port = parsed.port;
      setProxy(options, config.proxy, protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + options.path);
    }

    let transport;
    const isHttpsRequest = isHttps.test(options.protocol);
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsRequest ? https__default["default"] : http__default["default"];
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      if (config.beforeRedirect) {
        options.beforeRedirects.config = config.beforeRedirect;
      }
      transport = isHttpsRequest ? httpsFollow : httpFollow;
    }

    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    } else {
      // follow-redirects does not skip comparison, so it should always succeed for axios -1 unlimited
      options.maxBodyLength = Infinity;
    }

    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }

    // Create the request
    req = transport.request(options, function handleResponse(res) {
      if (req.destroyed) return;

      const streams = [res];

      const responseLength = +res.headers['content-length'];

      if (onDownloadProgress) {
        const transformStream = new AxiosTransformStream$1({
          length: utils$1.toFiniteNumber(responseLength),
          maxRate: utils$1.toFiniteNumber(maxDownloadRate)
        });

        onDownloadProgress && transformStream.on('progress', progress => {
          onDownloadProgress(Object.assign(progress, {
            download: true
          }));
        });

        streams.push(transformStream);
      }

      // decompress the response body transparently if required
      let responseStream = res;

      // return the last request in case of redirects
      const lastRequest = res.req || req;

      // if decompress disabled we should not decompress
      if (config.decompress !== false && res.headers['content-encoding']) {
        // if no content, but headers still say that it is encoded,
        // remove the header not confuse downstream operations
        if (method === 'HEAD' || res.statusCode === 204) {
          delete res.headers['content-encoding'];
        }

        switch ((res.headers['content-encoding'] || '').toLowerCase()) {
        /*eslint default-case:0*/
        case 'gzip':
        case 'x-gzip':
        case 'compress':
        case 'x-compress':
          // add the unzipper to the body stream processing pipeline
          streams.push(zlib__default["default"].createUnzip(zlibOptions));

          // remove the content-encoding in order to not confuse downstream operations
          delete res.headers['content-encoding'];
          break;
        case 'deflate':
          streams.push(new ZlibHeaderTransformStream$1());

          // add the unzipper to the body stream processing pipeline
          streams.push(zlib__default["default"].createUnzip(zlibOptions));

          // remove the content-encoding in order to not confuse downstream operations
          delete res.headers['content-encoding'];
          break;
        case 'br':
          if (isBrotliSupported) {
            streams.push(zlib__default["default"].createBrotliDecompress(brotliOptions));
            delete res.headers['content-encoding'];
          }
        }
      }

      responseStream = streams.length > 1 ? stream__default["default"].pipeline(streams, utils$1.noop) : streams[0];

      const offListeners = stream__default["default"].finished(responseStream, () => {
        offListeners();
        onFinished();
      });

      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders$1(res.headers),
        config,
        request: lastRequest
      };

      if (responseType === 'stream') {
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;

        responseStream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            // stream.destroy() emit aborted event before calling reject() on Node.js v16
            rejected = true;
            responseStream.destroy();
            reject(new AxiosError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
              AxiosError.ERR_BAD_RESPONSE, config, lastRequest));
          }
        });

        responseStream.on('aborted', function handlerStreamAborted() {
          if (rejected) {
            return;
          }

          const err = new AxiosError(
            'maxContentLength size of ' + config.maxContentLength + ' exceeded',
            AxiosError.ERR_BAD_RESPONSE,
            config,
            lastRequest
          );
          responseStream.destroy(err);
          reject(err);
        });

        responseStream.on('error', function handleStreamError(err) {
          if (req.destroyed) return;
          reject(AxiosError.from(err, null, config, lastRequest));
        });

        responseStream.on('end', function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== 'arraybuffer') {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === 'utf8') {
                responseData = utils$1.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        });
      }

      emitter.once('abort', err => {
        if (!responseStream.destroyed) {
          responseStream.emit('error', err);
          responseStream.destroy();
        }
      });
    });

    emitter.once('abort', err => {
      reject(err);
      req.destroy(err);
    });

    // Handle errors
    req.on('error', function handleRequestError(err) {
      // @todo remove
      // if (req.aborted && err.code !== AxiosError.ERR_FR_TOO_MANY_REDIRECTS) return;
      reject(AxiosError.from(err, null, config, req));
    });

    // set tcp keep alive to prevent drop connection by peer
    req.on('socket', function handleRequestSocket(socket) {
      // default interval of sending ack packet is 1 minute
      socket.setKeepAlive(true, 1000 * 60);
    });

    // Handle request timeout
    if (config.timeout) {
      // This is forcing a int timeout to avoid problems if the `req` interface doesn't handle other types.
      const timeout = parseInt(config.timeout, 10);

      if (Number.isNaN(timeout)) {
        reject(new AxiosError(
          'error trying to parse `config.timeout` to int',
          AxiosError.ERR_BAD_OPTION_VALUE,
          config,
          req
        ));

        return;
      }

      // Sometime, the response will be very slow, and does not respond, the connect event will be block by event loop system.
      // And timer callback will be fired, and abort() will be invoked before connection, then get "socket hang up" and code ECONNRESET.
      // At this time, if we have a large number of request, nodejs will hang up some socket on background. and the number will up and up.
      // And then these socket which be hang up will devouring CPU little by little.
      // ClientRequest.setTimeout will be fired on the specify milliseconds, and can make sure that abort() will be fired after connect.
      req.setTimeout(timeout, function handleRequestTimeout() {
        if (isDone) return;
        let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
        const transitional = config.transitional || transitionalDefaults;
        if (config.timeoutErrorMessage) {
          timeoutErrorMessage = config.timeoutErrorMessage;
        }
        reject(new AxiosError(
          timeoutErrorMessage,
          transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
          config,
          req
        ));
        abort();
      });
    }


    // Send the request
    if (utils$1.isStream(data)) {
      let ended = false;
      let errored = false;

      data.on('end', () => {
        ended = true;
      });

      data.once('error', err => {
        errored = true;
        req.destroy(err);
      });

      data.on('close', () => {
        if (!ended && !errored) {
          abort(new CanceledError('Request stream has been aborted', config, req));
        }
      });

      data.pipe(req);
    } else {
      req.end(data);
    }
  });
};

const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return throttle(e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;

    bytesNotified = loaded;

    const data = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null
    };

    data[isDownloadStream ? 'download' : 'upload'] = true;

    listener(data);
  }, freq);
};

const isURLSameOrigin = platform.hasStandardBrowserEnv ?

// Standard browser envs have full support of the APIs needed to test
// whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    const msie = /(msie|trident)/i.test(navigator.userAgent);
    const urlParsingNode = document.createElement('a');
    let originURL;

    /**
    * Parse a URL to discover its components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      let href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
          urlParsingNode.pathname :
          '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      const parsed = (utils$1.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
          parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })();

const cookies = platform.hasStandardBrowserEnv ?

  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure) {
      const cookie = [name + '=' + encodeURIComponent(value)];

      utils$1.isNumber(expires) && cookie.push('expires=' + new Date(expires).toGMTString());

      utils$1.isString(path) && cookie.push('path=' + path);

      utils$1.isString(domain) && cookie.push('domain=' + domain);

      secure === true && cookie.push('secure');

      document.cookie = cookie.join('; ');
    },

    read(name) {
      const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
      return (match ? decodeURIComponent(match[3]) : null);
    },

    remove(name) {
      this.write(name, '', Date.now() - 86400000);
    }
  }

  :

  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {},
    read() {
      return null;
    },
    remove() {}
  };

const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  const config = {};

  function getMergedValue(target, source, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({caseless}, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(a, b, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }

  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
  };

  utils$1.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge(config1[prop], config2[prop], prop);
    (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
}

const resolveConfig = (config) => {
  const newConfig = mergeConfig({}, config);

  let {data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth} = newConfig;

  newConfig.headers = headers = AxiosHeaders$1.from(headers);

  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url), config.params, config.paramsSerializer);

  // HTTP basic authentication
  if (auth) {
    headers.set('Authorization', 'Basic ' +
      btoa((auth.username || '') + ':' + (auth.password ? unescape(encodeURIComponent(auth.password)) : ''))
    );
  }

  let contentType;

  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(undefined); // Let the browser set it
    } else if ((contentType = headers.getContentType()) !== false) {
      // fix semicolon duplication issue for ReactNative FormData implementation
      const [type, ...tokens] = contentType ? contentType.split(';').map(token => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || 'multipart/form-data', ...tokens].join('; '));
    }
  }

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.

  if (platform.hasStandardBrowserEnv) {
    withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));

    if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(newConfig.url))) {
      // Add xsrf header
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);

      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }

  return newConfig;
};

const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

const xhrAdapter = isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
    let {responseType} = _config;
    let onCanceled;
    function done() {
      if (_config.cancelToken) {
        _config.cancelToken.unsubscribe(onCanceled);
      }

      if (_config.signal) {
        _config.signal.removeEventListener('abort', onCanceled);
      }
    }

    let request = new XMLHttpRequest();

    request.open(_config.method.toUpperCase(), _config.url, true);

    // Set the request timeout in MS
    request.timeout = _config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      const responseHeaders = AxiosHeaders$1.from(
        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
        request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, _config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, _config, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? 'timeout of ' + _config.timeout + 'ms exceeded' : 'timeout exceeded';
      const transitional = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        _config,
        request));

      // Clean up request
      request = null;
    };

    // Remove Content-Type if data is undefined
    requestData === undefined && requestHeaders.setContentType(null);

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // Add withCredentials to request if needed
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = _config.responseType;
    }

    // Handle progress if needed
    if (typeof _config.onDownloadProgress === 'function') {
      request.addEventListener('progress', progressEventReducer(_config.onDownloadProgress, true));
    }

    // Not all browsers support upload events
    if (typeof _config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', progressEventReducer(_config.onUploadProgress));
    }

    if (_config.cancelToken || _config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = cancel => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
        request.abort();
        request = null;
      };

      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener('abort', onCanceled);
      }
    }

    const protocol = parseProtocol(_config.url);

    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    }


    // Send the request
    request.send(requestData || null);
  });
};

const composeSignals = (signals, timeout) => {
  let controller = new AbortController();

  let aborted;

  const onabort = function (cancel) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = cancel instanceof Error ? cancel : this.reason;
      controller.abort(err instanceof AxiosError ? err : new CanceledError(err instanceof Error ? err.message : err));
    }
  };

  let timer = timeout && setTimeout(() => {
    onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT));
  }, timeout);

  const unsubscribe = () => {
    if (signals) {
      timer && clearTimeout(timer);
      timer = null;
      signals.forEach(signal => {
        signal &&
        (signal.removeEventListener ? signal.removeEventListener('abort', onabort) : signal.unsubscribe(onabort));
      });
      signals = null;
    }
  };

  signals.forEach((signal) => signal && signal.addEventListener && signal.addEventListener('abort', onabort));

  const {signal} = controller;

  signal.unsubscribe = unsubscribe;

  return [signal, () => {
    timer && clearTimeout(timer);
    timer = null;
  }];
};

const composeSignals$1 = composeSignals;

const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;

  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }

  let pos = 0;
  let end;

  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};

const readBytes = async function* (iterable, chunkSize, encode) {
  for await (const chunk of iterable) {
    yield* streamChunk(ArrayBuffer.isView(chunk) ? chunk : (await encode(String(chunk))), chunkSize);
  }
};

const trackStream = (stream, chunkSize, onProgress, onFinish, encode) => {
  const iterator = readBytes(stream, chunkSize, encode);

  let bytes = 0;

  return new ReadableStream({
    type: 'bytes',

    async pull(controller) {
      const {done, value} = await iterator.next();

      if (done) {
        controller.close();
        onFinish();
        return;
      }

      let len = value.byteLength;
      onProgress && onProgress(bytes += len);
      controller.enqueue(new Uint8Array(value));
    },
    cancel(reason) {
      onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  })
};

const fetchProgressDecorator = (total, fn) => {
  const lengthComputable = total != null;
  return (loaded) => setTimeout(() => fn({
    lengthComputable,
    total,
    loaded
  }));
};

const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function';
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === 'function';

// used only inside the fetch adapter
const encodeText = isFetchSupported && (typeof TextEncoder === 'function' ?
    ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) :
    async (str) => new Uint8Array(await new Response(str).arrayBuffer())
);

const supportsRequestStream = isReadableStreamSupported && (() => {
  let duplexAccessed = false;

  const hasContentType = new Request(platform.origin, {
    body: new ReadableStream(),
    method: 'POST',
    get duplex() {
      duplexAccessed = true;
      return 'half';
    },
  }).headers.has('Content-Type');

  return duplexAccessed && !hasContentType;
})();

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const supportsResponseStream = isReadableStreamSupported && !!(()=> {
  try {
    return utils$1.isReadableStream(new Response('').body);
  } catch(err) {
    // return undefined
  }
})();

const resolvers = {
  stream: supportsResponseStream && ((res) => res.body)
};

isFetchSupported && (((res) => {
  ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach(type => {
    !resolvers[type] && (resolvers[type] = utils$1.isFunction(res[type]) ? (res) => res[type]() :
      (_, config) => {
        throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
      });
  });
})(new Response));

const getBodyLength = async (body) => {
  if (body == null) {
    return 0;
  }

  if(utils$1.isBlob(body)) {
    return body.size;
  }

  if(utils$1.isSpecCompliantForm(body)) {
    return (await new Request(body).arrayBuffer()).byteLength;
  }

  if(utils$1.isArrayBufferView(body)) {
    return body.byteLength;
  }

  if(utils$1.isURLSearchParams(body)) {
    body = body + '';
  }

  if(utils$1.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};

const resolveBodyLength = async (headers, body) => {
  const length = utils$1.toFiniteNumber(headers.getContentLength());

  return length == null ? getBodyLength(body) : length;
};

const fetchAdapter = isFetchSupported && (async (config) => {
  let {
    url,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = 'same-origin',
    fetchOptions
  } = resolveConfig(config);

  responseType = responseType ? (responseType + '').toLowerCase() : 'text';

  let [composedSignal, stopTimeout] = (signal || cancelToken || timeout) ?
    composeSignals$1([signal, cancelToken], timeout) : [];

  let finished, request;

  const onFinish = () => {
    !finished && setTimeout(() => {
      composedSignal && composedSignal.unsubscribe();
    });

    finished = true;
  };

  let requestContentLength;

  try {
    if (
      onUploadProgress && supportsRequestStream && method !== 'get' && method !== 'head' &&
      (requestContentLength = await resolveBodyLength(headers, data)) !== 0
    ) {
      let _request = new Request(url, {
        method: 'POST',
        body: data,
        duplex: "half"
      });

      let contentTypeHeader;

      if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get('content-type'))) {
        headers.setContentType(contentTypeHeader);
      }

      if (_request.body) {
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, fetchProgressDecorator(
          requestContentLength,
          progressEventReducer(onUploadProgress)
        ), null, encodeText);
      }
    }

    if (!utils$1.isString(withCredentials)) {
      withCredentials = withCredentials ? 'cors' : 'omit';
    }

    request = new Request(url, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      withCredentials
    });

    let response = await fetch(request);

    const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');

    if (supportsResponseStream && (onDownloadProgress || isStreamResponse)) {
      const options = {};

      ['status', 'statusText', 'headers'].forEach(prop => {
        options[prop] = response[prop];
      });

      const responseContentLength = utils$1.toFiniteNumber(response.headers.get('content-length'));

      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, onDownloadProgress && fetchProgressDecorator(
          responseContentLength,
          progressEventReducer(onDownloadProgress, true)
        ), isStreamResponse && onFinish, encodeText),
        options
      );
    }

    responseType = responseType || 'text';

    let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || 'text'](response, config);

    !isStreamResponse && onFinish();

    stopTimeout && stopTimeout();

    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders$1.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    })
  } catch (err) {
    onFinish();

    if (err && err.name === 'TypeError' && /fetch/i.test(err.message)) {
      throw Object.assign(
        new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request),
        {
          cause: err.cause || err
        }
      )
    }

    throw AxiosError.from(err, err && err.code, config, request);
  }
});

const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: fetchAdapter
};

utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, 'name', {value});
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', {value});
  }
});

const renderReason = (reason) => `- ${reason}`;

const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;

const adapters = {
  getAdapter: (adapters) => {
    adapters = utils$1.isArray(adapters) ? adapters : [adapters];

    const {length} = adapters;
    let nameOrAdapter;
    let adapter;

    const rejectedReasons = {};

    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;

      adapter = nameOrAdapter;

      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

        if (adapter === undefined) {
          throw new AxiosError(`Unknown adapter '${id}'`);
        }
      }

      if (adapter) {
        break;
      }

      rejectedReasons[id || '#' + i] = adapter;
    }

    if (!adapter) {

      const reasons = Object.entries(rejectedReasons)
        .map(([id, state]) => `adapter ${id} ` +
          (state === false ? 'is not supported by the environment' : 'is not available in the build')
        );

      let s = length ?
        (reasons.length > 1 ? 'since :\n' + reasons.map(renderReason).join('\n') : ' ' + renderReason(reasons[0])) :
        'as no adapter specified';

      throw new AxiosError(
        `There is no suitable adapter to dispatch the request ` + s,
        'ERR_NOT_SUPPORT'
      );
    }

    return adapter;
  },
  adapters: knownAdapters
};

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders$1.from(config.headers);

  // Transform request data
  config.data = transformData.call(
    config,
    config.transformRequest
  );

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );

    response.headers = AxiosHeaders$1.from(response.headers);

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  });
}

const validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

const deprecatedWarnings = {};

/**
 * Transitional option validator
 *
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 *
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

const validator = {
  assertOptions,
  validators: validators$1
};

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager$1(),
      response: new InterceptorManager$1()
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy;

        Error.captureStackTrace ? Error.captureStackTrace(dummy = {}) : (dummy = new Error());

        // slice off the Error: ... line
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';
        try {
          if (!err.stack) {
            err.stack = stack;
            // match without the 2 top stack lines
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
            err.stack += '\n' + stack;
          }
        } catch (e) {
          // ignore the case where "stack" is an un-writable property
        }
      }

      throw err;
    }
  }

  _request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig(this.defaults, config);

    const {transitional, paramsSerializer, headers} = config;

    if (transitional !== undefined) {
      validator.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }

    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // Flatten headers
    let contextHeaders = headers && utils$1.merge(
      headers.common,
      headers[config.method]
    );

    headers && utils$1.forEach(
      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
      (method) => {
        delete headers[method];
      }
    );

    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});

utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});

const Axios$1 = Axios;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;

    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(cancel => {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // eslint-disable-next-line func-names
    this.promise.then = onfulfilled => {
      let _resolve;
      // eslint-disable-next-line func-names
      const promise = new Promise(resolve => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */

  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */

  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}

const CancelToken$1 = CancelToken;

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 *
 * @returns {Function}
 */
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 *
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
function isAxiosError(payload) {
  return utils$1.isObject(payload) && (payload.isAxiosError === true);
}

const HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
};

Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});

const HttpStatusCode$1 = HttpStatusCode;

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind(Axios$1.prototype.request, context);

  // Copy axios.prototype to instance
  utils$1.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

  // Copy context to instance
  utils$1.extend(instance, context, null, {allOwnKeys: true});

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
const axios = createInstance(defaults$1);

// Expose Axios class to allow class inheritance
axios.Axios = Axios$1;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;

// Expose AxiosError class
axios.AxiosError = AxiosError;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

// Expose mergeConfig
axios.mergeConfig = mergeConfig;

axios.AxiosHeaders = AxiosHeaders$1;

axios.formToJSON = thing => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.getAdapter = adapters.getAdapter;

axios.HttpStatusCode = HttpStatusCode$1;

axios.default = axios;

module.exports = axios;
//# sourceMappingURL=axios.cjs.map


/***/ }),

/***/ 3765:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"application/1d-interleaved-parityfec":{"source":"iana"},"application/3gpdash-qoe-report+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/3gpp-ims+xml":{"source":"iana","compressible":true},"application/3gpphal+json":{"source":"iana","compressible":true},"application/3gpphalforms+json":{"source":"iana","compressible":true},"application/a2l":{"source":"iana"},"application/ace+cbor":{"source":"iana"},"application/activemessage":{"source":"iana"},"application/activity+json":{"source":"iana","compressible":true},"application/alto-costmap+json":{"source":"iana","compressible":true},"application/alto-costmapfilter+json":{"source":"iana","compressible":true},"application/alto-directory+json":{"source":"iana","compressible":true},"application/alto-endpointcost+json":{"source":"iana","compressible":true},"application/alto-endpointcostparams+json":{"source":"iana","compressible":true},"application/alto-endpointprop+json":{"source":"iana","compressible":true},"application/alto-endpointpropparams+json":{"source":"iana","compressible":true},"application/alto-error+json":{"source":"iana","compressible":true},"application/alto-networkmap+json":{"source":"iana","compressible":true},"application/alto-networkmapfilter+json":{"source":"iana","compressible":true},"application/alto-updatestreamcontrol+json":{"source":"iana","compressible":true},"application/alto-updatestreamparams+json":{"source":"iana","compressible":true},"application/aml":{"source":"iana"},"application/andrew-inset":{"source":"iana","extensions":["ez"]},"application/applefile":{"source":"iana"},"application/applixware":{"source":"apache","extensions":["aw"]},"application/at+jwt":{"source":"iana"},"application/atf":{"source":"iana"},"application/atfx":{"source":"iana"},"application/atom+xml":{"source":"iana","compressible":true,"extensions":["atom"]},"application/atomcat+xml":{"source":"iana","compressible":true,"extensions":["atomcat"]},"application/atomdeleted+xml":{"source":"iana","compressible":true,"extensions":["atomdeleted"]},"application/atomicmail":{"source":"iana"},"application/atomsvc+xml":{"source":"iana","compressible":true,"extensions":["atomsvc"]},"application/atsc-dwd+xml":{"source":"iana","compressible":true,"extensions":["dwd"]},"application/atsc-dynamic-event-message":{"source":"iana"},"application/atsc-held+xml":{"source":"iana","compressible":true,"extensions":["held"]},"application/atsc-rdt+json":{"source":"iana","compressible":true},"application/atsc-rsat+xml":{"source":"iana","compressible":true,"extensions":["rsat"]},"application/atxml":{"source":"iana"},"application/auth-policy+xml":{"source":"iana","compressible":true},"application/bacnet-xdd+zip":{"source":"iana","compressible":false},"application/batch-smtp":{"source":"iana"},"application/bdoc":{"compressible":false,"extensions":["bdoc"]},"application/beep+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/calendar+json":{"source":"iana","compressible":true},"application/calendar+xml":{"source":"iana","compressible":true,"extensions":["xcs"]},"application/call-completion":{"source":"iana"},"application/cals-1840":{"source":"iana"},"application/captive+json":{"source":"iana","compressible":true},"application/cbor":{"source":"iana"},"application/cbor-seq":{"source":"iana"},"application/cccex":{"source":"iana"},"application/ccmp+xml":{"source":"iana","compressible":true},"application/ccxml+xml":{"source":"iana","compressible":true,"extensions":["ccxml"]},"application/cdfx+xml":{"source":"iana","compressible":true,"extensions":["cdfx"]},"application/cdmi-capability":{"source":"iana","extensions":["cdmia"]},"application/cdmi-container":{"source":"iana","extensions":["cdmic"]},"application/cdmi-domain":{"source":"iana","extensions":["cdmid"]},"application/cdmi-object":{"source":"iana","extensions":["cdmio"]},"application/cdmi-queue":{"source":"iana","extensions":["cdmiq"]},"application/cdni":{"source":"iana"},"application/cea":{"source":"iana"},"application/cea-2018+xml":{"source":"iana","compressible":true},"application/cellml+xml":{"source":"iana","compressible":true},"application/cfw":{"source":"iana"},"application/city+json":{"source":"iana","compressible":true},"application/clr":{"source":"iana"},"application/clue+xml":{"source":"iana","compressible":true},"application/clue_info+xml":{"source":"iana","compressible":true},"application/cms":{"source":"iana"},"application/cnrp+xml":{"source":"iana","compressible":true},"application/coap-group+json":{"source":"iana","compressible":true},"application/coap-payload":{"source":"iana"},"application/commonground":{"source":"iana"},"application/conference-info+xml":{"source":"iana","compressible":true},"application/cose":{"source":"iana"},"application/cose-key":{"source":"iana"},"application/cose-key-set":{"source":"iana"},"application/cpl+xml":{"source":"iana","compressible":true,"extensions":["cpl"]},"application/csrattrs":{"source":"iana"},"application/csta+xml":{"source":"iana","compressible":true},"application/cstadata+xml":{"source":"iana","compressible":true},"application/csvm+json":{"source":"iana","compressible":true},"application/cu-seeme":{"source":"apache","extensions":["cu"]},"application/cwt":{"source":"iana"},"application/cybercash":{"source":"iana"},"application/dart":{"compressible":true},"application/dash+xml":{"source":"iana","compressible":true,"extensions":["mpd"]},"application/dash-patch+xml":{"source":"iana","compressible":true,"extensions":["mpp"]},"application/dashdelta":{"source":"iana"},"application/davmount+xml":{"source":"iana","compressible":true,"extensions":["davmount"]},"application/dca-rft":{"source":"iana"},"application/dcd":{"source":"iana"},"application/dec-dx":{"source":"iana"},"application/dialog-info+xml":{"source":"iana","compressible":true},"application/dicom":{"source":"iana"},"application/dicom+json":{"source":"iana","compressible":true},"application/dicom+xml":{"source":"iana","compressible":true},"application/dii":{"source":"iana"},"application/dit":{"source":"iana"},"application/dns":{"source":"iana"},"application/dns+json":{"source":"iana","compressible":true},"application/dns-message":{"source":"iana"},"application/docbook+xml":{"source":"apache","compressible":true,"extensions":["dbk"]},"application/dots+cbor":{"source":"iana"},"application/dskpp+xml":{"source":"iana","compressible":true},"application/dssc+der":{"source":"iana","extensions":["dssc"]},"application/dssc+xml":{"source":"iana","compressible":true,"extensions":["xdssc"]},"application/dvcs":{"source":"iana"},"application/ecmascript":{"source":"iana","compressible":true,"extensions":["es","ecma"]},"application/edi-consent":{"source":"iana"},"application/edi-x12":{"source":"iana","compressible":false},"application/edifact":{"source":"iana","compressible":false},"application/efi":{"source":"iana"},"application/elm+json":{"source":"iana","charset":"UTF-8","compressible":true},"application/elm+xml":{"source":"iana","compressible":true},"application/emergencycalldata.cap+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/emergencycalldata.comment+xml":{"source":"iana","compressible":true},"application/emergencycalldata.control+xml":{"source":"iana","compressible":true},"application/emergencycalldata.deviceinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.ecall.msd":{"source":"iana"},"application/emergencycalldata.providerinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.serviceinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.subscriberinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.veds+xml":{"source":"iana","compressible":true},"application/emma+xml":{"source":"iana","compressible":true,"extensions":["emma"]},"application/emotionml+xml":{"source":"iana","compressible":true,"extensions":["emotionml"]},"application/encaprtp":{"source":"iana"},"application/epp+xml":{"source":"iana","compressible":true},"application/epub+zip":{"source":"iana","compressible":false,"extensions":["epub"]},"application/eshop":{"source":"iana"},"application/exi":{"source":"iana","extensions":["exi"]},"application/expect-ct-report+json":{"source":"iana","compressible":true},"application/express":{"source":"iana","extensions":["exp"]},"application/fastinfoset":{"source":"iana"},"application/fastsoap":{"source":"iana"},"application/fdt+xml":{"source":"iana","compressible":true,"extensions":["fdt"]},"application/fhir+json":{"source":"iana","charset":"UTF-8","compressible":true},"application/fhir+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/fido.trusted-apps+json":{"compressible":true},"application/fits":{"source":"iana"},"application/flexfec":{"source":"iana"},"application/font-sfnt":{"source":"iana"},"application/font-tdpfr":{"source":"iana","extensions":["pfr"]},"application/font-woff":{"source":"iana","compressible":false},"application/framework-attributes+xml":{"source":"iana","compressible":true},"application/geo+json":{"source":"iana","compressible":true,"extensions":["geojson"]},"application/geo+json-seq":{"source":"iana"},"application/geopackage+sqlite3":{"source":"iana"},"application/geoxacml+xml":{"source":"iana","compressible":true},"application/gltf-buffer":{"source":"iana"},"application/gml+xml":{"source":"iana","compressible":true,"extensions":["gml"]},"application/gpx+xml":{"source":"apache","compressible":true,"extensions":["gpx"]},"application/gxf":{"source":"apache","extensions":["gxf"]},"application/gzip":{"source":"iana","compressible":false,"extensions":["gz"]},"application/h224":{"source":"iana"},"application/held+xml":{"source":"iana","compressible":true},"application/hjson":{"extensions":["hjson"]},"application/http":{"source":"iana"},"application/hyperstudio":{"source":"iana","extensions":["stk"]},"application/ibe-key-request+xml":{"source":"iana","compressible":true},"application/ibe-pkg-reply+xml":{"source":"iana","compressible":true},"application/ibe-pp-data":{"source":"iana"},"application/iges":{"source":"iana"},"application/im-iscomposing+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/index":{"source":"iana"},"application/index.cmd":{"source":"iana"},"application/index.obj":{"source":"iana"},"application/index.response":{"source":"iana"},"application/index.vnd":{"source":"iana"},"application/inkml+xml":{"source":"iana","compressible":true,"extensions":["ink","inkml"]},"application/iotp":{"source":"iana"},"application/ipfix":{"source":"iana","extensions":["ipfix"]},"application/ipp":{"source":"iana"},"application/isup":{"source":"iana"},"application/its+xml":{"source":"iana","compressible":true,"extensions":["its"]},"application/java-archive":{"source":"apache","compressible":false,"extensions":["jar","war","ear"]},"application/java-serialized-object":{"source":"apache","compressible":false,"extensions":["ser"]},"application/java-vm":{"source":"apache","compressible":false,"extensions":["class"]},"application/javascript":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["js","mjs"]},"application/jf2feed+json":{"source":"iana","compressible":true},"application/jose":{"source":"iana"},"application/jose+json":{"source":"iana","compressible":true},"application/jrd+json":{"source":"iana","compressible":true},"application/jscalendar+json":{"source":"iana","compressible":true},"application/json":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["json","map"]},"application/json-patch+json":{"source":"iana","compressible":true},"application/json-seq":{"source":"iana"},"application/json5":{"extensions":["json5"]},"application/jsonml+json":{"source":"apache","compressible":true,"extensions":["jsonml"]},"application/jwk+json":{"source":"iana","compressible":true},"application/jwk-set+json":{"source":"iana","compressible":true},"application/jwt":{"source":"iana"},"application/kpml-request+xml":{"source":"iana","compressible":true},"application/kpml-response+xml":{"source":"iana","compressible":true},"application/ld+json":{"source":"iana","compressible":true,"extensions":["jsonld"]},"application/lgr+xml":{"source":"iana","compressible":true,"extensions":["lgr"]},"application/link-format":{"source":"iana"},"application/load-control+xml":{"source":"iana","compressible":true},"application/lost+xml":{"source":"iana","compressible":true,"extensions":["lostxml"]},"application/lostsync+xml":{"source":"iana","compressible":true},"application/lpf+zip":{"source":"iana","compressible":false},"application/lxf":{"source":"iana"},"application/mac-binhex40":{"source":"iana","extensions":["hqx"]},"application/mac-compactpro":{"source":"apache","extensions":["cpt"]},"application/macwriteii":{"source":"iana"},"application/mads+xml":{"source":"iana","compressible":true,"extensions":["mads"]},"application/manifest+json":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["webmanifest"]},"application/marc":{"source":"iana","extensions":["mrc"]},"application/marcxml+xml":{"source":"iana","compressible":true,"extensions":["mrcx"]},"application/mathematica":{"source":"iana","extensions":["ma","nb","mb"]},"application/mathml+xml":{"source":"iana","compressible":true,"extensions":["mathml"]},"application/mathml-content+xml":{"source":"iana","compressible":true},"application/mathml-presentation+xml":{"source":"iana","compressible":true},"application/mbms-associated-procedure-description+xml":{"source":"iana","compressible":true},"application/mbms-deregister+xml":{"source":"iana","compressible":true},"application/mbms-envelope+xml":{"source":"iana","compressible":true},"application/mbms-msk+xml":{"source":"iana","compressible":true},"application/mbms-msk-response+xml":{"source":"iana","compressible":true},"application/mbms-protection-description+xml":{"source":"iana","compressible":true},"application/mbms-reception-report+xml":{"source":"iana","compressible":true},"application/mbms-register+xml":{"source":"iana","compressible":true},"application/mbms-register-response+xml":{"source":"iana","compressible":true},"application/mbms-schedule+xml":{"source":"iana","compressible":true},"application/mbms-user-service-description+xml":{"source":"iana","compressible":true},"application/mbox":{"source":"iana","extensions":["mbox"]},"application/media-policy-dataset+xml":{"source":"iana","compressible":true,"extensions":["mpf"]},"application/media_control+xml":{"source":"iana","compressible":true},"application/mediaservercontrol+xml":{"source":"iana","compressible":true,"extensions":["mscml"]},"application/merge-patch+json":{"source":"iana","compressible":true},"application/metalink+xml":{"source":"apache","compressible":true,"extensions":["metalink"]},"application/metalink4+xml":{"source":"iana","compressible":true,"extensions":["meta4"]},"application/mets+xml":{"source":"iana","compressible":true,"extensions":["mets"]},"application/mf4":{"source":"iana"},"application/mikey":{"source":"iana"},"application/mipc":{"source":"iana"},"application/missing-blocks+cbor-seq":{"source":"iana"},"application/mmt-aei+xml":{"source":"iana","compressible":true,"extensions":["maei"]},"application/mmt-usd+xml":{"source":"iana","compressible":true,"extensions":["musd"]},"application/mods+xml":{"source":"iana","compressible":true,"extensions":["mods"]},"application/moss-keys":{"source":"iana"},"application/moss-signature":{"source":"iana"},"application/mosskey-data":{"source":"iana"},"application/mosskey-request":{"source":"iana"},"application/mp21":{"source":"iana","extensions":["m21","mp21"]},"application/mp4":{"source":"iana","extensions":["mp4s","m4p"]},"application/mpeg4-generic":{"source":"iana"},"application/mpeg4-iod":{"source":"iana"},"application/mpeg4-iod-xmt":{"source":"iana"},"application/mrb-consumer+xml":{"source":"iana","compressible":true},"application/mrb-publish+xml":{"source":"iana","compressible":true},"application/msc-ivr+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/msc-mixer+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/msword":{"source":"iana","compressible":false,"extensions":["doc","dot"]},"application/mud+json":{"source":"iana","compressible":true},"application/multipart-core":{"source":"iana"},"application/mxf":{"source":"iana","extensions":["mxf"]},"application/n-quads":{"source":"iana","extensions":["nq"]},"application/n-triples":{"source":"iana","extensions":["nt"]},"application/nasdata":{"source":"iana"},"application/news-checkgroups":{"source":"iana","charset":"US-ASCII"},"application/news-groupinfo":{"source":"iana","charset":"US-ASCII"},"application/news-transmission":{"source":"iana"},"application/nlsml+xml":{"source":"iana","compressible":true},"application/node":{"source":"iana","extensions":["cjs"]},"application/nss":{"source":"iana"},"application/oauth-authz-req+jwt":{"source":"iana"},"application/oblivious-dns-message":{"source":"iana"},"application/ocsp-request":{"source":"iana"},"application/ocsp-response":{"source":"iana"},"application/octet-stream":{"source":"iana","compressible":false,"extensions":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"]},"application/oda":{"source":"iana","extensions":["oda"]},"application/odm+xml":{"source":"iana","compressible":true},"application/odx":{"source":"iana"},"application/oebps-package+xml":{"source":"iana","compressible":true,"extensions":["opf"]},"application/ogg":{"source":"iana","compressible":false,"extensions":["ogx"]},"application/omdoc+xml":{"source":"apache","compressible":true,"extensions":["omdoc"]},"application/onenote":{"source":"apache","extensions":["onetoc","onetoc2","onetmp","onepkg"]},"application/opc-nodeset+xml":{"source":"iana","compressible":true},"application/oscore":{"source":"iana"},"application/oxps":{"source":"iana","extensions":["oxps"]},"application/p21":{"source":"iana"},"application/p21+zip":{"source":"iana","compressible":false},"application/p2p-overlay+xml":{"source":"iana","compressible":true,"extensions":["relo"]},"application/parityfec":{"source":"iana"},"application/passport":{"source":"iana"},"application/patch-ops-error+xml":{"source":"iana","compressible":true,"extensions":["xer"]},"application/pdf":{"source":"iana","compressible":false,"extensions":["pdf"]},"application/pdx":{"source":"iana"},"application/pem-certificate-chain":{"source":"iana"},"application/pgp-encrypted":{"source":"iana","compressible":false,"extensions":["pgp"]},"application/pgp-keys":{"source":"iana","extensions":["asc"]},"application/pgp-signature":{"source":"iana","extensions":["asc","sig"]},"application/pics-rules":{"source":"apache","extensions":["prf"]},"application/pidf+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/pidf-diff+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/pkcs10":{"source":"iana","extensions":["p10"]},"application/pkcs12":{"source":"iana"},"application/pkcs7-mime":{"source":"iana","extensions":["p7m","p7c"]},"application/pkcs7-signature":{"source":"iana","extensions":["p7s"]},"application/pkcs8":{"source":"iana","extensions":["p8"]},"application/pkcs8-encrypted":{"source":"iana"},"application/pkix-attr-cert":{"source":"iana","extensions":["ac"]},"application/pkix-cert":{"source":"iana","extensions":["cer"]},"application/pkix-crl":{"source":"iana","extensions":["crl"]},"application/pkix-pkipath":{"source":"iana","extensions":["pkipath"]},"application/pkixcmp":{"source":"iana","extensions":["pki"]},"application/pls+xml":{"source":"iana","compressible":true,"extensions":["pls"]},"application/poc-settings+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/postscript":{"source":"iana","compressible":true,"extensions":["ai","eps","ps"]},"application/ppsp-tracker+json":{"source":"iana","compressible":true},"application/problem+json":{"source":"iana","compressible":true},"application/problem+xml":{"source":"iana","compressible":true},"application/provenance+xml":{"source":"iana","compressible":true,"extensions":["provx"]},"application/prs.alvestrand.titrax-sheet":{"source":"iana"},"application/prs.cww":{"source":"iana","extensions":["cww"]},"application/prs.cyn":{"source":"iana","charset":"7-BIT"},"application/prs.hpub+zip":{"source":"iana","compressible":false},"application/prs.nprend":{"source":"iana"},"application/prs.plucker":{"source":"iana"},"application/prs.rdf-xml-crypt":{"source":"iana"},"application/prs.xsf+xml":{"source":"iana","compressible":true},"application/pskc+xml":{"source":"iana","compressible":true,"extensions":["pskcxml"]},"application/pvd+json":{"source":"iana","compressible":true},"application/qsig":{"source":"iana"},"application/raml+yaml":{"compressible":true,"extensions":["raml"]},"application/raptorfec":{"source":"iana"},"application/rdap+json":{"source":"iana","compressible":true},"application/rdf+xml":{"source":"iana","compressible":true,"extensions":["rdf","owl"]},"application/reginfo+xml":{"source":"iana","compressible":true,"extensions":["rif"]},"application/relax-ng-compact-syntax":{"source":"iana","extensions":["rnc"]},"application/remote-printing":{"source":"iana"},"application/reputon+json":{"source":"iana","compressible":true},"application/resource-lists+xml":{"source":"iana","compressible":true,"extensions":["rl"]},"application/resource-lists-diff+xml":{"source":"iana","compressible":true,"extensions":["rld"]},"application/rfc+xml":{"source":"iana","compressible":true},"application/riscos":{"source":"iana"},"application/rlmi+xml":{"source":"iana","compressible":true},"application/rls-services+xml":{"source":"iana","compressible":true,"extensions":["rs"]},"application/route-apd+xml":{"source":"iana","compressible":true,"extensions":["rapd"]},"application/route-s-tsid+xml":{"source":"iana","compressible":true,"extensions":["sls"]},"application/route-usd+xml":{"source":"iana","compressible":true,"extensions":["rusd"]},"application/rpki-ghostbusters":{"source":"iana","extensions":["gbr"]},"application/rpki-manifest":{"source":"iana","extensions":["mft"]},"application/rpki-publication":{"source":"iana"},"application/rpki-roa":{"source":"iana","extensions":["roa"]},"application/rpki-updown":{"source":"iana"},"application/rsd+xml":{"source":"apache","compressible":true,"extensions":["rsd"]},"application/rss+xml":{"source":"apache","compressible":true,"extensions":["rss"]},"application/rtf":{"source":"iana","compressible":true,"extensions":["rtf"]},"application/rtploopback":{"source":"iana"},"application/rtx":{"source":"iana"},"application/samlassertion+xml":{"source":"iana","compressible":true},"application/samlmetadata+xml":{"source":"iana","compressible":true},"application/sarif+json":{"source":"iana","compressible":true},"application/sarif-external-properties+json":{"source":"iana","compressible":true},"application/sbe":{"source":"iana"},"application/sbml+xml":{"source":"iana","compressible":true,"extensions":["sbml"]},"application/scaip+xml":{"source":"iana","compressible":true},"application/scim+json":{"source":"iana","compressible":true},"application/scvp-cv-request":{"source":"iana","extensions":["scq"]},"application/scvp-cv-response":{"source":"iana","extensions":["scs"]},"application/scvp-vp-request":{"source":"iana","extensions":["spq"]},"application/scvp-vp-response":{"source":"iana","extensions":["spp"]},"application/sdp":{"source":"iana","extensions":["sdp"]},"application/secevent+jwt":{"source":"iana"},"application/senml+cbor":{"source":"iana"},"application/senml+json":{"source":"iana","compressible":true},"application/senml+xml":{"source":"iana","compressible":true,"extensions":["senmlx"]},"application/senml-etch+cbor":{"source":"iana"},"application/senml-etch+json":{"source":"iana","compressible":true},"application/senml-exi":{"source":"iana"},"application/sensml+cbor":{"source":"iana"},"application/sensml+json":{"source":"iana","compressible":true},"application/sensml+xml":{"source":"iana","compressible":true,"extensions":["sensmlx"]},"application/sensml-exi":{"source":"iana"},"application/sep+xml":{"source":"iana","compressible":true},"application/sep-exi":{"source":"iana"},"application/session-info":{"source":"iana"},"application/set-payment":{"source":"iana"},"application/set-payment-initiation":{"source":"iana","extensions":["setpay"]},"application/set-registration":{"source":"iana"},"application/set-registration-initiation":{"source":"iana","extensions":["setreg"]},"application/sgml":{"source":"iana"},"application/sgml-open-catalog":{"source":"iana"},"application/shf+xml":{"source":"iana","compressible":true,"extensions":["shf"]},"application/sieve":{"source":"iana","extensions":["siv","sieve"]},"application/simple-filter+xml":{"source":"iana","compressible":true},"application/simple-message-summary":{"source":"iana"},"application/simplesymbolcontainer":{"source":"iana"},"application/sipc":{"source":"iana"},"application/slate":{"source":"iana"},"application/smil":{"source":"iana"},"application/smil+xml":{"source":"iana","compressible":true,"extensions":["smi","smil"]},"application/smpte336m":{"source":"iana"},"application/soap+fastinfoset":{"source":"iana"},"application/soap+xml":{"source":"iana","compressible":true},"application/sparql-query":{"source":"iana","extensions":["rq"]},"application/sparql-results+xml":{"source":"iana","compressible":true,"extensions":["srx"]},"application/spdx+json":{"source":"iana","compressible":true},"application/spirits-event+xml":{"source":"iana","compressible":true},"application/sql":{"source":"iana"},"application/srgs":{"source":"iana","extensions":["gram"]},"application/srgs+xml":{"source":"iana","compressible":true,"extensions":["grxml"]},"application/sru+xml":{"source":"iana","compressible":true,"extensions":["sru"]},"application/ssdl+xml":{"source":"apache","compressible":true,"extensions":["ssdl"]},"application/ssml+xml":{"source":"iana","compressible":true,"extensions":["ssml"]},"application/stix+json":{"source":"iana","compressible":true},"application/swid+xml":{"source":"iana","compressible":true,"extensions":["swidtag"]},"application/tamp-apex-update":{"source":"iana"},"application/tamp-apex-update-confirm":{"source":"iana"},"application/tamp-community-update":{"source":"iana"},"application/tamp-community-update-confirm":{"source":"iana"},"application/tamp-error":{"source":"iana"},"application/tamp-sequence-adjust":{"source":"iana"},"application/tamp-sequence-adjust-confirm":{"source":"iana"},"application/tamp-status-query":{"source":"iana"},"application/tamp-status-response":{"source":"iana"},"application/tamp-update":{"source":"iana"},"application/tamp-update-confirm":{"source":"iana"},"application/tar":{"compressible":true},"application/taxii+json":{"source":"iana","compressible":true},"application/td+json":{"source":"iana","compressible":true},"application/tei+xml":{"source":"iana","compressible":true,"extensions":["tei","teicorpus"]},"application/tetra_isi":{"source":"iana"},"application/thraud+xml":{"source":"iana","compressible":true,"extensions":["tfi"]},"application/timestamp-query":{"source":"iana"},"application/timestamp-reply":{"source":"iana"},"application/timestamped-data":{"source":"iana","extensions":["tsd"]},"application/tlsrpt+gzip":{"source":"iana"},"application/tlsrpt+json":{"source":"iana","compressible":true},"application/tnauthlist":{"source":"iana"},"application/token-introspection+jwt":{"source":"iana"},"application/toml":{"compressible":true,"extensions":["toml"]},"application/trickle-ice-sdpfrag":{"source":"iana"},"application/trig":{"source":"iana","extensions":["trig"]},"application/ttml+xml":{"source":"iana","compressible":true,"extensions":["ttml"]},"application/tve-trigger":{"source":"iana"},"application/tzif":{"source":"iana"},"application/tzif-leap":{"source":"iana"},"application/ubjson":{"compressible":false,"extensions":["ubj"]},"application/ulpfec":{"source":"iana"},"application/urc-grpsheet+xml":{"source":"iana","compressible":true},"application/urc-ressheet+xml":{"source":"iana","compressible":true,"extensions":["rsheet"]},"application/urc-targetdesc+xml":{"source":"iana","compressible":true,"extensions":["td"]},"application/urc-uisocketdesc+xml":{"source":"iana","compressible":true},"application/vcard+json":{"source":"iana","compressible":true},"application/vcard+xml":{"source":"iana","compressible":true},"application/vemmi":{"source":"iana"},"application/vividence.scriptfile":{"source":"apache"},"application/vnd.1000minds.decision-model+xml":{"source":"iana","compressible":true,"extensions":["1km"]},"application/vnd.3gpp-prose+xml":{"source":"iana","compressible":true},"application/vnd.3gpp-prose-pc3ch+xml":{"source":"iana","compressible":true},"application/vnd.3gpp-v2x-local-service-information":{"source":"iana"},"application/vnd.3gpp.5gnas":{"source":"iana"},"application/vnd.3gpp.access-transfer-events+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.bsf+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.gmop+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.gtpc":{"source":"iana"},"application/vnd.3gpp.interworking-data":{"source":"iana"},"application/vnd.3gpp.lpp":{"source":"iana"},"application/vnd.3gpp.mc-signalling-ear":{"source":"iana"},"application/vnd.3gpp.mcdata-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-payload":{"source":"iana"},"application/vnd.3gpp.mcdata-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-signalling":{"source":"iana"},"application/vnd.3gpp.mcdata-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-floor-request+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-location-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-mbms-usage-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-signed+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-ue-init-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-affiliation-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-location-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-mbms-usage-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-transmission-request+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mid-call+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.ngap":{"source":"iana"},"application/vnd.3gpp.pfcp":{"source":"iana"},"application/vnd.3gpp.pic-bw-large":{"source":"iana","extensions":["plb"]},"application/vnd.3gpp.pic-bw-small":{"source":"iana","extensions":["psb"]},"application/vnd.3gpp.pic-bw-var":{"source":"iana","extensions":["pvb"]},"application/vnd.3gpp.s1ap":{"source":"iana"},"application/vnd.3gpp.sms":{"source":"iana"},"application/vnd.3gpp.sms+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.srvcc-ext+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.srvcc-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.state-and-event-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.ussd+xml":{"source":"iana","compressible":true},"application/vnd.3gpp2.bcmcsinfo+xml":{"source":"iana","compressible":true},"application/vnd.3gpp2.sms":{"source":"iana"},"application/vnd.3gpp2.tcap":{"source":"iana","extensions":["tcap"]},"application/vnd.3lightssoftware.imagescal":{"source":"iana"},"application/vnd.3m.post-it-notes":{"source":"iana","extensions":["pwn"]},"application/vnd.accpac.simply.aso":{"source":"iana","extensions":["aso"]},"application/vnd.accpac.simply.imp":{"source":"iana","extensions":["imp"]},"application/vnd.acucobol":{"source":"iana","extensions":["acu"]},"application/vnd.acucorp":{"source":"iana","extensions":["atc","acutc"]},"application/vnd.adobe.air-application-installer-package+zip":{"source":"apache","compressible":false,"extensions":["air"]},"application/vnd.adobe.flash.movie":{"source":"iana"},"application/vnd.adobe.formscentral.fcdt":{"source":"iana","extensions":["fcdt"]},"application/vnd.adobe.fxp":{"source":"iana","extensions":["fxp","fxpl"]},"application/vnd.adobe.partial-upload":{"source":"iana"},"application/vnd.adobe.xdp+xml":{"source":"iana","compressible":true,"extensions":["xdp"]},"application/vnd.adobe.xfdf":{"source":"iana","extensions":["xfdf"]},"application/vnd.aether.imp":{"source":"iana"},"application/vnd.afpc.afplinedata":{"source":"iana"},"application/vnd.afpc.afplinedata-pagedef":{"source":"iana"},"application/vnd.afpc.cmoca-cmresource":{"source":"iana"},"application/vnd.afpc.foca-charset":{"source":"iana"},"application/vnd.afpc.foca-codedfont":{"source":"iana"},"application/vnd.afpc.foca-codepage":{"source":"iana"},"application/vnd.afpc.modca":{"source":"iana"},"application/vnd.afpc.modca-cmtable":{"source":"iana"},"application/vnd.afpc.modca-formdef":{"source":"iana"},"application/vnd.afpc.modca-mediummap":{"source":"iana"},"application/vnd.afpc.modca-objectcontainer":{"source":"iana"},"application/vnd.afpc.modca-overlay":{"source":"iana"},"application/vnd.afpc.modca-pagesegment":{"source":"iana"},"application/vnd.age":{"source":"iana","extensions":["age"]},"application/vnd.ah-barcode":{"source":"iana"},"application/vnd.ahead.space":{"source":"iana","extensions":["ahead"]},"application/vnd.airzip.filesecure.azf":{"source":"iana","extensions":["azf"]},"application/vnd.airzip.filesecure.azs":{"source":"iana","extensions":["azs"]},"application/vnd.amadeus+json":{"source":"iana","compressible":true},"application/vnd.amazon.ebook":{"source":"apache","extensions":["azw"]},"application/vnd.amazon.mobi8-ebook":{"source":"iana"},"application/vnd.americandynamics.acc":{"source":"iana","extensions":["acc"]},"application/vnd.amiga.ami":{"source":"iana","extensions":["ami"]},"application/vnd.amundsen.maze+xml":{"source":"iana","compressible":true},"application/vnd.android.ota":{"source":"iana"},"application/vnd.android.package-archive":{"source":"apache","compressible":false,"extensions":["apk"]},"application/vnd.anki":{"source":"iana"},"application/vnd.anser-web-certificate-issue-initiation":{"source":"iana","extensions":["cii"]},"application/vnd.anser-web-funds-transfer-initiation":{"source":"apache","extensions":["fti"]},"application/vnd.antix.game-component":{"source":"iana","extensions":["atx"]},"application/vnd.apache.arrow.file":{"source":"iana"},"application/vnd.apache.arrow.stream":{"source":"iana"},"application/vnd.apache.thrift.binary":{"source":"iana"},"application/vnd.apache.thrift.compact":{"source":"iana"},"application/vnd.apache.thrift.json":{"source":"iana"},"application/vnd.api+json":{"source":"iana","compressible":true},"application/vnd.aplextor.warrp+json":{"source":"iana","compressible":true},"application/vnd.apothekende.reservation+json":{"source":"iana","compressible":true},"application/vnd.apple.installer+xml":{"source":"iana","compressible":true,"extensions":["mpkg"]},"application/vnd.apple.keynote":{"source":"iana","extensions":["key"]},"application/vnd.apple.mpegurl":{"source":"iana","extensions":["m3u8"]},"application/vnd.apple.numbers":{"source":"iana","extensions":["numbers"]},"application/vnd.apple.pages":{"source":"iana","extensions":["pages"]},"application/vnd.apple.pkpass":{"compressible":false,"extensions":["pkpass"]},"application/vnd.arastra.swi":{"source":"iana"},"application/vnd.aristanetworks.swi":{"source":"iana","extensions":["swi"]},"application/vnd.artisan+json":{"source":"iana","compressible":true},"application/vnd.artsquare":{"source":"iana"},"application/vnd.astraea-software.iota":{"source":"iana","extensions":["iota"]},"application/vnd.audiograph":{"source":"iana","extensions":["aep"]},"application/vnd.autopackage":{"source":"iana"},"application/vnd.avalon+json":{"source":"iana","compressible":true},"application/vnd.avistar+xml":{"source":"iana","compressible":true},"application/vnd.balsamiq.bmml+xml":{"source":"iana","compressible":true,"extensions":["bmml"]},"application/vnd.balsamiq.bmpr":{"source":"iana"},"application/vnd.banana-accounting":{"source":"iana"},"application/vnd.bbf.usp.error":{"source":"iana"},"application/vnd.bbf.usp.msg":{"source":"iana"},"application/vnd.bbf.usp.msg+json":{"source":"iana","compressible":true},"application/vnd.bekitzur-stech+json":{"source":"iana","compressible":true},"application/vnd.bint.med-content":{"source":"iana"},"application/vnd.biopax.rdf+xml":{"source":"iana","compressible":true},"application/vnd.blink-idb-value-wrapper":{"source":"iana"},"application/vnd.blueice.multipass":{"source":"iana","extensions":["mpm"]},"application/vnd.bluetooth.ep.oob":{"source":"iana"},"application/vnd.bluetooth.le.oob":{"source":"iana"},"application/vnd.bmi":{"source":"iana","extensions":["bmi"]},"application/vnd.bpf":{"source":"iana"},"application/vnd.bpf3":{"source":"iana"},"application/vnd.businessobjects":{"source":"iana","extensions":["rep"]},"application/vnd.byu.uapi+json":{"source":"iana","compressible":true},"application/vnd.cab-jscript":{"source":"iana"},"application/vnd.canon-cpdl":{"source":"iana"},"application/vnd.canon-lips":{"source":"iana"},"application/vnd.capasystems-pg+json":{"source":"iana","compressible":true},"application/vnd.cendio.thinlinc.clientconf":{"source":"iana"},"application/vnd.century-systems.tcp_stream":{"source":"iana"},"application/vnd.chemdraw+xml":{"source":"iana","compressible":true,"extensions":["cdxml"]},"application/vnd.chess-pgn":{"source":"iana"},"application/vnd.chipnuts.karaoke-mmd":{"source":"iana","extensions":["mmd"]},"application/vnd.ciedi":{"source":"iana"},"application/vnd.cinderella":{"source":"iana","extensions":["cdy"]},"application/vnd.cirpack.isdn-ext":{"source":"iana"},"application/vnd.citationstyles.style+xml":{"source":"iana","compressible":true,"extensions":["csl"]},"application/vnd.claymore":{"source":"iana","extensions":["cla"]},"application/vnd.cloanto.rp9":{"source":"iana","extensions":["rp9"]},"application/vnd.clonk.c4group":{"source":"iana","extensions":["c4g","c4d","c4f","c4p","c4u"]},"application/vnd.cluetrust.cartomobile-config":{"source":"iana","extensions":["c11amc"]},"application/vnd.cluetrust.cartomobile-config-pkg":{"source":"iana","extensions":["c11amz"]},"application/vnd.coffeescript":{"source":"iana"},"application/vnd.collabio.xodocuments.document":{"source":"iana"},"application/vnd.collabio.xodocuments.document-template":{"source":"iana"},"application/vnd.collabio.xodocuments.presentation":{"source":"iana"},"application/vnd.collabio.xodocuments.presentation-template":{"source":"iana"},"application/vnd.collabio.xodocuments.spreadsheet":{"source":"iana"},"application/vnd.collabio.xodocuments.spreadsheet-template":{"source":"iana"},"application/vnd.collection+json":{"source":"iana","compressible":true},"application/vnd.collection.doc+json":{"source":"iana","compressible":true},"application/vnd.collection.next+json":{"source":"iana","compressible":true},"application/vnd.comicbook+zip":{"source":"iana","compressible":false},"application/vnd.comicbook-rar":{"source":"iana"},"application/vnd.commerce-battelle":{"source":"iana"},"application/vnd.commonspace":{"source":"iana","extensions":["csp"]},"application/vnd.contact.cmsg":{"source":"iana","extensions":["cdbcmsg"]},"application/vnd.coreos.ignition+json":{"source":"iana","compressible":true},"application/vnd.cosmocaller":{"source":"iana","extensions":["cmc"]},"application/vnd.crick.clicker":{"source":"iana","extensions":["clkx"]},"application/vnd.crick.clicker.keyboard":{"source":"iana","extensions":["clkk"]},"application/vnd.crick.clicker.palette":{"source":"iana","extensions":["clkp"]},"application/vnd.crick.clicker.template":{"source":"iana","extensions":["clkt"]},"application/vnd.crick.clicker.wordbank":{"source":"iana","extensions":["clkw"]},"application/vnd.criticaltools.wbs+xml":{"source":"iana","compressible":true,"extensions":["wbs"]},"application/vnd.cryptii.pipe+json":{"source":"iana","compressible":true},"application/vnd.crypto-shade-file":{"source":"iana"},"application/vnd.cryptomator.encrypted":{"source":"iana"},"application/vnd.cryptomator.vault":{"source":"iana"},"application/vnd.ctc-posml":{"source":"iana","extensions":["pml"]},"application/vnd.ctct.ws+xml":{"source":"iana","compressible":true},"application/vnd.cups-pdf":{"source":"iana"},"application/vnd.cups-postscript":{"source":"iana"},"application/vnd.cups-ppd":{"source":"iana","extensions":["ppd"]},"application/vnd.cups-raster":{"source":"iana"},"application/vnd.cups-raw":{"source":"iana"},"application/vnd.curl":{"source":"iana"},"application/vnd.curl.car":{"source":"apache","extensions":["car"]},"application/vnd.curl.pcurl":{"source":"apache","extensions":["pcurl"]},"application/vnd.cyan.dean.root+xml":{"source":"iana","compressible":true},"application/vnd.cybank":{"source":"iana"},"application/vnd.cyclonedx+json":{"source":"iana","compressible":true},"application/vnd.cyclonedx+xml":{"source":"iana","compressible":true},"application/vnd.d2l.coursepackage1p0+zip":{"source":"iana","compressible":false},"application/vnd.d3m-dataset":{"source":"iana"},"application/vnd.d3m-problem":{"source":"iana"},"application/vnd.dart":{"source":"iana","compressible":true,"extensions":["dart"]},"application/vnd.data-vision.rdz":{"source":"iana","extensions":["rdz"]},"application/vnd.datapackage+json":{"source":"iana","compressible":true},"application/vnd.dataresource+json":{"source":"iana","compressible":true},"application/vnd.dbf":{"source":"iana","extensions":["dbf"]},"application/vnd.debian.binary-package":{"source":"iana"},"application/vnd.dece.data":{"source":"iana","extensions":["uvf","uvvf","uvd","uvvd"]},"application/vnd.dece.ttml+xml":{"source":"iana","compressible":true,"extensions":["uvt","uvvt"]},"application/vnd.dece.unspecified":{"source":"iana","extensions":["uvx","uvvx"]},"application/vnd.dece.zip":{"source":"iana","extensions":["uvz","uvvz"]},"application/vnd.denovo.fcselayout-link":{"source":"iana","extensions":["fe_launch"]},"application/vnd.desmume.movie":{"source":"iana"},"application/vnd.dir-bi.plate-dl-nosuffix":{"source":"iana"},"application/vnd.dm.delegation+xml":{"source":"iana","compressible":true},"application/vnd.dna":{"source":"iana","extensions":["dna"]},"application/vnd.document+json":{"source":"iana","compressible":true},"application/vnd.dolby.mlp":{"source":"apache","extensions":["mlp"]},"application/vnd.dolby.mobile.1":{"source":"iana"},"application/vnd.dolby.mobile.2":{"source":"iana"},"application/vnd.doremir.scorecloud-binary-document":{"source":"iana"},"application/vnd.dpgraph":{"source":"iana","extensions":["dpg"]},"application/vnd.dreamfactory":{"source":"iana","extensions":["dfac"]},"application/vnd.drive+json":{"source":"iana","compressible":true},"application/vnd.ds-keypoint":{"source":"apache","extensions":["kpxx"]},"application/vnd.dtg.local":{"source":"iana"},"application/vnd.dtg.local.flash":{"source":"iana"},"application/vnd.dtg.local.html":{"source":"iana"},"application/vnd.dvb.ait":{"source":"iana","extensions":["ait"]},"application/vnd.dvb.dvbisl+xml":{"source":"iana","compressible":true},"application/vnd.dvb.dvbj":{"source":"iana"},"application/vnd.dvb.esgcontainer":{"source":"iana"},"application/vnd.dvb.ipdcdftnotifaccess":{"source":"iana"},"application/vnd.dvb.ipdcesgaccess":{"source":"iana"},"application/vnd.dvb.ipdcesgaccess2":{"source":"iana"},"application/vnd.dvb.ipdcesgpdd":{"source":"iana"},"application/vnd.dvb.ipdcroaming":{"source":"iana"},"application/vnd.dvb.iptv.alfec-base":{"source":"iana"},"application/vnd.dvb.iptv.alfec-enhancement":{"source":"iana"},"application/vnd.dvb.notif-aggregate-root+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-container+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-generic+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-msglist+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-registration-request+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-registration-response+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-init+xml":{"source":"iana","compressible":true},"application/vnd.dvb.pfr":{"source":"iana"},"application/vnd.dvb.service":{"source":"iana","extensions":["svc"]},"application/vnd.dxr":{"source":"iana"},"application/vnd.dynageo":{"source":"iana","extensions":["geo"]},"application/vnd.dzr":{"source":"iana"},"application/vnd.easykaraoke.cdgdownload":{"source":"iana"},"application/vnd.ecdis-update":{"source":"iana"},"application/vnd.ecip.rlp":{"source":"iana"},"application/vnd.eclipse.ditto+json":{"source":"iana","compressible":true},"application/vnd.ecowin.chart":{"source":"iana","extensions":["mag"]},"application/vnd.ecowin.filerequest":{"source":"iana"},"application/vnd.ecowin.fileupdate":{"source":"iana"},"application/vnd.ecowin.series":{"source":"iana"},"application/vnd.ecowin.seriesrequest":{"source":"iana"},"application/vnd.ecowin.seriesupdate":{"source":"iana"},"application/vnd.efi.img":{"source":"iana"},"application/vnd.efi.iso":{"source":"iana"},"application/vnd.emclient.accessrequest+xml":{"source":"iana","compressible":true},"application/vnd.enliven":{"source":"iana","extensions":["nml"]},"application/vnd.enphase.envoy":{"source":"iana"},"application/vnd.eprints.data+xml":{"source":"iana","compressible":true},"application/vnd.epson.esf":{"source":"iana","extensions":["esf"]},"application/vnd.epson.msf":{"source":"iana","extensions":["msf"]},"application/vnd.epson.quickanime":{"source":"iana","extensions":["qam"]},"application/vnd.epson.salt":{"source":"iana","extensions":["slt"]},"application/vnd.epson.ssf":{"source":"iana","extensions":["ssf"]},"application/vnd.ericsson.quickcall":{"source":"iana"},"application/vnd.espass-espass+zip":{"source":"iana","compressible":false},"application/vnd.eszigno3+xml":{"source":"iana","compressible":true,"extensions":["es3","et3"]},"application/vnd.etsi.aoc+xml":{"source":"iana","compressible":true},"application/vnd.etsi.asic-e+zip":{"source":"iana","compressible":false},"application/vnd.etsi.asic-s+zip":{"source":"iana","compressible":false},"application/vnd.etsi.cug+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvcommand+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvdiscovery+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvprofile+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-bc+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-cod+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-npvr+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvservice+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsync+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvueprofile+xml":{"source":"iana","compressible":true},"application/vnd.etsi.mcid+xml":{"source":"iana","compressible":true},"application/vnd.etsi.mheg5":{"source":"iana"},"application/vnd.etsi.overload-control-policy-dataset+xml":{"source":"iana","compressible":true},"application/vnd.etsi.pstn+xml":{"source":"iana","compressible":true},"application/vnd.etsi.sci+xml":{"source":"iana","compressible":true},"application/vnd.etsi.simservs+xml":{"source":"iana","compressible":true},"application/vnd.etsi.timestamp-token":{"source":"iana"},"application/vnd.etsi.tsl+xml":{"source":"iana","compressible":true},"application/vnd.etsi.tsl.der":{"source":"iana"},"application/vnd.eu.kasparian.car+json":{"source":"iana","compressible":true},"application/vnd.eudora.data":{"source":"iana"},"application/vnd.evolv.ecig.profile":{"source":"iana"},"application/vnd.evolv.ecig.settings":{"source":"iana"},"application/vnd.evolv.ecig.theme":{"source":"iana"},"application/vnd.exstream-empower+zip":{"source":"iana","compressible":false},"application/vnd.exstream-package":{"source":"iana"},"application/vnd.ezpix-album":{"source":"iana","extensions":["ez2"]},"application/vnd.ezpix-package":{"source":"iana","extensions":["ez3"]},"application/vnd.f-secure.mobile":{"source":"iana"},"application/vnd.familysearch.gedcom+zip":{"source":"iana","compressible":false},"application/vnd.fastcopy-disk-image":{"source":"iana"},"application/vnd.fdf":{"source":"iana","extensions":["fdf"]},"application/vnd.fdsn.mseed":{"source":"iana","extensions":["mseed"]},"application/vnd.fdsn.seed":{"source":"iana","extensions":["seed","dataless"]},"application/vnd.ffsns":{"source":"iana"},"application/vnd.ficlab.flb+zip":{"source":"iana","compressible":false},"application/vnd.filmit.zfc":{"source":"iana"},"application/vnd.fints":{"source":"iana"},"application/vnd.firemonkeys.cloudcell":{"source":"iana"},"application/vnd.flographit":{"source":"iana","extensions":["gph"]},"application/vnd.fluxtime.clip":{"source":"iana","extensions":["ftc"]},"application/vnd.font-fontforge-sfd":{"source":"iana"},"application/vnd.framemaker":{"source":"iana","extensions":["fm","frame","maker","book"]},"application/vnd.frogans.fnc":{"source":"iana","extensions":["fnc"]},"application/vnd.frogans.ltf":{"source":"iana","extensions":["ltf"]},"application/vnd.fsc.weblaunch":{"source":"iana","extensions":["fsc"]},"application/vnd.fujifilm.fb.docuworks":{"source":"iana"},"application/vnd.fujifilm.fb.docuworks.binder":{"source":"iana"},"application/vnd.fujifilm.fb.docuworks.container":{"source":"iana"},"application/vnd.fujifilm.fb.jfi+xml":{"source":"iana","compressible":true},"application/vnd.fujitsu.oasys":{"source":"iana","extensions":["oas"]},"application/vnd.fujitsu.oasys2":{"source":"iana","extensions":["oa2"]},"application/vnd.fujitsu.oasys3":{"source":"iana","extensions":["oa3"]},"application/vnd.fujitsu.oasysgp":{"source":"iana","extensions":["fg5"]},"application/vnd.fujitsu.oasysprs":{"source":"iana","extensions":["bh2"]},"application/vnd.fujixerox.art-ex":{"source":"iana"},"application/vnd.fujixerox.art4":{"source":"iana"},"application/vnd.fujixerox.ddd":{"source":"iana","extensions":["ddd"]},"application/vnd.fujixerox.docuworks":{"source":"iana","extensions":["xdw"]},"application/vnd.fujixerox.docuworks.binder":{"source":"iana","extensions":["xbd"]},"application/vnd.fujixerox.docuworks.container":{"source":"iana"},"application/vnd.fujixerox.hbpl":{"source":"iana"},"application/vnd.fut-misnet":{"source":"iana"},"application/vnd.futoin+cbor":{"source":"iana"},"application/vnd.futoin+json":{"source":"iana","compressible":true},"application/vnd.fuzzysheet":{"source":"iana","extensions":["fzs"]},"application/vnd.genomatix.tuxedo":{"source":"iana","extensions":["txd"]},"application/vnd.gentics.grd+json":{"source":"iana","compressible":true},"application/vnd.geo+json":{"source":"iana","compressible":true},"application/vnd.geocube+xml":{"source":"iana","compressible":true},"application/vnd.geogebra.file":{"source":"iana","extensions":["ggb"]},"application/vnd.geogebra.slides":{"source":"iana"},"application/vnd.geogebra.tool":{"source":"iana","extensions":["ggt"]},"application/vnd.geometry-explorer":{"source":"iana","extensions":["gex","gre"]},"application/vnd.geonext":{"source":"iana","extensions":["gxt"]},"application/vnd.geoplan":{"source":"iana","extensions":["g2w"]},"application/vnd.geospace":{"source":"iana","extensions":["g3w"]},"application/vnd.gerber":{"source":"iana"},"application/vnd.globalplatform.card-content-mgt":{"source":"iana"},"application/vnd.globalplatform.card-content-mgt-response":{"source":"iana"},"application/vnd.gmx":{"source":"iana","extensions":["gmx"]},"application/vnd.google-apps.document":{"compressible":false,"extensions":["gdoc"]},"application/vnd.google-apps.presentation":{"compressible":false,"extensions":["gslides"]},"application/vnd.google-apps.spreadsheet":{"compressible":false,"extensions":["gsheet"]},"application/vnd.google-earth.kml+xml":{"source":"iana","compressible":true,"extensions":["kml"]},"application/vnd.google-earth.kmz":{"source":"iana","compressible":false,"extensions":["kmz"]},"application/vnd.gov.sk.e-form+xml":{"source":"iana","compressible":true},"application/vnd.gov.sk.e-form+zip":{"source":"iana","compressible":false},"application/vnd.gov.sk.xmldatacontainer+xml":{"source":"iana","compressible":true},"application/vnd.grafeq":{"source":"iana","extensions":["gqf","gqs"]},"application/vnd.gridmp":{"source":"iana"},"application/vnd.groove-account":{"source":"iana","extensions":["gac"]},"application/vnd.groove-help":{"source":"iana","extensions":["ghf"]},"application/vnd.groove-identity-message":{"source":"iana","extensions":["gim"]},"application/vnd.groove-injector":{"source":"iana","extensions":["grv"]},"application/vnd.groove-tool-message":{"source":"iana","extensions":["gtm"]},"application/vnd.groove-tool-template":{"source":"iana","extensions":["tpl"]},"application/vnd.groove-vcard":{"source":"iana","extensions":["vcg"]},"application/vnd.hal+json":{"source":"iana","compressible":true},"application/vnd.hal+xml":{"source":"iana","compressible":true,"extensions":["hal"]},"application/vnd.handheld-entertainment+xml":{"source":"iana","compressible":true,"extensions":["zmm"]},"application/vnd.hbci":{"source":"iana","extensions":["hbci"]},"application/vnd.hc+json":{"source":"iana","compressible":true},"application/vnd.hcl-bireports":{"source":"iana"},"application/vnd.hdt":{"source":"iana"},"application/vnd.heroku+json":{"source":"iana","compressible":true},"application/vnd.hhe.lesson-player":{"source":"iana","extensions":["les"]},"application/vnd.hl7cda+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.hl7v2+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.hp-hpgl":{"source":"iana","extensions":["hpgl"]},"application/vnd.hp-hpid":{"source":"iana","extensions":["hpid"]},"application/vnd.hp-hps":{"source":"iana","extensions":["hps"]},"application/vnd.hp-jlyt":{"source":"iana","extensions":["jlt"]},"application/vnd.hp-pcl":{"source":"iana","extensions":["pcl"]},"application/vnd.hp-pclxl":{"source":"iana","extensions":["pclxl"]},"application/vnd.httphone":{"source":"iana"},"application/vnd.hydrostatix.sof-data":{"source":"iana","extensions":["sfd-hdstx"]},"application/vnd.hyper+json":{"source":"iana","compressible":true},"application/vnd.hyper-item+json":{"source":"iana","compressible":true},"application/vnd.hyperdrive+json":{"source":"iana","compressible":true},"application/vnd.hzn-3d-crossword":{"source":"iana"},"application/vnd.ibm.afplinedata":{"source":"iana"},"application/vnd.ibm.electronic-media":{"source":"iana"},"application/vnd.ibm.minipay":{"source":"iana","extensions":["mpy"]},"application/vnd.ibm.modcap":{"source":"iana","extensions":["afp","listafp","list3820"]},"application/vnd.ibm.rights-management":{"source":"iana","extensions":["irm"]},"application/vnd.ibm.secure-container":{"source":"iana","extensions":["sc"]},"application/vnd.iccprofile":{"source":"iana","extensions":["icc","icm"]},"application/vnd.ieee.1905":{"source":"iana"},"application/vnd.igloader":{"source":"iana","extensions":["igl"]},"application/vnd.imagemeter.folder+zip":{"source":"iana","compressible":false},"application/vnd.imagemeter.image+zip":{"source":"iana","compressible":false},"application/vnd.immervision-ivp":{"source":"iana","extensions":["ivp"]},"application/vnd.immervision-ivu":{"source":"iana","extensions":["ivu"]},"application/vnd.ims.imsccv1p1":{"source":"iana"},"application/vnd.ims.imsccv1p2":{"source":"iana"},"application/vnd.ims.imsccv1p3":{"source":"iana"},"application/vnd.ims.lis.v2.result+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolconsumerprofile+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolproxy+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolproxy.id+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolsettings+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolsettings.simple+json":{"source":"iana","compressible":true},"application/vnd.informedcontrol.rms+xml":{"source":"iana","compressible":true},"application/vnd.informix-visionary":{"source":"iana"},"application/vnd.infotech.project":{"source":"iana"},"application/vnd.infotech.project+xml":{"source":"iana","compressible":true},"application/vnd.innopath.wamp.notification":{"source":"iana"},"application/vnd.insors.igm":{"source":"iana","extensions":["igm"]},"application/vnd.intercon.formnet":{"source":"iana","extensions":["xpw","xpx"]},"application/vnd.intergeo":{"source":"iana","extensions":["i2g"]},"application/vnd.intertrust.digibox":{"source":"iana"},"application/vnd.intertrust.nncp":{"source":"iana"},"application/vnd.intu.qbo":{"source":"iana","extensions":["qbo"]},"application/vnd.intu.qfx":{"source":"iana","extensions":["qfx"]},"application/vnd.iptc.g2.catalogitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.conceptitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.knowledgeitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.newsitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.newsmessage+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.packageitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.planningitem+xml":{"source":"iana","compressible":true},"application/vnd.ipunplugged.rcprofile":{"source":"iana","extensions":["rcprofile"]},"application/vnd.irepository.package+xml":{"source":"iana","compressible":true,"extensions":["irp"]},"application/vnd.is-xpr":{"source":"iana","extensions":["xpr"]},"application/vnd.isac.fcs":{"source":"iana","extensions":["fcs"]},"application/vnd.iso11783-10+zip":{"source":"iana","compressible":false},"application/vnd.jam":{"source":"iana","extensions":["jam"]},"application/vnd.japannet-directory-service":{"source":"iana"},"application/vnd.japannet-jpnstore-wakeup":{"source":"iana"},"application/vnd.japannet-payment-wakeup":{"source":"iana"},"application/vnd.japannet-registration":{"source":"iana"},"application/vnd.japannet-registration-wakeup":{"source":"iana"},"application/vnd.japannet-setstore-wakeup":{"source":"iana"},"application/vnd.japannet-verification":{"source":"iana"},"application/vnd.japannet-verification-wakeup":{"source":"iana"},"application/vnd.jcp.javame.midlet-rms":{"source":"iana","extensions":["rms"]},"application/vnd.jisp":{"source":"iana","extensions":["jisp"]},"application/vnd.joost.joda-archive":{"source":"iana","extensions":["joda"]},"application/vnd.jsk.isdn-ngn":{"source":"iana"},"application/vnd.kahootz":{"source":"iana","extensions":["ktz","ktr"]},"application/vnd.kde.karbon":{"source":"iana","extensions":["karbon"]},"application/vnd.kde.kchart":{"source":"iana","extensions":["chrt"]},"application/vnd.kde.kformula":{"source":"iana","extensions":["kfo"]},"application/vnd.kde.kivio":{"source":"iana","extensions":["flw"]},"application/vnd.kde.kontour":{"source":"iana","extensions":["kon"]},"application/vnd.kde.kpresenter":{"source":"iana","extensions":["kpr","kpt"]},"application/vnd.kde.kspread":{"source":"iana","extensions":["ksp"]},"application/vnd.kde.kword":{"source":"iana","extensions":["kwd","kwt"]},"application/vnd.kenameaapp":{"source":"iana","extensions":["htke"]},"application/vnd.kidspiration":{"source":"iana","extensions":["kia"]},"application/vnd.kinar":{"source":"iana","extensions":["kne","knp"]},"application/vnd.koan":{"source":"iana","extensions":["skp","skd","skt","skm"]},"application/vnd.kodak-descriptor":{"source":"iana","extensions":["sse"]},"application/vnd.las":{"source":"iana"},"application/vnd.las.las+json":{"source":"iana","compressible":true},"application/vnd.las.las+xml":{"source":"iana","compressible":true,"extensions":["lasxml"]},"application/vnd.laszip":{"source":"iana"},"application/vnd.leap+json":{"source":"iana","compressible":true},"application/vnd.liberty-request+xml":{"source":"iana","compressible":true},"application/vnd.llamagraphics.life-balance.desktop":{"source":"iana","extensions":["lbd"]},"application/vnd.llamagraphics.life-balance.exchange+xml":{"source":"iana","compressible":true,"extensions":["lbe"]},"application/vnd.logipipe.circuit+zip":{"source":"iana","compressible":false},"application/vnd.loom":{"source":"iana"},"application/vnd.lotus-1-2-3":{"source":"iana","extensions":["123"]},"application/vnd.lotus-approach":{"source":"iana","extensions":["apr"]},"application/vnd.lotus-freelance":{"source":"iana","extensions":["pre"]},"application/vnd.lotus-notes":{"source":"iana","extensions":["nsf"]},"application/vnd.lotus-organizer":{"source":"iana","extensions":["org"]},"application/vnd.lotus-screencam":{"source":"iana","extensions":["scm"]},"application/vnd.lotus-wordpro":{"source":"iana","extensions":["lwp"]},"application/vnd.macports.portpkg":{"source":"iana","extensions":["portpkg"]},"application/vnd.mapbox-vector-tile":{"source":"iana","extensions":["mvt"]},"application/vnd.marlin.drm.actiontoken+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.conftoken+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.license+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.mdcf":{"source":"iana"},"application/vnd.mason+json":{"source":"iana","compressible":true},"application/vnd.maxar.archive.3tz+zip":{"source":"iana","compressible":false},"application/vnd.maxmind.maxmind-db":{"source":"iana"},"application/vnd.mcd":{"source":"iana","extensions":["mcd"]},"application/vnd.medcalcdata":{"source":"iana","extensions":["mc1"]},"application/vnd.mediastation.cdkey":{"source":"iana","extensions":["cdkey"]},"application/vnd.meridian-slingshot":{"source":"iana"},"application/vnd.mfer":{"source":"iana","extensions":["mwf"]},"application/vnd.mfmp":{"source":"iana","extensions":["mfm"]},"application/vnd.micro+json":{"source":"iana","compressible":true},"application/vnd.micrografx.flo":{"source":"iana","extensions":["flo"]},"application/vnd.micrografx.igx":{"source":"iana","extensions":["igx"]},"application/vnd.microsoft.portable-executable":{"source":"iana"},"application/vnd.microsoft.windows.thumbnail-cache":{"source":"iana"},"application/vnd.miele+json":{"source":"iana","compressible":true},"application/vnd.mif":{"source":"iana","extensions":["mif"]},"application/vnd.minisoft-hp3000-save":{"source":"iana"},"application/vnd.mitsubishi.misty-guard.trustweb":{"source":"iana"},"application/vnd.mobius.daf":{"source":"iana","extensions":["daf"]},"application/vnd.mobius.dis":{"source":"iana","extensions":["dis"]},"application/vnd.mobius.mbk":{"source":"iana","extensions":["mbk"]},"application/vnd.mobius.mqy":{"source":"iana","extensions":["mqy"]},"application/vnd.mobius.msl":{"source":"iana","extensions":["msl"]},"application/vnd.mobius.plc":{"source":"iana","extensions":["plc"]},"application/vnd.mobius.txf":{"source":"iana","extensions":["txf"]},"application/vnd.mophun.application":{"source":"iana","extensions":["mpn"]},"application/vnd.mophun.certificate":{"source":"iana","extensions":["mpc"]},"application/vnd.motorola.flexsuite":{"source":"iana"},"application/vnd.motorola.flexsuite.adsi":{"source":"iana"},"application/vnd.motorola.flexsuite.fis":{"source":"iana"},"application/vnd.motorola.flexsuite.gotap":{"source":"iana"},"application/vnd.motorola.flexsuite.kmr":{"source":"iana"},"application/vnd.motorola.flexsuite.ttc":{"source":"iana"},"application/vnd.motorola.flexsuite.wem":{"source":"iana"},"application/vnd.motorola.iprm":{"source":"iana"},"application/vnd.mozilla.xul+xml":{"source":"iana","compressible":true,"extensions":["xul"]},"application/vnd.ms-3mfdocument":{"source":"iana"},"application/vnd.ms-artgalry":{"source":"iana","extensions":["cil"]},"application/vnd.ms-asf":{"source":"iana"},"application/vnd.ms-cab-compressed":{"source":"iana","extensions":["cab"]},"application/vnd.ms-color.iccprofile":{"source":"apache"},"application/vnd.ms-excel":{"source":"iana","compressible":false,"extensions":["xls","xlm","xla","xlc","xlt","xlw"]},"application/vnd.ms-excel.addin.macroenabled.12":{"source":"iana","extensions":["xlam"]},"application/vnd.ms-excel.sheet.binary.macroenabled.12":{"source":"iana","extensions":["xlsb"]},"application/vnd.ms-excel.sheet.macroenabled.12":{"source":"iana","extensions":["xlsm"]},"application/vnd.ms-excel.template.macroenabled.12":{"source":"iana","extensions":["xltm"]},"application/vnd.ms-fontobject":{"source":"iana","compressible":true,"extensions":["eot"]},"application/vnd.ms-htmlhelp":{"source":"iana","extensions":["chm"]},"application/vnd.ms-ims":{"source":"iana","extensions":["ims"]},"application/vnd.ms-lrm":{"source":"iana","extensions":["lrm"]},"application/vnd.ms-office.activex+xml":{"source":"iana","compressible":true},"application/vnd.ms-officetheme":{"source":"iana","extensions":["thmx"]},"application/vnd.ms-opentype":{"source":"apache","compressible":true},"application/vnd.ms-outlook":{"compressible":false,"extensions":["msg"]},"application/vnd.ms-package.obfuscated-opentype":{"source":"apache"},"application/vnd.ms-pki.seccat":{"source":"apache","extensions":["cat"]},"application/vnd.ms-pki.stl":{"source":"apache","extensions":["stl"]},"application/vnd.ms-playready.initiator+xml":{"source":"iana","compressible":true},"application/vnd.ms-powerpoint":{"source":"iana","compressible":false,"extensions":["ppt","pps","pot"]},"application/vnd.ms-powerpoint.addin.macroenabled.12":{"source":"iana","extensions":["ppam"]},"application/vnd.ms-powerpoint.presentation.macroenabled.12":{"source":"iana","extensions":["pptm"]},"application/vnd.ms-powerpoint.slide.macroenabled.12":{"source":"iana","extensions":["sldm"]},"application/vnd.ms-powerpoint.slideshow.macroenabled.12":{"source":"iana","extensions":["ppsm"]},"application/vnd.ms-powerpoint.template.macroenabled.12":{"source":"iana","extensions":["potm"]},"application/vnd.ms-printdevicecapabilities+xml":{"source":"iana","compressible":true},"application/vnd.ms-printing.printticket+xml":{"source":"apache","compressible":true},"application/vnd.ms-printschematicket+xml":{"source":"iana","compressible":true},"application/vnd.ms-project":{"source":"iana","extensions":["mpp","mpt"]},"application/vnd.ms-tnef":{"source":"iana"},"application/vnd.ms-windows.devicepairing":{"source":"iana"},"application/vnd.ms-windows.nwprinting.oob":{"source":"iana"},"application/vnd.ms-windows.printerpairing":{"source":"iana"},"application/vnd.ms-windows.wsd.oob":{"source":"iana"},"application/vnd.ms-wmdrm.lic-chlg-req":{"source":"iana"},"application/vnd.ms-wmdrm.lic-resp":{"source":"iana"},"application/vnd.ms-wmdrm.meter-chlg-req":{"source":"iana"},"application/vnd.ms-wmdrm.meter-resp":{"source":"iana"},"application/vnd.ms-word.document.macroenabled.12":{"source":"iana","extensions":["docm"]},"application/vnd.ms-word.template.macroenabled.12":{"source":"iana","extensions":["dotm"]},"application/vnd.ms-works":{"source":"iana","extensions":["wps","wks","wcm","wdb"]},"application/vnd.ms-wpl":{"source":"iana","extensions":["wpl"]},"application/vnd.ms-xpsdocument":{"source":"iana","compressible":false,"extensions":["xps"]},"application/vnd.msa-disk-image":{"source":"iana"},"application/vnd.mseq":{"source":"iana","extensions":["mseq"]},"application/vnd.msign":{"source":"iana"},"application/vnd.multiad.creator":{"source":"iana"},"application/vnd.multiad.creator.cif":{"source":"iana"},"application/vnd.music-niff":{"source":"iana"},"application/vnd.musician":{"source":"iana","extensions":["mus"]},"application/vnd.muvee.style":{"source":"iana","extensions":["msty"]},"application/vnd.mynfc":{"source":"iana","extensions":["taglet"]},"application/vnd.nacamar.ybrid+json":{"source":"iana","compressible":true},"application/vnd.ncd.control":{"source":"iana"},"application/vnd.ncd.reference":{"source":"iana"},"application/vnd.nearst.inv+json":{"source":"iana","compressible":true},"application/vnd.nebumind.line":{"source":"iana"},"application/vnd.nervana":{"source":"iana"},"application/vnd.netfpx":{"source":"iana"},"application/vnd.neurolanguage.nlu":{"source":"iana","extensions":["nlu"]},"application/vnd.nimn":{"source":"iana"},"application/vnd.nintendo.nitro.rom":{"source":"iana"},"application/vnd.nintendo.snes.rom":{"source":"iana"},"application/vnd.nitf":{"source":"iana","extensions":["ntf","nitf"]},"application/vnd.noblenet-directory":{"source":"iana","extensions":["nnd"]},"application/vnd.noblenet-sealer":{"source":"iana","extensions":["nns"]},"application/vnd.noblenet-web":{"source":"iana","extensions":["nnw"]},"application/vnd.nokia.catalogs":{"source":"iana"},"application/vnd.nokia.conml+wbxml":{"source":"iana"},"application/vnd.nokia.conml+xml":{"source":"iana","compressible":true},"application/vnd.nokia.iptv.config+xml":{"source":"iana","compressible":true},"application/vnd.nokia.isds-radio-presets":{"source":"iana"},"application/vnd.nokia.landmark+wbxml":{"source":"iana"},"application/vnd.nokia.landmark+xml":{"source":"iana","compressible":true},"application/vnd.nokia.landmarkcollection+xml":{"source":"iana","compressible":true},"application/vnd.nokia.n-gage.ac+xml":{"source":"iana","compressible":true,"extensions":["ac"]},"application/vnd.nokia.n-gage.data":{"source":"iana","extensions":["ngdat"]},"application/vnd.nokia.n-gage.symbian.install":{"source":"iana","extensions":["n-gage"]},"application/vnd.nokia.ncd":{"source":"iana"},"application/vnd.nokia.pcd+wbxml":{"source":"iana"},"application/vnd.nokia.pcd+xml":{"source":"iana","compressible":true},"application/vnd.nokia.radio-preset":{"source":"iana","extensions":["rpst"]},"application/vnd.nokia.radio-presets":{"source":"iana","extensions":["rpss"]},"application/vnd.novadigm.edm":{"source":"iana","extensions":["edm"]},"application/vnd.novadigm.edx":{"source":"iana","extensions":["edx"]},"application/vnd.novadigm.ext":{"source":"iana","extensions":["ext"]},"application/vnd.ntt-local.content-share":{"source":"iana"},"application/vnd.ntt-local.file-transfer":{"source":"iana"},"application/vnd.ntt-local.ogw_remote-access":{"source":"iana"},"application/vnd.ntt-local.sip-ta_remote":{"source":"iana"},"application/vnd.ntt-local.sip-ta_tcp_stream":{"source":"iana"},"application/vnd.oasis.opendocument.chart":{"source":"iana","extensions":["odc"]},"application/vnd.oasis.opendocument.chart-template":{"source":"iana","extensions":["otc"]},"application/vnd.oasis.opendocument.database":{"source":"iana","extensions":["odb"]},"application/vnd.oasis.opendocument.formula":{"source":"iana","extensions":["odf"]},"application/vnd.oasis.opendocument.formula-template":{"source":"iana","extensions":["odft"]},"application/vnd.oasis.opendocument.graphics":{"source":"iana","compressible":false,"extensions":["odg"]},"application/vnd.oasis.opendocument.graphics-template":{"source":"iana","extensions":["otg"]},"application/vnd.oasis.opendocument.image":{"source":"iana","extensions":["odi"]},"application/vnd.oasis.opendocument.image-template":{"source":"iana","extensions":["oti"]},"application/vnd.oasis.opendocument.presentation":{"source":"iana","compressible":false,"extensions":["odp"]},"application/vnd.oasis.opendocument.presentation-template":{"source":"iana","extensions":["otp"]},"application/vnd.oasis.opendocument.spreadsheet":{"source":"iana","compressible":false,"extensions":["ods"]},"application/vnd.oasis.opendocument.spreadsheet-template":{"source":"iana","extensions":["ots"]},"application/vnd.oasis.opendocument.text":{"source":"iana","compressible":false,"extensions":["odt"]},"application/vnd.oasis.opendocument.text-master":{"source":"iana","extensions":["odm"]},"application/vnd.oasis.opendocument.text-template":{"source":"iana","extensions":["ott"]},"application/vnd.oasis.opendocument.text-web":{"source":"iana","extensions":["oth"]},"application/vnd.obn":{"source":"iana"},"application/vnd.ocf+cbor":{"source":"iana"},"application/vnd.oci.image.manifest.v1+json":{"source":"iana","compressible":true},"application/vnd.oftn.l10n+json":{"source":"iana","compressible":true},"application/vnd.oipf.contentaccessdownload+xml":{"source":"iana","compressible":true},"application/vnd.oipf.contentaccessstreaming+xml":{"source":"iana","compressible":true},"application/vnd.oipf.cspg-hexbinary":{"source":"iana"},"application/vnd.oipf.dae.svg+xml":{"source":"iana","compressible":true},"application/vnd.oipf.dae.xhtml+xml":{"source":"iana","compressible":true},"application/vnd.oipf.mippvcontrolmessage+xml":{"source":"iana","compressible":true},"application/vnd.oipf.pae.gem":{"source":"iana"},"application/vnd.oipf.spdiscovery+xml":{"source":"iana","compressible":true},"application/vnd.oipf.spdlist+xml":{"source":"iana","compressible":true},"application/vnd.oipf.ueprofile+xml":{"source":"iana","compressible":true},"application/vnd.oipf.userprofile+xml":{"source":"iana","compressible":true},"application/vnd.olpc-sugar":{"source":"iana","extensions":["xo"]},"application/vnd.oma-scws-config":{"source":"iana"},"application/vnd.oma-scws-http-request":{"source":"iana"},"application/vnd.oma-scws-http-response":{"source":"iana"},"application/vnd.oma.bcast.associated-procedure-parameter+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.drm-trigger+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.imd+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.ltkm":{"source":"iana"},"application/vnd.oma.bcast.notification+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.provisioningtrigger":{"source":"iana"},"application/vnd.oma.bcast.sgboot":{"source":"iana"},"application/vnd.oma.bcast.sgdd+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.sgdu":{"source":"iana"},"application/vnd.oma.bcast.simple-symbol-container":{"source":"iana"},"application/vnd.oma.bcast.smartcard-trigger+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.sprov+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.stkm":{"source":"iana"},"application/vnd.oma.cab-address-book+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-feature-handler+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-pcc+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-subs-invite+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-user-prefs+xml":{"source":"iana","compressible":true},"application/vnd.oma.dcd":{"source":"iana"},"application/vnd.oma.dcdc":{"source":"iana"},"application/vnd.oma.dd2+xml":{"source":"iana","compressible":true,"extensions":["dd2"]},"application/vnd.oma.drm.risd+xml":{"source":"iana","compressible":true},"application/vnd.oma.group-usage-list+xml":{"source":"iana","compressible":true},"application/vnd.oma.lwm2m+cbor":{"source":"iana"},"application/vnd.oma.lwm2m+json":{"source":"iana","compressible":true},"application/vnd.oma.lwm2m+tlv":{"source":"iana"},"application/vnd.oma.pal+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.detailed-progress-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.final-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.groups+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.invocation-descriptor+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.optimized-progress-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.push":{"source":"iana"},"application/vnd.oma.scidm.messages+xml":{"source":"iana","compressible":true},"application/vnd.oma.xcap-directory+xml":{"source":"iana","compressible":true},"application/vnd.omads-email+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omads-file+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omads-folder+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omaloc-supl-init":{"source":"iana"},"application/vnd.onepager":{"source":"iana"},"application/vnd.onepagertamp":{"source":"iana"},"application/vnd.onepagertamx":{"source":"iana"},"application/vnd.onepagertat":{"source":"iana"},"application/vnd.onepagertatp":{"source":"iana"},"application/vnd.onepagertatx":{"source":"iana"},"application/vnd.openblox.game+xml":{"source":"iana","compressible":true,"extensions":["obgx"]},"application/vnd.openblox.game-binary":{"source":"iana"},"application/vnd.openeye.oeb":{"source":"iana"},"application/vnd.openofficeorg.extension":{"source":"apache","extensions":["oxt"]},"application/vnd.openstreetmap.data+xml":{"source":"iana","compressible":true,"extensions":["osm"]},"application/vnd.opentimestamps.ots":{"source":"iana"},"application/vnd.openxmlformats-officedocument.custom-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.customxmlproperties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawing+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.chart+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.extended-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.presentation":{"source":"iana","compressible":false,"extensions":["pptx"]},"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.presprops+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slide":{"source":"iana","extensions":["sldx"]},"application/vnd.openxmlformats-officedocument.presentationml.slide+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slideshow":{"source":"iana","extensions":["ppsx"]},"application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.tags+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.template":{"source":"iana","extensions":["potx"]},"application/vnd.openxmlformats-officedocument.presentationml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{"source":"iana","compressible":false,"extensions":["xlsx"]},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.template":{"source":"iana","extensions":["xltx"]},"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.theme+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.themeoverride+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.vmldrawing":{"source":"iana"},"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.document":{"source":"iana","compressible":false,"extensions":["docx"]},"application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.template":{"source":"iana","extensions":["dotx"]},"application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.core-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.relationships+xml":{"source":"iana","compressible":true},"application/vnd.oracle.resource+json":{"source":"iana","compressible":true},"application/vnd.orange.indata":{"source":"iana"},"application/vnd.osa.netdeploy":{"source":"iana"},"application/vnd.osgeo.mapguide.package":{"source":"iana","extensions":["mgp"]},"application/vnd.osgi.bundle":{"source":"iana"},"application/vnd.osgi.dp":{"source":"iana","extensions":["dp"]},"application/vnd.osgi.subsystem":{"source":"iana","extensions":["esa"]},"application/vnd.otps.ct-kip+xml":{"source":"iana","compressible":true},"application/vnd.oxli.countgraph":{"source":"iana"},"application/vnd.pagerduty+json":{"source":"iana","compressible":true},"application/vnd.palm":{"source":"iana","extensions":["pdb","pqa","oprc"]},"application/vnd.panoply":{"source":"iana"},"application/vnd.paos.xml":{"source":"iana"},"application/vnd.patentdive":{"source":"iana"},"application/vnd.patientecommsdoc":{"source":"iana"},"application/vnd.pawaafile":{"source":"iana","extensions":["paw"]},"application/vnd.pcos":{"source":"iana"},"application/vnd.pg.format":{"source":"iana","extensions":["str"]},"application/vnd.pg.osasli":{"source":"iana","extensions":["ei6"]},"application/vnd.piaccess.application-licence":{"source":"iana"},"application/vnd.picsel":{"source":"iana","extensions":["efif"]},"application/vnd.pmi.widget":{"source":"iana","extensions":["wg"]},"application/vnd.poc.group-advertisement+xml":{"source":"iana","compressible":true},"application/vnd.pocketlearn":{"source":"iana","extensions":["plf"]},"application/vnd.powerbuilder6":{"source":"iana","extensions":["pbd"]},"application/vnd.powerbuilder6-s":{"source":"iana"},"application/vnd.powerbuilder7":{"source":"iana"},"application/vnd.powerbuilder7-s":{"source":"iana"},"application/vnd.powerbuilder75":{"source":"iana"},"application/vnd.powerbuilder75-s":{"source":"iana"},"application/vnd.preminet":{"source":"iana"},"application/vnd.previewsystems.box":{"source":"iana","extensions":["box"]},"application/vnd.proteus.magazine":{"source":"iana","extensions":["mgz"]},"application/vnd.psfs":{"source":"iana"},"application/vnd.publishare-delta-tree":{"source":"iana","extensions":["qps"]},"application/vnd.pvi.ptid1":{"source":"iana","extensions":["ptid"]},"application/vnd.pwg-multiplexed":{"source":"iana"},"application/vnd.pwg-xhtml-print+xml":{"source":"iana","compressible":true},"application/vnd.qualcomm.brew-app-res":{"source":"iana"},"application/vnd.quarantainenet":{"source":"iana"},"application/vnd.quark.quarkxpress":{"source":"iana","extensions":["qxd","qxt","qwd","qwt","qxl","qxb"]},"application/vnd.quobject-quoxdocument":{"source":"iana"},"application/vnd.radisys.moml+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-conf+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-conn+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-dialog+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-stream+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-conf+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-base+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-fax-detect+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-fax-sendrecv+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-group+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-speech+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-transform+xml":{"source":"iana","compressible":true},"application/vnd.rainstor.data":{"source":"iana"},"application/vnd.rapid":{"source":"iana"},"application/vnd.rar":{"source":"iana","extensions":["rar"]},"application/vnd.realvnc.bed":{"source":"iana","extensions":["bed"]},"application/vnd.recordare.musicxml":{"source":"iana","extensions":["mxl"]},"application/vnd.recordare.musicxml+xml":{"source":"iana","compressible":true,"extensions":["musicxml"]},"application/vnd.renlearn.rlprint":{"source":"iana"},"application/vnd.resilient.logic":{"source":"iana"},"application/vnd.restful+json":{"source":"iana","compressible":true},"application/vnd.rig.cryptonote":{"source":"iana","extensions":["cryptonote"]},"application/vnd.rim.cod":{"source":"apache","extensions":["cod"]},"application/vnd.rn-realmedia":{"source":"apache","extensions":["rm"]},"application/vnd.rn-realmedia-vbr":{"source":"apache","extensions":["rmvb"]},"application/vnd.route66.link66+xml":{"source":"iana","compressible":true,"extensions":["link66"]},"application/vnd.rs-274x":{"source":"iana"},"application/vnd.ruckus.download":{"source":"iana"},"application/vnd.s3sms":{"source":"iana"},"application/vnd.sailingtracker.track":{"source":"iana","extensions":["st"]},"application/vnd.sar":{"source":"iana"},"application/vnd.sbm.cid":{"source":"iana"},"application/vnd.sbm.mid2":{"source":"iana"},"application/vnd.scribus":{"source":"iana"},"application/vnd.sealed.3df":{"source":"iana"},"application/vnd.sealed.csf":{"source":"iana"},"application/vnd.sealed.doc":{"source":"iana"},"application/vnd.sealed.eml":{"source":"iana"},"application/vnd.sealed.mht":{"source":"iana"},"application/vnd.sealed.net":{"source":"iana"},"application/vnd.sealed.ppt":{"source":"iana"},"application/vnd.sealed.tiff":{"source":"iana"},"application/vnd.sealed.xls":{"source":"iana"},"application/vnd.sealedmedia.softseal.html":{"source":"iana"},"application/vnd.sealedmedia.softseal.pdf":{"source":"iana"},"application/vnd.seemail":{"source":"iana","extensions":["see"]},"application/vnd.seis+json":{"source":"iana","compressible":true},"application/vnd.sema":{"source":"iana","extensions":["sema"]},"application/vnd.semd":{"source":"iana","extensions":["semd"]},"application/vnd.semf":{"source":"iana","extensions":["semf"]},"application/vnd.shade-save-file":{"source":"iana"},"application/vnd.shana.informed.formdata":{"source":"iana","extensions":["ifm"]},"application/vnd.shana.informed.formtemplate":{"source":"iana","extensions":["itp"]},"application/vnd.shana.informed.interchange":{"source":"iana","extensions":["iif"]},"application/vnd.shana.informed.package":{"source":"iana","extensions":["ipk"]},"application/vnd.shootproof+json":{"source":"iana","compressible":true},"application/vnd.shopkick+json":{"source":"iana","compressible":true},"application/vnd.shp":{"source":"iana"},"application/vnd.shx":{"source":"iana"},"application/vnd.sigrok.session":{"source":"iana"},"application/vnd.simtech-mindmapper":{"source":"iana","extensions":["twd","twds"]},"application/vnd.siren+json":{"source":"iana","compressible":true},"application/vnd.smaf":{"source":"iana","extensions":["mmf"]},"application/vnd.smart.notebook":{"source":"iana"},"application/vnd.smart.teacher":{"source":"iana","extensions":["teacher"]},"application/vnd.snesdev-page-table":{"source":"iana"},"application/vnd.software602.filler.form+xml":{"source":"iana","compressible":true,"extensions":["fo"]},"application/vnd.software602.filler.form-xml-zip":{"source":"iana"},"application/vnd.solent.sdkm+xml":{"source":"iana","compressible":true,"extensions":["sdkm","sdkd"]},"application/vnd.spotfire.dxp":{"source":"iana","extensions":["dxp"]},"application/vnd.spotfire.sfs":{"source":"iana","extensions":["sfs"]},"application/vnd.sqlite3":{"source":"iana"},"application/vnd.sss-cod":{"source":"iana"},"application/vnd.sss-dtf":{"source":"iana"},"application/vnd.sss-ntf":{"source":"iana"},"application/vnd.stardivision.calc":{"source":"apache","extensions":["sdc"]},"application/vnd.stardivision.draw":{"source":"apache","extensions":["sda"]},"application/vnd.stardivision.impress":{"source":"apache","extensions":["sdd"]},"application/vnd.stardivision.math":{"source":"apache","extensions":["smf"]},"application/vnd.stardivision.writer":{"source":"apache","extensions":["sdw","vor"]},"application/vnd.stardivision.writer-global":{"source":"apache","extensions":["sgl"]},"application/vnd.stepmania.package":{"source":"iana","extensions":["smzip"]},"application/vnd.stepmania.stepchart":{"source":"iana","extensions":["sm"]},"application/vnd.street-stream":{"source":"iana"},"application/vnd.sun.wadl+xml":{"source":"iana","compressible":true,"extensions":["wadl"]},"application/vnd.sun.xml.calc":{"source":"apache","extensions":["sxc"]},"application/vnd.sun.xml.calc.template":{"source":"apache","extensions":["stc"]},"application/vnd.sun.xml.draw":{"source":"apache","extensions":["sxd"]},"application/vnd.sun.xml.draw.template":{"source":"apache","extensions":["std"]},"application/vnd.sun.xml.impress":{"source":"apache","extensions":["sxi"]},"application/vnd.sun.xml.impress.template":{"source":"apache","extensions":["sti"]},"application/vnd.sun.xml.math":{"source":"apache","extensions":["sxm"]},"application/vnd.sun.xml.writer":{"source":"apache","extensions":["sxw"]},"application/vnd.sun.xml.writer.global":{"source":"apache","extensions":["sxg"]},"application/vnd.sun.xml.writer.template":{"source":"apache","extensions":["stw"]},"application/vnd.sus-calendar":{"source":"iana","extensions":["sus","susp"]},"application/vnd.svd":{"source":"iana","extensions":["svd"]},"application/vnd.swiftview-ics":{"source":"iana"},"application/vnd.sycle+xml":{"source":"iana","compressible":true},"application/vnd.syft+json":{"source":"iana","compressible":true},"application/vnd.symbian.install":{"source":"apache","extensions":["sis","sisx"]},"application/vnd.syncml+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["xsm"]},"application/vnd.syncml.dm+wbxml":{"source":"iana","charset":"UTF-8","extensions":["bdm"]},"application/vnd.syncml.dm+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["xdm"]},"application/vnd.syncml.dm.notification":{"source":"iana"},"application/vnd.syncml.dmddf+wbxml":{"source":"iana"},"application/vnd.syncml.dmddf+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["ddf"]},"application/vnd.syncml.dmtnds+wbxml":{"source":"iana"},"application/vnd.syncml.dmtnds+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.syncml.ds.notification":{"source":"iana"},"application/vnd.tableschema+json":{"source":"iana","compressible":true},"application/vnd.tao.intent-module-archive":{"source":"iana","extensions":["tao"]},"application/vnd.tcpdump.pcap":{"source":"iana","extensions":["pcap","cap","dmp"]},"application/vnd.think-cell.ppttc+json":{"source":"iana","compressible":true},"application/vnd.tmd.mediaflex.api+xml":{"source":"iana","compressible":true},"application/vnd.tml":{"source":"iana"},"application/vnd.tmobile-livetv":{"source":"iana","extensions":["tmo"]},"application/vnd.tri.onesource":{"source":"iana"},"application/vnd.trid.tpt":{"source":"iana","extensions":["tpt"]},"application/vnd.triscape.mxs":{"source":"iana","extensions":["mxs"]},"application/vnd.trueapp":{"source":"iana","extensions":["tra"]},"application/vnd.truedoc":{"source":"iana"},"application/vnd.ubisoft.webplayer":{"source":"iana"},"application/vnd.ufdl":{"source":"iana","extensions":["ufd","ufdl"]},"application/vnd.uiq.theme":{"source":"iana","extensions":["utz"]},"application/vnd.umajin":{"source":"iana","extensions":["umj"]},"application/vnd.unity":{"source":"iana","extensions":["unityweb"]},"application/vnd.uoml+xml":{"source":"iana","compressible":true,"extensions":["uoml"]},"application/vnd.uplanet.alert":{"source":"iana"},"application/vnd.uplanet.alert-wbxml":{"source":"iana"},"application/vnd.uplanet.bearer-choice":{"source":"iana"},"application/vnd.uplanet.bearer-choice-wbxml":{"source":"iana"},"application/vnd.uplanet.cacheop":{"source":"iana"},"application/vnd.uplanet.cacheop-wbxml":{"source":"iana"},"application/vnd.uplanet.channel":{"source":"iana"},"application/vnd.uplanet.channel-wbxml":{"source":"iana"},"application/vnd.uplanet.list":{"source":"iana"},"application/vnd.uplanet.list-wbxml":{"source":"iana"},"application/vnd.uplanet.listcmd":{"source":"iana"},"application/vnd.uplanet.listcmd-wbxml":{"source":"iana"},"application/vnd.uplanet.signal":{"source":"iana"},"application/vnd.uri-map":{"source":"iana"},"application/vnd.valve.source.material":{"source":"iana"},"application/vnd.vcx":{"source":"iana","extensions":["vcx"]},"application/vnd.vd-study":{"source":"iana"},"application/vnd.vectorworks":{"source":"iana"},"application/vnd.vel+json":{"source":"iana","compressible":true},"application/vnd.verimatrix.vcas":{"source":"iana"},"application/vnd.veritone.aion+json":{"source":"iana","compressible":true},"application/vnd.veryant.thin":{"source":"iana"},"application/vnd.ves.encrypted":{"source":"iana"},"application/vnd.vidsoft.vidconference":{"source":"iana"},"application/vnd.visio":{"source":"iana","extensions":["vsd","vst","vss","vsw"]},"application/vnd.visionary":{"source":"iana","extensions":["vis"]},"application/vnd.vividence.scriptfile":{"source":"iana"},"application/vnd.vsf":{"source":"iana","extensions":["vsf"]},"application/vnd.wap.sic":{"source":"iana"},"application/vnd.wap.slc":{"source":"iana"},"application/vnd.wap.wbxml":{"source":"iana","charset":"UTF-8","extensions":["wbxml"]},"application/vnd.wap.wmlc":{"source":"iana","extensions":["wmlc"]},"application/vnd.wap.wmlscriptc":{"source":"iana","extensions":["wmlsc"]},"application/vnd.webturbo":{"source":"iana","extensions":["wtb"]},"application/vnd.wfa.dpp":{"source":"iana"},"application/vnd.wfa.p2p":{"source":"iana"},"application/vnd.wfa.wsc":{"source":"iana"},"application/vnd.windows.devicepairing":{"source":"iana"},"application/vnd.wmc":{"source":"iana"},"application/vnd.wmf.bootstrap":{"source":"iana"},"application/vnd.wolfram.mathematica":{"source":"iana"},"application/vnd.wolfram.mathematica.package":{"source":"iana"},"application/vnd.wolfram.player":{"source":"iana","extensions":["nbp"]},"application/vnd.wordperfect":{"source":"iana","extensions":["wpd"]},"application/vnd.wqd":{"source":"iana","extensions":["wqd"]},"application/vnd.wrq-hp3000-labelled":{"source":"iana"},"application/vnd.wt.stf":{"source":"iana","extensions":["stf"]},"application/vnd.wv.csp+wbxml":{"source":"iana"},"application/vnd.wv.csp+xml":{"source":"iana","compressible":true},"application/vnd.wv.ssp+xml":{"source":"iana","compressible":true},"application/vnd.xacml+json":{"source":"iana","compressible":true},"application/vnd.xara":{"source":"iana","extensions":["xar"]},"application/vnd.xfdl":{"source":"iana","extensions":["xfdl"]},"application/vnd.xfdl.webform":{"source":"iana"},"application/vnd.xmi+xml":{"source":"iana","compressible":true},"application/vnd.xmpie.cpkg":{"source":"iana"},"application/vnd.xmpie.dpkg":{"source":"iana"},"application/vnd.xmpie.plan":{"source":"iana"},"application/vnd.xmpie.ppkg":{"source":"iana"},"application/vnd.xmpie.xlim":{"source":"iana"},"application/vnd.yamaha.hv-dic":{"source":"iana","extensions":["hvd"]},"application/vnd.yamaha.hv-script":{"source":"iana","extensions":["hvs"]},"application/vnd.yamaha.hv-voice":{"source":"iana","extensions":["hvp"]},"application/vnd.yamaha.openscoreformat":{"source":"iana","extensions":["osf"]},"application/vnd.yamaha.openscoreformat.osfpvg+xml":{"source":"iana","compressible":true,"extensions":["osfpvg"]},"application/vnd.yamaha.remote-setup":{"source":"iana"},"application/vnd.yamaha.smaf-audio":{"source":"iana","extensions":["saf"]},"application/vnd.yamaha.smaf-phrase":{"source":"iana","extensions":["spf"]},"application/vnd.yamaha.through-ngn":{"source":"iana"},"application/vnd.yamaha.tunnel-udpencap":{"source":"iana"},"application/vnd.yaoweme":{"source":"iana"},"application/vnd.yellowriver-custom-menu":{"source":"iana","extensions":["cmp"]},"application/vnd.youtube.yt":{"source":"iana"},"application/vnd.zul":{"source":"iana","extensions":["zir","zirz"]},"application/vnd.zzazz.deck+xml":{"source":"iana","compressible":true,"extensions":["zaz"]},"application/voicexml+xml":{"source":"iana","compressible":true,"extensions":["vxml"]},"application/voucher-cms+json":{"source":"iana","compressible":true},"application/vq-rtcpxr":{"source":"iana"},"application/wasm":{"source":"iana","compressible":true,"extensions":["wasm"]},"application/watcherinfo+xml":{"source":"iana","compressible":true,"extensions":["wif"]},"application/webpush-options+json":{"source":"iana","compressible":true},"application/whoispp-query":{"source":"iana"},"application/whoispp-response":{"source":"iana"},"application/widget":{"source":"iana","extensions":["wgt"]},"application/winhlp":{"source":"apache","extensions":["hlp"]},"application/wita":{"source":"iana"},"application/wordperfect5.1":{"source":"iana"},"application/wsdl+xml":{"source":"iana","compressible":true,"extensions":["wsdl"]},"application/wspolicy+xml":{"source":"iana","compressible":true,"extensions":["wspolicy"]},"application/x-7z-compressed":{"source":"apache","compressible":false,"extensions":["7z"]},"application/x-abiword":{"source":"apache","extensions":["abw"]},"application/x-ace-compressed":{"source":"apache","extensions":["ace"]},"application/x-amf":{"source":"apache"},"application/x-apple-diskimage":{"source":"apache","extensions":["dmg"]},"application/x-arj":{"compressible":false,"extensions":["arj"]},"application/x-authorware-bin":{"source":"apache","extensions":["aab","x32","u32","vox"]},"application/x-authorware-map":{"source":"apache","extensions":["aam"]},"application/x-authorware-seg":{"source":"apache","extensions":["aas"]},"application/x-bcpio":{"source":"apache","extensions":["bcpio"]},"application/x-bdoc":{"compressible":false,"extensions":["bdoc"]},"application/x-bittorrent":{"source":"apache","extensions":["torrent"]},"application/x-blorb":{"source":"apache","extensions":["blb","blorb"]},"application/x-bzip":{"source":"apache","compressible":false,"extensions":["bz"]},"application/x-bzip2":{"source":"apache","compressible":false,"extensions":["bz2","boz"]},"application/x-cbr":{"source":"apache","extensions":["cbr","cba","cbt","cbz","cb7"]},"application/x-cdlink":{"source":"apache","extensions":["vcd"]},"application/x-cfs-compressed":{"source":"apache","extensions":["cfs"]},"application/x-chat":{"source":"apache","extensions":["chat"]},"application/x-chess-pgn":{"source":"apache","extensions":["pgn"]},"application/x-chrome-extension":{"extensions":["crx"]},"application/x-cocoa":{"source":"nginx","extensions":["cco"]},"application/x-compress":{"source":"apache"},"application/x-conference":{"source":"apache","extensions":["nsc"]},"application/x-cpio":{"source":"apache","extensions":["cpio"]},"application/x-csh":{"source":"apache","extensions":["csh"]},"application/x-deb":{"compressible":false},"application/x-debian-package":{"source":"apache","extensions":["deb","udeb"]},"application/x-dgc-compressed":{"source":"apache","extensions":["dgc"]},"application/x-director":{"source":"apache","extensions":["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"]},"application/x-doom":{"source":"apache","extensions":["wad"]},"application/x-dtbncx+xml":{"source":"apache","compressible":true,"extensions":["ncx"]},"application/x-dtbook+xml":{"source":"apache","compressible":true,"extensions":["dtb"]},"application/x-dtbresource+xml":{"source":"apache","compressible":true,"extensions":["res"]},"application/x-dvi":{"source":"apache","compressible":false,"extensions":["dvi"]},"application/x-envoy":{"source":"apache","extensions":["evy"]},"application/x-eva":{"source":"apache","extensions":["eva"]},"application/x-font-bdf":{"source":"apache","extensions":["bdf"]},"application/x-font-dos":{"source":"apache"},"application/x-font-framemaker":{"source":"apache"},"application/x-font-ghostscript":{"source":"apache","extensions":["gsf"]},"application/x-font-libgrx":{"source":"apache"},"application/x-font-linux-psf":{"source":"apache","extensions":["psf"]},"application/x-font-pcf":{"source":"apache","extensions":["pcf"]},"application/x-font-snf":{"source":"apache","extensions":["snf"]},"application/x-font-speedo":{"source":"apache"},"application/x-font-sunos-news":{"source":"apache"},"application/x-font-type1":{"source":"apache","extensions":["pfa","pfb","pfm","afm"]},"application/x-font-vfont":{"source":"apache"},"application/x-freearc":{"source":"apache","extensions":["arc"]},"application/x-futuresplash":{"source":"apache","extensions":["spl"]},"application/x-gca-compressed":{"source":"apache","extensions":["gca"]},"application/x-glulx":{"source":"apache","extensions":["ulx"]},"application/x-gnumeric":{"source":"apache","extensions":["gnumeric"]},"application/x-gramps-xml":{"source":"apache","extensions":["gramps"]},"application/x-gtar":{"source":"apache","extensions":["gtar"]},"application/x-gzip":{"source":"apache"},"application/x-hdf":{"source":"apache","extensions":["hdf"]},"application/x-httpd-php":{"compressible":true,"extensions":["php"]},"application/x-install-instructions":{"source":"apache","extensions":["install"]},"application/x-iso9660-image":{"source":"apache","extensions":["iso"]},"application/x-iwork-keynote-sffkey":{"extensions":["key"]},"application/x-iwork-numbers-sffnumbers":{"extensions":["numbers"]},"application/x-iwork-pages-sffpages":{"extensions":["pages"]},"application/x-java-archive-diff":{"source":"nginx","extensions":["jardiff"]},"application/x-java-jnlp-file":{"source":"apache","compressible":false,"extensions":["jnlp"]},"application/x-javascript":{"compressible":true},"application/x-keepass2":{"extensions":["kdbx"]},"application/x-latex":{"source":"apache","compressible":false,"extensions":["latex"]},"application/x-lua-bytecode":{"extensions":["luac"]},"application/x-lzh-compressed":{"source":"apache","extensions":["lzh","lha"]},"application/x-makeself":{"source":"nginx","extensions":["run"]},"application/x-mie":{"source":"apache","extensions":["mie"]},"application/x-mobipocket-ebook":{"source":"apache","extensions":["prc","mobi"]},"application/x-mpegurl":{"compressible":false},"application/x-ms-application":{"source":"apache","extensions":["application"]},"application/x-ms-shortcut":{"source":"apache","extensions":["lnk"]},"application/x-ms-wmd":{"source":"apache","extensions":["wmd"]},"application/x-ms-wmz":{"source":"apache","extensions":["wmz"]},"application/x-ms-xbap":{"source":"apache","extensions":["xbap"]},"application/x-msaccess":{"source":"apache","extensions":["mdb"]},"application/x-msbinder":{"source":"apache","extensions":["obd"]},"application/x-mscardfile":{"source":"apache","extensions":["crd"]},"application/x-msclip":{"source":"apache","extensions":["clp"]},"application/x-msdos-program":{"extensions":["exe"]},"application/x-msdownload":{"source":"apache","extensions":["exe","dll","com","bat","msi"]},"application/x-msmediaview":{"source":"apache","extensions":["mvb","m13","m14"]},"application/x-msmetafile":{"source":"apache","extensions":["wmf","wmz","emf","emz"]},"application/x-msmoney":{"source":"apache","extensions":["mny"]},"application/x-mspublisher":{"source":"apache","extensions":["pub"]},"application/x-msschedule":{"source":"apache","extensions":["scd"]},"application/x-msterminal":{"source":"apache","extensions":["trm"]},"application/x-mswrite":{"source":"apache","extensions":["wri"]},"application/x-netcdf":{"source":"apache","extensions":["nc","cdf"]},"application/x-ns-proxy-autoconfig":{"compressible":true,"extensions":["pac"]},"application/x-nzb":{"source":"apache","extensions":["nzb"]},"application/x-perl":{"source":"nginx","extensions":["pl","pm"]},"application/x-pilot":{"source":"nginx","extensions":["prc","pdb"]},"application/x-pkcs12":{"source":"apache","compressible":false,"extensions":["p12","pfx"]},"application/x-pkcs7-certificates":{"source":"apache","extensions":["p7b","spc"]},"application/x-pkcs7-certreqresp":{"source":"apache","extensions":["p7r"]},"application/x-pki-message":{"source":"iana"},"application/x-rar-compressed":{"source":"apache","compressible":false,"extensions":["rar"]},"application/x-redhat-package-manager":{"source":"nginx","extensions":["rpm"]},"application/x-research-info-systems":{"source":"apache","extensions":["ris"]},"application/x-sea":{"source":"nginx","extensions":["sea"]},"application/x-sh":{"source":"apache","compressible":true,"extensions":["sh"]},"application/x-shar":{"source":"apache","extensions":["shar"]},"application/x-shockwave-flash":{"source":"apache","compressible":false,"extensions":["swf"]},"application/x-silverlight-app":{"source":"apache","extensions":["xap"]},"application/x-sql":{"source":"apache","extensions":["sql"]},"application/x-stuffit":{"source":"apache","compressible":false,"extensions":["sit"]},"application/x-stuffitx":{"source":"apache","extensions":["sitx"]},"application/x-subrip":{"source":"apache","extensions":["srt"]},"application/x-sv4cpio":{"source":"apache","extensions":["sv4cpio"]},"application/x-sv4crc":{"source":"apache","extensions":["sv4crc"]},"application/x-t3vm-image":{"source":"apache","extensions":["t3"]},"application/x-tads":{"source":"apache","extensions":["gam"]},"application/x-tar":{"source":"apache","compressible":true,"extensions":["tar"]},"application/x-tcl":{"source":"apache","extensions":["tcl","tk"]},"application/x-tex":{"source":"apache","extensions":["tex"]},"application/x-tex-tfm":{"source":"apache","extensions":["tfm"]},"application/x-texinfo":{"source":"apache","extensions":["texinfo","texi"]},"application/x-tgif":{"source":"apache","extensions":["obj"]},"application/x-ustar":{"source":"apache","extensions":["ustar"]},"application/x-virtualbox-hdd":{"compressible":true,"extensions":["hdd"]},"application/x-virtualbox-ova":{"compressible":true,"extensions":["ova"]},"application/x-virtualbox-ovf":{"compressible":true,"extensions":["ovf"]},"application/x-virtualbox-vbox":{"compressible":true,"extensions":["vbox"]},"application/x-virtualbox-vbox-extpack":{"compressible":false,"extensions":["vbox-extpack"]},"application/x-virtualbox-vdi":{"compressible":true,"extensions":["vdi"]},"application/x-virtualbox-vhd":{"compressible":true,"extensions":["vhd"]},"application/x-virtualbox-vmdk":{"compressible":true,"extensions":["vmdk"]},"application/x-wais-source":{"source":"apache","extensions":["src"]},"application/x-web-app-manifest+json":{"compressible":true,"extensions":["webapp"]},"application/x-www-form-urlencoded":{"source":"iana","compressible":true},"application/x-x509-ca-cert":{"source":"iana","extensions":["der","crt","pem"]},"application/x-x509-ca-ra-cert":{"source":"iana"},"application/x-x509-next-ca-cert":{"source":"iana"},"application/x-xfig":{"source":"apache","extensions":["fig"]},"application/x-xliff+xml":{"source":"apache","compressible":true,"extensions":["xlf"]},"application/x-xpinstall":{"source":"apache","compressible":false,"extensions":["xpi"]},"application/x-xz":{"source":"apache","extensions":["xz"]},"application/x-zmachine":{"source":"apache","extensions":["z1","z2","z3","z4","z5","z6","z7","z8"]},"application/x400-bp":{"source":"iana"},"application/xacml+xml":{"source":"iana","compressible":true},"application/xaml+xml":{"source":"apache","compressible":true,"extensions":["xaml"]},"application/xcap-att+xml":{"source":"iana","compressible":true,"extensions":["xav"]},"application/xcap-caps+xml":{"source":"iana","compressible":true,"extensions":["xca"]},"application/xcap-diff+xml":{"source":"iana","compressible":true,"extensions":["xdf"]},"application/xcap-el+xml":{"source":"iana","compressible":true,"extensions":["xel"]},"application/xcap-error+xml":{"source":"iana","compressible":true},"application/xcap-ns+xml":{"source":"iana","compressible":true,"extensions":["xns"]},"application/xcon-conference-info+xml":{"source":"iana","compressible":true},"application/xcon-conference-info-diff+xml":{"source":"iana","compressible":true},"application/xenc+xml":{"source":"iana","compressible":true,"extensions":["xenc"]},"application/xhtml+xml":{"source":"iana","compressible":true,"extensions":["xhtml","xht"]},"application/xhtml-voice+xml":{"source":"apache","compressible":true},"application/xliff+xml":{"source":"iana","compressible":true,"extensions":["xlf"]},"application/xml":{"source":"iana","compressible":true,"extensions":["xml","xsl","xsd","rng"]},"application/xml-dtd":{"source":"iana","compressible":true,"extensions":["dtd"]},"application/xml-external-parsed-entity":{"source":"iana"},"application/xml-patch+xml":{"source":"iana","compressible":true},"application/xmpp+xml":{"source":"iana","compressible":true},"application/xop+xml":{"source":"iana","compressible":true,"extensions":["xop"]},"application/xproc+xml":{"source":"apache","compressible":true,"extensions":["xpl"]},"application/xslt+xml":{"source":"iana","compressible":true,"extensions":["xsl","xslt"]},"application/xspf+xml":{"source":"apache","compressible":true,"extensions":["xspf"]},"application/xv+xml":{"source":"iana","compressible":true,"extensions":["mxml","xhvml","xvml","xvm"]},"application/yang":{"source":"iana","extensions":["yang"]},"application/yang-data+json":{"source":"iana","compressible":true},"application/yang-data+xml":{"source":"iana","compressible":true},"application/yang-patch+json":{"source":"iana","compressible":true},"application/yang-patch+xml":{"source":"iana","compressible":true},"application/yin+xml":{"source":"iana","compressible":true,"extensions":["yin"]},"application/zip":{"source":"iana","compressible":false,"extensions":["zip"]},"application/zlib":{"source":"iana"},"application/zstd":{"source":"iana"},"audio/1d-interleaved-parityfec":{"source":"iana"},"audio/32kadpcm":{"source":"iana"},"audio/3gpp":{"source":"iana","compressible":false,"extensions":["3gpp"]},"audio/3gpp2":{"source":"iana"},"audio/aac":{"source":"iana"},"audio/ac3":{"source":"iana"},"audio/adpcm":{"source":"apache","extensions":["adp"]},"audio/amr":{"source":"iana","extensions":["amr"]},"audio/amr-wb":{"source":"iana"},"audio/amr-wb+":{"source":"iana"},"audio/aptx":{"source":"iana"},"audio/asc":{"source":"iana"},"audio/atrac-advanced-lossless":{"source":"iana"},"audio/atrac-x":{"source":"iana"},"audio/atrac3":{"source":"iana"},"audio/basic":{"source":"iana","compressible":false,"extensions":["au","snd"]},"audio/bv16":{"source":"iana"},"audio/bv32":{"source":"iana"},"audio/clearmode":{"source":"iana"},"audio/cn":{"source":"iana"},"audio/dat12":{"source":"iana"},"audio/dls":{"source":"iana"},"audio/dsr-es201108":{"source":"iana"},"audio/dsr-es202050":{"source":"iana"},"audio/dsr-es202211":{"source":"iana"},"audio/dsr-es202212":{"source":"iana"},"audio/dv":{"source":"iana"},"audio/dvi4":{"source":"iana"},"audio/eac3":{"source":"iana"},"audio/encaprtp":{"source":"iana"},"audio/evrc":{"source":"iana"},"audio/evrc-qcp":{"source":"iana"},"audio/evrc0":{"source":"iana"},"audio/evrc1":{"source":"iana"},"audio/evrcb":{"source":"iana"},"audio/evrcb0":{"source":"iana"},"audio/evrcb1":{"source":"iana"},"audio/evrcnw":{"source":"iana"},"audio/evrcnw0":{"source":"iana"},"audio/evrcnw1":{"source":"iana"},"audio/evrcwb":{"source":"iana"},"audio/evrcwb0":{"source":"iana"},"audio/evrcwb1":{"source":"iana"},"audio/evs":{"source":"iana"},"audio/flexfec":{"source":"iana"},"audio/fwdred":{"source":"iana"},"audio/g711-0":{"source":"iana"},"audio/g719":{"source":"iana"},"audio/g722":{"source":"iana"},"audio/g7221":{"source":"iana"},"audio/g723":{"source":"iana"},"audio/g726-16":{"source":"iana"},"audio/g726-24":{"source":"iana"},"audio/g726-32":{"source":"iana"},"audio/g726-40":{"source":"iana"},"audio/g728":{"source":"iana"},"audio/g729":{"source":"iana"},"audio/g7291":{"source":"iana"},"audio/g729d":{"source":"iana"},"audio/g729e":{"source":"iana"},"audio/gsm":{"source":"iana"},"audio/gsm-efr":{"source":"iana"},"audio/gsm-hr-08":{"source":"iana"},"audio/ilbc":{"source":"iana"},"audio/ip-mr_v2.5":{"source":"iana"},"audio/isac":{"source":"apache"},"audio/l16":{"source":"iana"},"audio/l20":{"source":"iana"},"audio/l24":{"source":"iana","compressible":false},"audio/l8":{"source":"iana"},"audio/lpc":{"source":"iana"},"audio/melp":{"source":"iana"},"audio/melp1200":{"source":"iana"},"audio/melp2400":{"source":"iana"},"audio/melp600":{"source":"iana"},"audio/mhas":{"source":"iana"},"audio/midi":{"source":"apache","extensions":["mid","midi","kar","rmi"]},"audio/mobile-xmf":{"source":"iana","extensions":["mxmf"]},"audio/mp3":{"compressible":false,"extensions":["mp3"]},"audio/mp4":{"source":"iana","compressible":false,"extensions":["m4a","mp4a"]},"audio/mp4a-latm":{"source":"iana"},"audio/mpa":{"source":"iana"},"audio/mpa-robust":{"source":"iana"},"audio/mpeg":{"source":"iana","compressible":false,"extensions":["mpga","mp2","mp2a","mp3","m2a","m3a"]},"audio/mpeg4-generic":{"source":"iana"},"audio/musepack":{"source":"apache"},"audio/ogg":{"source":"iana","compressible":false,"extensions":["oga","ogg","spx","opus"]},"audio/opus":{"source":"iana"},"audio/parityfec":{"source":"iana"},"audio/pcma":{"source":"iana"},"audio/pcma-wb":{"source":"iana"},"audio/pcmu":{"source":"iana"},"audio/pcmu-wb":{"source":"iana"},"audio/prs.sid":{"source":"iana"},"audio/qcelp":{"source":"iana"},"audio/raptorfec":{"source":"iana"},"audio/red":{"source":"iana"},"audio/rtp-enc-aescm128":{"source":"iana"},"audio/rtp-midi":{"source":"iana"},"audio/rtploopback":{"source":"iana"},"audio/rtx":{"source":"iana"},"audio/s3m":{"source":"apache","extensions":["s3m"]},"audio/scip":{"source":"iana"},"audio/silk":{"source":"apache","extensions":["sil"]},"audio/smv":{"source":"iana"},"audio/smv-qcp":{"source":"iana"},"audio/smv0":{"source":"iana"},"audio/sofa":{"source":"iana"},"audio/sp-midi":{"source":"iana"},"audio/speex":{"source":"iana"},"audio/t140c":{"source":"iana"},"audio/t38":{"source":"iana"},"audio/telephone-event":{"source":"iana"},"audio/tetra_acelp":{"source":"iana"},"audio/tetra_acelp_bb":{"source":"iana"},"audio/tone":{"source":"iana"},"audio/tsvcis":{"source":"iana"},"audio/uemclip":{"source":"iana"},"audio/ulpfec":{"source":"iana"},"audio/usac":{"source":"iana"},"audio/vdvi":{"source":"iana"},"audio/vmr-wb":{"source":"iana"},"audio/vnd.3gpp.iufp":{"source":"iana"},"audio/vnd.4sb":{"source":"iana"},"audio/vnd.audiokoz":{"source":"iana"},"audio/vnd.celp":{"source":"iana"},"audio/vnd.cisco.nse":{"source":"iana"},"audio/vnd.cmles.radio-events":{"source":"iana"},"audio/vnd.cns.anp1":{"source":"iana"},"audio/vnd.cns.inf1":{"source":"iana"},"audio/vnd.dece.audio":{"source":"iana","extensions":["uva","uvva"]},"audio/vnd.digital-winds":{"source":"iana","extensions":["eol"]},"audio/vnd.dlna.adts":{"source":"iana"},"audio/vnd.dolby.heaac.1":{"source":"iana"},"audio/vnd.dolby.heaac.2":{"source":"iana"},"audio/vnd.dolby.mlp":{"source":"iana"},"audio/vnd.dolby.mps":{"source":"iana"},"audio/vnd.dolby.pl2":{"source":"iana"},"audio/vnd.dolby.pl2x":{"source":"iana"},"audio/vnd.dolby.pl2z":{"source":"iana"},"audio/vnd.dolby.pulse.1":{"source":"iana"},"audio/vnd.dra":{"source":"iana","extensions":["dra"]},"audio/vnd.dts":{"source":"iana","extensions":["dts"]},"audio/vnd.dts.hd":{"source":"iana","extensions":["dtshd"]},"audio/vnd.dts.uhd":{"source":"iana"},"audio/vnd.dvb.file":{"source":"iana"},"audio/vnd.everad.plj":{"source":"iana"},"audio/vnd.hns.audio":{"source":"iana"},"audio/vnd.lucent.voice":{"source":"iana","extensions":["lvp"]},"audio/vnd.ms-playready.media.pya":{"source":"iana","extensions":["pya"]},"audio/vnd.nokia.mobile-xmf":{"source":"iana"},"audio/vnd.nortel.vbk":{"source":"iana"},"audio/vnd.nuera.ecelp4800":{"source":"iana","extensions":["ecelp4800"]},"audio/vnd.nuera.ecelp7470":{"source":"iana","extensions":["ecelp7470"]},"audio/vnd.nuera.ecelp9600":{"source":"iana","extensions":["ecelp9600"]},"audio/vnd.octel.sbc":{"source":"iana"},"audio/vnd.presonus.multitrack":{"source":"iana"},"audio/vnd.qcelp":{"source":"iana"},"audio/vnd.rhetorex.32kadpcm":{"source":"iana"},"audio/vnd.rip":{"source":"iana","extensions":["rip"]},"audio/vnd.rn-realaudio":{"compressible":false},"audio/vnd.sealedmedia.softseal.mpeg":{"source":"iana"},"audio/vnd.vmx.cvsd":{"source":"iana"},"audio/vnd.wave":{"compressible":false},"audio/vorbis":{"source":"iana","compressible":false},"audio/vorbis-config":{"source":"iana"},"audio/wav":{"compressible":false,"extensions":["wav"]},"audio/wave":{"compressible":false,"extensions":["wav"]},"audio/webm":{"source":"apache","compressible":false,"extensions":["weba"]},"audio/x-aac":{"source":"apache","compressible":false,"extensions":["aac"]},"audio/x-aiff":{"source":"apache","extensions":["aif","aiff","aifc"]},"audio/x-caf":{"source":"apache","compressible":false,"extensions":["caf"]},"audio/x-flac":{"source":"apache","extensions":["flac"]},"audio/x-m4a":{"source":"nginx","extensions":["m4a"]},"audio/x-matroska":{"source":"apache","extensions":["mka"]},"audio/x-mpegurl":{"source":"apache","extensions":["m3u"]},"audio/x-ms-wax":{"source":"apache","extensions":["wax"]},"audio/x-ms-wma":{"source":"apache","extensions":["wma"]},"audio/x-pn-realaudio":{"source":"apache","extensions":["ram","ra"]},"audio/x-pn-realaudio-plugin":{"source":"apache","extensions":["rmp"]},"audio/x-realaudio":{"source":"nginx","extensions":["ra"]},"audio/x-tta":{"source":"apache"},"audio/x-wav":{"source":"apache","extensions":["wav"]},"audio/xm":{"source":"apache","extensions":["xm"]},"chemical/x-cdx":{"source":"apache","extensions":["cdx"]},"chemical/x-cif":{"source":"apache","extensions":["cif"]},"chemical/x-cmdf":{"source":"apache","extensions":["cmdf"]},"chemical/x-cml":{"source":"apache","extensions":["cml"]},"chemical/x-csml":{"source":"apache","extensions":["csml"]},"chemical/x-pdb":{"source":"apache"},"chemical/x-xyz":{"source":"apache","extensions":["xyz"]},"font/collection":{"source":"iana","extensions":["ttc"]},"font/otf":{"source":"iana","compressible":true,"extensions":["otf"]},"font/sfnt":{"source":"iana"},"font/ttf":{"source":"iana","compressible":true,"extensions":["ttf"]},"font/woff":{"source":"iana","extensions":["woff"]},"font/woff2":{"source":"iana","extensions":["woff2"]},"image/aces":{"source":"iana","extensions":["exr"]},"image/apng":{"compressible":false,"extensions":["apng"]},"image/avci":{"source":"iana","extensions":["avci"]},"image/avcs":{"source":"iana","extensions":["avcs"]},"image/avif":{"source":"iana","compressible":false,"extensions":["avif"]},"image/bmp":{"source":"iana","compressible":true,"extensions":["bmp"]},"image/cgm":{"source":"iana","extensions":["cgm"]},"image/dicom-rle":{"source":"iana","extensions":["drle"]},"image/emf":{"source":"iana","extensions":["emf"]},"image/fits":{"source":"iana","extensions":["fits"]},"image/g3fax":{"source":"iana","extensions":["g3"]},"image/gif":{"source":"iana","compressible":false,"extensions":["gif"]},"image/heic":{"source":"iana","extensions":["heic"]},"image/heic-sequence":{"source":"iana","extensions":["heics"]},"image/heif":{"source":"iana","extensions":["heif"]},"image/heif-sequence":{"source":"iana","extensions":["heifs"]},"image/hej2k":{"source":"iana","extensions":["hej2"]},"image/hsj2":{"source":"iana","extensions":["hsj2"]},"image/ief":{"source":"iana","extensions":["ief"]},"image/jls":{"source":"iana","extensions":["jls"]},"image/jp2":{"source":"iana","compressible":false,"extensions":["jp2","jpg2"]},"image/jpeg":{"source":"iana","compressible":false,"extensions":["jpeg","jpg","jpe"]},"image/jph":{"source":"iana","extensions":["jph"]},"image/jphc":{"source":"iana","extensions":["jhc"]},"image/jpm":{"source":"iana","compressible":false,"extensions":["jpm"]},"image/jpx":{"source":"iana","compressible":false,"extensions":["jpx","jpf"]},"image/jxr":{"source":"iana","extensions":["jxr"]},"image/jxra":{"source":"iana","extensions":["jxra"]},"image/jxrs":{"source":"iana","extensions":["jxrs"]},"image/jxs":{"source":"iana","extensions":["jxs"]},"image/jxsc":{"source":"iana","extensions":["jxsc"]},"image/jxsi":{"source":"iana","extensions":["jxsi"]},"image/jxss":{"source":"iana","extensions":["jxss"]},"image/ktx":{"source":"iana","extensions":["ktx"]},"image/ktx2":{"source":"iana","extensions":["ktx2"]},"image/naplps":{"source":"iana"},"image/pjpeg":{"compressible":false},"image/png":{"source":"iana","compressible":false,"extensions":["png"]},"image/prs.btif":{"source":"iana","extensions":["btif"]},"image/prs.pti":{"source":"iana","extensions":["pti"]},"image/pwg-raster":{"source":"iana"},"image/sgi":{"source":"apache","extensions":["sgi"]},"image/svg+xml":{"source":"iana","compressible":true,"extensions":["svg","svgz"]},"image/t38":{"source":"iana","extensions":["t38"]},"image/tiff":{"source":"iana","compressible":false,"extensions":["tif","tiff"]},"image/tiff-fx":{"source":"iana","extensions":["tfx"]},"image/vnd.adobe.photoshop":{"source":"iana","compressible":true,"extensions":["psd"]},"image/vnd.airzip.accelerator.azv":{"source":"iana","extensions":["azv"]},"image/vnd.cns.inf2":{"source":"iana"},"image/vnd.dece.graphic":{"source":"iana","extensions":["uvi","uvvi","uvg","uvvg"]},"image/vnd.djvu":{"source":"iana","extensions":["djvu","djv"]},"image/vnd.dvb.subtitle":{"source":"iana","extensions":["sub"]},"image/vnd.dwg":{"source":"iana","extensions":["dwg"]},"image/vnd.dxf":{"source":"iana","extensions":["dxf"]},"image/vnd.fastbidsheet":{"source":"iana","extensions":["fbs"]},"image/vnd.fpx":{"source":"iana","extensions":["fpx"]},"image/vnd.fst":{"source":"iana","extensions":["fst"]},"image/vnd.fujixerox.edmics-mmr":{"source":"iana","extensions":["mmr"]},"image/vnd.fujixerox.edmics-rlc":{"source":"iana","extensions":["rlc"]},"image/vnd.globalgraphics.pgb":{"source":"iana"},"image/vnd.microsoft.icon":{"source":"iana","compressible":true,"extensions":["ico"]},"image/vnd.mix":{"source":"iana"},"image/vnd.mozilla.apng":{"source":"iana"},"image/vnd.ms-dds":{"compressible":true,"extensions":["dds"]},"image/vnd.ms-modi":{"source":"iana","extensions":["mdi"]},"image/vnd.ms-photo":{"source":"apache","extensions":["wdp"]},"image/vnd.net-fpx":{"source":"iana","extensions":["npx"]},"image/vnd.pco.b16":{"source":"iana","extensions":["b16"]},"image/vnd.radiance":{"source":"iana"},"image/vnd.sealed.png":{"source":"iana"},"image/vnd.sealedmedia.softseal.gif":{"source":"iana"},"image/vnd.sealedmedia.softseal.jpg":{"source":"iana"},"image/vnd.svf":{"source":"iana"},"image/vnd.tencent.tap":{"source":"iana","extensions":["tap"]},"image/vnd.valve.source.texture":{"source":"iana","extensions":["vtf"]},"image/vnd.wap.wbmp":{"source":"iana","extensions":["wbmp"]},"image/vnd.xiff":{"source":"iana","extensions":["xif"]},"image/vnd.zbrush.pcx":{"source":"iana","extensions":["pcx"]},"image/webp":{"source":"apache","extensions":["webp"]},"image/wmf":{"source":"iana","extensions":["wmf"]},"image/x-3ds":{"source":"apache","extensions":["3ds"]},"image/x-cmu-raster":{"source":"apache","extensions":["ras"]},"image/x-cmx":{"source":"apache","extensions":["cmx"]},"image/x-freehand":{"source":"apache","extensions":["fh","fhc","fh4","fh5","fh7"]},"image/x-icon":{"source":"apache","compressible":true,"extensions":["ico"]},"image/x-jng":{"source":"nginx","extensions":["jng"]},"image/x-mrsid-image":{"source":"apache","extensions":["sid"]},"image/x-ms-bmp":{"source":"nginx","compressible":true,"extensions":["bmp"]},"image/x-pcx":{"source":"apache","extensions":["pcx"]},"image/x-pict":{"source":"apache","extensions":["pic","pct"]},"image/x-portable-anymap":{"source":"apache","extensions":["pnm"]},"image/x-portable-bitmap":{"source":"apache","extensions":["pbm"]},"image/x-portable-graymap":{"source":"apache","extensions":["pgm"]},"image/x-portable-pixmap":{"source":"apache","extensions":["ppm"]},"image/x-rgb":{"source":"apache","extensions":["rgb"]},"image/x-tga":{"source":"apache","extensions":["tga"]},"image/x-xbitmap":{"source":"apache","extensions":["xbm"]},"image/x-xcf":{"compressible":false},"image/x-xpixmap":{"source":"apache","extensions":["xpm"]},"image/x-xwindowdump":{"source":"apache","extensions":["xwd"]},"message/cpim":{"source":"iana"},"message/delivery-status":{"source":"iana"},"message/disposition-notification":{"source":"iana","extensions":["disposition-notification"]},"message/external-body":{"source":"iana"},"message/feedback-report":{"source":"iana"},"message/global":{"source":"iana","extensions":["u8msg"]},"message/global-delivery-status":{"source":"iana","extensions":["u8dsn"]},"message/global-disposition-notification":{"source":"iana","extensions":["u8mdn"]},"message/global-headers":{"source":"iana","extensions":["u8hdr"]},"message/http":{"source":"iana","compressible":false},"message/imdn+xml":{"source":"iana","compressible":true},"message/news":{"source":"iana"},"message/partial":{"source":"iana","compressible":false},"message/rfc822":{"source":"iana","compressible":true,"extensions":["eml","mime"]},"message/s-http":{"source":"iana"},"message/sip":{"source":"iana"},"message/sipfrag":{"source":"iana"},"message/tracking-status":{"source":"iana"},"message/vnd.si.simp":{"source":"iana"},"message/vnd.wfa.wsc":{"source":"iana","extensions":["wsc"]},"model/3mf":{"source":"iana","extensions":["3mf"]},"model/e57":{"source":"iana"},"model/gltf+json":{"source":"iana","compressible":true,"extensions":["gltf"]},"model/gltf-binary":{"source":"iana","compressible":true,"extensions":["glb"]},"model/iges":{"source":"iana","compressible":false,"extensions":["igs","iges"]},"model/mesh":{"source":"iana","compressible":false,"extensions":["msh","mesh","silo"]},"model/mtl":{"source":"iana","extensions":["mtl"]},"model/obj":{"source":"iana","extensions":["obj"]},"model/step":{"source":"iana"},"model/step+xml":{"source":"iana","compressible":true,"extensions":["stpx"]},"model/step+zip":{"source":"iana","compressible":false,"extensions":["stpz"]},"model/step-xml+zip":{"source":"iana","compressible":false,"extensions":["stpxz"]},"model/stl":{"source":"iana","extensions":["stl"]},"model/vnd.collada+xml":{"source":"iana","compressible":true,"extensions":["dae"]},"model/vnd.dwf":{"source":"iana","extensions":["dwf"]},"model/vnd.flatland.3dml":{"source":"iana"},"model/vnd.gdl":{"source":"iana","extensions":["gdl"]},"model/vnd.gs-gdl":{"source":"apache"},"model/vnd.gs.gdl":{"source":"iana"},"model/vnd.gtw":{"source":"iana","extensions":["gtw"]},"model/vnd.moml+xml":{"source":"iana","compressible":true},"model/vnd.mts":{"source":"iana","extensions":["mts"]},"model/vnd.opengex":{"source":"iana","extensions":["ogex"]},"model/vnd.parasolid.transmit.binary":{"source":"iana","extensions":["x_b"]},"model/vnd.parasolid.transmit.text":{"source":"iana","extensions":["x_t"]},"model/vnd.pytha.pyox":{"source":"iana"},"model/vnd.rosette.annotated-data-model":{"source":"iana"},"model/vnd.sap.vds":{"source":"iana","extensions":["vds"]},"model/vnd.usdz+zip":{"source":"iana","compressible":false,"extensions":["usdz"]},"model/vnd.valve.source.compiled-map":{"source":"iana","extensions":["bsp"]},"model/vnd.vtu":{"source":"iana","extensions":["vtu"]},"model/vrml":{"source":"iana","compressible":false,"extensions":["wrl","vrml"]},"model/x3d+binary":{"source":"apache","compressible":false,"extensions":["x3db","x3dbz"]},"model/x3d+fastinfoset":{"source":"iana","extensions":["x3db"]},"model/x3d+vrml":{"source":"apache","compressible":false,"extensions":["x3dv","x3dvz"]},"model/x3d+xml":{"source":"iana","compressible":true,"extensions":["x3d","x3dz"]},"model/x3d-vrml":{"source":"iana","extensions":["x3dv"]},"multipart/alternative":{"source":"iana","compressible":false},"multipart/appledouble":{"source":"iana"},"multipart/byteranges":{"source":"iana"},"multipart/digest":{"source":"iana"},"multipart/encrypted":{"source":"iana","compressible":false},"multipart/form-data":{"source":"iana","compressible":false},"multipart/header-set":{"source":"iana"},"multipart/mixed":{"source":"iana"},"multipart/multilingual":{"source":"iana"},"multipart/parallel":{"source":"iana"},"multipart/related":{"source":"iana","compressible":false},"multipart/report":{"source":"iana"},"multipart/signed":{"source":"iana","compressible":false},"multipart/vnd.bint.med-plus":{"source":"iana"},"multipart/voice-message":{"source":"iana"},"multipart/x-mixed-replace":{"source":"iana"},"text/1d-interleaved-parityfec":{"source":"iana"},"text/cache-manifest":{"source":"iana","compressible":true,"extensions":["appcache","manifest"]},"text/calendar":{"source":"iana","extensions":["ics","ifb"]},"text/calender":{"compressible":true},"text/cmd":{"compressible":true},"text/coffeescript":{"extensions":["coffee","litcoffee"]},"text/cql":{"source":"iana"},"text/cql-expression":{"source":"iana"},"text/cql-identifier":{"source":"iana"},"text/css":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["css"]},"text/csv":{"source":"iana","compressible":true,"extensions":["csv"]},"text/csv-schema":{"source":"iana"},"text/directory":{"source":"iana"},"text/dns":{"source":"iana"},"text/ecmascript":{"source":"iana"},"text/encaprtp":{"source":"iana"},"text/enriched":{"source":"iana"},"text/fhirpath":{"source":"iana"},"text/flexfec":{"source":"iana"},"text/fwdred":{"source":"iana"},"text/gff3":{"source":"iana"},"text/grammar-ref-list":{"source":"iana"},"text/html":{"source":"iana","compressible":true,"extensions":["html","htm","shtml"]},"text/jade":{"extensions":["jade"]},"text/javascript":{"source":"iana","compressible":true},"text/jcr-cnd":{"source":"iana"},"text/jsx":{"compressible":true,"extensions":["jsx"]},"text/less":{"compressible":true,"extensions":["less"]},"text/markdown":{"source":"iana","compressible":true,"extensions":["markdown","md"]},"text/mathml":{"source":"nginx","extensions":["mml"]},"text/mdx":{"compressible":true,"extensions":["mdx"]},"text/mizar":{"source":"iana"},"text/n3":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["n3"]},"text/parameters":{"source":"iana","charset":"UTF-8"},"text/parityfec":{"source":"iana"},"text/plain":{"source":"iana","compressible":true,"extensions":["txt","text","conf","def","list","log","in","ini"]},"text/provenance-notation":{"source":"iana","charset":"UTF-8"},"text/prs.fallenstein.rst":{"source":"iana"},"text/prs.lines.tag":{"source":"iana","extensions":["dsc"]},"text/prs.prop.logic":{"source":"iana"},"text/raptorfec":{"source":"iana"},"text/red":{"source":"iana"},"text/rfc822-headers":{"source":"iana"},"text/richtext":{"source":"iana","compressible":true,"extensions":["rtx"]},"text/rtf":{"source":"iana","compressible":true,"extensions":["rtf"]},"text/rtp-enc-aescm128":{"source":"iana"},"text/rtploopback":{"source":"iana"},"text/rtx":{"source":"iana"},"text/sgml":{"source":"iana","extensions":["sgml","sgm"]},"text/shaclc":{"source":"iana"},"text/shex":{"source":"iana","extensions":["shex"]},"text/slim":{"extensions":["slim","slm"]},"text/spdx":{"source":"iana","extensions":["spdx"]},"text/strings":{"source":"iana"},"text/stylus":{"extensions":["stylus","styl"]},"text/t140":{"source":"iana"},"text/tab-separated-values":{"source":"iana","compressible":true,"extensions":["tsv"]},"text/troff":{"source":"iana","extensions":["t","tr","roff","man","me","ms"]},"text/turtle":{"source":"iana","charset":"UTF-8","extensions":["ttl"]},"text/ulpfec":{"source":"iana"},"text/uri-list":{"source":"iana","compressible":true,"extensions":["uri","uris","urls"]},"text/vcard":{"source":"iana","compressible":true,"extensions":["vcard"]},"text/vnd.a":{"source":"iana"},"text/vnd.abc":{"source":"iana"},"text/vnd.ascii-art":{"source":"iana"},"text/vnd.curl":{"source":"iana","extensions":["curl"]},"text/vnd.curl.dcurl":{"source":"apache","extensions":["dcurl"]},"text/vnd.curl.mcurl":{"source":"apache","extensions":["mcurl"]},"text/vnd.curl.scurl":{"source":"apache","extensions":["scurl"]},"text/vnd.debian.copyright":{"source":"iana","charset":"UTF-8"},"text/vnd.dmclientscript":{"source":"iana"},"text/vnd.dvb.subtitle":{"source":"iana","extensions":["sub"]},"text/vnd.esmertec.theme-descriptor":{"source":"iana","charset":"UTF-8"},"text/vnd.familysearch.gedcom":{"source":"iana","extensions":["ged"]},"text/vnd.ficlab.flt":{"source":"iana"},"text/vnd.fly":{"source":"iana","extensions":["fly"]},"text/vnd.fmi.flexstor":{"source":"iana","extensions":["flx"]},"text/vnd.gml":{"source":"iana"},"text/vnd.graphviz":{"source":"iana","extensions":["gv"]},"text/vnd.hans":{"source":"iana"},"text/vnd.hgl":{"source":"iana"},"text/vnd.in3d.3dml":{"source":"iana","extensions":["3dml"]},"text/vnd.in3d.spot":{"source":"iana","extensions":["spot"]},"text/vnd.iptc.newsml":{"source":"iana"},"text/vnd.iptc.nitf":{"source":"iana"},"text/vnd.latex-z":{"source":"iana"},"text/vnd.motorola.reflex":{"source":"iana"},"text/vnd.ms-mediapackage":{"source":"iana"},"text/vnd.net2phone.commcenter.command":{"source":"iana"},"text/vnd.radisys.msml-basic-layout":{"source":"iana"},"text/vnd.senx.warpscript":{"source":"iana"},"text/vnd.si.uricatalogue":{"source":"iana"},"text/vnd.sosi":{"source":"iana"},"text/vnd.sun.j2me.app-descriptor":{"source":"iana","charset":"UTF-8","extensions":["jad"]},"text/vnd.trolltech.linguist":{"source":"iana","charset":"UTF-8"},"text/vnd.wap.si":{"source":"iana"},"text/vnd.wap.sl":{"source":"iana"},"text/vnd.wap.wml":{"source":"iana","extensions":["wml"]},"text/vnd.wap.wmlscript":{"source":"iana","extensions":["wmls"]},"text/vtt":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["vtt"]},"text/x-asm":{"source":"apache","extensions":["s","asm"]},"text/x-c":{"source":"apache","extensions":["c","cc","cxx","cpp","h","hh","dic"]},"text/x-component":{"source":"nginx","extensions":["htc"]},"text/x-fortran":{"source":"apache","extensions":["f","for","f77","f90"]},"text/x-gwt-rpc":{"compressible":true},"text/x-handlebars-template":{"extensions":["hbs"]},"text/x-java-source":{"source":"apache","extensions":["java"]},"text/x-jquery-tmpl":{"compressible":true},"text/x-lua":{"extensions":["lua"]},"text/x-markdown":{"compressible":true,"extensions":["mkd"]},"text/x-nfo":{"source":"apache","extensions":["nfo"]},"text/x-opml":{"source":"apache","extensions":["opml"]},"text/x-org":{"compressible":true,"extensions":["org"]},"text/x-pascal":{"source":"apache","extensions":["p","pas"]},"text/x-processing":{"compressible":true,"extensions":["pde"]},"text/x-sass":{"extensions":["sass"]},"text/x-scss":{"extensions":["scss"]},"text/x-setext":{"source":"apache","extensions":["etx"]},"text/x-sfv":{"source":"apache","extensions":["sfv"]},"text/x-suse-ymp":{"compressible":true,"extensions":["ymp"]},"text/x-uuencode":{"source":"apache","extensions":["uu"]},"text/x-vcalendar":{"source":"apache","extensions":["vcs"]},"text/x-vcard":{"source":"apache","extensions":["vcf"]},"text/xml":{"source":"iana","compressible":true,"extensions":["xml"]},"text/xml-external-parsed-entity":{"source":"iana"},"text/yaml":{"compressible":true,"extensions":["yaml","yml"]},"video/1d-interleaved-parityfec":{"source":"iana"},"video/3gpp":{"source":"iana","extensions":["3gp","3gpp"]},"video/3gpp-tt":{"source":"iana"},"video/3gpp2":{"source":"iana","extensions":["3g2"]},"video/av1":{"source":"iana"},"video/bmpeg":{"source":"iana"},"video/bt656":{"source":"iana"},"video/celb":{"source":"iana"},"video/dv":{"source":"iana"},"video/encaprtp":{"source":"iana"},"video/ffv1":{"source":"iana"},"video/flexfec":{"source":"iana"},"video/h261":{"source":"iana","extensions":["h261"]},"video/h263":{"source":"iana","extensions":["h263"]},"video/h263-1998":{"source":"iana"},"video/h263-2000":{"source":"iana"},"video/h264":{"source":"iana","extensions":["h264"]},"video/h264-rcdo":{"source":"iana"},"video/h264-svc":{"source":"iana"},"video/h265":{"source":"iana"},"video/iso.segment":{"source":"iana","extensions":["m4s"]},"video/jpeg":{"source":"iana","extensions":["jpgv"]},"video/jpeg2000":{"source":"iana"},"video/jpm":{"source":"apache","extensions":["jpm","jpgm"]},"video/jxsv":{"source":"iana"},"video/mj2":{"source":"iana","extensions":["mj2","mjp2"]},"video/mp1s":{"source":"iana"},"video/mp2p":{"source":"iana"},"video/mp2t":{"source":"iana","extensions":["ts"]},"video/mp4":{"source":"iana","compressible":false,"extensions":["mp4","mp4v","mpg4"]},"video/mp4v-es":{"source":"iana"},"video/mpeg":{"source":"iana","compressible":false,"extensions":["mpeg","mpg","mpe","m1v","m2v"]},"video/mpeg4-generic":{"source":"iana"},"video/mpv":{"source":"iana"},"video/nv":{"source":"iana"},"video/ogg":{"source":"iana","compressible":false,"extensions":["ogv"]},"video/parityfec":{"source":"iana"},"video/pointer":{"source":"iana"},"video/quicktime":{"source":"iana","compressible":false,"extensions":["qt","mov"]},"video/raptorfec":{"source":"iana"},"video/raw":{"source":"iana"},"video/rtp-enc-aescm128":{"source":"iana"},"video/rtploopback":{"source":"iana"},"video/rtx":{"source":"iana"},"video/scip":{"source":"iana"},"video/smpte291":{"source":"iana"},"video/smpte292m":{"source":"iana"},"video/ulpfec":{"source":"iana"},"video/vc1":{"source":"iana"},"video/vc2":{"source":"iana"},"video/vnd.cctv":{"source":"iana"},"video/vnd.dece.hd":{"source":"iana","extensions":["uvh","uvvh"]},"video/vnd.dece.mobile":{"source":"iana","extensions":["uvm","uvvm"]},"video/vnd.dece.mp4":{"source":"iana"},"video/vnd.dece.pd":{"source":"iana","extensions":["uvp","uvvp"]},"video/vnd.dece.sd":{"source":"iana","extensions":["uvs","uvvs"]},"video/vnd.dece.video":{"source":"iana","extensions":["uvv","uvvv"]},"video/vnd.directv.mpeg":{"source":"iana"},"video/vnd.directv.mpeg-tts":{"source":"iana"},"video/vnd.dlna.mpeg-tts":{"source":"iana"},"video/vnd.dvb.file":{"source":"iana","extensions":["dvb"]},"video/vnd.fvt":{"source":"iana","extensions":["fvt"]},"video/vnd.hns.video":{"source":"iana"},"video/vnd.iptvforum.1dparityfec-1010":{"source":"iana"},"video/vnd.iptvforum.1dparityfec-2005":{"source":"iana"},"video/vnd.iptvforum.2dparityfec-1010":{"source":"iana"},"video/vnd.iptvforum.2dparityfec-2005":{"source":"iana"},"video/vnd.iptvforum.ttsavc":{"source":"iana"},"video/vnd.iptvforum.ttsmpeg2":{"source":"iana"},"video/vnd.motorola.video":{"source":"iana"},"video/vnd.motorola.videop":{"source":"iana"},"video/vnd.mpegurl":{"source":"iana","extensions":["mxu","m4u"]},"video/vnd.ms-playready.media.pyv":{"source":"iana","extensions":["pyv"]},"video/vnd.nokia.interleaved-multimedia":{"source":"iana"},"video/vnd.nokia.mp4vr":{"source":"iana"},"video/vnd.nokia.videovoip":{"source":"iana"},"video/vnd.objectvideo":{"source":"iana"},"video/vnd.radgamettools.bink":{"source":"iana"},"video/vnd.radgamettools.smacker":{"source":"iana"},"video/vnd.sealed.mpeg1":{"source":"iana"},"video/vnd.sealed.mpeg4":{"source":"iana"},"video/vnd.sealed.swf":{"source":"iana"},"video/vnd.sealedmedia.softseal.mov":{"source":"iana"},"video/vnd.uvvu.mp4":{"source":"iana","extensions":["uvu","uvvu"]},"video/vnd.vivo":{"source":"iana","extensions":["viv"]},"video/vnd.youtube.yt":{"source":"iana"},"video/vp8":{"source":"iana"},"video/vp9":{"source":"iana"},"video/webm":{"source":"apache","compressible":false,"extensions":["webm"]},"video/x-f4v":{"source":"apache","extensions":["f4v"]},"video/x-fli":{"source":"apache","extensions":["fli"]},"video/x-flv":{"source":"apache","compressible":false,"extensions":["flv"]},"video/x-m4v":{"source":"apache","extensions":["m4v"]},"video/x-matroska":{"source":"apache","compressible":false,"extensions":["mkv","mk3d","mks"]},"video/x-mng":{"source":"apache","extensions":["mng"]},"video/x-ms-asf":{"source":"apache","extensions":["asf","asx"]},"video/x-ms-vob":{"source":"apache","extensions":["vob"]},"video/x-ms-wm":{"source":"apache","extensions":["wm"]},"video/x-ms-wmv":{"source":"apache","compressible":false,"extensions":["wmv"]},"video/x-ms-wmx":{"source":"apache","extensions":["wmx"]},"video/x-ms-wvx":{"source":"apache","extensions":["wvx"]},"video/x-msvideo":{"source":"apache","extensions":["avi"]},"video/x-sgi-movie":{"source":"apache","extensions":["movie"]},"video/x-smv":{"source":"apache","extensions":["smv"]},"x-conference/x-cooltalk":{"source":"apache","extensions":["ice"]},"x-shader/x-fragment":{"compressible":true},"x-shader/x-vertex":{"compressible":true}}');

/***/ }),

/***/ 3435:
/***/ ((module) => {

"use strict";
module.exports = {"i8":"5.22.11"};

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const si = __nccwpck_require__(2491);
const axios = __nccwpck_require__(2223);

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node collectInfo.js <email> <setup-id>');
    process.exit(1);
}
const email = args[0];
const setupId = args[1];
console.log(email, setupId);
// Function to collect and send system information
async function sendSystemInfo() {
    try {
        const system = await si.system();
        const osInfo = await si.osInfo();
        const cpu = await si.cpu();
        const mem = await si.mem();

        const systemInfo = {
            email,
            setupId,
            system,
            osInfo,
            cpu,
            mem,
        };

        await axios.post('http://localhost:3000/api/staff/register-device', systemInfo).then(() => {
            console.log('System information sent successfully');
            process.exit(1);
        });
    } catch (error) {
        console.error('Error collecting or sending system information:', error.response);
    }
}

sendSystemInfo();

})();

module.exports = __webpack_exports__;
/******/ })()
;