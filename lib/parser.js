const headerBodyBreak = '\r\n\r\n';
const headerKeyValueBreak = ':';

/**
 * Parses a CGI response string in to an Object with `statusCode`, `headers` and
 * `body` properties.
 */
function parser(response) {
  const headerBodySplitIndex = response.indexOf(headerBodyBreak);
  if (headerBodySplitIndex === -1) {
    console.error(`Invalid CGI response: ${response}`); // eslint-disable-line no-console
    return { statusCode: 500, headers: {}, body: '' };
  }
  let statusCode = 200;
  const headers = response
    .slice(0, headerBodySplitIndex)
    .split('\n')
    .reduce((currentHeaders, header) => {
      const headerSplit = header.indexOf(headerKeyValueBreak);
      const key = (headerSplit !== -1) ? header.slice(0, headerSplit).trim() : header.trim();
      const value = (headerSplit !== -1) ? header.slice(headerSplit + 1).trim() : '';
      if (key !== 'Status') {
        return { ...currentHeaders, [key]: value };
      }
      const result = value.match(/([1-9][0-9]{2})/);
      if (result !== null) {
        statusCode = parseInt(result[0], 10);
      }
      return currentHeaders;
    }, {});
  const body = response.slice(headerBodySplitIndex + headerBodyBreak.length);
  return { statusCode, headers, body };
}

module.exports = parser;
