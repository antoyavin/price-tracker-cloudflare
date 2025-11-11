function normalizePriceString(raw: string) {
    // Remove non-numeric except dot and comma
    let s = raw.replace(/[^0-9.,]/g, "").trim();
    if (!s) return null;

    // If there is both . and ,, assume . is thousands and , is decimal
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '');
        s = s.replace(/,/g, '.');
    } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        s = s.replace(/,/g, '.');
    } else {
        // else keep as-is
    }

    const num = parseFloat(s);
    if (Number.isNaN(num)) return null;
    return num;
}


function parseAmazonPrice(html: string): number | null {
    function normalizePriceString(str: string): number | null {
        if (!str) return null;
        // Supprime les espaces et transforme les virgules en points
        const cleaned = str.replace(/\s/g, '').replace(',', '.');
        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
    }
    const patterns = [
        // 1) a-price-whole + a-price-fraction
        /<span[^>]*class=["']?a-price-whole["']?[^>]*>([\d\s]+)<span[^>]*class=["']?a-price-decimal["']?[^>]*>[\.,]<\/span><\/span>\s*<span[^>]*class=["']?a-price-fraction["']?[^>]*>(\d+)<\/span>/i,

        // 2) fallback aok-offscreen
        /<span[^>]+class=["']?aok-offscreen["']?[^>]*>\s*([\d.,]+)\s*€/i,

        // 3) priceblock ids
        /id=["']priceblock_(?:ourprice|dealprice)["'][^>]*>\s*([\d.,]+)\s*(?:€|EUR|\$|US\$)?</i,

        // 4) JSON inline
        /"priceToPay"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.,]+)"/i,
        /"currentPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.,]+)"/i,

        // 5) dernier recours
        /([\d.,]+)\s*(?:€|EUR|\$|US\$)/i,
    ];

    for (const pat of patterns) {
        const m = html.match(pat);
        if (m) {
            // Si le pattern a deux groupes (whole + fraction)
            if (m.length >= 3 && m[2]) {
                return normalizePriceString(`${m[1]}.${m[2]}`);
            }
            // Sinon on prend le premier groupe
            if (m[1]) {
                return normalizePriceString(m[1]);
            }
        }
    }

    // fallback meta og:price:amount
    const meta = html.match(/<meta\s+property="og:price:amount"\s+content="([0-9.,]+)"/i);
    if (meta && meta[1]) return normalizePriceString(meta[1]);

    return null;
}


async function sendTelegram(env: Env, text: string) {
    const token = (env as any).TELEGRAM_TOKEN;
    const chatId = (env as any).TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.warn('Telegram token/chat_id not configured, skipping notification');
        return { sent: false, reason: 'not-configured' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { chat_id: chatId, text };

    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        return { sent: true, response: json };
    } catch (err: any) {
        console.error('sendTelegram error', err);
        return { sent: false, reason: String(err?.message ?? err) };
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
            const r = await fetch(String(url), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; price-tracker/1.0)' } });
            const html = await r.text();
            newPrice = parseAmazonPrice(html);

            if (newPrice === null) {
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
