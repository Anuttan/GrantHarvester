/**
 * Opportunity ID Fetcher
 * 
 * This module fetches all available grant opportunities from Simpler.Grants.gov API
 * and saves their IDs to a JSON file. It handles pagination and rate limiting.
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Configuration
const API_KEY = process.env.GRANTS_GOV_API_KEY;
const PAGE_SIZE = 25;
const RATE_LIMIT_DELAY = 300; // milliseconds
const OUTPUT_FILE = 'data/opportunityIds.json';

/**
 * Fetches a single page of opportunity IDs
 * @param {number} pageNumber - The page number to fetch
 * @returns {Promise<{ids: string[], totalPages: number}>} - The IDs and total pages
 */
async function fetchOpportunityPage(pageNumber) {
  try {
    const response = await axios.post(
      'https://api.simpler.grants.gov/v1/opportunities/search',
      {
        filters: {
          opportunity_status: {
            one_of: ['posted']
          },
          funding_instrument: {
            one_of: ['grant']
          }
        },
        pagination: {
          page_offset: pageNumber,
          page_size: PAGE_SIZE,
          sort_order: [
            {
              order_by: "opportunity_id",
              sort_direction: "ascending"
            }
          ]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );

    const data = response.data?.data || [];
    const ids = data.map(opp => opp.opportunity_id);
    const totalPages = response.data?.pagination_info?.total_pages || 1;

    return { ids, totalPages };
  } catch (error) {
    console.error(`Error fetching page ${pageNumber}:`, error.message);
    if (error.response) {
      console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Fetches all available opportunity IDs from Simpler.Grants.gov
 * @returns {Promise<string[]>} Array of opportunity IDs
 */
async function fetchAllOpportunityIDs() {
  let currentPage = 1;
  let totalPages = 1;
  const allIDs = [];

  console.log('Fetching all posted grant opportunity IDs...');

  while (currentPage <= totalPages) {
    try {
      const { ids, totalPages: newTotalPages } = await fetchOpportunityPage(currentPage);
      allIDs.push(...ids);
      totalPages = newTotalPages;

      console.log(`Page ${currentPage}/${totalPages} fetched (${ids.length} IDs)`);
      currentPage++;

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch (error) {
      console.error(`Failed to fetch page ${currentPage}. Stopping fetch process.`);
      break;
    }
  }

  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allIDs, null, 2));
  console.log(`Total opportunities collected: ${allIDs.length}`);
  console.log(`Results saved to ${OUTPUT_FILE}`);

  return allIDs;
}

// Execute if run directly
if (require.main === module) {
  fetchAllOpportunityIDs().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  fetchAllOpportunityIDs,
  fetchOpportunityPage
};
