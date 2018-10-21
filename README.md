# PHP Lambda

Allows you to run PHP code within an AWS Lambda function, via Proxy Integration.

Takes an incoming API Gateway Lambda Proxy Integration request object, builds and dispatches to PHP,
then parses the response back in to a suitable Lambda Proxy Integration response object.

Uses the PHP CGI process via FastCGI over a local socket to ensure fast execution of PHP code.

The FastCGI process is started up outside of the handler and therefore benefits from faster warm
executions as Lambda "freezes" and "warms" the executing PHP process rather than cold starting it
each time.

Requires a compiled `php-cgi` executable in your Lambda function ZIP file to function. See the
following links for useful resources on producing a build:

https://aws.amazon.com/blogs/compute/scripting-languages-for-aws-lambda-running-php-ruby-and-go/
https://github.com/ArtisanHost/php-cgi-lambda-build-script

## Requirements

Designed to run inside AWS' Lambda environment, with the Node.js 8.10 runtime.

## Installation

In your existing PHP project, install the Node.js package:

```
$ npm install @aiir\php-lambda
```

Create an index.js script that setups your preferred environment:

```
const createHandler = require('@aiir/php-lambda');

module.exports.handler = createHandler();
```

Place your `php-cgi` executable in the same folder, then create a zip file to setup on AWS.

As well as creating your Lambda function, you will need to create an API Gateway in front of it,
configures with a `{proxy+}` or similar proxy integration resource.

## Options

The library consists of a constructor function which returns the asynchronous handler for the Lambda
function.

It can take an options object, which can consist of any of the following properties:

* `args`
  Allows you to supply an array of arguments to the PHP CGI process.

* `command`
  *Defaults to `php-cgi`*
  Sets the PHP process to be called.

* `index`
  *Defaults to `index.php`*
  Sets the PHP script to be used to route all requests.

* `rewriteRules`
  Allows specific routes to be handled by different PHP scripts. The value is an object, with the
  key as the route prefix to match and the value the path to the PHP script.

* `rootPath`
  *Defaults to `.`*
  Sets where to find the `index` script and which path to base all rewrite rule paths on.

* `callbackWaitsForEmptyEventLoop`
  Sets the value on the AWS `context` object property of the same name.

## Authors

- Created by [@andybee](https://twitter.com/@andybee)
