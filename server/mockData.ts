import type { InfographicData } from './schema.js';

export const DEMO_TOPICS = ['renewable energy', 'artificial intelligence', 'ancient egypt', 'global coffee market', 'space exploration'];

export const mockDatabase: Record<string, InfographicData> = {
  'renewable energy': {
    title: 'Renewable Energy',
    subtitle: 'Powering the Planet\'s Clean Future',
    summary: 'Renewable energy sources now account for over 30% of global electricity generation, with solar and wind leading unprecedented growth. Investment in clean energy hit a record $1.8 trillion in 2023, surpassing fossil fuel investment for the first time.',
    theme: 'editorial-light',
    keyStats: [
      { label: 'Global Renewable Share', value: '30.3%', context: 'of world electricity in 2023', sourceRef: 'src1' },
      { label: 'Solar Cost Drop', value: '89%', context: 'decline in solar PV cost since 2010', sourceRef: 'src2' },
      { label: 'Clean Energy Investment', value: '$1.8T', context: 'record investment in 2023', sourceRef: 'src3' },
      { label: 'Wind Capacity', value: '2,100 GW', context: 'global installed wind power', sourceRef: 'src1' },
      { label: 'Solar Jobs', value: '4.9M', context: 'people employed in solar globally', sourceRef: 'src4' },
      { label: 'EV Adoption', value: '18%', context: 'of new car sales in 2023', sourceRef: 'src3' },
      { label: 'CO₂ Avoided', value: '2.8 Gt', context: 'annual CO₂ avoided by renewables', sourceRef: 'src2' },
    ],
    factSections: [
      {
        heading: 'Solar Power Revolution',
        body: 'Solar photovoltaic (PV) technology has become the cheapest source of new electricity generation in history. The cost of utility-scale solar has fallen from $380/MWh in 2010 to under $40/MWh today. China, the US, and India lead installations, with global solar capacity surpassing 1,600 GW in 2023.',
        sourceRef: 'src2',
      },
      {
        heading: 'Wind Energy Dominance',
        body: 'Wind power is the largest renewable energy source in many countries, with offshore wind expanding rapidly. The UK, Germany, and China are leaders in offshore capacity. Turbines now reach heights exceeding 260 meters and generate up to 15 MW each — enough to power 15,000 homes.',
        sourceRef: 'src1',
      },
      {
        heading: 'Energy Storage Breakthrough',
        body: 'Battery storage capacity is doubling annually, solving renewables\' intermittency challenge. Lithium-ion battery prices have fallen 97% since 1991. Grid-scale storage installations exceeded 45 GW globally in 2023, enabling grids to run on 100% renewables for extended periods.',
        sourceRef: 'src5',
      },
      {
        heading: 'Economic Case for Clean Energy',
        body: 'Renewable energy is now cheaper than new fossil fuel plants in 90% of the world. The International Energy Agency projects renewables will attract $1.7 trillion in annual investment by 2030. Clean energy industries employed 13.7 million people globally in 2022.',
        sourceRef: 'src3',
      },
      {
        heading: 'Developing World Leapfrogging',
        body: 'Nations in Africa and Asia are skipping fossil fuel infrastructure entirely, going straight to distributed solar. Off-grid solar systems now provide electricity to over 420 million people who lack grid access. Bangladesh alone has 6 million solar home systems installed.',
        sourceRef: 'src4',
      },
    ],
    timeline: [
      { year: '1954', event: 'Bell Labs creates the first practical silicon solar cell with 6% efficiency.', sourceRef: 'src2' },
      { year: '1991', event: 'Denmark installs the world\'s first offshore wind farm at Vindeby.', sourceRef: 'src1' },
      { year: '2008', event: 'Wind becomes the fastest-growing energy technology globally.', sourceRef: 'src1' },
      { year: '2015', event: 'Solar becomes cost-competitive with natural gas in several markets.', sourceRef: 'src2' },
      { year: '2020', event: 'Renewables generate more electricity than coal in the US for first time.', sourceRef: 'src3' },
      { year: '2023', event: 'Clean energy investment hits $1.8T, overtaking fossil fuels globally.', sourceRef: 'src3' },
      { year: '2024', event: 'Solar and wind account for 13% of global electricity generation.', sourceRef: 'src1' },
    ],
    comparisons: [
      {
        label: 'Cost of Electricity (per MWh)',
        leftLabel: 'New Coal Plant',
        leftValue: '$65-150',
        rightLabel: 'Utility Solar',
        rightValue: '$30-50',
        sourceRef: 'src2',
      },
      {
        label: 'Jobs Created per $1M Investment',
        leftLabel: 'Fossil Fuels',
        leftValue: '2.7 jobs',
        rightLabel: 'Renewables',
        rightValue: '7.5 jobs',
        sourceRef: 'src4',
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Global Renewable Capacity by Source (GW, 2023)',
        labels: ['Hydropower', 'Wind', 'Solar PV', 'Bioenergy', 'Geothermal'],
        values: [1392, 2100, 1630, 148, 15],
        sourceRef: 'src1',
      },
      {
        type: 'line',
        title: 'Solar PV Cost Decline ($/MWh)',
        labels: ['2010', '2013', '2016', '2019', '2022', '2023'],
        values: [380, 200, 100, 60, 40, 35],
        sourceRef: 'src2',
      },
    ],
    sources: [
      { id: 'src1', name: 'IRENA — Renewable Power Generation Costs 2023', url: 'https://www.irena.org/publications', note: 'Global installed capacity and generation statistics' },
      { id: 'src2', name: 'BloombergNEF — New Energy Outlook 2023', url: 'https://about.bnef.com/new-energy-outlook/', note: 'Solar cost data and historical trends' },
      { id: 'src3', name: 'IEA — World Energy Investment 2023', url: 'https://www.iea.org/reports/world-energy-investment-2023', note: 'Investment flows and market data' },
      { id: 'src4', name: 'IRENA — Renewable Energy and Jobs 2023', url: 'https://www.irena.org/publications/2023/Sep/Renewable-Energy-and-Jobs', note: 'Employment and economic impact data' },
      { id: 'src5', name: 'Wood Mackenzie — Energy Storage Monitor 2023', url: 'https://www.woodmac.com/reports/', note: 'Battery storage statistics and forecasts' },
    ],
    confidenceScore: 0.92,
    lastResearched: '2026-03-19',
  },

  'artificial intelligence': {
    title: 'Artificial Intelligence',
    subtitle: 'The Technology Reshaping Human Civilization',
    summary: 'Artificial intelligence has evolved from a niche research field into the defining technology of the 21st century. The global AI market reached $196 billion in 2023 and is projected to surpass $1.8 trillion by 2030, transforming every industry it touches.',
    theme: 'midnight-data',
    keyStats: [
      { label: 'AI Market Size', value: '$196B', context: 'global AI market in 2023', sourceRef: 'src1' },
      { label: 'ChatGPT Users', value: '100M+', context: 'active users within 2 months of launch', sourceRef: 'src2' },
      { label: 'AI Investment', value: '$91.9B', context: 'global private AI investment in 2022', sourceRef: 'src3' },
      { label: 'GPU Demand Growth', value: '4x', context: 'increase in AI chip demand since 2020', sourceRef: 'src4' },
      { label: 'AI Productivity Gain', value: '40%', context: 'developer productivity boost with AI tools', sourceRef: 'src5' },
      { label: 'AI Startups', value: '67,200+', context: 'active AI startups globally in 2023', sourceRef: 'src3' },
      { label: 'Projected 2030 Market', value: '$1.8T', context: 'projected global AI market size', sourceRef: 'src1' },
    ],
    factSections: [
      {
        heading: 'Large Language Models Transform Computing',
        body: 'Models like GPT-4, Gemini, and Claude represent a fundamental shift in human-computer interaction. With billions of parameters trained on vast datasets, they can write code, draft documents, analyze images, and reason across domains. These models compress years of human text into accessible intelligence.',
        sourceRef: 'src2',
      },
      {
        heading: 'AI in Healthcare: Diagnosing the Future',
        body: 'AI algorithms now match or exceed specialist physicians in diagnosing conditions from medical imaging. Google\'s DeepMind AI detected over 50 eye diseases with 94% accuracy. AI drug discovery platforms have reduced drug development timelines from 12 years to under 4 years for some compounds.',
        sourceRef: 'src5',
      },
      {
        heading: 'The Compute Race',
        body: 'Training frontier AI models requires extraordinary computing power. GPT-3 required 3.14×10²³ FLOPS to train. NVIDIA\'s market cap surpassed $3 trillion in 2024 largely on AI chip demand. The US and China are engaged in a strategic competition for AI chip supremacy with national security implications.',
        sourceRef: 'src4',
      },
      {
        heading: 'Economic Disruption and Creation',
        body: 'The World Economic Forum estimates AI will displace 85 million jobs but create 97 million new roles by 2025. McKinsey projects AI could add $13 trillion to global GDP by 2030. Goldman Sachs analysis suggests generative AI alone could raise annual global GDP by 7%.',
        sourceRef: 'src1',
      },
    ],
    timeline: [
      { year: '1950', event: 'Alan Turing proposes the "Turing Test" for machine intelligence.', sourceRef: 'src6' },
      { year: '1997', event: 'IBM Deep Blue defeats world chess champion Garry Kasparov.', sourceRef: 'src6' },
      { year: '2012', event: 'Deep learning breakthrough: AlexNet wins ImageNet competition by huge margin.', sourceRef: 'src6' },
      { year: '2017', event: 'Google publishes "Attention Is All You Need" — the Transformer architecture.', sourceRef: 'src2' },
      { year: '2020', event: 'OpenAI releases GPT-3 with 175 billion parameters.', sourceRef: 'src2' },
      { year: '2022', event: 'ChatGPT launches, reaching 100M users in 2 months — fastest ever.', sourceRef: 'src2' },
      { year: '2024', event: 'AI agents begin autonomously completing multi-step professional tasks.', sourceRef: 'src3' },
    ],
    comparisons: [
      {
        label: 'Model Parameters',
        leftLabel: 'GPT-3 (2020)',
        leftValue: '175 Billion',
        rightLabel: 'GPT-4 (2023)',
        rightValue: '~1.8 Trillion',
        sourceRef: 'src2',
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Global AI Investment by Region ($B, 2022)',
        labels: ['United States', 'China', 'European Union', 'United Kingdom', 'India'],
        values: [47.4, 13.4, 7.9, 4.5, 3.2],
        sourceRef: 'src3',
      },
      {
        type: 'line',
        title: 'AI Market Size Growth ($B)',
        labels: ['2020', '2021', '2022', '2023', '2025E', '2027E', '2030E'],
        values: [58, 87, 136, 196, 360, 620, 1800],
        sourceRef: 'src1',
      },
    ],
    sources: [
      { id: 'src1', name: 'Grand View Research — AI Market Report 2024', url: 'https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-market', note: 'Market size projections and industry analysis' },
      { id: 'src2', name: 'OpenAI Research Blog', url: 'https://openai.com/research', note: 'GPT model details and capability research' },
      { id: 'src3', name: 'Stanford AI Index Report 2023', url: 'https://aiindex.stanford.edu/report/', note: 'Investment data and AI startup ecosystem' },
      { id: 'src4', name: 'NVIDIA Investor Relations 2024', url: 'https://investor.nvidia.com', note: 'GPU demand and compute market data' },
      { id: 'src5', name: 'McKinsey Global Institute — The Economic Potential of Generative AI', url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights', note: 'Productivity impact and economic forecasts' },
      { id: 'src6', name: 'Turing Archive for the History of Computing', url: 'https://www.alanturing.net', note: 'Historical AI milestones and context' },
    ],
    confidenceScore: 0.89,
    lastResearched: '2026-03-19',
  },

  'space exploration': {
    title: 'Space Exploration',
    subtitle: 'Humanity\'s Greatest Adventure Beyond Earth',
    summary: 'Space exploration has entered a new era of commercial competition and scientific ambition. SpaceX has disrupted the industry with reusable rockets, NASA is returning humans to the Moon through Artemis, and over 70 countries now have active space programs.',
    theme: 'midnight-data',
    keyStats: [
      { label: 'Objects in Orbit', value: '8,000+', context: 'active satellites currently orbiting Earth', sourceRef: 'src1' },
      { label: 'Falcon 9 Cost', value: '$2,700/kg', context: 'to LEO vs $54,500/kg in 1981 Space Shuttle', sourceRef: 'src2' },
      { label: 'Starlink Satellites', value: '5,000+', context: 'SpaceX satellites in constellation', sourceRef: 'src2' },
      { label: 'Space Economy', value: '$546B', context: 'global space economy in 2023', sourceRef: 'src3' },
      { label: 'Distance to Mars', value: '54.6M km', context: 'minimum distance from Earth', sourceRef: 'src4' },
      { label: 'ISS Age', value: '25+ years', context: 'continuous human habitation since 2000', sourceRef: 'src5' },
      { label: 'Exoplanets Found', value: '5,600+', context: 'confirmed exoplanets as of 2024', sourceRef: 'src4' },
    ],
    factSections: [
      {
        heading: 'The Reusable Rocket Revolution',
        body: 'SpaceX fundamentally changed space economics by landing and reusing orbital rocket boosters. A Falcon 9 first stage has now flown up to 19 times. This drove launch costs down by over 95% compared to the Space Shuttle era, opening space to commercial ventures and smaller nations.',
        sourceRef: 'src2',
      },
      {
        heading: 'Artemis: Returning to the Moon',
        body: 'NASA\'s Artemis program aims to land the first woman and first person of color on the Moon. The Space Launch System rocket stands 98 meters tall and produces 8.8 million pounds of thrust. Artemis will establish a permanent orbital Gateway station and lay the foundation for eventual Mars missions.',
        sourceRef: 'src5',
      },
      {
        heading: 'Mars: The Next Frontier',
        body: 'NASA\'s Perseverance rover has collected rock samples and detected oxygen in the Martian atmosphere. SpaceX\'s Starship is designed to carry 100 people to Mars per mission. Elon Musk targets a crewed Mars landing before 2030, though most analysts project 2035-2040 as more realistic.',
        sourceRef: 'src2',
      },
      {
        heading: 'James Webb Space Telescope',
        body: 'Launched in December 2021, JWST has transformed our understanding of the early universe. It has imaged galaxies from 13.1 billion years ago, analyzed exoplanet atmospheres for signs of habitability, and revealed star formation in unprecedented detail. Its $10 billion cost has already yielded thousands of scientific papers.',
        sourceRef: 'src4',
      },
    ],
    timeline: [
      { year: '1957', event: 'USSR launches Sputnik — humanity\'s first artificial satellite.', sourceRef: 'src5' },
      { year: '1969', event: 'Apollo 11 lands humans on the Moon for the first time.', sourceRef: 'src5' },
      { year: '1990', event: 'Hubble Space Telescope launched, revolutionizing astronomy.', sourceRef: 'src4' },
      { year: '2000', event: 'International Space Station begins continuous human occupation.', sourceRef: 'src5' },
      { year: '2015', event: 'SpaceX lands first orbital rocket booster, enabling reuse.', sourceRef: 'src2' },
      { year: '2021', event: 'James Webb Space Telescope launches, deepest space images ever captured.', sourceRef: 'src4' },
      { year: '2024', event: 'Starship completes first successful flight test with full stack.', sourceRef: 'src2' },
    ],
    comparisons: [
      {
        label: 'Launch Cost to LEO (per kg)',
        leftLabel: 'Space Shuttle (1981)',
        leftValue: '$54,500/kg',
        rightLabel: 'Falcon 9 (2024)',
        rightValue: '$2,700/kg',
        sourceRef: 'src2',
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Space Agency Annual Budgets ($B, 2023)',
        labels: ['NASA', 'ESA', 'CNSA', 'Roscosmos', 'JAXA', 'ISRO'],
        values: [25.4, 9.1, 8.9, 2.5, 2.0, 1.9],
        sourceRef: 'src3',
      },
    ],
    sources: [
      { id: 'src1', name: 'Union of Concerned Scientists Satellite Database', url: 'https://www.ucsusa.org/resources/satellite-database', note: 'Active satellite count and orbital data' },
      { id: 'src2', name: 'SpaceX Press Kit and Mission Data', url: 'https://www.spacex.com/mission', note: 'Launch costs, Falcon 9, and Starship data' },
      { id: 'src3', name: 'Space Foundation — The Space Report 2023', url: 'https://www.spacefoundation.org/space_brief/space-report-2023/', note: 'Global space economy and investment data' },
      { id: 'src4', name: 'NASA Exoplanet Archive and JWST Science', url: 'https://exoplanetarchive.ipac.caltech.edu', note: 'Exoplanet discoveries and telescope science' },
      { id: 'src5', name: 'NASA History Division', url: 'https://history.nasa.gov', note: 'Historical space exploration milestones' },
    ],
    confidenceScore: 0.91,
    lastResearched: '2026-03-19',
  },
};

export function getMockData(topic: string): InfographicData {
  const normalizedTopic = topic.toLowerCase().trim();

  // Try exact match
  if (mockDatabase[normalizedTopic]) {
    return mockDatabase[normalizedTopic];
  }

  // Try partial match
  for (const key of Object.keys(mockDatabase)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      return mockDatabase[key];
    }
  }

  // Generate a generic mock for unknown topics
  return generateGenericMock(topic);
}

