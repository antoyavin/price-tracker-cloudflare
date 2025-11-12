import { AppContext } from "../../types";
import { getRealisticHeaders } from "../../services/checker";

export const DebugFetch = async (c: AppContext) => {
    const url = c.req.query("url");
    if (!url) {
        return c.json({ success: false, error: "Missing url query parameter" }, 400);
    }

    try {
        const r = await fetch(String(url), { headers: getRealisticHeaders(url) });
        const html = await r.text();

        // Extract first 3000 chars for inspection
        const htmlSnippet = html.substring(0, 3000);

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

        // Check if it's a captcha page
        const isCaptcha = html.includes("To discuss automated access to Amazon") || html.includes("captcha");

        return c.json({
            success: true,
            url,
            status: r.status,
            htmlLength: html.length,
            isCaptcha,
            htmlSnippet,
            foundPatterns,
        });
    } catch (err: any) {
        console.error("DebugFetch error", err);
        return c.json({ success: false, error: String(err?.message ?? err) }, 500);
    }
};

export default DebugFetch;
