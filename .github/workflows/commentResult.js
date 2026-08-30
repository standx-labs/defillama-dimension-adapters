const { readFileSync } = require('fs');
const axios = require('axios');

// The API token is read from the environment (GITHUB_TOKEN, supplied by the
// workflow from `secrets.GITHUB_TOKEN`). It must never be embedded in this
// file: anything committed here is public and permanently recoverable from git
// history, and obfuscating it does not make it a secret.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function main() {
    const [, , log, author, repo, pr, adapterNameKey] = process.argv;
    const file = readFileSync(log, 'utf-8');

    const [_, adapterName] = adapterNameKey.split('@')

    const errorString = 'ERROR';
    const summaryIndex = file.indexOf('---------------------------------------------------');
    const errorIndex = file.indexOf(errorString);
    let body;

    if (summaryIndex != -1) {
        body = `The ${adapterName} adapter exports:
        \n \n ${file.replaceAll('\n', '\n    ')}`;
    } else if (errorIndex != -1) {
        body = `Error while running adapter ${adapterName} adapter:
        \n \n ${file.split(errorString)[1].replaceAll('\n', '\n    ')}`;
    } else {
        console.info(`No error or summary found in log file`);
        return;
    }

    console.info(`Posting comment:\n${body}`)

    if (!GITHUB_TOKEN) {
        console.warn('GITHUB_TOKEN is not set, skipping the pull request comment.');
        return;
    }

    // Commenting is best effort. `GITHUB_TOKEN` is read-only for pull requests
    // opened from a fork, so the request is expected to fail in that case; the
    // failure must not mask the adapter test result of the calling workflow.
    try {
        await axios.post(
            `https://api.github.com/repos/${author}/${repo}/issues/${pr}/comments`,
            { body }, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
    } catch (e) {
        console.warn(`Could not post the pull request comment: ${e.message}`);
    }
};

main();