function generateGenericMock(topic: string): InfographicData {
  const displayTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  return {
    title: displayTopic,
    subtitle: `Key Facts, Figures & Insights`,
    summary: `This infographic presents key facts and figures about ${displayTopic}. Running in demo mode — add your GEMINI_API_KEY to .env for live AI-generated research with real-time data and sourced facts.`,
    theme: 'editorial-light',
    keyStats: [
      { label: 'Demo Mode', value: 'Active', context: 'Add GEMINI_API_KEY for live data', sourceRef: 'demo' },
      { label: 'Data Points', value: '6', context: 'sample statistics shown', sourceRef: 'demo' },
      { label: 'Fact Sections', value: '3', context: 'organized topic breakdowns', sourceRef: 'demo' },
      { label: 'Sources', value: '2+', context: 'citations per section', sourceRef: 'demo' },
    ],
    factSections: [
      {
        heading: 'About This Demo',
        body: `You are viewing FactCanvas in demo mode. This is a sample infographic for "${displayTopic}". To generate a real, AI-powered infographic with sourced facts, configure your GEMINI_API_KEY in the .env file.`,
        sourceRef: 'demo',
      },
      {
        heading: 'How FactCanvas Works',
        body: 'FactCanvas uses the Gemini AI API to research and synthesize factual information about any topic. It structures the output as a rich JSON payload with key stats, fact sections, timelines, comparisons, charts, and properly cited sources.',
        sourceRef: 'demo',
      },
      {
        heading: 'Getting Started',
        body: 'Copy .env.example to .env, add your GEMINI_API_KEY from Google AI Studio, restart the server, and enter any topic to generate a beautiful, source-backed infographic in seconds.',
        sourceRef: 'demo',
      },
    ],
    timeline: [
      { year: 'Step 1', event: 'Copy .env.example to .env', sourceRef: 'demo' },
      { year: 'Step 2', event: 'Add your GEMINI_API_KEY from aistudio.google.com', sourceRef: 'demo' },
      { year: 'Step 3', event: 'Restart the server with npm run dev', sourceRef: 'demo' },
      { year: 'Step 4', event: 'Enter any topic and generate your infographic!', sourceRef: 'demo' },
    ],
    comparisons: [],
    charts: [],
    sources: [
      { id: 'demo', name: 'FactCanvas Demo Mode', url: 'https://github.com', note: 'Demo placeholder — not a real source' },
    ],
    confidenceScore: 0.5,
    lastResearched: new Date().toISOString().split('T')[0],
  };
}
