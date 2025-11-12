import { AppContext } from "../../types";

export const DebugFetch = async (c: AppContext) => {
    const url = c.req.query("url");
    if (!url) {
        return c.json({ success: false, error: "Missing url query parameter" }, 400);
    }

    try {
        const REALISTIC_HEADERS = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
        };

        const r = await fetch(String(url), { headers: REALISTIC_HEADERS });
        const html = await r.text();

        // Extract first 2000 chars for inspection
        const htmlSnippet = html.substring(0, 2000);

        // Look for price-related patterns
        const pricePatterns = [
            { name: "a-price-whole", regex: /class="a-price-whole"[^>]*>([^<]+)</ },
            { name: "aok-offscreen", regex: /class="aok-offscreen"[^>]*>([^<]+)</ },
            { name: "priceblock", regex: /id="priceblock_(?:ourprice|dealprice)"[^>]*>([^<]+)</ },
            { name: "og:price:amount", regex: /property="og:price:amount"[^>]*content="([^"]+)"/ },
            { name: "euro-pattern", regex: /([0-9\s,\.]+)\s*€/ },
        ];

        const foundPatterns: Record<string, string | null> = {};
        for (const pattern of pricePatterns) {
            const m = html.match(pattern.regex);
            foundPatterns[pattern.name] = m ? m[1] : null;
        }

        return c.json({
            success: true,
            url,
            status: r.status,
            htmlLength: html.length,
            htmlSnippet,
            foundPatterns,
        });
    } catch (err: any) {
        console.error("DebugFetch error", err);
        return c.json({ success: false, error: String(err?.message ?? err) }, 500);
    }
};

export default DebugFetch;
