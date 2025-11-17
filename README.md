# GrantHarvester

GrantHarvester is a lightweight tool that automates the ingestion of federal funding opportunities (NOFOs) document from [Simpler.Grants.gov](https://simpler.grants.gov).

## Project Structure

```
GrantHarvester/
├── src/
│   ├── opportunityIds.js          # Fetches all available opportunity IDs
│   └── opportunityDetails.js      # Fetches detailed information for each opportunity
├── data/
│   ├── opportunityIds.json        # Stores all fetched opportunity IDs
│   └── opportunityDetails.json    # Stores processed opportunities
├── .github/
│   └── workflows/
│       └── fetch-nofos.yml       # GitHub Actions workflow
├── package.json
├── package-lock.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Simpler.Grants.gov API key

## Dependencies

- axios (^1.9.0) - For making HTTP requests
- dotenv (^16.5.0) - For environment variable management

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Anuttan/GrantHarvester.git
cd GrantHarvester
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API key:
```
GRANTS_GOV_API_KEY=your_api_key_here
```

## Usage

### Local Usage

The tool operates in two sequential steps:

1. **Fetch Opportunity IDs**
```bash
node src/opportunityIds.js
```
This will:
- Fetch all available grant opportunity IDs
- Save them to `data/opportunityIds.json`
- Handle pagination and rate limiting automatically

2. **Fetch Opportunity Details**
```bash
node src/opportunityDetails.js
```
This will:
- Read opportunity IDs from `data/opportunityIds.json`
- Fetch detailed information for each opportunity
- Filter for opportunities with attachment
- Save results to `data/opportunityDetails.json`

### Automated Usage with GitHub Actions

The project includes a GitHub Actions workflow that can be triggered manually to fetch and update NOFO data:

1. Go to the "Actions" tab in your GitHub repository
2. Select the "Fetch NOFOs" workflow
3. Click "Run workflow"
4. The workflow will:
   - Fetch latest opportunity IDs
   - Fetch opportunity details
   - Commit and push changes to the main branch

To set up the workflow:
1. Add your Simpler.Grants.gov API key to repository secrets:
   - Go to repository Settings > Secrets and variables > Actions
   - Add new repository secret named `GRANTS_GOV_API_KEY`
   - Paste your API key as the value

## Output Format

### Opportunity IDs (`data/opportunityIds.json`)
```json
[
  "OPPORTUNITY_ID_1",
  "OPPORTUNITY_ID_2",
  ...
]
```

### Opportunity Details (`data/opportunityDetails.json`)
```json
[
  {
    "opportunity_id": "string",
    "opportunity_title": "string",
    "download_path": "string",
    "file_description": "string"
  },
  ...
]
```

## Contributing

Feel free to open issues or submit pull requests for any improvements.

Made with ❤️ by Anuttan
