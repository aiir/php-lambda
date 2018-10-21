const { spawn } = require('child_process');
const fastcgiConnector = require('fastcgi-client');
const { promisify } = require('util');

const { isSocketReady } = require('./socket');

function failedSpawnHandler() {
  const error = new Error('FastCGI process failed to start');
  error.code = 'ERR_PROCESS_FAILED';
  throw error;
}

/**
 * Provides an interface to run and interact with a PHP FastCGI process.
 */
class FastCGIProcess {
  /**
   * Constructor
   */
  constructor({ command = 'php-cgi', args = [], socketName = '/tmp/php.sock' } = {}) {
    this.command = command;
    this.args = [...args, '-b', socketName];
    this.socketName = socketName;
  }

  /**
   * Starts the PHP CGI child process.
   */
  async start() {
    if (this.process) {
      const error = new Error('FastCGI process already started');
      error.code = 'ERR_PROCESS_ALREADY_STARTED';
      throw error;
    }
    this.process = spawn(this.command, this.args, { env: process.env })
      .on('close', failedSpawnHandler);
    await isSocketReady(this.socketName);
    this.process.removeListener('close', failedSpawnHandler);
    const clientOptions = { sockFile: this.socketName };
    this.client = fastcgiConnector(clientOptions);
    return new Promise((resolve) => {
      this.client.on('ready', () => resolve());
    });
  }

  /**
   * Kills the PHP CGI child process.
   */
  stop() {
    if (!this.process) {
      const error = new Error('FastCGI process not started');
      error.code = 'ERR_PROCESS_NOT_STARTED';
      throw error;
    }
    this.process.kill();
    delete this.process;
  }

  /**
   * Sends a request to the PHP CGI child process.
   */
  async request(params, body = '') {
    if (params === undefined) {
      const error = new Error('`params` is a required argument');
      throw error;
    }
    if (!this.process) {
      const error = new Error('FastCGI process not started');
      error.code = 'ERR_PROCESS_NOT_STARTED';
      throw error;
    }
    const { stdin, stdout, stderr } = await promisify(this.client.request)(params);
    stdin.end(body, 'utf8');
    const errorData = [];
    const outputData = [];
    stderr.on('data', chunk => errorData.push(chunk));
    stdout.on('data', chunk => outputData.push(chunk));
    return new Promise((resolve) => {
      stdout.on('end', async () => {
        const stdoutContent = Buffer.concat(outputData).toString('utf8');
        const stderrContent = Buffer.concat(errorData).toString('utf8');
        resolve({ stdout: stdoutContent, stderr: stderrContent });
      });
    });
  }
}

module.exports = FastCGIProcess;
