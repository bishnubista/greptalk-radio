#!/usr/bin/env node
/**
 * Greptile API Test Script
 *
 * Purpose: Test actual Greptile API behavior to determine:
 * 1. Citation format (does it include line numbers?)
 * 2. Response structure (sources array format)
 * 3. Indexing time for small repos
 * 4. Query response quality
 *
 * Usage:
 *   export GREPTILE_API_KEY="your-key"
 *   export GITHUB_TOKEN="your-token"
 *   node test-greptile.js
 */

const GREPTILE_API_KEY = process.env.GREPTILE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL = 'https://api.greptile.com/v2';

// Test repo (small, well-known)
const TEST_REPO = {
  remote: 'github',
  repository: 'octocat/Hello-World', // Tiny repo for fast indexing
  branch: 'master'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function indexRepository(repo) {
  console.log(`\n📥 Indexing repository: ${repo.repository}...`);

  const response = await fetch(`${BASE_URL}/repositories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GREPTILE_API_KEY}`,
      'X-Github-Token': GITHUB_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(repo)
  });

  const data = await response.json();
  console.log('Index response:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Indexing failed: ${data.message || response.statusText}`);
  }

  return data;
}

async function checkIndexStatus(repo) {
  const repoId = `${repo.remote}:${repo.branch}:${repo.repository}`;
  const encodedRepoId = encodeURIComponent(repoId);
  const url = `${BASE_URL}/repositories/${encodedRepoId}`;

  console.log(`\n🔍 Checking status: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GREPTILE_API_KEY}`,
      'X-Github-Token': GITHUB_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('Status:', data.status);

  if (data.filesProcessed) {
    console.log(`Files processed: ${data.filesProcessed}`);
  }

  return data;
}

async function waitForIndexing(repo, maxWaitTime = 180000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkIndexStatus(repo);
    const statusLower = status.status?.toLowerCase();

    if (statusLower === 'completed') {
      console.log('✅ Indexing completed!');
      return true;
    }

    if (statusLower === 'failed') {
      throw new Error('Indexing failed');
    }

    console.log(`⏳ Status: ${status.status}, waiting 3s...`);
    await sleep(3000);
  }

  throw new Error('Indexing timeout');
}

async function queryRepository(repo, question, genius = false) {
  console.log(`\n💬 Querying: "${question}"`);
  console.log(`Genius mode: ${genius}`);

  const response = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GREPTILE_API_KEY}`,
      'X-Github-Token': GITHUB_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        {
          content: question,
          role: 'user'
        }
      ],
      repositories: [repo],
      sessionId: `test-${Date.now()}`,
      stream: false,
      genius: genius
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Query failed: ${data.message || response.statusText}`);
  }

  return data;
}

async function analyzeResponse(response, queryNum) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`QUERY ${queryNum} RESPONSE ANALYSIS`);
  console.log('='.repeat(80));

  console.log('\n📄 Full Response:');
  console.log(JSON.stringify(response, null, 2));

  console.log('\n🔍 Citation Analysis:');

  // Check if there's a message
  if (response.message) {
    console.log('✅ Has message field');
    console.log('Message preview:', response.message.substring(0, 200) + '...');
  }

  // Check for sources/citations
  if (response.sources) {
    console.log(`✅ Has sources array (${response.sources.length} items)`);
    response.sources.forEach((source, i) => {
      console.log(`\nSource ${i + 1}:`, JSON.stringify(source, null, 2));

      // Analyze citation format
      if (source.filepath) console.log('  ✅ Has filepath');
      if (source.linestart !== undefined) console.log('  ✅ Has linestart');
      if (source.lineend !== undefined) console.log('  ✅ Has lineend');
      if (source.summary) console.log('  ✅ Has summary');
    });
  } else {
    console.log('❌ No sources array found');
  }

  // Check for other possible citation fields
  const possibleFields = ['files', 'references', 'citations', 'locations', 'snippets'];
  possibleFields.forEach(field => {
    if (response[field]) {
      console.log(`⚠️  Found alternate field: ${field}`);
      console.log(JSON.stringify(response[field], null, 2));
    }
  });

  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('🚀 Greptile API Test Starting...\n');

  if (!GREPTILE_API_KEY || !GITHUB_TOKEN) {
    console.error('❌ Missing required environment variables:');
    console.error('  GREPTILE_API_KEY:', GREPTILE_API_KEY ? '✅ Set' : '❌ Missing');
    console.error('  GITHUB_TOKEN:', GITHUB_TOKEN ? '✅ Set' : '❌ Missing');
    process.exit(1);
  }

  try {
    // Step 1: Index repository
    await indexRepository(TEST_REPO);

    // Step 2: Wait for indexing
    await waitForIndexing(TEST_REPO);

    // Step 3: Test queries (same as Greptalk would use)
    const queries = [
      {
        question: "What is this repo's purpose? List the main files with their paths.",
        genius: false
      },
      {
        question: "What are the entrypoints or main files? Give exact file paths.",
        genius: false
      },
      {
        question: "Show me a code pattern or function with its file path and explain what it does.",
        genius: true
      }
    ];

    for (let i = 0; i < queries.length; i++) {
      const { question, genius } = queries[i];
      const response = await queryRepository(TEST_REPO, question, genius);
      await analyzeResponse(response, i + 1);

      // Pause between queries
      if (i < queries.length - 1) {
        console.log('⏸️  Waiting 2s before next query...\n');
        await sleep(2000);
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📋 SUMMARY:');
    console.log('- Check the response analysis above to determine citation format');
    console.log('- Look for linestart/lineend fields in sources array');
    console.log('- If missing, implement GitHub API fallback in PLAN.md section 0.2.1');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
