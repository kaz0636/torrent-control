function parseFilenameFromContentDisposition(header) {
    if (!header) {
        return null;
    }

    // Try filename*= (RFC 5987) first
    const filenameStarMatch = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)'[^']*'([^;]+)/i);
    if (filenameStarMatch) {
        try {
            return decodeURIComponent(filenameStarMatch[1].trim());
        } catch (e) {}
    }

    // Try filename= (quoted)
    const filenameQuotedMatch = header.match(/filename\s*=\s*"([^"]+)"/i);
    if (filenameQuotedMatch) {
        return filenameQuotedMatch[1];
    }

    // Try filename= (unquoted)
    const filenameUnquotedMatch = header.match(/filename\s*=\s*([^;]+)/i);
    if (filenameUnquotedMatch) {
        return filenameUnquotedMatch[1].trim();
    }

    return null;
}

function parseFilenameFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const segment = decodeURIComponent(pathname.split('/').pop());
        return segment.endsWith('.torrent') ? segment : null;
    } catch (e) {
        return null;
    }
}

async function listener(request) {
    if (request.type !== 'fetchTorrent') {
        return;
    }

    const init = {
        headers: {
            'accept': 'application/x-bittorrent,application/octet-stream,*/*',
        },
    };

    // Fetch in page context first (sends the site's cookies like a normal
    // click). That fetch is bound by CORS, so a torrent hosted on another
    // origin (e.g. a tracker domain linked from a gallery site) fails there;
    // fall back to the extension's own fetch, which is not bound by CORS.
    const contexts = [];
    if (typeof content !== 'undefined' && typeof content.fetch === 'function')
        contexts.push((url, opts) => content.fetch(url, opts));
    contexts.push((url, opts) => fetch(url, {...opts, credentials: 'include'}));

    let lastError = null;
    for (const doFetch of contexts) {
        try {
            const response = await doFetch(request.url, init);

            const contentDisposition = response.headers.get('content-disposition');
            const filename = parseFilenameFromContentDisposition(contentDisposition)
                || parseFilenameFromUrl(request.url);

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                filename: filename,
                content: await response.blob(),
            };
        } catch (e) {
            lastError = e;
        }
    }

    return {error: String(lastError && lastError.message || lastError)};
}

chrome.runtime.onMessage.addListener(listener);
