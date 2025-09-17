const core = require('@actions/core');

async function run() {
  try {
    const username = core.getInput('username');
    const greeting = core.getInput('greeting');
    const message = `${greeting}, ${username}!`;
    console.log(message);

    const now = new Date().toISOString();
    core.setOutput('time', now);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();