import { load } from "cheerio";

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function getRealisticHeaders(url: string): Record<string, string> {
    const domain = new URL(url).hostname;
    return {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        "Referer": `https://${domain}/`,
    };
} function normalizePriceString(raw: string): number | null {
    if (!raw) return null;
    // Remove non-numeric except dot and comma
    let s = raw.replace(/[^0-9.,]/g, "").trim();
    if (!s) return null;

    // If there is both . and ,, assume . is thousands and , is decimal
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '');
        s = s.replace(/,/g, '.');
    } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        s = s.replace(/,/g, '.');
    }

    const num = parseFloat(s);
    if (Number.isNaN(num)) return null;
    return num;
}

function parseAmazonPrice(html: string): number | null {
    const $ = load(html);

    // Debug: log HTML length
    console.log(`[parseAmazonPrice] HTML length: ${html.length}`);

    // 1) Try a-price-whole + a-price-fraction combo (common on Amazon)
    const wholeFraction = $("span.a-price-whole").first().text();
    const fractionSpan = $("span.a-price-fraction").first().text();
    if (wholeFraction && fractionSpan) {
        const price = normalizePriceString(`${wholeFraction}.${fractionSpan}`);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via a-price-whole/fraction: ${price}`);
            return price;
        }
    }

    // 2) Try aok-offscreen (hidden text with full price)
    const offscreen = $("span.aok-offscreen").first().text();
    if (offscreen) {
        const price = normalizePriceString(offscreen);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via aok-offscreen: ${price}`);
            return price;
        }
    }

    // 3) Try priceblock IDs (older Amazon pages)
    const priceblock = $("#priceblock_ourprice, #priceblock_dealprice").first().text();
    if (priceblock) {
        const price = normalizePriceString(priceblock);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via priceblock ID: ${price}`);
            return price;
        }
    }

    // 4) Try a-price (generic price span)
    const aPrice = $("span.a-price").first().text();
    if (aPrice) {
        const price = normalizePriceString(aPrice);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via a-price span: ${price}`);
            return price;
        }
    }

    // 5) Try meta og:price:amount JSON-LD
    const metaPrice = $('meta[property="og:price:amount"]').attr("content");
    if (metaPrice) {
        const price = normalizePriceString(metaPrice);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via og:price:amount: ${price}`);
            return price;
        }
    }

    // 6) Try data-a-color attribute on a-price spans (sometimes used)
    $("span[data-a-price-whole]").each((i, elem) => {
        const wholePrice = $(elem).attr("data-a-price-whole");
        if (wholePrice) {
            const price = normalizePriceString(wholePrice);
            if (price !== null) {
                console.log(`[parseAmazonPrice] Found price via data-a-price-whole: ${price}`);
                return false; // break
            }
        }
    });

    // 7) Try to find any text with Euro symbol and price
    const euroMatch = html.match(/([0-9\s,\.]+)\s*€/i);
    if (euroMatch && euroMatch[1]) {
        const price = normalizePriceString(euroMatch[1]);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via Euro regex: ${price}`);
            return price;
        }
    }

    // 8) Last resort: look for currency symbol followed by numbers
    const currencyMatch = html.match(/(€|\$|USD|EUR)\s*([\d.,]+)/i);
    if (currencyMatch && currencyMatch[2]) {
        const price = normalizePriceString(currencyMatch[2]);
        if (price !== null) {
            console.log(`[parseAmazonPrice] Found price via currency regex: ${price}`);
            return price;
        }
    }

    console.warn(`[parseAmazonPrice] No price found in HTML`);
    return null;
}

function sendTelegram(env: Env, text: string) {
    const token = (env as any).TELEGRAM_TOKEN;
    const chatId = (env as any).TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.warn('Telegram token/chat_id not configured, skipping notification');
        return { sent: false, reason: 'not-configured' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { chat_id: chatId, text };

    try {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((res) => res.json().catch(() => ({})))
            .then((json) => ({ sent: true, response: json }))
            .catch((err: any) => {
                console.error('sendTelegram error', err);
                return { sent: false, reason: String(err?.message ?? err) };
            });
    } catch (err: any) {
        console.error('sendTelegram error', err);
        return Promise.resolve({ sent: false, reason: String(err?.message ?? err) });
    }
}

export async function runCheck(env: Env) {
    const res = await env.DB.prepare('SELECT id, url, price FROM products').all();
    const products = res.results ?? [];
    const summary: Array<{ id: number; url: string; oldPrice: number | null; newPrice: number | null; notified?: boolean }>
        = [];

    for (const p of products) {
        const id = Number((p as any).id);
        const url = String((p as any).url);
        const oldPrice = (p as any).price == null ? null : Number((p as any).price);
        let newPrice: number | null = null;
        try {
            const r = await fetch(String(url), { headers: getRealisticHeaders(url) });
            const html = await r.text();
            console.log(`[runCheck] Fetched ${url}, status: ${r.status}, HTML length: ${html.length}`);
            newPrice = parseAmazonPrice(html); if (newPrice === null) {
                // update last_check only
                await env.DB.prepare('UPDATE products SET last_check = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
                summary.push({ id, url, oldPrice, newPrice });
                continue;
            }

            if (oldPrice === null || newPrice !== oldPrice) {
                await env.DB.prepare('UPDATE products SET price = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?').bind(newPrice, id).run();
            } else {
                await env.DB.prepare('UPDATE products SET last_check = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
            }

            let notified = false;
            if (oldPrice !== null && newPrice < oldPrice) {
                const text = `Price dropped for ${url}\nfrom ${oldPrice} to ${newPrice}`;
                const sent = await sendTelegram(env, text);
                notified = Boolean((sent as any).sent);
            }

            summary.push({ id, url, oldPrice, newPrice, notified });
        } catch (err: any) {
            console.error('runCheck item error', p, err);
            summary.push({ id, url, oldPrice, newPrice });
        }
    }

    return { checked: products.length, details: summary };
}

export default runCheck;
