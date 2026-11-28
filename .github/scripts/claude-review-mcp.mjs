// This stdio MCP server lets the active Claude session publish its advisory
// review with the Claude App credential. The workflow owns the target revision
// and checks GitHub independently before recording the review as complete.
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const { GITHUB_API_URL, GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL, GH_TOKEN } = process.env
const { pull_request: { number, head, base } } = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'))
const heading = `## ${process.argv[2]}`
const runLink = `[Actions run](${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})`
const endpoint = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls/${number}`
const tool = {
  name: 'submit_review',
  description: 'Submit a formal GitHub Comment review on the pull request revision being reviewed. Returns the published review URL.',
  inputSchema: {
    type: 'object',
    properties: { body: { type: 'string', description: 'Review summary and feedback in Markdown.' } },
    required: ['body'],
    additionalProperties: false,
  },
}

/** Use the action's existing App credential for this PR's API operations. */
async function github(url, payload) {
  if (!GH_TOKEN) throw new Error('The Claude App credential is unavailable.')
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: payload && JSON.stringify(payload),
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`GitHub review API returned HTTP ${response.status}.`)
  return response.json()
}

/** Identify a retried publication by the author, pinned commit, and run link. */
function isThisReview(review) {
  return review.user?.login === 'claude[bot]' && review.state === 'COMMENTED' &&
    review.commit_id === head.sha && review.body?.startsWith(`${heading}\n`) && review.body.endsWith(runLink)
}

/** Reuse a review from this run if the client retries after publication. */
async function existingReview() {
  for (let page = 1; ; page++) {
    const reviews = await github(`${endpoint}/reviews?per_page=100&page=${page}`)
    const review = reviews.find(isThisReview)
    if (review || reviews.length < 100) return review
  }
}

/** Recheck both revisions and pin the formal review to the event's HEAD. */
async function submitReview(body) {
  if (typeof body !== 'string' || !body.trim()) throw new Error('A review body is required.')
  const existing = await existingReview()
  if (existing) return existing.html_url
  const current = await github(endpoint)
  if (current.state !== 'open' || current.head.sha !== head.sha || current.base.sha !== base.sha) {
    throw new Error('The pull request closed or changed during the review.')
  }
  const review = await github(`${endpoint}/reviews`, {
    body: `${heading}\n\n${body.trim()}\n\nReviewed HEAD SHA: ${head.sha}\n\n${runLink}`,
    event: 'COMMENT',
    commit_id: head.sha,
  })
  if (!isThisReview(review)) throw new Error('GitHub returned an unexpected review author, state, or commit.')
  return review.html_url
}

/** Respond to the MCP handshake and serve one review tool over stdio. */
async function handle({ method, params }) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'claude_review', version: '1.0.0' },
      }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: [tool] }
    case 'tools/call':
      try {
        if (params?.name !== tool.name) throw new Error('Unknown review tool.')
        const url = await submitReview(params.arguments?.body)
        return { content: [{ type: 'text', text: url }] }
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.message }] }
      }
    default:
      return undefined
  }
}

for await (const line of createInterface({ input: process.stdin })) {
  let request
  try {
    request = JSON.parse(line)
  } catch {
    console.log(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }))
    continue
  }
  if (request.id === undefined) continue
  const result = await handle(request)
  const response = result === undefined
    ? { error: { code: -32601, message: 'Method not found' } }
    : { result }
  console.log(JSON.stringify({ jsonrpc: '2.0', id: request.id, ...response }))
}
