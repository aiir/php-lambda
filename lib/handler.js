const { lstatSync } = require('fs');
const { hostname } = require('os');
const { join } = require('path');
const { stringify } = require('querystring');

const FastCGIProcess = require('./process');
const parseCgiResponse = require('./parser');

/**
 * Takes a configuration object and returns an asynchronous function to act as a Lambda handler,
 * which accepts a Lambda Proxy Integration request and forwards to a PHP CGI child process in
 * FastCGI format over a local socket. It then parses the CGI response and returns a Lambda Proxy
 * Integration response.
 *
 * Errors are emitted via console.error so that CloudWatch can capture them, without being exposed
 * in the response.
 */
function createHandler({
  args,
  command,
  index = 'index.php',
  rewriteRules = {},
  rootPath = '.',
  callbackWaitsForEmptyEventLoop,
} = {}) {
  const fastCgi = new FastCGIProcess({ command, args });
  const ready = fastCgi.start();

  return async (event, context) => {
    const {
      body: input = '',
      headers: requestHeaders = {},
      httpMethod: REQUEST_METHOD,
      path,
      queryStringParameters = {},
    } = event;

    if (callbackWaitsForEmptyEventLoop !== undefined) {
      // eslint-disable-next-line no-param-reassign
      context.callbackWaitsForEmptyEventLoop = callbackWaitsForEmptyEventLoop;
    }

    const formattedRequestHeaders = Object.entries(requestHeaders)
      .reduce((accumulator, [key, value]) => ({
        ...accumulator,
        [`HTTP_${key.replace(/-/g, '_').toUpperCase()}`]: value,
      }), {});

    const matchingRuleKey = Object.keys(rewriteRules).find(prefix => path.startsWith(prefix));
    let scriptName = index;
    if (matchingRuleKey !== undefined) {
      scriptName = rewriteRules[matchingRuleKey];
    } else {
      const candidate = [path, `${path}/index.php`].find((candidatePath) => {
        try {
          return lstatSync(candidatePath).isFile();
        } catch (error) {
          return false;
        }
      });
      if (candidate !== undefined) {
        scriptName = candidate;
      }
    }
    const scriptPath = join(rootPath, scriptName);

    const cgiParams = {
      PATH_INFO: '/',
      QUERY_STRING: stringify(queryStringParameters),
      REDIRECT_STATUS: 200,
      REQUEST_METHOD,
      REQUEST_URI: path,
      SCRIPT_FILENAME: scriptPath,
      SCRIPT_NAME: join('/', scriptName),
      SERVER_NAME: hostname(),
      SERVER_PROTOCOL: 'HTTP/1.1',
      ...formattedRequestHeaders,
    };
    // PHP forces a content type CGI param to be a header value, so remove it
    if (formattedRequestHeaders.HTTP_CONTENT_TYPE) {
      cgiParams.CONTENT_TYPE = formattedRequestHeaders.HTTP_CONTENT_TYPE;
      delete formattedRequestHeaders.HTTP_CONTENT_TYPE;
    }
    // PHP forces a content length CGI param to be a header value, so remove it
    if (formattedRequestHeaders.HTTP_CONTENT_LENGTH) {
      cgiParams.CONTENT_LENGTH = formattedRequestHeaders.HTTP_CONTENT_LENGTH;
      delete formattedRequestHeaders.HTTP_CONTENT_LENGTH;
    } else {
      cgiParams.CONTENT_LENGTH = Buffer.byteLength(input || '', 'utf-8');
    }

    await ready;
    const { stderr, stdout } = await fastCgi.request(cgiParams, input);

    if (stderr.length > 0) {
      console.error(stderr); // eslint-disable-line no-console
    }

    const response = parseCgiResponse(stdout);
    return response;
  };
}

module.exports = createHandler;
