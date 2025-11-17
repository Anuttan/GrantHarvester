/**
 * Opportunity Details Fetcher
 * 
 * This module fetches detailed information for grant opportunities from Simpler.Grants.gov API,
 * specifically focusing on opportunities with exactly one attachment.
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Configuration
const API_KEY = process.env.GRANTS_GOV_API_KEY;
const RATE_LIMIT_DELAY = 250; // milliseconds
const INPUT_FILE = 'data/opportunityIds.json';
const OUTPUT_FILE = 'data/opportunityDetails.json';
const STATS_OUTPUT_FILE = 'data/opportunityStats.json';

/**
 * Fetches details for a single opportunity
 * @param {string} opportunityId - The ID of the opportunity to fetch
 * @returns {Promise<Object|null>} The opportunity details with stats or null if not found
 */
async function fetchOpportunityDetails(opportunityId) {
  try {
    const response = await axios.get(
      `https://api.simpler.grants.gov/v1/opportunities/${opportunityId}`,
      {
        headers: {
          'accept': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );

    const data = response.data?.data;
    if (!data) return null;

    const attachments = (data.attachments || []).filter(att => !!att.download_path);
    const attachmentCount = attachments.length;
    
    // Extract mime types from all attachments
    const mimeTypes = attachments.map(att => att.mime_type || 'unknown').filter(Boolean);
    
    // Return data for filtering (single attachment) and stats collection
    const result = {
      opportunity_id: data.opportunity_id,
      opportunity_title: data.opportunity_title,
      attachment_count: attachmentCount,
      mime_types: mimeTypes,
      attachments: attachments.map(att => ({
        mime_type: att.mime_type || 'unknown',
        file_description: att.file_description || ''
      }))
    };
    
    // Add download_path for single attachment opportunities (for backward compatibility)
    if (attachmentCount === 1) {
      result.download_path = attachments[0].download_path;
      result.file_description = attachments[0].file_description || '';
    }

    return result;
  } catch (error) {
    console.error(`Error fetching opportunity ${opportunityId}:`, error.message);
    if (error.response) {
      console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Processes all opportunities and saves those with exactly one attachment
 * Also collects statistics about mime types and attachment counts
 * @returns {Promise<Object[]>} Array of opportunities with single attachments
 */
async function processOpportunities() {
  // Ensure input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file ${INPUT_FILE} not found. Please run opportunityIds.js first.`);
  }

  const ids = JSON.parse(fs.readFileSync(INPUT_FILE));
  const results = [];
  
  // Statistics tracking
  const mimeTypeCounts = {};
  const attachmentCountDistribution = {};
  let totalOpportunitiesProcessed = 0;

  console.log(`Processing ${ids.length} opportunities...`);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const details = await fetchOpportunityDetails(id);

    if (details) {
      totalOpportunitiesProcessed++;
      
      // Track attachment count distribution
      const attachmentCount = details.attachment_count;
      attachmentCountDistribution[attachmentCount] = (attachmentCountDistribution[attachmentCount] || 0) + 1;
      
      // Track mime type counts (count opportunities, not attachments)
      if (details.mime_types && details.mime_types.length > 0) {
        // Get unique mime types for this opportunity (count each opportunity once per mime type)
        const uniqueMimeTypes = [...new Set(details.mime_types)];
        uniqueMimeTypes.forEach(mimeType => {
          mimeTypeCounts[mimeType] = (mimeTypeCounts[mimeType] || 0) + 1;
        });
      }
      
      // Only include opportunities with exactly one attachment in the main results
      if (attachmentCount === 1) {
        // Format for backward compatibility
        results.push({
          opportunity_id: details.opportunity_id,
          opportunity_title: details.opportunity_title,
          download_path: details.download_path,
          file_description: details.file_description || ''
        });
        console.log(`[${i + 1}/${ids.length}] Included: ${details.opportunity_title}`);
      } else {
        console.log(`[${i + 1}/${ids.length}] Skipped: ${attachmentCount} attachment(s) found (need exactly 1)`);
      }
    } else {
      console.log(`[${i + 1}/${ids.length}] Skipped: No data found`);
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  // Save main results (single attachment opportunities)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Processed ${results.length} opportunities with exactly 1 attachment`);
  console.log(`Results saved to ${OUTPUT_FILE}`);

  // Prepare statistics
  const stats = {
    total_opportunities_processed: totalOpportunitiesProcessed,
    mime_type_counts: Object.keys(mimeTypeCounts)
      .sort((a, b) => mimeTypeCounts[b] - mimeTypeCounts[a])
      .reduce((acc, key) => {
        acc[key] = mimeTypeCounts[key];
        return acc;
      }, {}),
    attachment_count_distribution: Object.keys(attachmentCountDistribution)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .reduce((acc, key) => {
        acc[key] = attachmentCountDistribution[key];
        return acc;
      }, {}),
    generated_at: new Date().toISOString()
  };

  // Save statistics
  fs.writeFileSync(STATS_OUTPUT_FILE, JSON.stringify(stats, null, 2));
  console.log(`\nStatistics:`);
  console.log(`  Total opportunities processed: ${totalOpportunitiesProcessed}`);
  console.log(`  Unique mime types found: ${Object.keys(mimeTypeCounts).length}`);
  console.log(`  Mime type counts (opportunities with each mime type):`, mimeTypeCounts);
  console.log(`  Attachment count distribution:`, attachmentCountDistribution);
  console.log(`Statistics saved to ${STATS_OUTPUT_FILE}`);

  return results;
}

// Execute if run directly
if (require.main === module) {
  processOpportunities().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  processOpportunities,
  fetchOpportunityDetails
};
