const { spawn } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT_PATH = path.join(__dirname, 'run_python_extractor.py');

/**
 * Executes the Python NLP / ML model extractor from Node.js
 * @param {Object} emailData { subject, sender, body, sent_at }
 * @returns {Promise<Object>} extracted task metadata
 */
function executePythonExtractor(emailData) {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pyProcess = spawn(pythonCmd, [PYTHON_SCRIPT_PATH], {
      cwd: path.dirname(path.dirname(__dirname))
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0 && !stdoutData) {
        return reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python model output: ${err.message}. Raw: ${stdoutData}`));
      }
    });

    pyProcess.on('error', (err) => {
      reject(err);
    });

    // Send JSON input to Python via stdin
    pyProcess.stdin.write(JSON.stringify(emailData));
    pyProcess.stdin.end();
  });
}

module.exports = {
  executePythonExtractor
};
