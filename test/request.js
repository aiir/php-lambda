const createHandler = require('..');

const options = {
  index: 'test.php',
  rootPath: __dirname,
  rewriteRules: {
    '/alt': 'alt.php',
  },
};
const handler = createHandler(options);

async function headerTest() {
  const event = {
    httpMethod: 'GET',
    path: '/header',
  };

  const expectedStatusCode = 200;
  const expectedHeaderKey = 'X-Custom-Header';
  const expectedHeaderValue = 'Hello World';

  return handler(event)
    .then(({ statusCode, headers, body }) => {
      console.log(body);
      if (statusCode !== expectedStatusCode) {
        throw new Error(`Status code should be ${expectedStatusCode}, got ${statusCode}`);
      }
      if (headers === undefined || headers[expectedHeaderKey] !== expectedHeaderValue) {
        throw new Error(`Custom response header not '${expectedHeaderValue}', got '${headers[expectedHeaderKey]}'`);
      }
    });
}

async function postTest() {
  const event = {
    body: 'key1=This%20is%20a&key2=test.',
    headers: {
      host: 'localhost',
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 29,
    },
    httpMethod: 'POST',
    path: '/post',
  };

  const expectedStatusCode = 200;
  const expectedBody = 'This is a test.';

  return handler(event)
    .then(({ statusCode, body }) => {
      if (statusCode !== expectedStatusCode) {
        throw new Error(`Status code should be ${expectedStatusCode}, got ${statusCode}`);
      }
      if (body !== expectedBody) {
        throw new Error(`Body not '${expectedBody}', got '${body}'`);
      }
    });
}

async function queryTest() {
  const event = {
    headers: {
      host: 'localhost',
    },
    httpMethod: 'GET',
    queryStringParameters: {
      key1: 'This is a',
      key2: 'test.',
    },
    path: '/query',
  };

  const expectedStatusCode = 200;
  const expectedBody = 'This is a test.';

  return handler(event)
    .then(({ statusCode, body }) => {
      if (statusCode !== expectedStatusCode) {
        throw new Error(`Status code should be ${expectedStatusCode}, got ${statusCode}`);
      }
      if (body !== expectedBody) {
        throw new Error(`Body not '${expectedBody}', got '${body}'`);
      }
    });
}

async function statusCodeTest() {
  const event = {
    httpMethod: 'GET',
    path: '/404',
  };

  const expectedStatusCode = 404;

  return handler(event)
    .then(({ statusCode }) => {
      if (statusCode !== expectedStatusCode) {
        throw new Error(`Status code should be ${expectedStatusCode}, got ${statusCode}`);
      }
    });
}

async function rewriteTest() {
  const event = {
    httpMethod: 'GET',
    path: '/alt/test123',
  };

  const expectedBody = 'Alternative script';

  return handler(event)
    .then(({ body }) => {
      if (body !== expectedBody) {
        throw new Error(`Body not '${expectedBody}', got '${body}'`);
      }
    });
}

headerTest()
  .then(postTest)
  .then(queryTest)
  .then(statusCodeTest)
  .then(rewriteTest)
  .then(() => {
    console.log('All tests passed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
