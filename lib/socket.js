const { Socket } = require('net');
const { promisify } = require('util');

/**
 * Internal callback based function so we can publicly wrap it in a Promise.
 */
function internalSocketReady(name, options, callback) {
  const {
    acceptableErrorCodes = ['ENOENT', 'ECONNREFUSED'],
    startTime = Date.now(),
    timeout = 30,
  } = options;
  const socket = new Socket();
  socket.on('error', (socketError) => {
    if (timeout !== undefined || timeout === 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout * 1000) {
        const timeoutError = new Error('Waiting for socket ready timed out');
        timeoutError.code = 'ERR_SOCKET_READY_TIMEOUT';
        callback(timeoutError);
        return;
      }
    }
    if (!acceptableErrorCodes.includes(socketError.code)) {
      callback(socketError);
      return;
    }
    internalSocketReady(name, { acceptableErrorCodes, startTime, timeout }, callback);
  });
  socket.connect(name, () => callback());
}

const internalSocketReadyPromise = promisify(internalSocketReady);

/**
 * Returns a Promise which resolves if the socket is ready, else rejects if it timesout or throws an
 * error other than ENOENT and ECONNREFUSED, or an alternative array of error codes in the options
 * object.
 */
function isSocketReady(name, options = {}) {
  if (name === undefined) {
    const error = new Error('`name` argument is required');
    throw error;
  }
  return internalSocketReadyPromise(name, options);
}

module.exports.isSocketReady = isSocketReady;
