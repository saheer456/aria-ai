import * as cheerio from 'cheerio';

export interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
}

/**
 * Perform a real-time web search utilizing DuckDuckGo's Lite HTML version.
 * This effectively bypasses JavaScript requirements and API rate limits.
 */
export async function performWebSearch(query: string, maxResults = 3): Promise<WebSearchResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    // Using native fetch, passing typical headers to avoid anti-bot blocks
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
    });

    if (!response.ok) {
      throw new Error(`Web search failed with HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const results: WebSearchResult[] = [];

    $('.result').each((i, element) => {
      if (results.length >= maxResults) return false; // Break loop
      
      const titleEl = $(element).find('.result__title a.result__a');
      const snippetEl = $(element).find('.result__snippet');
      
      const title = titleEl.text().trim();
      let link = titleEl.attr('href') || '';
      const snippet = snippetEl.text().trim();

      // DuckDuckGo often wraps links in a redirect //duckduckgo.com/l/?uddg=...
      if (link.includes('uddg=')) {
        try {
          const urlParams = new URLSearchParams(link.split('?')[1]);
          const uddg = urlParams.get('uddg');
          if (uddg) link = decodeURIComponent(uddg);
        } catch {
          // keep original if parsing fails
        }
      } else if (link.startsWith('//')) {
        link = `https:${link}`;
      }

      if (title && snippet && link) {
        results.push({ title, snippet, link });
      }
    });

    return results;

  } catch (error) {
    console.error('[Web Search Error]:', error);
    return [];
  }
}

/**
 * A fast heuristic to determine if a user query is asking for real-time/latest information.
 */
export function requiresWebSearch(query: string): boolean {
  const q = query.toLowerCase();
  
  // Specific keywords that imply current events, weather, news, or modern references
  const liveKeywords = [
    'current', 'latest', 'today', 'news', 'weather', 'now', 'price of', 'who won',
    'recently', 'this week', 'this year', 'what time is it', 'stock', 'who is the ceo',
    'recent developments', 'update on'
  ];

  for (const kw of liveKeywords) {
    if (q.includes(kw)) return true;
  }

  // If the query is specifically asking for a search
  if (q.startsWith('search') || q.startsWith('lookup') || q.startsWith('find the latest')) {
    return true;
  }

  // Fallback for general questions, let LLM decide based on context, 
  // but for now, we'll keep the heuristic lightweight to save latency.
  return false;
}
