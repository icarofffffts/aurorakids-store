import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import adyenLib from '@adyen/api-library';
const { Client: AdyenClient, CheckoutAPI: AdyenCheckoutAPI } = adyenLib;
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { buildSeedProducts } from './seed/products.seed.js';

dotenv.config();

const port = process.env.PORT || 3000;

console.log("Starting server...");

// Global Error Handlers
process.on('uncaughtException', (err) => console.error('UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', (reason, promise) => console.error('UNHANDLED REJECTION:', reason));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function unquoteEnv(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function readEnvOrFile(name) {
    const filePath = process.env[`${name}_FILE`];
    if (typeof filePath === 'string' && filePath.trim()) {
        try {
            return fs.readFileSync(filePath.trim(), 'utf8').trim();
        } catch (e) {
            console.error(`Failed to read secret file for ${name}:`, e);
            return undefined;
        }
    }
    return process.env[name];
}

function requireEnv(name) {
    const value = unquoteEnv(readEnvOrFile(name));
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value.trim();
}

function errorToMessage(error) {
    if (!error) return 'Unknown error';

    if (error instanceof Error) {
        return error.message || 'Unknown error';
    }

    if (typeof error === 'string') return error;

    // Many libraries (PostgREST/Supabase) return plain objects with message/details.
    if (typeof error === 'object') {
        try {
            // @ts-ignore
            const msg = typeof error.message === 'string' ? error.message : '';
            // @ts-ignore
            const details = typeof error.details === 'string' ? error.details : '';
            // @ts-ignore
            const hint = typeof error.hint === 'string' ? error.hint : '';
            // @ts-ignore
            const code = typeof error.code === 'string' ? error.code : '';
            // @ts-ignore
            const status = typeof error.status === 'number' ? error.status : null;
            // @ts-ignore
            const statusCode = typeof error.statusCode === 'number' ? error.statusCode : null;

            const parts = [];
            if (msg) parts.push(msg);
            if (details) parts.push(details);
            if (hint) parts.push(hint);
            if (code) parts.push(`code ${code}`);
            const http = status ?? statusCode;
            if (http) parts.push(`HTTP ${http}`);
            if (parts.length) return parts.join(' | ');
        } catch {
            // ignore
        }
    }

    try {
        const s = JSON.stringify(error);
        if (typeof s === 'string' && s && s !== '{}' && s !== '[]') return s;
        return 'Unknown error';
    } catch {
        return 'Unknown error';
    }
}

function getAdyenCheckout() {
    const apiKey = unquoteEnv(process.env.ADYEN_API_KEY);
    const merchantAccount = unquoteEnv(process.env.ADYEN_MERCHANT_ACCOUNT);
    if (!apiKey || !merchantAccount) {
        throw new Error('ADYEN_API_KEY e ADYEN_MERCHANT_ACCOUNT precisam estar configurados.');
    }
    const environment = (unquoteEnv(process.env.ADYEN_ENV) || 'test').toLowerCase() === 'live' ? 'LIVE' : 'TEST';
    const client = new AdyenClient({ apiKey, environment });
    return new AdyenCheckoutAPI(client);
}

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is not available in this Node runtime');
    }
    const controller = new AbortController();
    const externalSignal = options && typeof options === 'object' ? options.signal : undefined;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        if (externalSignal) {
            try {
                if (externalSignal.aborted) {
                    controller.abort(externalSignal.reason);
                } else {
                    externalSignal.addEventListener(
                        'abort',
                        () => {
                            try {
                                controller.abort(externalSignal.reason);
                            } catch {
                                controller.abort();
                            }
                        },
                        { once: true }
                    );
                }
            } catch {
                // ignore signal wiring issues
            }
        }
        return await fetch(url, {
            ...(options || {}),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function postJsonWithTimeout(url, payload, timeoutMs = 15000) {
    if (typeof url !== 'string' || !url.trim()) {
        throw new Error('Invalid URL for JSON POST');
    }
    const res = await fetchWithTimeout(
        url.trim(),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        },
        timeoutMs
    );
    let text = '';
    try {
        text = await res.text();
    } catch {
        text = '';
    }
    return { ok: res.ok, status: res.status, text };
}

function getMpNotificationUrl() {
    const base = requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '');
    const secret = requireEnv('MP_WEBHOOK_SECRET');
    return `${base}/api/webhook?secret=${encodeURIComponent(secret)}`;
}

function normalizeMpPaymentBody(input, payerEmail, orderId) {
    if (!input || typeof input !== 'object') {
        return {
            description: `Pedido #${String(orderId ?? '').slice(0, 8)} - ${payerEmail}`,
            external_reference: orderId,
            payer: { email: payerEmail },
        };
    }

    // The MP Payment Brick can send wrapper fields like:
    // { selectedPaymentMethod, paymentType, formData: { ...actual mp body... } }
    let body = input;
    if ('formData' in body && body.formData && typeof body.formData === 'object') {
        body = body.formData;
    }

    // Clone to avoid mutating original input
    const out = { ...body };

    // Strip known wrapper keys if they leaked into the payload
    delete out.selectedPaymentMethod;
    delete out.paymentType;
    delete out.formData;

    out.description = out.description ?? `Pedido #${String(orderId ?? '').slice(0, 8)} - ${payerEmail}`;
    out.external_reference = out.external_reference ?? orderId;
    out.notification_url = out.notification_url ?? getMpNotificationUrl();

    const payer = (out.payer && typeof out.payer === 'object') ? out.payer : {};
    out.payer = {
        ...payer,
        email: typeof payer.email === 'string' && payer.email.trim() ? payer.email : payerEmail,
    };

    return out;
}

function normalizePhoneBR(input) {
    if (typeof input !== 'string') return null;
    const digits = input.replace(/\D/g, '');
    if (!digits) return null;

    // If already includes country code
    if (digits.startsWith('55') && digits.length >= 12) {
        return `+${digits}`;
    }

    // Common BR formats with DDD
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }

    // Fallback
    return `+${digits}`;
}

function normalizeCpfBR(input) {
    if (typeof input !== 'string') return null;
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 11) return null;
    return digits;
}

function parseCsvEnv(value) {
    const raw = unquoteEnv(value);
    if (typeof raw !== 'string') return [];
    return raw
        .split(',')
        .map(v => unquoteEnv(v).trim())
        .filter(Boolean);
}

function formatSupabaseError(error) {
    if (!error) return null;
    const message = errorToMessage(error);
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : null;
    const details = typeof error === 'object' && error && 'details' in error ? String(error.details) : null;
    const hint = typeof error === 'object' && error && 'hint' in error ? String(error.hint) : null;
    return {
        message,
        code,
        details: details && details !== 'null' ? details : null,
        hint: hint && hint !== 'null' ? hint : null,
    };
}

function isMissingTableError(error, tableName) {
    const msg = String((error && (error.message || errorToMessage(error))) || '').toLowerCase();
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === '42P01') return true; // Postgres undefined_table
    // PostgREST can return messages like: "Could not find the 'campaigns' column/table"
    if (tableName && msg.includes(String(tableName).toLowerCase())) {
        if (msg.includes('does not exist') || msg.includes('could not find') || msg.includes('undefined')) return true;
    }
    return false;
}

function isMissingColumnError(error, columnName) {
    const msg = String((error && (error.message || errorToMessage(error))) || '').toLowerCase();
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === '42703') return true; // Postgres undefined_column
    if (columnName && msg.includes(String(columnName).toLowerCase()) && msg.includes('does not exist')) return true;
    return false;
}

function makeRequestId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse(text) {
    if (typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function normalizeOrigin(origin) {
    if (typeof origin !== 'string') return '';
    return origin.trim().replace(/\/+$/, '');
}

async function getUserFromRequest(req) {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'Missing Authorization header' };
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return { user: null, error: 'Missing bearer token' };

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return { user: null, error: 'Invalid session' };
    }

    return { user: data.user, error: null };
}

function getJwtRole(token) {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const payloadB64 = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
        const json = Buffer.from(padded, 'base64').toString('utf8');
        const payload = JSON.parse(json);
        const role = payload?.role;
        return typeof role === 'string' ? role : null;
    } catch {
        return null;
    }
}

async function isAdminUser(userId, userEmail) {
    const email = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    const adminEmails = parseCsvEnv(process.env.ADMIN_EMAILS).map(e => e.toLowerCase());
    if (email && adminEmails.includes(email)) return true;

    const adminUserIds = parseCsvEnv(process.env.ADMIN_USER_IDS);
    if (userId && adminUserIds.includes(userId)) return true;

    // Fallback to profiles.role when available
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (!profileError && profile && profile.role === 'admin') {
            return true;
        }
    } catch {
        // ignore
    }

    return false;
}

async function getAdminUserFromRequest(req) {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'Missing Authorization header' };
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return { user: null, error: 'Missing bearer token' };

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return { user: null, error: 'Invalid session' };
    }

    const userId = data.user.id;
    const ok = await isAdminUser(userId, data.user.email);
    if (!ok) return { user: null, error: 'Forbidden' };

    return { user: data.user, error: null };
}

function normalizeCouponCode(codeRaw) {
    if (typeof codeRaw !== 'string') return '';
    return codeRaw.trim().toUpperCase();
}

function normalizeCouponRow(row) {
    if (!row || typeof row !== 'object') return null;
    const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
    const discountType = String(row.discount_type || '');
    const discountValue = Number(row.discount_value);

    const startsAt = row.starts_at ? new Date(row.starts_at) : null;
    const endsAt = row.ends_at ? new Date(row.ends_at) : null;
    const minSubtotal = Number(row.min_subtotal ?? 0);
    const maxUses = row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses);
    const maxUsesPerUser = row.max_uses_per_user === null || row.max_uses_per_user === undefined ? null : Number(row.max_uses_per_user);

    const eligibleCategories = Array.isArray(row.eligible_categories)
        ? row.eligible_categories.map(v => String(v))
        : null;
    const eligibleProductIds = Array.isArray(row.eligible_product_ids)
        ? row.eligible_product_ids.map(v => Number(v)).filter(v => Number.isFinite(v))
        : null;

    if (!code) return null;
    if (discountType !== 'percentage' && discountType !== 'fixed') return null;
    if (!Number.isFinite(discountValue) || discountValue <= 0) return null;

    return {
        id: row.id,
        code,
        name: typeof row.name === 'string' ? row.name : null,
        discount_type: discountType,
        discount_value: discountValue,
        active: row.active !== false,
        starts_at: startsAt,
        ends_at: endsAt,
        min_subtotal: Number.isFinite(minSubtotal) ? minSubtotal : 0,
        max_uses: Number.isFinite(maxUses) ? maxUses : null,
        max_uses_per_user: Number.isFinite(maxUsesPerUser) ? maxUsesPerUser : null,
        eligible_categories: eligibleCategories && eligibleCategories.length ? eligibleCategories : null,
        eligible_product_ids: eligibleProductIds && eligibleProductIds.length ? eligibleProductIds : null,
    };
}

async function quoteCoupon({ code, items, userId }) {
    const now = new Date();
    const couponCode = normalizeCouponCode(code);
    if (!couponCode) {
        return { valid: false, error: 'Digite um cupom' };
    }

    // Load coupon
    const { data: couponRow, error: couponErr } = await supabase
        .from('coupons')
        .select('id,code,name,discount_type,discount_value,active,starts_at,ends_at,min_subtotal,max_uses,max_uses_per_user,eligible_categories,eligible_product_ids')
        .eq('code', couponCode)
        .limit(1)
        .maybeSingle();
    if (couponErr) {
        if (isMissingTableError(couponErr, 'coupons')) {
            return { valid: false, error: 'Coupons table missing. Run fix_all_permissions.sql or supabase_coupons_v2.sql.' };
        }
        if (isMissingColumnError(couponErr, 'starts_at') || isMissingColumnError(couponErr, 'min_subtotal')) {
            return { valid: false, error: 'Coupons schema outdated. Run supabase_coupons_v2.sql.' };
        }
        return { valid: false, error: errorToMessage(couponErr) };
    }
    if (!couponRow) return { valid: false, error: 'Cupom invalido' };

    const coupon = normalizeCouponRow(couponRow);
    if (!coupon) return { valid: false, error: 'Cupom invalido' };

    if (!coupon.active) return { valid: false, error: 'Cupom inativo' };
    if (coupon.starts_at && coupon.starts_at.getTime() > now.getTime()) return { valid: false, error: 'Cupom ainda nao liberado' };
    if (coupon.ends_at && coupon.ends_at.getTime() < now.getTime()) return { valid: false, error: 'Cupom expirado' };

    // Compute subtotal from products
    const cleanItems = Array.isArray(items) ? items : [];
    const productIds = cleanItems
        .map(i => Number(i?.productId ?? i?.id))
        .filter(v => Number.isFinite(v));
    const uniqueProductIds = Array.from(new Set(productIds));

    let productsById = new Map();
    if (uniqueProductIds.length) {
        const { data: products, error: productsErr } = await supabase
            .from('products')
            .select('id,price,category,name,image')
            .in('id', uniqueProductIds);
        if (productsErr) {
            return { valid: false, error: 'Falha ao carregar produtos' };
        }
        for (const p of products || []) {
            productsById.set(Number(p.id), p);
        }
    }

    let subtotal = 0;
    let eligibleSubtotal = 0;
    for (const it of cleanItems) {
        const pid = Number(it?.productId ?? it?.id);
        const qty = Number(it?.quantity);
        if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) continue;
        const product = productsById.get(pid);
        if (!product) continue;

        const unitPrice = Number(product.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;

        const eligibleProducts = coupon.eligible_product_ids;
        const eligibleCats = coupon.eligible_categories;
        if (!eligibleProducts && !eligibleCats) {
            eligibleSubtotal += lineTotal;
            continue;
        }

        const matchProduct = eligibleProducts ? eligibleProducts.includes(pid) : false;
        const matchCategory = eligibleCats ? eligibleCats.includes(String(product.category)) : false;
        if (matchProduct || matchCategory) {
            eligibleSubtotal += lineTotal;
        }
    }

    subtotal = Number(subtotal.toFixed(2));
    eligibleSubtotal = Number(eligibleSubtotal.toFixed(2));

    if (subtotal <= 0) {
        return { valid: false, error: 'Carrinho vazio' };
    }

    if (coupon.min_subtotal > 0 && subtotal < coupon.min_subtotal) {
        return { valid: false, error: `Minimo para usar este cupom: R$ ${Number(coupon.min_subtotal).toFixed(2)}` };
    }

    if (eligibleSubtotal <= 0) {
        return { valid: false, error: 'Cupom nao se aplica aos itens do carrinho' };
    }

    // Enforce max uses (paid uses)
    if (coupon.max_uses !== null) {
        const { count, error } = await supabase
            .from('coupon_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id);
        if (error) return { valid: false, error: 'Falha ao validar cupom' };
        if (typeof count === 'number' && count >= coupon.max_uses) {
            return { valid: false, error: 'Cupom esgotado' };
        }
    }

    if (userId && coupon.max_uses_per_user !== null) {
        const { count, error } = await supabase
            .from('coupon_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('user_id', userId);
        if (error) return { valid: false, error: 'Falha ao validar cupom' };
        if (typeof count === 'number' && count >= coupon.max_uses_per_user) {
            return { valid: false, error: 'Limite do cupom atingido para este usuario' };
        }
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
        const pct = Math.max(0, Math.min(100, coupon.discount_value));
        discount = (eligibleSubtotal * pct) / 100;
    } else {
        discount = coupon.discount_value;
    }
    discount = Math.max(0, Math.min(eligibleSubtotal, discount));
    discount = Number(discount.toFixed(2));

    const total = Number(Math.max(0, subtotal - discount).toFixed(2));

    return {
        valid: true,
        coupon,
        subtotal,
        eligible_subtotal: eligibleSubtotal,
        discount,
        total,
    };
}

async function redeemCouponForOrder(orderId) {
    try {
        if (typeof orderId !== 'string' || !orderId.trim()) return;
        const { data: orderRow, error: orderErr } = await supabase
            .from('orders')
            .select('id,user_id,coupon_id,coupon_code,coupon_redeemed_at')
            .eq('id', orderId)
            .single();
        if (orderErr || !orderRow) return;

        if (!orderRow.coupon_id || !orderRow.coupon_code) return;
        if (orderRow.coupon_redeemed_at) return;

        const nowIso = new Date().toISOString();

        const { error: insErr } = await supabase
            .from('coupon_redemptions')
            .insert({
                coupon_id: orderRow.coupon_id,
                coupon_code: orderRow.coupon_code,
                user_id: orderRow.user_id,
                order_id: orderRow.id,
            });

        if (insErr) {
            const code = typeof insErr === 'object' && insErr && 'code' in insErr ? String(insErr.code) : '';
            if (code !== '23505') {
                console.error('Coupon redemption insert error:', insErr);
                return;
            }
        }

        await supabase
            .from('orders')
            .update({ coupon_redeemed_at: nowIso })
            .eq('id', orderId);
    } catch (e) {
        console.error('redeemCouponForOrder error:', e);
    }
}

function normalizeOrderStatus(input) {
    const allowed = new Set(['Pendente', 'Preparando', 'Em trânsito', 'Entregue', 'Cancelado']);
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    return allowed.has(trimmed) ? trimmed : null;
}

function composeOrderStatusMessage(status, orderId, trackingCode, meta = null) {
    const shortId = String(orderId || '').slice(0, 8);
    const customerName = meta && typeof meta.customerName === 'string' ? meta.customerName.split(' ')[0] : '';
    const greeting = customerName ? `Ola, ${customerName}! ` : 'Ola! ';

    if (status === 'Preparando') {
        return `✨ *Pedido confirmado com sucesso!* ✨

${greeting}Ficamos muito felizes em informar que seu pedido *#${shortId}* foi confirmado e ja entrou em processo de preparacao.

Estamos separando cada item com todo o cuidado para que chegue ate voce em perfeitas condicoes. 👶🧡

Assim que o envio for realizado, voce recebera automaticamente as informacoes de rastreamento para acompanhar cada etapa da entrega.

Agradecemos a preferencia! 💛
*DeLu Kids*`;
    }

    if (status === 'Em trânsito') {
        const code = trackingCode ? String(trackingCode).trim() : '';
        const carrierName = meta && typeof meta.carrierName === 'string' ? meta.carrierName.trim() : '';
        const carrierService = meta && typeof meta.carrierService === 'string' ? meta.carrierService.trim() : '';
        const providedUrl = meta && typeof meta.trackingUrl === 'string' ? meta.trackingUrl.trim() : '';
        const trackingUrl = providedUrl || (code ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(code)}` : null);

        if (code && trackingUrl) {
            const carrierLine = carrierName ? `📦 *Transportadora:* ${carrierName}${carrierService ? ` - ${carrierService}` : ''}` : '';
            return `🚚 *Seu pedido ja esta a caminho!*

${greeting}Seu pedido *#${shortId}* foi enviado com sucesso e ja esta com a transportadora.

${carrierLine}
🔖 *Codigo de rastreamento:* ${code}

🔗 *Acompanhe aqui:*
${trackingUrl}

Acompanhe o trajeto da sua entrega e fique de olho — em breve ela chegara ate voce! ✨

Qualquer duvida, nossa equipe esta a disposicao para ajudar. 💬🧡
*DeLu Kids*`;
        }

        return `🚚 *Seu pedido ja esta a caminho!*

${greeting}Seu pedido *#${shortId}* foi enviado com sucesso!

Estamos finalizando os detalhes do envio e em breve voce recebera o codigo de rastreamento para acompanhar a entrega.

Qualquer duvida, nossa equipe esta a disposicao para ajudar. 💬🧡
*DeLu Kids*`;
    }

    if (status === 'Entregue') {
        const reviewUrl = meta && typeof meta.reviewUrl === 'string' ? meta.reviewUrl.trim() : '';
        const reviewLine = reviewUrl
            ? `\n\n⭐ *Avalie sua compra:*\n${reviewUrl}\n\nSua opiniao e muito importante e ajuda outras familias a escolherem!`
            : '\n\n⭐ Sua opiniao e muito importante! Se puder, deixe uma avaliacao sobre sua experiencia de compra.';

        return `🎉 *Pedido entregue com sucesso!*

${greeting}Que otima noticia! Seu pedido *#${shortId}* foi entregue.

Esperamos que voce e sua familia amem cada pecinha! 👶💕

📸 Compartilhe esse momento com a gente! Adoramos ver nossos pequenos clientes usando DeLu Kids.${reviewLine}

Obrigado por escolher a *DeLu Kids*! Volte sempre! 🛍️💛`;
    }

    if (status === 'Cancelado') {
        return `📋 *Atualizacao do seu pedido*

${greeting}Informamos que seu pedido *#${shortId}* foi cancelado conforme solicitado.

Caso o pagamento ja tenha sido processado, o estorno sera realizado automaticamente em ate 7 dias uteis, de acordo com a sua forma de pagamento.

Se voce nao solicitou este cancelamento ou tem alguma duvida, por favor entre em contato com nossa equipe:

💬 Responda esta mensagem
📧 contato@delukids.com.br

Esperamos te ver novamente em breve! 🧡
*DeLu Kids*`;
    }

    return `📋 *Atualizacao do pedido #${shortId}*

${greeting}O status do seu pedido foi atualizado para: *${status}*

Acompanhe todos os detalhes na sua conta ou entre em contato conosco.

*DeLu Kids* 🧡`;
}

// Helper to fetch or create review token for an order
async function getReviewTokenForOrder(orderId) {
    try {
        // Wait a bit for the trigger to create the token (if status just changed)
        await new Promise(r => setTimeout(r, 200));

        // Try to fetch existing token
        const { data: existingToken } = await supabase
            .from('review_tokens')
            .select('token, expires_at, used_at')
            .eq('order_id', orderId)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingToken && existingToken.token) {
            return existingToken.token;
        }

        // If no valid token exists, create one manually
        const { data: newToken, error } = await supabase
            .from('review_tokens')
            .insert({ order_id: orderId })
            .select('token')
            .single();

        if (error) {
            console.warn('Failed to create review token:', error.message);
            return null;
        }

        return newToken?.token || null;
    } catch (e) {
        console.error('getReviewTokenForOrder error:', e.message);
        return null;
    }
}

// Build review URL from token
function buildReviewUrl(token) {
    if (!token) return null;
    const baseUrl = unquoteEnv(process.env.FRONTEND_URL) || 'https://loja.arxsolutions.cloud';
    return `${baseUrl}/review/${token}`;
}

async function notifyCustomerOrderStatus(orderRow, nextStatus) {
    try {
        const n8nUrl =
            unquoteEnv(process.env.N8N_ORDER_STATUS_WEBHOOK_URL) ||
            'https://n8n.arxsolutions.cloud/webhook/order-status';

        // Enrich with customer contact data
        let customerEmail = null;
        let customerPhone = orderRow.customer_phone || null;
        if (orderRow.user_id) {
            const { data: customerProfile } = await supabase
                .from('profiles')
                .select('email, phone, name')
                .eq('id', orderRow.user_id)
                .single();
            if (customerProfile) {
                customerEmail = customerProfile.email || null;
                customerPhone = customerPhone || customerProfile.phone || null;
            }
        }

        const customerPhoneRaw = customerPhone ? String(customerPhone) : null;
        const customerPhoneDigits = customerPhoneRaw ? customerPhoneRaw.replace(/\D/g, '') : null;
        const customerPhoneE164 = customerPhoneRaw ? normalizePhoneBR(customerPhoneRaw) : null;

        // Get review URL if status is Entregue
        let reviewUrl = null;
        if (nextStatus === 'Entregue') {
            const token = await getReviewTokenForOrder(orderRow.id);
            reviewUrl = buildReviewUrl(token);
        }

        const message = composeOrderStatusMessage(nextStatus, orderRow.id, orderRow.tracking_code, {
            customerName: orderRow.customer_name,
            carrierName: orderRow.carrier_name,
            carrierService: orderRow.carrier_service,
            trackingUrl: orderRow.tracking_url,
            reviewUrl,
        });

        const payload = {
            orderId: orderRow.id,
            orderShortId: String(orderRow.id).slice(0, 8),
            customerName: orderRow.customer_name,
            customerEmail,
            customerPhone: customerPhoneRaw,
            customerPhoneDigits,
            customerPhoneE164,
            status: nextStatus,
            total: Number(orderRow.total),
            carrierName: orderRow.carrier_name || null,
            carrierService: orderRow.carrier_service || null,
            trackingCode: orderRow.tracking_code || null,
            trackingUrl: orderRow.tracking_url || null,
            address: orderRow.address,
            createdAt: orderRow.created_at,
            to: customerPhoneE164 || customerPhoneDigits || customerPhoneRaw,
            message,
        };

        postJsonWithTimeout(n8nUrl, payload, 8000)
            .then(r => {
                if (!r.ok) {
                    console.warn(`N8n status webhook failed: ${r.status} ${String(r.text || '').slice(0, 220)}`);
                } else {
                    console.log(`N8n status webhook status: ${r.status}`);
                }
            })
            .catch(err => console.error('Failed to trigger N8n status webhook:', err?.message || err));
    } catch (e) {
        console.error('notifyCustomerOrderStatus error:', e);
    }
}

// Initialize Supabase Admin Client (service_role)
const supabaseUrl =
    unquoteEnv(readEnvOrFile('SUPABASE_URL')) ||
    unquoteEnv(readEnvOrFile('VITE_SUPABASE_URL')) ||
    null;

if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
}

const supabaseKey =
    unquoteEnv(readEnvOrFile('SUPABASE_SERVICE_ROLE_KEY')) ||
    unquoteEnv(readEnvOrFile('SUPABASE_SERVICE_ROLE')) ||
    null;

if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for server-side operations)');
}

const supabaseKeyRole = getJwtRole(supabaseKey);
console.log(`Supabase admin key role: ${supabaseKeyRole || 'unknown'}`);
if (supabaseKeyRole && supabaseKeyRole !== 'service_role') {
    console.warn('WARNING: Supabase admin key role is not service_role; admin DB writes may fail due to RLS.');
}

const supabaseFetchTimeoutMsRaw = unquoteEnv(readEnvOrFile('SUPABASE_FETCH_TIMEOUT_MS'));
const supabaseFetchTimeoutMs = Number(supabaseFetchTimeoutMsRaw || 12000);
const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        fetch: (url, options) => fetchWithTimeout(url, options, Number.isFinite(supabaseFetchTimeoutMs) ? supabaseFetchTimeoutMs : 12000),
    },
});

async function startServer() {
    try {
        console.log("Initializing Express...");
        const app = express();

        app.disable('x-powered-by');

        app.use((req, res, next) => {
            const id = makeRequestId();
            const start = Date.now();
            res.setHeader('x-request-id', id);
            // @ts-ignore
            req.requestId = id;

            res.on('finish', () => {
                try {
                    const isApi = typeof req.path === 'string' && req.path.startsWith('/api');
                    if (!isApi) return;
                    const ms = Date.now() - start;
                    console.log(JSON.stringify({
                        ts: new Date().toISOString(),
                        requestId: id,
                        method: req.method,
                        path: req.path,
                        status: res.statusCode,
                        ms,
                    }));
                } catch {
                    // ignore
                }
            });

            next();
        });

        app.use('/api/', (req, res, next) => {
            // Avoid hanging requests (e.g. upstream stalls)
            res.setTimeout(30000, () => {
                try {
                    if (!res.headersSent) {
                        res.status(504).json({ error: 'Timeout' });
                    }
                } catch {
                    // ignore
                }
            });
            next();
        });

        app.set('trust proxy', 1);

        const corsOrigins = parseCsvEnv(process.env.CORS_ORIGINS).map(normalizeOrigin);
        if (!corsOrigins.length) {
            console.warn('CORS_ORIGINS is empty; allowing all origins (not recommended)');
        }

        const corsBaseOptions = {
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            maxAge: 600,
        };
        app.use(
            cors((req, callback) => {
                const originRaw = req.header('Origin');
                const origin = normalizeOrigin(originRaw);

                // Allow non-browser calls (curl, server-to-server)
                if (!origin) {
                    return callback(null, { ...corsBaseOptions, origin: true });
                }

                // Allow all when not configured
                if (!corsOrigins.length) {
                    return callback(null, { ...corsBaseOptions, origin: true });
                }

                const allowed = corsOrigins.includes(origin);
                if (!allowed) {
                    try {
                        // @ts-ignore
                        const requestId = typeof req.requestId === 'string' ? req.requestId : null;
                        console.warn(JSON.stringify({
                            ts: new Date().toISOString(),
                            kind: 'cors_block',
                            requestId,
                            origin,
                            path: req.path,
                        }));
                    } catch {
                        // ignore
                    }
                }

                return callback(null, { ...corsBaseOptions, origin: allowed });
            })
        );

        const rateLimitHandler = (req, res) => {
            const requestId = String(res.getHeader('x-request-id') || '');
            // express-rate-limit attaches metadata here (when available)
            // @ts-ignore
            const resetTime = req.rateLimit && req.rateLimit.resetTime instanceof Date ? req.rateLimit.resetTime : null;
            const retryAfterSec = resetTime ? Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : null;
            if (retryAfterSec !== null) {
                res.setHeader('Retry-After', String(retryAfterSec));
            }
            try {
                console.warn(JSON.stringify({
                    ts: new Date().toISOString(),
                    kind: 'rate_limited',
                    requestId: requestId || null,
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    retryAfterSec,
                }));
            } catch {
                // ignore
            }
            return res.status(429).json({
                error: 'Rate limit exceeded',
                requestId: requestId || null,
                retryAfterSec,
            });
        };

        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 600,
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => req.method === 'OPTIONS',
            handler: rateLimitHandler,
        });
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 30,
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => req.method === 'OPTIONS',
            handler: rateLimitHandler,
        });
        const sensitiveLimiter = rateLimit({
            windowMs: 60 * 1000,
            limit: 60,
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => req.method === 'OPTIONS',
            handler: rateLimitHandler,
        });
        const webhookLimiter = rateLimit({
            windowMs: 60 * 1000,
            limit: 240,
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => req.method === 'OPTIONS',
            handler: rateLimitHandler,
        });

        app.use('/api/', apiLimiter);
        app.use('/api/auth/login', authLimiter);
        app.use('/api/process_payment', sensitiveLimiter);
        app.use('/api/check_status', sensitiveLimiter);
        app.use('/api/payments/adyen', sensitiveLimiter);
        app.use('/api/public/coupons', sensitiveLimiter);
        app.use('/api/public/campaigns', sensitiveLimiter);
        app.use('/api/public/newsletter', sensitiveLimiter);
        app.use('/api/webhook', webhookLimiter);

        app.use(express.json({ limit: '1mb' }));
        app.use(express.static(path.join(__dirname, 'dist')));

        app.get('/api/config', (req, res) => {
            res.json({ mpPublicKey: unquoteEnv(process.env.VITE_MP_PUBLIC_KEY) });
        });

        // Newsletter subscribe (proxy to n8n)
        app.post('/api/public/newsletter/subscribe', async (req, res) => {
            try {
                const emailRaw = req.body?.email;
                const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
                if (!email || !email.includes('@') || email.length > 254) {
                    return res.status(400).json({ ok: false, error: 'Invalid email' });
                }

                const n8nUrl =
                    unquoteEnv(process.env.N8N_NEWSLETTER_WEBHOOK_URL) ||
                    'https://n8n.arxsolutions.cloud/webhook/newsletter';

                const r = await postJsonWithTimeout(n8nUrl, { email }, 8000);
                if (!r.ok) {
                    console.warn(`N8n newsletter webhook failed: ${r.status} ${String(r.text || '').slice(0, 220)}`);
                }

                return res.json({ ok: true });
            } catch (error) {
                console.error('Newsletter subscribe error:', error);
                return res.status(500).json({ ok: false, error: errorToMessage(error) });
            }
        });

        // Auth proxy (fixes browsers that can't reach Supabase directly)
        app.post('/api/auth/login', async (req, res) => {
            try {
                const requestId = String(res.getHeader('x-request-id') || '');
                const startedAt = Date.now();
                const email = req.body?.email;
                const password = req.body?.password;

                if (typeof email !== 'string' || !email.trim()) {
                    return res.status(400).json({ error: 'Email required' });
                }
                if (typeof password !== 'string' || !password) {
                    return res.status(400).json({ error: 'Password required' });
                }

                const publicUrlRaw =
                    unquoteEnv(readEnvOrFile('VITE_SUPABASE_URL')) ||
                    unquoteEnv(readEnvOrFile('SUPABASE_URL')) ||
                    'https://supabase.arxsolutions.cloud';
                const publicUrl = String(publicUrlRaw || '').trim().replace(/\/+$/, '');

                const anonKey = unquoteEnv(readEnvOrFile('VITE_SUPABASE_ANON_KEY'));
                if (!anonKey) {
                    return res.status(500).json({ error: 'Missing Supabase anon key' });
                }

                const url = `${publicUrl}/auth/v1/token?grant_type=password`;

                const upstreamAbort = new AbortController();
                res.on('close', () => {
                    try {
                        upstreamAbort.abort('client_disconnected');
                    } catch {
                        // ignore
                    }
                });

                const mpRes = await fetchWithTimeout(
                    url,
                    {
                        method: 'POST',
                        headers: {
                            apikey: anonKey,
                            Authorization: `Bearer ${anonKey}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password }),
                        signal: upstreamAbort.signal,
                    },
                    12000
                );

                const text = await mpRes.text();

                const parsed = safeJsonParse(text);
                const data = parsed !== null ? parsed : { raw: text };

                const ms = Date.now() - startedAt;
                try {
                    const emailStr = String(email || '').trim().toLowerCase();
                    const emailDomain = emailStr.includes('@') ? emailStr.split('@').slice(-1)[0] : null;
                    console.log(JSON.stringify({
                        ts: new Date().toISOString(),
                        requestId: requestId || null,
                        kind: 'auth_login_proxy',
                        upstreamStatus: mpRes.status,
                        ms,
                        emailDomain,
                    }));
                } catch {
                    // ignore
                }

                return res.status(mpRes.status).json(data);
            } catch (error) {
                const message = errorToMessage(error);
                if (message.toLowerCase().includes('client_disconnected')) {
                    // Client closed the connection; nothing to return.
                    return;
                }
                // AbortError -> timeout
                if (message.toLowerCase().includes('aborted')) {
                    return res.status(504).json({ error: 'Timeout' });
                }
                console.error('Auth proxy error:', error);
                return res.status(500).json({ error: message });
            }
        });

        // Adyen - create session (Drop-in)
        app.post('/api/payments/adyen/session', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const merchantAccount = unquoteEnv(process.env.ADYEN_MERCHANT_ACCOUNT);
                const clientKey = unquoteEnv(process.env.VITE_ADYEN_CLIENT_KEY) || unquoteEnv(process.env.ADYEN_CLIENT_KEY);
                if (!merchantAccount || !clientKey) {
                    return res.status(500).json({ error: 'Adyen nao configurado: defina ADYEN_API_KEY, ADYEN_MERCHANT_ACCOUNT e VITE_ADYEN_CLIENT_KEY.' });
                }

                const { orderId, amount, returnUrl } = req.body || {};
                if (!orderId || typeof orderId !== 'string') {
                    return res.status(400).json({ error: 'orderId obrigatorio' });
                }
                const numericAmount = Number(amount);
                if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                    return res.status(400).json({ error: 'amount invalido' });
                }

                const checkout = getAdyenCheckout();
                const baseUrl = unquoteEnv(process.env.PUBLIC_BASE_URL) || 'http://localhost:5173';

                const sessionRequest = {
                    amount: { currency: 'BRL', value: Math.round(numericAmount * 100) },
                    merchantAccount,
                    reference: orderId,
                    returnUrl: returnUrl || `${baseUrl}/account`,
                    countryCode: 'BR',
                    channel: 'Web',
                    shopperEmail: user?.email || undefined,
                };

                const sessionResponse = await checkout.PaymentsApi.sessions(sessionRequest);
                return res.json(sessionResponse);
            } catch (error) {
                console.error('Adyen session error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 1. Process Payment (Brick)
        app.get('/api/process_payment', (req, res) => {
            return res.status(405).json({ error: 'Method not allowed. Use POST.' });
        });
        app.post('/api/process_payment', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const { formData, payerEmail, orderId, payerCpf } = req.body || {};
                if (typeof orderId !== 'string' || !orderId.trim()) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                const { data: orderRow, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,subtotal,discount,coupon_code,total,status,created_at,address')
                    .eq('id', orderId)
                    .single();

                if (orderErr || !orderRow) {
                    return res.status(404).json({ error: 'Order not found' });
                }

                const can = orderRow.user_id === user.id || (await isAdminUser(user.id, user.email));
                if (!can) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                if (orderRow.status && String(orderRow.status) !== 'Pendente') {
                    return res.status(400).json({ error: 'Order is not pending' });
                }

                const accessToken = requireEnv('MERCADO_PAGO_ACCESS_TOKEN');

                const client = new MercadoPagoConfig({ accessToken });
                const payment = new Payment(client);

                const orderTotal = Number(orderRow.total);
                if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
                    return res.status(400).json({ error: 'Invalid order total' });
                }

                const effectivePayerEmail = typeof payerEmail === 'string' && payerEmail.trim() ? payerEmail.trim() : (user.email || '');
                const paymentData = normalizeMpPaymentBody(formData, effectivePayerEmail, orderId);
                paymentData.external_reference = orderId;
                paymentData.transaction_amount = orderTotal;

                // Enrich PIX payer data with CPF when available (can reduce risk/policy blocks)
                try {
                    let cpfDigits = null;
                    const cpfFromRequest = typeof payerCpf === 'string' ? normalizeCpfBR(payerCpf) : null;
                    if (cpfFromRequest) {
                        cpfDigits = cpfFromRequest;
                    } else {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('cpf,name')
                            .eq('id', user.id)
                            .single();
                        const cpfFromProfile = profile && typeof profile.cpf === 'string' ? normalizeCpfBR(profile.cpf) : null;
                        if (cpfFromProfile) cpfDigits = cpfFromProfile;

                        // Also add name split when possible (optional)
                        if (profile && typeof profile.name === 'string' && profile.name.trim()) {
                            const parts = profile.name.trim().split(/\s+/).filter(Boolean);
                            const first = parts[0] || null;
                            const last = parts.length > 1 ? parts.slice(1).join(' ') : null;
                            if (first) {
                                paymentData.payer = (paymentData.payer && typeof paymentData.payer === 'object') ? paymentData.payer : {};
                                if (!paymentData.payer.first_name) paymentData.payer.first_name = first;
                                if (last && !paymentData.payer.last_name) paymentData.payer.last_name = last;
                            }
                        }
                    }

                    if (cpfDigits) {
                        paymentData.payer = (paymentData.payer && typeof paymentData.payer === 'object') ? paymentData.payer : {};
                        const existing = paymentData.payer.identification && typeof paymentData.payer.identification === 'object'
                            ? paymentData.payer.identification
                            : null;
                        const existingNumber = existing && typeof existing.number === 'string' ? normalizeCpfBR(existing.number) : null;
                        if (!existing || !existingNumber) {
                            paymentData.payer.identification = { type: 'CPF', number: cpfDigits };
                        }
                    }
                } catch (e) {
                    console.warn('CPF enrichment failed (continuing):', e?.message || e);
                }

                // Debug (no PII): confirm enrichment & key fields
                try {
                    // @ts-ignore
                    const requestId = typeof req.requestId === 'string' ? req.requestId : String(res.getHeader('x-request-id') || '');
                    const payerEmail = paymentData?.payer?.email ? String(paymentData.payer.email) : '';
                    const payerEmailDomain = payerEmail.includes('@') ? payerEmail.split('@').slice(-1)[0] : null;
                    const cpfNow = paymentData?.payer?.identification?.number ? String(paymentData.payer.identification.number) : null;
                    const cpfNowDigits = cpfNow ? normalizeCpfBR(cpfNow) : null;
                    console.log(JSON.stringify({
                        ts: new Date().toISOString(),
                        kind: 'mp_payment_payload',
                        requestId: requestId || null,
                        orderShortId: String(orderId).slice(0, 8),
                        amount: orderTotal,
                        paymentMethodId: paymentData?.payment_method_id || null,
                        payerEmailDomain,
                        payerHasCpf: !!cpfNowDigits,
                        cpfLast2: cpfNowDigits ? cpfNowDigits.slice(-2) : null,
                        payerHasName: !!(paymentData?.payer?.first_name || paymentData?.payer?.last_name),
                    }));
                } catch {
                    // ignore
                }

                // Log only keys to avoid leaking sensitive fields (token, etc.)
                try {
                    const topKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
                    const fdKeys = formData && typeof formData === 'object' ? Object.keys(formData) : [];
                    console.log('Process payment payload keys:', { topKeys, formDataKeys: fdKeys });
                } catch {
                    // ignore
                }

                const response = await payment.create({ body: paymentData });
                console.log("Payment created:", response.id, response.status);

                // TRIGGER N8N WEBHOOK FOR NEW ORDER
                try {
                    const n8nUrl = unquoteEnv(process.env.N8N_NEW_ORDER_WEBHOOK_URL) || "https://n8n.arxsolutions.cloud/webhook/new-order";
                    const webhookPayload = {
                        orderId: orderId,
                        orderShortId: String(orderId).slice(0, 8),
                        paymentId: response.id,
                        status: response.status,
                        amount: paymentData.transaction_amount,
                        total: Number(orderRow.total),
                        subtotal: orderRow.subtotal !== undefined && orderRow.subtotal !== null ? Number(orderRow.subtotal) : null,
                        discount: orderRow.discount !== undefined && orderRow.discount !== null ? Number(orderRow.discount) : null,
                        couponCode: typeof orderRow.coupon_code === 'string' ? orderRow.coupon_code : null,
                        customerName: orderRow.customer_name,
                        customerPhone: orderRow.customer_phone || null,
                        address: orderRow.address,
                        createdAt: orderRow.created_at,
                        payerEmail: paymentData?.payer?.email || null,
                        items: paymentData.additional_info?.items || [],
                    };

                    postJsonWithTimeout(n8nUrl, webhookPayload, 8000)
                        .then(r => {
                            if (!r.ok) {
                                console.warn(`N8n new-order webhook failed: ${r.status} ${String(r.text || '').slice(0, 220)}`);
                            } else {
                                console.log(`N8n new-order webhook status: ${r.status}`);
                            }
                        })
                        .catch(err => {
                            console.error("Failed to trigger N8n webhook:", err?.message || err);
                        });

                } catch (webhookError) {
                    console.error("Error triggering N8n webhook:", webhookError);
                }

                res.json({
                    id: response.id,
                    status: response.status,
                    qr_code: response.point_of_interaction?.transaction_data?.qr_code,
                    qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64
                });
            } catch (error) {
                console.error('Payment Error:', error);
                const message = errorToMessage(error);

                const parsed = safeJsonParse(message);
                if (parsed && typeof parsed === 'object') {
                    const status = Number(parsed.status);
                    const code = typeof parsed.code === 'string' ? parsed.code : null;
                    if (status === 403 && code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
                        const friendly = 'Pagamento bloqueado pelo Mercado Pago (politica/risco). Tente outro metodo, um valor maior, ou confira se as credenciais (public key + access token) estao no mesmo ambiente/conta.';
                        return res.status(403).json({
                            error: friendly,
                            details: {
                                code,
                                status,
                                blocked_by: parsed.blocked_by || null,
                                raw: parsed.message || null,
                            }
                        });
                    }
                }

                return res.status(500).json({ error: message });
            }
        });

        // Orders: create (server-calculated totals + coupon enforcement)
        app.post('/api/orders/create', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const body = req.body || {};
                const customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
                const customerPhone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : null;
                const address = typeof body.address === 'string' ? body.address.trim() : '';
                const paymentMethod = typeof body.payment_method === 'string' ? body.payment_method.trim() : 'A Combinar';
                const couponCode = typeof body.coupon_code === 'string' ? body.coupon_code.trim() : '';

                const items = Array.isArray(body.items) ? body.items : [];
                if (!customerName) return res.status(400).json({ error: 'Customer name required' });
                if (!address) return res.status(400).json({ error: 'Address required' });
                if (!items.length) return res.status(400).json({ error: 'Items required' });

                const productIds = Array.from(
                    new Set(
                        items
                            .map(i => Number(i?.productId ?? i?.id))
                            .filter(v => Number.isFinite(v))
                    )
                );
                if (!productIds.length) return res.status(400).json({ error: 'Invalid items' });

                const { data: products, error: prodErr } = await supabase
                    .from('products')
                    .select('id,name,price,image,category')
                    .in('id', productIds);
                if (prodErr) throw prodErr;
                const productsById = new Map((products || []).map(p => [Number(p.id), p]));

                const normalizedItems = [];
                let subtotal = 0;
                for (const it of items) {
                    const pid = Number(it?.productId ?? it?.id);
                    const qty = Number(it?.quantity);
                    const size = typeof it?.size === 'string' ? it.size : (typeof it?.selectedSize === 'string' ? it.selectedSize : null);
                    const color = typeof it?.color === 'string' ? it.color : (typeof it?.selectedColor === 'string' ? it.selectedColor : null);
                    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) continue;
                    const product = productsById.get(pid);
                    if (!product) continue;
                    const unitPrice = Number(product.price);
                    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
                    const lineTotal = unitPrice * qty;
                    subtotal += lineTotal;
                    normalizedItems.push({
                        productId: pid,
                        quantity: qty,
                        size,
                        color,
                        product_name: product.name,
                        price: unitPrice,
                        image: product.image,
                    });
                }

                subtotal = Number(subtotal.toFixed(2));
                if (subtotal <= 0 || !normalizedItems.length) {
                    return res.status(400).json({ error: 'Invalid items' });
                }

                let discount = 0;
                let couponId = null;
                let appliedCouponCode = null;
                if (couponCode) {
                    const q = await quoteCoupon({
                        code: couponCode,
                        items: normalizedItems,
                        userId: user.id,
                    });
                    if (!q.valid) {
                        return res.status(400).json({ error: q.error || 'Invalid coupon' });
                    }
                    discount = q.discount;
                    couponId = q.coupon.id;
                    appliedCouponCode = q.coupon.code;
                }

                const total = Number(Math.max(0, subtotal - discount).toFixed(2));

                const orderInsert = {
                    user_id: user.id,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    address,
                    payment_method: paymentMethod,
                    subtotal,
                    discount,
                    total,
                    coupon_code: appliedCouponCode,
                    coupon_id: couponId,
                    status: 'Pendente',
                };

                const { data: orderRow, error: orderErr } = await supabase
                    .from('orders')
                    .insert(orderInsert)
                    .select('id,subtotal,discount,total,coupon_code')
                    .single();

                if (orderErr) {
                    if (isMissingColumnError(orderErr, 'subtotal') || isMissingColumnError(orderErr, 'coupon_code')) {
                        return res.status(500).json({ error: 'Orders schema outdated. Run supabase_orders_coupons.sql.' });
                    }
                    throw orderErr;
                }

                const itemsToInsert = normalizedItems.map(it => ({
                    order_id: orderRow.id,
                    product_name: it.product_name,
                    quantity: it.quantity,
                    size: it.size,
                    color: it.color,
                    price: it.price,
                    image: it.image,
                }));

                let itemsErr = null;
                const ins1 = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);
                if (ins1?.error) {
                    if (isMissingColumnError(ins1.error, 'color')) {
                        const fallbackItems = itemsToInsert.map(({ color: _c, ...rest }) => rest);
                        const ins2 = await supabase
                            .from('order_items')
                            .insert(fallbackItems);
                        if (ins2?.error) itemsErr = ins2.error;
                    } else {
                        itemsErr = ins1.error;
                    }
                }
                if (itemsErr) throw itemsErr;

                return res.json({
                    orderId: orderRow.id,
                    subtotal: Number(orderRow.subtotal),
                    discount: Number(orderRow.discount),
                    total: Number(orderRow.total),
                    couponCode: orderRow.coupon_code || null,
                });
            } catch (error) {
                console.error('Create order error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        const mapOrdersWithItems = async (orders) => {
            const safeOrders = Array.isArray(orders) ? orders : [];
            const orderIds = safeOrders.map(o => o.id).filter(Boolean);

            let items = [];
            if (orderIds.length) {
                try {
                    const { data, error } = await supabase
                        .from('order_items')
                        .select('id,order_id,product_name,quantity,size,color,price,image')
                        .in('order_id', orderIds);
                    if (error) {
                        if (isMissingColumnError(error, 'color')) {
                            const { data: data2, error: error2 } = await supabase
                                .from('order_items')
                                .select('id,order_id,product_name,quantity,size,price,image')
                                .in('order_id', orderIds);
                            if (!error2) items = data2 || [];
                        } else {
                            console.error('Order items fetch error:', error);
                        }
                    } else {
                        items = data || [];
                    }
                } catch (e) {
                    console.error('Order items fetch exception:', e);
                }
            }

            const itemsByOrder = new Map();
            for (const it of items) {
                const oid = it.order_id;
                if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
                itemsByOrder.get(oid).push(it);
            }

            return safeOrders.map(o => ({
                id: o.id,
                customer: o.customer_name,
                customerPhone: o.customer_phone ?? undefined,
                subtotal: o.subtotal !== undefined && o.subtotal !== null ? Number(o.subtotal) : undefined,
                discount: o.discount !== undefined && o.discount !== null ? Number(o.discount) : undefined,
                couponCode: typeof o.coupon_code === 'string' ? o.coupon_code : undefined,
                total: Number(o.total),
                status: o.status,
                date: o.created_at,
                paymentMethod: o.payment_method,
                address: o.address,
                trackingCode: o.tracking_code ?? undefined,
                trackingUrl: o.tracking_url ?? undefined,
                carrierName: o.carrier_name ?? undefined,
                carrierService: o.carrier_service ?? undefined,
                shippedAt: o.shipped_at ?? undefined,
                userId: o.user_id,
                items: (itemsByOrder.get(o.id) || []).map(it => ({
                    id: Number(it.id),
                    name: it.product_name,
                    quantity: Number(it.quantity),
                    size: it.size || '',
                    color: it.color || undefined,
                    price: Number(it.price),
                    image: it.image,
                })),
            }));
        };

        app.get('/api/orders/my', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,subtotal,discount,coupon_code,total,status,created_at,payment_method,address,tracking_code,tracking_url,carrier_name,carrier_service,shipped_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) throw error;

                const mapped = await mapOrdersWithItems(orders || []);
                return res.json({ orders: mapped });
            } catch (error) {
                console.error('My orders error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.get('/api/admin/orders', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,subtotal,discount,coupon_code,total,status,created_at,payment_method,address,tracking_code,tracking_url,carrier_name,carrier_service,shipped_at')
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (error) throw error;

                const mapped = await mapOrdersWithItems(orders || []);
                return res.json({ orders: mapped });
            } catch (error) {
                console.error('Admin orders error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 2. Webhook Handler
        app.post(['/api/webhook', '/api/webhook/:secret'], async (req, res) => {
            try {
                // Validate shared secret (configured in Mercado Pago notification_url)
                const expectedSecret = requireEnv('MP_WEBHOOK_SECRET');
                const providedSecret =
                    (typeof req.params?.secret === 'string' ? req.params.secret : '') ||
                    (typeof req.query?.secret === 'string' ? req.query.secret : '');
                if (!providedSecret || providedSecret !== expectedSecret) {
                    return res.sendStatus(401);
                }

                const { type, data } = req.body;

                // Only process payment notifications
                if (type === 'payment' || req.query.topic === 'payment') {
                    const paymentId = data?.id || req.query.id;

                    if (!paymentId) return res.sendStatus(200);

                    console.log(`Webhook: Checking payment ${paymentId}...`);

                    // 1. Fetch Payment Status from MP
                    const accessToken = requireEnv('MERCADO_PAGO_ACCESS_TOKEN');
                    const client = new MercadoPagoConfig({ accessToken });
                    const payment = new Payment(client);
                    const paymentInfo = await payment.get({ id: paymentId });

                    const { status, external_reference } = paymentInfo;
                    console.log(`Payment ${paymentId} is ${status} for Order ${external_reference}`);

                    // 2. Map MP Status to our Status
                    let newStatus = null;
                    if (status === 'approved') newStatus = 'Preparando';
                    if (status === 'rejected' || status === 'cancelled') newStatus = 'Cancelado';

                    // 3. Update Supabase
                    if (newStatus && external_reference) {
                        const { data: orderRow, error: orderErr } = await supabase
                            .from('orders')
                            .select('id,user_id,customer_name,customer_phone,total,status,created_at,address,tracking_code,tracking_url,carrier_name,carrier_service')
                            .eq('id', external_reference)
                            .single();

                        if (orderErr || !orderRow) {
                            console.error('Order fetch error (webhook):', orderErr);
                        } else if (orderRow.status !== newStatus) {
                            const { error } = await supabase
                                .from('orders')
                                .update({ status: newStatus })
                                .eq('id', external_reference);

                            if (error) {
                                console.error("Supabase Update Error:", error);
                            } else {
                                console.log(`Order ${external_reference} updated to ${newStatus}`);
                                notifyCustomerOrderStatus({ ...orderRow, status: newStatus }, newStatus);
                                if (newStatus === 'Preparando') {
                                    redeemCouponForOrder(external_reference);
                                }
                            }
                        }
                    }
                }

                res.sendStatus(200);
            } catch (error) {
                console.error("Webhook Error:", error);
                res.sendStatus(500);
            }
        });

        // 3. Manual Payment Status Check
        app.post('/api/check_status', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const { orderId, paymentId } = req.body || {};
                if (typeof orderId !== 'string' || !orderId.trim()) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                console.log(`Checking status for order ${orderId}...`);

                const accessToken = requireEnv('MERCADO_PAGO_ACCESS_TOKEN');

                const client = new MercadoPagoConfig({ accessToken });
                const payment = new Payment(client);

                // Load order total to prevent tampering / mismatched amounts
                const { data: orderRow, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,total,status,created_at,address,tracking_code,tracking_url,carrier_name,carrier_service')
                    .eq('id', orderId)
                    .single();

                if (orderErr || !orderRow) {
                    console.error('Order fetch error:', orderErr);
                    return res.status(404).json({ error: 'Order not found' });
                }

                const can = orderRow.user_id === user.id || (await isAdminUser(user.id, user.email));
                if (!can) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                const orderTotal = Number(orderRow.total);

                let paymentInfo = null;

                // Prefer checking the specific payment id created for this order
                if (paymentId) {
                    paymentInfo = await payment.get({ id: paymentId });
                    if (paymentInfo?.external_reference && paymentInfo.external_reference !== orderId) {
                        return res.status(400).json({ error: 'Payment does not match order', payment_status: paymentInfo.status });
                    }
                } else {
                    // Fallback: search payment(s) for this order
                    const searchResult = await payment.search({
                        options: {
                            external_reference: orderId,
                            limit: 1
                        }
                    });
                    paymentInfo = searchResult.results && searchResult.results.length > 0 ? searchResult.results[0] : null;
                }

                if (paymentInfo) {
                    console.log(`Found payment ${paymentInfo.id} with status ${paymentInfo.status}`);

                    // Validate amount when available
                    const paidAmount = Number(paymentInfo.transaction_amount ?? NaN);
                    if (Number.isFinite(orderTotal) && Number.isFinite(paidAmount)) {
                        const diff = Math.abs(orderTotal - paidAmount);
                        if (diff > 0.01) {
                            return res.status(400).json({ error: 'Payment amount mismatch', payment_status: paymentInfo.status });
                        }
                    }

                    let newStatus = null;
                    if (paymentInfo.status === 'approved') newStatus = 'Preparando';
                    if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') newStatus = 'Cancelado';

                    if (newStatus) {
                        const { error } = await supabase
                            .from('orders')
                            .update({ status: newStatus })
                            .eq('id', orderId);

                        if (error) {
                            console.error("Supabase Update Error:", error);
                        } else {
                            console.log(`Order ${orderId} updated to ${newStatus}`);
                            notifyCustomerOrderStatus({ ...orderRow, status: newStatus }, newStatus);
                            if (newStatus === 'Preparando') {
                                redeemCouponForOrder(orderId);
                            }
                        }

                        return res.json({ status: newStatus, payment_status: paymentInfo.status });
                    }

                    // Pending/in_process/etc
                    return res.json({ status: 'Pendente', payment_status: paymentInfo.status });
                }

                console.log(`No payment found for order ${orderId}`);
                res.json({ status: 'Pendente', payment_status: 'not_found' });

            } catch (error) {
                console.error("Check Status Error:", error);
                res.status(500).json({ error: error.message });
            }

        });

        // 4. Admin: set tracking code + notify via n8n
        app.post('/api/admin/ship_order', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const { orderId, trackingCode, status } = req.body || {};
                if (typeof orderId !== 'string' || !orderId.trim()) {
                    return res.status(400).json({ error: 'Order ID required' });
                }
                if (typeof trackingCode !== 'string' || !trackingCode.trim()) {
                    return res.status(400).json({ error: 'Tracking code required' });
                }

                // For now, enforce that shipping implies "Em trânsito"
                const nextStatus = status === 'Em trânsito' ? 'Em trânsito' : 'Em trânsito';

                const { data: orderRow, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,total,status,created_at,address,tracking_code,tracking_url,carrier_name,carrier_service')
                    .eq('id', orderId)
                    .single();

                if (orderErr || !orderRow) {
                    console.error('Order fetch error:', orderErr);
                    return res.status(404).json({ error: 'Order not found' });
                }

                const carrierNameRaw = req.body?.carrierName;
                const carrierServiceRaw = req.body?.carrierService;
                const trackingUrlRaw = req.body?.trackingUrl;

                const carrierName = typeof carrierNameRaw === 'string' ? carrierNameRaw.trim().slice(0, 80) : '';
                const carrierService = typeof carrierServiceRaw === 'string' ? carrierServiceRaw.trim().slice(0, 80) : '';
                const trackingUrlProvided = typeof trackingUrlRaw === 'string' ? trackingUrlRaw.trim().slice(0, 400) : '';
                const trackingUrl = trackingUrlProvided || `https://www.linkcorreios.com.br/?id=${encodeURIComponent(trackingCode.trim())}`;

                const { error: updateErr } = await supabase
                    .from('orders')
                    .update({
                        status: nextStatus,
                        tracking_code: trackingCode.trim(),
                        tracking_url: trackingUrl,
                        carrier_name: carrierName || null,
                        carrier_service: carrierService || null,
                        shipped_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);

                if (updateErr) {
                    console.error('Order update error:', updateErr);
                    return res.status(500).json({ error: 'Failed to update order' });
                }

                // Enrich with customer contact data
                let customerEmail = null;
                let customerPhone = orderRow.customer_phone || null;
                if (orderRow.user_id) {
                    const { data: customerProfile } = await supabase
                        .from('profiles')
                        .select('email, phone, name')
                        .eq('id', orderRow.user_id)
                        .single();
                    if (customerProfile) {
                        customerEmail = customerProfile.email || null;
                        customerPhone = customerPhone || customerProfile.phone || null;
                    }
                }

                const customerPhoneRaw = customerPhone ? String(customerPhone) : null;
                const customerPhoneDigits = customerPhoneRaw ? customerPhoneRaw.replace(/\D/g, '') : null;
                const customerPhoneE164 = customerPhoneRaw ? normalizePhoneBR(customerPhoneRaw) : null;

                const n8nUrl = unquoteEnv(process.env.N8N_TRACKING_WEBHOOK_URL) || 'https://n8n.arxsolutions.cloud/webhook/tracking-code';
                const customerMessage = composeOrderStatusMessage('Em trânsito', orderRow.id, trackingCode.trim(), {
                    customerName: orderRow.customer_name,
                    carrierName,
                    carrierService,
                    trackingUrl,
                });
                const payload = {
                    orderId: orderRow.id,
                    orderShortId: String(orderRow.id).slice(0, 8),
                    customerName: orderRow.customer_name,
                    customerEmail,
                    customerPhone: customerPhoneRaw,
                    customerPhoneDigits,
                    customerPhoneE164,
                    trackingCode: trackingCode.trim(),
                    trackingUrl,
                    carrierName: carrierName || null,
                    carrierService: carrierService || null,
                    status: nextStatus,
                    total: Number(orderRow.total),
                    address: orderRow.address,
                    createdAt: orderRow.created_at,
                    to: customerPhoneE164 || customerPhoneDigits || customerPhoneRaw,
                    message: customerMessage,
                };

                // Fire-and-forget: don't block admin UI on external integrations
                postJsonWithTimeout(n8nUrl, payload, 8000)
                    .then(r => {
                        if (!r.ok) {
                            console.warn(`N8n tracking webhook failed: ${r.status} ${String(r.text || '').slice(0, 220)}`);
                        } else {
                            console.log(`N8n tracking webhook status: ${r.status}`);
                        }
                    })
                    .catch(err => {
                        console.error('Failed to trigger N8n tracking webhook:', err?.message || err);
                    });

                return res.json({ ok: true });
            } catch (error) {
                console.error('Ship order error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4a. Admin: update order status (and notify customer)
        app.post('/api/admin/update_order_status', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const { orderId, status } = req.body || {};
                if (typeof orderId !== 'string' || !orderId.trim()) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                const nextStatus = normalizeOrderStatus(status);
                if (!nextStatus) {
                    return res.status(400).json({ error: 'Invalid status' });
                }

                // For shipping, use /api/admin/ship_order to set tracking code
                if (nextStatus === 'Em trânsito') {
                    return res.status(400).json({ error: 'Use ship_order to set tracking code' });
                }

                const { data: orderRow, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_phone,total,status,created_at,address,tracking_code,tracking_url,carrier_name,carrier_service')
                    .eq('id', orderId)
                    .single();

                if (orderErr || !orderRow) {
                    console.error('Order fetch error:', orderErr);
                    return res.status(404).json({ error: 'Order not found' });
                }

                const { error: updateErr } = await supabase
                    .from('orders')
                    .update({ status: nextStatus })
                    .eq('id', orderId);

                if (updateErr) {
                    console.error('Order update error:', updateErr);
                    return res.status(500).json({ error: 'Failed to update order' });
                }

                // Enrich with customer contact data
                let customerEmail = null;
                let customerPhone = orderRow.customer_phone || null;
                if (orderRow.user_id) {
                    const { data: customerProfile } = await supabase
                        .from('profiles')
                        .select('email, phone, name')
                        .eq('id', orderRow.user_id)
                        .single();
                    if (customerProfile) {
                        customerEmail = customerProfile.email || null;
                        customerPhone = customerPhone || customerProfile.phone || null;
                    }
                }

                const customerPhoneRaw = customerPhone ? String(customerPhone) : null;
                const customerPhoneDigits = customerPhoneRaw ? customerPhoneRaw.replace(/\D/g, '') : null;
                const customerPhoneE164 = customerPhoneRaw ? normalizePhoneBR(customerPhoneRaw) : null;

                // Get review URL if status is Entregue
                let reviewUrl = null;
                if (nextStatus === 'Entregue') {
                    const token = await getReviewTokenForOrder(orderRow.id);
                    reviewUrl = buildReviewUrl(token);
                }

                const message = composeOrderStatusMessage(nextStatus, orderRow.id, orderRow.tracking_code, {
                    customerName: orderRow.customer_name,
                    carrierName: orderRow.carrier_name,
                    carrierService: orderRow.carrier_service,
                    trackingUrl: orderRow.tracking_url,
                    reviewUrl,
                });
                const n8nUrl =
                    unquoteEnv(process.env.N8N_ORDER_STATUS_WEBHOOK_URL) ||
                    'https://n8n.arxsolutions.cloud/webhook/order-status';

                const payload = {
                    orderId: orderRow.id,
                    orderShortId: String(orderRow.id).slice(0, 8),
                    customerName: orderRow.customer_name,
                    customerEmail,
                    customerPhone: customerPhoneRaw,
                    customerPhoneDigits,
                    customerPhoneE164,
                    status: nextStatus,
                    total: Number(orderRow.total),
                    carrierName: orderRow.carrier_name || null,
                    carrierService: orderRow.carrier_service || null,
                    trackingCode: orderRow.tracking_code || null,
                    trackingUrl: orderRow.tracking_url || null,
                    address: orderRow.address,
                    createdAt: orderRow.created_at,
                    to: customerPhoneE164 || customerPhoneDigits || customerPhoneRaw,
                    message,
                };

                // Fire-and-forget: don't block admin UI on external integrations
                postJsonWithTimeout(n8nUrl, payload, 8000)
                    .then(r => {
                        if (!r.ok) {
                            console.warn(`N8n status webhook failed: ${r.status} ${String(r.text || '').slice(0, 220)}`);
                        } else {
                            console.log(`N8n status webhook status: ${r.status}`);
                        }
                    })
                    .catch(err => console.error('Failed to trigger N8n status webhook:', err?.message || err));

                return res.json({ ok: true });
            } catch (error) {
                console.error('Update order status error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4b. Admin check (frontend guard)
        app.get('/api/admin/me', async (req, res) => {
            try {
                const authHeader = req.headers?.authorization;
                if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Missing Authorization header' });
                }
                const token = authHeader.slice('Bearer '.length).trim();
                const { data, error } = await supabase.auth.getUser(token);
                if (error || !data?.user) {
                    return res.status(401).json({ error: 'Invalid session' });
                }

                const ok = await isAdminUser(data.user.id, data.user.email);
                return res.json({ isAdmin: ok, email: data.user.email, userId: data.user.id });
            } catch (error) {
                console.error('Admin me error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4bb. Admin: seed products (demo catalog)
        app.post('/api/admin/products/seed', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const countRaw = req.body?.count;
                const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 72;
                const desired = buildSeedProducts(Math.max(1, Math.min(240, count)));
                const names = desired.map(p => p.name);

                // Find existing by name (safe default: do not delete)
                const existingNames = new Set();
                const chunkSize = 80;
                for (let i = 0; i < names.length; i += chunkSize) {
                    const chunk = names.slice(i, i + chunkSize);
                    const { data, error } = await supabase
                        .from('products')
                        .select('id,name')
                        .in('name', chunk);
                    if (error) throw error;
                    for (const row of data || []) {
                        if (row?.name) existingNames.add(String(row.name));
                    }
                }

                const toInsert = desired.filter(p => !existingNames.has(p.name));
                if (!toInsert.length) {
                    return res.json({ ok: true, inserted: 0, skipped: desired.length, total: desired.length });
                }

                // Insert in batches
                let inserted = 0;
                const insertBatchSize = 50;
                for (let i = 0; i < toInsert.length; i += insertBatchSize) {
                    const batch = toInsert.slice(i, i + insertBatchSize);
                    const { error } = await supabase
                        .from('products')
                        .insert(batch);
                    if (error) throw error;
                    inserted += batch.length;
                }

                return res.json({ ok: true, inserted, skipped: desired.length - inserted, total: desired.length });
            } catch (error) {
                console.error('Admin seed products error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4c. Admin: campaigns CRUD
        app.get('/api/admin/campaigns', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const { data, error } = await supabase
                    .from('campaigns')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) {
                    if (isMissingTableError(error, 'campaigns')) {
                        return res.status(500).json({
                            error: 'Campaigns table missing. Run supabase_campaigns.sql in Supabase SQL Editor.',
                            supabase: formatSupabaseError(error),
                        });
                    }
                    throw error;
                }
                return res.json(data || []);
            } catch (error) {
                console.error('Admin campaigns fetch error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.post('/api/admin/campaigns', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const body = req.body || {};
                if (typeof body.title !== 'string' || !body.title.trim()) {
                    return res.status(400).json({ error: 'Title required' });
                }
                if (typeof body.message !== 'string' || !body.message.trim()) {
                    return res.status(400).json({ error: 'Message required' });
                }

                const payload = {
                    title: body.title.trim(),
                    message: body.message.trim(),
                    image_url: typeof body.image_url === 'string' ? (body.image_url.trim() || null) : null,
                    badge: typeof body.badge === 'string' ? (body.badge.trim() || null) : null,
                    cta_text: typeof body.cta_text === 'string' ? (body.cta_text.trim() || null) : null,
                    cta_url: typeof body.cta_url === 'string' ? (body.cta_url.trim() || null) : null,
                    show_on_home: body.show_on_home !== false,
                    show_once: body.show_once !== false,
                    priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
                    starts_at: body.starts_at || new Date().toISOString(),
                    ends_at: body.ends_at || null,
                    active: body.active !== false,
                };

                const { data, error } = await supabase
                    .from('campaigns')
                    .insert(payload)
                    .select('*')
                    .single();
                if (error) {
                    if (isMissingTableError(error, 'campaigns')) {
                        return res.status(500).json({
                            error: 'Campaigns table missing. Run supabase_campaigns.sql in Supabase SQL Editor.',
                            supabase: formatSupabaseError(error),
                        });
                    }
                    throw error;
                }
                return res.json(data);
            } catch (error) {
                console.error('Admin campaigns create error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.put('/api/admin/campaigns/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const id = req.params.id;
                if (!id) return res.status(400).json({ error: 'ID required' });

                const body = req.body || {};
                const payload = {
                    title: typeof body.title === 'string' ? body.title.trim() : undefined,
                    message: typeof body.message === 'string' ? body.message.trim() : undefined,
                    image_url: typeof body.image_url === 'string' ? (body.image_url.trim() || null) : undefined,
                    badge: typeof body.badge === 'string' ? (body.badge.trim() || null) : undefined,
                    cta_text: typeof body.cta_text === 'string' ? (body.cta_text.trim() || null) : undefined,
                    cta_url: typeof body.cta_url === 'string' ? (body.cta_url.trim() || null) : undefined,
                    show_on_home: typeof body.show_on_home === 'boolean' ? body.show_on_home : undefined,
                    show_once: typeof body.show_once === 'boolean' ? body.show_once : undefined,
                    priority: body.priority !== undefined ? Number(body.priority) : undefined,
                    starts_at: body.starts_at !== undefined ? body.starts_at : undefined,
                    ends_at: body.ends_at !== undefined ? body.ends_at : undefined,
                    active: typeof body.active === 'boolean' ? body.active : undefined,
                    updated_at: new Date().toISOString(),
                };

                // Remove undefined keys
                for (const k of Object.keys(payload)) {
                    if (payload[k] === undefined) delete payload[k];
                }

                const { data, error } = await supabase
                    .from('campaigns')
                    .update(payload)
                    .eq('id', id)
                    .select('*')
                    .single();
                if (error) {
                    if (isMissingTableError(error, 'campaigns')) {
                        return res.status(500).json({
                            error: 'Campaigns table missing. Run supabase_campaigns.sql in Supabase SQL Editor.',
                            supabase: formatSupabaseError(error),
                        });
                    }
                    throw error;
                }
                return res.json(data);
            } catch (error) {
                console.error('Admin campaigns update error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.delete('/api/admin/campaigns/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const id = req.params.id;
                if (!id) return res.status(400).json({ error: 'ID required' });

                const { error } = await supabase
                    .from('campaigns')
                    .delete()
                    .eq('id', id);
                if (error) {
                    if (isMissingTableError(error, 'campaigns')) {
                        return res.status(500).json({
                            error: 'Campaigns table missing. Run supabase_campaigns.sql in Supabase SQL Editor.',
                            supabase: formatSupabaseError(error),
                        });
                    }
                    throw error;
                }
                return res.json({ ok: true });
            } catch (error) {
                console.error('Admin campaigns delete error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4d. Admin: marketing metrics (views/clicks)
        app.get('/api/admin/marketing/metrics', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const daysRaw = req.query?.days;
                const days = Math.max(1, Math.min(365, Number(daysRaw || 30)));
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

                const { data: campaigns, error: cErr } = await supabase
                    .from('campaigns')
                    .select('id,title,active,show_on_home,priority,starts_at,ends_at,created_at')
                    .order('created_at', { ascending: false });
                if (cErr) {
                    if (isMissingTableError(cErr, 'campaigns')) {
                        return res.status(500).json({ error: 'Campaigns table missing. Run supabase_campaigns.sql.' });
                    }
                    throw cErr;
                }

                const { data: events, error: eErr } = await supabase
                    .from('campaign_events')
                    .select('campaign_id,event_type,created_at')
                    .gte('created_at', cutoff);
                if (eErr) {
                    if (isMissingTableError(eErr, 'campaign_events')) {
                        // No events table yet
                        return res.json({ days, campaigns: (campaigns || []).map(c => ({ ...c, views: 0, clicks: 0, ctr: 0 })) });
                    }
                    throw eErr;
                }

                const views = new Map();
                const clicks = new Map();
                for (const ev of events || []) {
                    const id = String(ev.campaign_id || '');
                    if (!id) continue;
                    if (ev.event_type === 'view') {
                        views.set(id, (views.get(id) || 0) + 1);
                    } else if (ev.event_type === 'click') {
                        clicks.set(id, (clicks.get(id) || 0) + 1);
                    }
                }

                const out = (campaigns || []).map(c => {
                    const id = String(c.id);
                    const v = views.get(id) || 0;
                    const k = clicks.get(id) || 0;
                    const ctr = v > 0 ? Number(((k / v) * 100).toFixed(2)) : 0;
                    return { ...c, views: v, clicks: k, ctr };
                });

                return res.json({ days, campaigns: out });
            } catch (error) {
                console.error('Marketing metrics error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 4e. Admin: coupons CRUD (server-side, bypass RLS)
        app.get('/api/admin/coupons', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const { data, error } = await supabase
                    .from('coupons')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) {
                    if (isMissingTableError(error, 'coupons')) {
                        return res.status(500).json({ error: 'Coupons table missing. Run supabase_coupons_v2.sql.' });
                    }
                    throw error;
                }
                return res.json(data || []);
            } catch (error) {
                console.error('Admin coupons fetch error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.post('/api/admin/coupons', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const body = req.body || {};
                const code = normalizeCouponCode(body.code);
                const discountType = String(body.discount_type || '');
                const discountValue = Number(body.discount_value);

                if (!code) return res.status(400).json({ error: 'Code required' });
                if (discountType !== 'percentage' && discountType !== 'fixed') return res.status(400).json({ error: 'Invalid discount_type' });
                if (!Number.isFinite(discountValue) || discountValue <= 0) return res.status(400).json({ error: 'Invalid discount_value' });

                const payload = {
                    code,
                    name: typeof body.name === 'string' ? body.name.trim() : null,
                    discount_type: discountType,
                    discount_value: discountValue,
                    active: body.active !== false,
                    starts_at: body.starts_at ? body.starts_at : new Date().toISOString(),
                    ends_at: body.ends_at || null,
                    min_subtotal: Number.isFinite(Number(body.min_subtotal)) ? Number(body.min_subtotal) : 0,
                    max_uses: body.max_uses === '' || body.max_uses === null || body.max_uses === undefined ? null : Number(body.max_uses),
                    max_uses_per_user: body.max_uses_per_user === '' || body.max_uses_per_user === null || body.max_uses_per_user === undefined ? null : Number(body.max_uses_per_user),
                    eligible_categories: Array.isArray(body.eligible_categories) ? body.eligible_categories : null,
                    eligible_product_ids: Array.isArray(body.eligible_product_ids) ? body.eligible_product_ids : null,
                    updated_at: new Date().toISOString(),
                };

                const { data, error } = await supabase
                    .from('coupons')
                    .insert(payload)
                    .select('*')
                    .single();
                if (error) {
                    if (isMissingColumnError(error, 'starts_at') || isMissingColumnError(error, 'min_subtotal')) {
                        return res.status(500).json({ error: 'Coupons schema outdated. Run supabase_coupons_v2.sql.' });
                    }
                    throw error;
                }
                return res.json(data);
            } catch (error) {
                console.error('Admin coupons create error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.put('/api/admin/coupons/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const id = req.params.id;
                if (!id) return res.status(400).json({ error: 'ID required' });

                const body = req.body || {};
                const payload = {
                    name: typeof body.name === 'string' ? body.name.trim() : undefined,
                    code: typeof body.code === 'string' ? normalizeCouponCode(body.code) : undefined,
                    discount_type: typeof body.discount_type === 'string' ? body.discount_type : undefined,
                    discount_value: body.discount_value !== undefined ? Number(body.discount_value) : undefined,
                    active: typeof body.active === 'boolean' ? body.active : undefined,
                    starts_at: body.starts_at !== undefined ? body.starts_at : undefined,
                    ends_at: body.ends_at !== undefined ? body.ends_at : undefined,
                    min_subtotal: body.min_subtotal !== undefined ? Number(body.min_subtotal) : undefined,
                    max_uses: body.max_uses !== undefined ? (body.max_uses === '' ? null : Number(body.max_uses)) : undefined,
                    max_uses_per_user: body.max_uses_per_user !== undefined ? (body.max_uses_per_user === '' ? null : Number(body.max_uses_per_user)) : undefined,
                    eligible_categories: body.eligible_categories !== undefined ? body.eligible_categories : undefined,
                    eligible_product_ids: body.eligible_product_ids !== undefined ? body.eligible_product_ids : undefined,
                    updated_at: new Date().toISOString(),
                };

                for (const k of Object.keys(payload)) {
                    if (payload[k] === undefined) delete payload[k];
                }

                const { data, error } = await supabase
                    .from('coupons')
                    .update(payload)
                    .eq('id', id)
                    .select('*')
                    .single();

                if (error) {
                    if (isMissingColumnError(error, 'starts_at') || isMissingColumnError(error, 'min_subtotal')) {
                        return res.status(500).json({ error: 'Coupons schema outdated. Run supabase_coupons_v2.sql.' });
                    }
                    throw error;
                }

                return res.json(data);
            } catch (error) {
                console.error('Admin coupons update error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        app.delete('/api/admin/coupons/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const id = req.params.id;
                if (!id) return res.status(400).json({ error: 'ID required' });

                const { error } = await supabase
                    .from('coupons')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return res.json({ ok: true });
            } catch (error) {
                console.error('Admin coupons delete error:', error);
                return res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // 5. Public Data Proxies (Bypass RLS)
        app.get('/api/public/products', async (req, res) => {
            try {
                console.log("Fetching products via Server Proxy...");
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                res.json(data);
            } catch (error) {
                console.error("Product Fetch Error:", error);
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/public/campaigns', async (req, res) => {
            try {
                const now = new Date().toISOString();
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('id,title,message,image_url,badge,cta_text,cta_url,show_once,priority,starts_at,ends_at')
                    .eq('active', true)
                    .eq('show_on_home', true)
                    .lte('starts_at', now)
                    .or(`ends_at.is.null,ends_at.gte.${now}`)
                    .order('priority', { ascending: false })
                    .limit(5);

                if (error) {
                    // If table doesn't exist yet, fail soft
                    if (isMissingTableError(error, 'campaigns')) {
                        res.setHeader('x-marketing-status', 'missing_table');
                        return res.json([]);
                    }
                    res.setHeader('x-marketing-status', 'error');
                    res.setHeader('x-marketing-error', encodeURIComponent(String(error.message || 'supabase_error').slice(0, 180)));
                    throw error;
                }

                return res.json(data || []);
            } catch (error) {
                console.error('Campaigns fetch error:', error);
                res.setHeader('x-marketing-status', 'error');
                return res.json([]);
            }
        });

        app.post('/api/public/campaigns/:id/event', async (req, res) => {
            try {
                const campaignId = req.params?.id;
                if (typeof campaignId !== 'string' || !campaignId.trim()) {
                    return res.status(400).json({ ok: false, error: 'Campaign ID required' });
                }

                const typeRaw = req.body?.type;
                const type = typeof typeRaw === 'string' ? typeRaw.trim().toLowerCase() : '';
                if (type !== 'view' && type !== 'click') {
                    return res.status(400).json({ ok: false, error: 'Invalid type' });
                }

                const sessionIdRaw = req.body?.session_id;
                const sessionId = typeof sessionIdRaw === 'string' && sessionIdRaw.trim() ? sessionIdRaw.trim().slice(0, 80) : null;

                // Optional auth
                let userId = null;
                try {
                    const { user } = await getUserFromRequest(req);
                    if (user?.id) userId = user.id;
                } catch {
                    // ignore
                }

                const { error } = await supabase
                    .from('campaign_events')
                    .insert({
                        campaign_id: campaignId,
                        event_type: type,
                        user_id: userId,
                        session_id: sessionId,
                    });

                if (error) {
                    if (isMissingTableError(error, 'campaign_events')) {
                        return res.json({ ok: true });
                    }
                    throw error;
                }

                return res.json({ ok: true });
            } catch (error) {
                console.error('Campaign event error:', error);
                return res.json({ ok: true });
            }
        });

        app.post('/api/public/coupons/quote', async (req, res) => {
            try {
                const body = req.body || {};
                const code = typeof body.code === 'string' ? body.code : '';
                const items = Array.isArray(body.items) ? body.items : [];

                // Optional auth: enables per-user limits
                let userId = null;
                try {
                    const { user } = await getUserFromRequest(req);
                    if (user?.id) userId = user.id;
                } catch {
                    // ignore
                }

                const quoted = await quoteCoupon({ code, items, userId });
                return res.json(quoted);
            } catch (error) {
                console.error('Coupon quote error:', error);
                return res.status(500).json({ valid: false, error: errorToMessage(error) });
            }
        });

        app.get('/api/public/coupons/validate', async (req, res) => {
            try {
                const codeRaw = req.query?.code;
                const code = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : '';
                if (!code) {
                    return res.status(400).json({ valid: false, error: 'Code required' });
                }

                // Lightweight validation (doesn't need items). For full rules use /quote.
                const { data, error } = await supabase
                    .from('coupons')
                    .select('id,code,name,discount_type,discount_value,active,starts_at,ends_at')
                    .eq('code', code)
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    if (isMissingColumnError(error, 'starts_at')) {
                        return res.status(500).json({ valid: false, error: 'Coupons schema outdated. Run supabase_coupons_v2.sql.' });
                    }
                    return res.status(500).json({ valid: false, error: errorToMessage(error) });
                }

                const coupon = normalizeCouponRow(data);
                if (!coupon) return res.json({ valid: false, error: 'Invalid coupon' });

                const now = new Date();
                if (!coupon.active) return res.json({ valid: false, error: 'Inactive coupon' });
                if (coupon.starts_at && coupon.starts_at.getTime() > now.getTime()) return res.json({ valid: false, error: 'Not started' });
                if (coupon.ends_at && coupon.ends_at.getTime() < now.getTime()) return res.json({ valid: false, error: 'Expired' });

                return res.json({
                    valid: true,
                    coupon: {
                        id: coupon.id,
                        code: coupon.code,
                        name: coupon.name,
                        discount_type: coupon.discount_type,
                        discount_value: coupon.discount_value,
                    },
                });
            } catch (error) {
                console.error('Coupon validate error:', error);
                return res.status(500).json({ valid: false, error: errorToMessage(error) });
            }
        });

        app.get('/api/public/products/:id', async (req, res) => {
            try {
                const { id } = req.params;
                console.log(`Fetching product ${id} via Server Proxy...`);
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                res.json(data);
            } catch (error) {
                console.error(`Product ${req.params.id} Fetch Error:`, error);
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/public/store-settings', async (req, res) => {
            try {
                console.log("Fetching settings via Server Proxy...");
                const { data, error } = await supabase
                    .from('store_settings')
                    .select('*')
                    .limit(1)
                    .single();

                // If no settings found, return default instead of error
                if (error && error.code === 'PGRST116') {
                    return res.json({ store_name: 'DeLu Kids', free_shipping_threshold: 299 });
                }

                if (error) throw error;
                res.json(data);
            } catch (error) {
                console.error("Settings Fetch Error:", error);
                res.status(500).json({ error: error.message });
            }
        });

        // =====================================================
        // REVIEWS API
        // =====================================================

        // GET /api/public/reviews - Buscar avaliacoes aprovadas (publico)
        app.get('/api/public/reviews', async (req, res) => {
            try {
                const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 50);
                const offset = Math.max(0, Number(req.query.offset) || 0);
                const productId = req.query.product_id ? Number(req.query.product_id) : null;
                const featured = req.query.featured === 'true';

                let query = supabase
                    .from('reviews')
                    .select('id,customer_name,customer_avatar_url,rating,title,comment,product_name,product_image,created_at,store_reply,store_reply_at')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (productId) {
                    query = query.eq('product_id', productId);
                }

                if (featured) {
                    query = query.eq('is_featured', true);
                }

                const { data, error } = await query;

                if (error) {
                    if (isMissingTableError(error, 'reviews')) {
                        return res.json({ reviews: [], total: 0, message: 'Reviews table not found. Run supabase_reviews.sql' });
                    }
                    throw error;
                }

                res.json({ reviews: data || [] });
            } catch (error) {
                console.error('Reviews fetch error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // GET /api/my-review-tokens - Buscar tokens de avaliacao do usuario logado
        app.get('/api/my-review-tokens', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError || 'Unauthorized' });
                }

                // Buscar pedidos entregues do usuario
                const { data: deliveredOrders, error: ordersError } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('status', 'Entregue');

                if (ordersError) {
                    if (isMissingTableError(ordersError, 'orders')) {
                        return res.json({ tokens: [] });
                    }
                    throw ordersError;
                }

                if (!deliveredOrders || deliveredOrders.length === 0) {
                    return res.json({ tokens: [] });
                }

                const orderIds = deliveredOrders.map(o => o.id);

                // Buscar tokens validos para esses pedidos
                const { data: tokens, error: tokensError } = await supabase
                    .from('review_tokens')
                    .select('token,order_id,expires_at,used_at')
                    .in('order_id', orderIds)
                    .is('used_at', null)
                    .gt('expires_at', new Date().toISOString());

                if (tokensError) {
                    if (isMissingTableError(tokensError, 'review_tokens')) {
                        return res.json({ tokens: [] });
                    }
                    throw tokensError;
                }

                // Buscar pedidos que ja foram avaliados (token usado ou review existe)
                const { data: usedTokens } = await supabase
                    .from('review_tokens')
                    .select('order_id')
                    .in('order_id', orderIds)
                    .not('used_at', 'is', null);

                const { data: existingReviews } = await supabase
                    .from('reviews')
                    .select('order_id')
                    .in('order_id', orderIds);

                const reviewedOrderIds = new Set([
                    ...(usedTokens || []).map(t => t.order_id),
                    ...(existingReviews || []).map(r => r.order_id),
                ]);

                // Retornar tokens com info de quais pedidos ainda precisam de avaliacao
                const result = orderIds.map(orderId => {
                    const token = tokens?.find(t => t.order_id === orderId);
                    return {
                        order_id: orderId,
                        token: token?.token || null,
                        reviewed: reviewedOrderIds.has(orderId),
                        expires_at: token?.expires_at || null,
                    };
                });

                res.json({ tokens: result });
            } catch (error) {
                console.error('My review tokens fetch error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // GET /api/public/reviews/stats - Estatisticas gerais (publico)
        app.get('/api/public/reviews/stats', async (req, res) => {
            try {
                const { data, error } = await supabase
                    .from('store_review_stats')
                    .select('*')
                    .single();

                if (error) {
                    if (isMissingTableError(error, 'store_review_stats')) {
                        return res.json({ total_reviews: 0, avg_rating: 0, positive_reviews: 0, negative_reviews: 0 });
                    }
                    throw error;
                }

                res.json(data || { total_reviews: 0, avg_rating: 0, positive_reviews: 0, negative_reviews: 0 });
            } catch (error) {
                console.error('Reviews stats error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // GET /api/public/review-token/:token - Validar token e obter dados do pedido
        app.get('/api/public/review-token/:token', async (req, res) => {
            try {
                const token = req.params.token;
                if (!token || typeof token !== 'string') {
                    return res.status(400).json({ error: 'Token required' });
                }

                const { data: tokenData, error: tokenErr } = await supabase
                    .from('review_tokens')
                    .select('id,order_id,token,expires_at,used_at')
                    .eq('token', token)
                    .single();

                if (tokenErr || !tokenData) {
                    return res.status(404).json({ error: 'Token invalido ou expirado' });
                }

                if (tokenData.used_at) {
                    return res.status(400).json({ error: 'Este link de avaliacao ja foi utilizado' });
                }

                if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
                    return res.status(400).json({ error: 'Este link de avaliacao expirou' });
                }

                // Buscar dados do pedido
                const { data: orderData, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,customer_email,created_at')
                    .eq('id', tokenData.order_id)
                    .single();

                if (orderErr || !orderData) {
                    return res.status(404).json({ error: 'Pedido nao encontrado' });
                }

                // Buscar itens do pedido
                const { data: items } = await supabase
                    .from('order_items')
                    .select('product_id,product_name,image')
                    .eq('order_id', tokenData.order_id);

                res.json({
                    token: tokenData.token,
                    order_id: orderData.id,
                    customer_id: orderData.user_id || '',
                    customer_name: orderData.customer_name || '',
                    customer_email: orderData.customer_email || '',
                    expires_at: tokenData.expires_at,
                    products: (items || []).map(item => ({
                        id: item.product_id,
                        name: item.product_name || 'Produto',
                        image: item.image || '',
                    })),
                });
            } catch (error) {
                console.error('Review token validation error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // POST /api/public/review - Submeter avaliacao(oes) via token (sem login)
        // Accepts: { token, reviews: [{ product_id, rating, title?, comment }] }
        // OR legacy: { token, productId, rating, title?, comment }
        app.post('/api/public/review', async (req, res) => {
            try {
                const { token, reviews: reviewsArray, rating, comment, title, productId } = req.body || {};

                if (!token || typeof token !== 'string') {
                    return res.status(400).json({ error: 'Token required' });
                }

                // Support both new format (array) and legacy (single review)
                let reviewsToProcess = [];
                if (Array.isArray(reviewsArray) && reviewsArray.length > 0) {
                    reviewsToProcess = reviewsArray;
                } else if (rating && comment) {
                    reviewsToProcess = [{ product_id: productId, rating, title, comment }];
                }

                if (reviewsToProcess.length === 0) {
                    return res.status(400).json({ error: 'Pelo menos uma avaliacao e necessaria' });
                }

                // Validate each review
                for (const r of reviewsToProcess) {
                    if (!r.rating || r.rating < 1 || r.rating > 5) {
                        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
                    }
                    if (!r.comment || typeof r.comment !== 'string' || r.comment.trim().length < 10) {
                        return res.status(400).json({ error: 'Comentario deve ter pelo menos 10 caracteres' });
                    }
                }

                // Validar token
                const { data: tokenData, error: tokenErr } = await supabase
                    .from('review_tokens')
                    .select('id,order_id,expires_at,used_at')
                    .eq('token', token)
                    .single();

                if (tokenErr || !tokenData) {
                    return res.status(404).json({ error: 'Token invalido' });
                }

                if (tokenData.used_at) {
                    return res.status(400).json({ error: 'Este link de avaliacao ja foi utilizado' });
                }

                if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
                    return res.status(400).json({ error: 'Este link de avaliacao expirou' });
                }

                // Buscar dados do pedido
                const { data: orderData, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name')
                    .eq('id', tokenData.order_id)
                    .single();

                if (orderErr || !orderData) {
                    return res.status(404).json({ error: 'Pedido nao encontrado' });
                }

                // Buscar avatar do usuario (se tiver)
                let avatarUrl = null;
                if (orderData.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', orderData.user_id)
                        .single();
                    avatarUrl = profile?.avatar_url || null;
                }

                // Process each review
                const createdReviews = [];
                for (const reviewItem of reviewsToProcess) {
                    // Buscar nome do produto (se especificado)
                    let productName = null;
                    let productImage = null;
                    if (reviewItem.product_id) {
                        const { data: product } = await supabase
                            .from('products')
                            .select('name,image')
                            .eq('id', reviewItem.product_id)
                            .single();
                        productName = product?.name || null;
                        productImage = product?.image || null;
                    }

                    // Criar avaliacao
                    const { data: review, error: reviewErr } = await supabase
                        .from('reviews')
                        .insert({
                            order_id: orderData.id,
                            user_id: orderData.user_id,
                            product_id: reviewItem.product_id || null,
                            customer_name: orderData.customer_name,
                            customer_avatar_url: avatarUrl,
                            rating: Number(reviewItem.rating),
                            title: reviewItem.title ? String(reviewItem.title).trim().slice(0, 100) : null,
                            comment: String(reviewItem.comment).trim().slice(0, 1000),
                            product_name: productName,
                            product_image: productImage,
                            status: 'pending',
                        })
                        .select('id')
                        .single();

                    if (reviewErr) {
                        console.error('Review insert error:', reviewErr);
                        throw reviewErr;
                    }
                    createdReviews.push(review.id);
                }

                // Marcar token como usado
                await supabase
                    .from('review_tokens')
                    .update({ used_at: new Date().toISOString() })
                    .eq('id', tokenData.id);

                res.json({ ok: true, reviewIds: createdReviews, message: 'Obrigado pela sua avaliacao!' });
            } catch (error) {
                console.error('Review submit error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // POST /api/reviews - Submeter avaliacao (usuario logado)
        app.post('/api/reviews', async (req, res) => {
            try {
                const { user, error: authError } = await getUserFromRequest(req);
                if (authError || !user) {
                    return res.status(401).json({ error: authError });
                }

                const { orderId, productId, rating, comment, title } = req.body || {};

                if (!orderId || typeof orderId !== 'string') {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                if (!rating || rating < 1 || rating > 5) {
                    return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
                }

                if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
                    return res.status(400).json({ error: 'Comentario deve ter pelo menos 10 caracteres' });
                }

                // Verificar se o pedido pertence ao usuario e esta entregue
                const { data: orderData, error: orderErr } = await supabase
                    .from('orders')
                    .select('id,user_id,customer_name,status')
                    .eq('id', orderId)
                    .eq('user_id', user.id)
                    .single();

                if (orderErr || !orderData) {
                    return res.status(404).json({ error: 'Pedido nao encontrado' });
                }

                if (orderData.status !== 'Entregue') {
                    return res.status(400).json({ error: 'Voce so pode avaliar pedidos entregues' });
                }

                // Verificar se ja avaliou este pedido
                const { data: existingReview } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('order_id', orderId)
                    .eq('user_id', user.id)
                    .single();

                if (existingReview) {
                    return res.status(400).json({ error: 'Voce ja avaliou este pedido' });
                }

                // Buscar avatar do usuario
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url,name')
                    .eq('id', user.id)
                    .single();

                // Buscar nome do produto
                let productName = null;
                let productImage = null;
                if (productId) {
                    const { data: product } = await supabase
                        .from('products')
                        .select('name,image')
                        .eq('id', productId)
                        .single();
                    productName = product?.name || null;
                    productImage = product?.image || null;
                }

                // Criar avaliacao
                const { data: review, error: reviewErr } = await supabase
                    .from('reviews')
                    .insert({
                        order_id: orderId,
                        user_id: user.id,
                        product_id: productId || null,
                        customer_name: profile?.name || orderData.customer_name,
                        customer_avatar_url: profile?.avatar_url || null,
                        rating: Number(rating),
                        title: title ? String(title).trim().slice(0, 100) : null,
                        comment: String(comment).trim().slice(0, 1000),
                        product_name: productName,
                        product_image: productImage,
                        status: 'pending',
                    })
                    .select('id')
                    .single();

                if (reviewErr) {
                    console.error('Review insert error:', reviewErr);
                    throw reviewErr;
                }

                res.json({ ok: true, reviewId: review.id, message: 'Obrigado pela sua avaliacao!' });
            } catch (error) {
                console.error('Review submit error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // GET /api/admin/reviews - Listar todas avaliacoes (admin)
        app.get('/api/admin/reviews', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const status = req.query.status || null;
                const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
                const offset = Math.max(0, Number(req.query.offset) || 0);

                let query = supabase
                    .from('reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (status && ['pending', 'approved', 'rejected'].includes(status)) {
                    query = query.eq('status', status);
                }

                const { data, error } = await query;

                if (error) {
                    if (isMissingTableError(error, 'reviews')) {
                        return res.json({ reviews: [], message: 'Reviews table not found. Run supabase_reviews.sql' });
                    }
                    throw error;
                }

                res.json({ reviews: data || [] });
            } catch (error) {
                console.error('Admin reviews fetch error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // PUT /api/admin/reviews/:id - Atualizar avaliacao (aprovar/rejeitar/responder)
        app.put('/api/admin/reviews/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const reviewId = req.params.id;
                const { status, is_featured, admin_notes, store_reply, admin_response } = req.body || {};

                const updateData = {};

                if (status && ['pending', 'approved', 'rejected'].includes(status)) {
                    updateData.status = status;
                }

                if (typeof is_featured === 'boolean') {
                    updateData.is_featured = is_featured;
                }

                if (typeof admin_notes === 'string') {
                    updateData.admin_notes = admin_notes.trim().slice(0, 500);
                }

                // Accept both store_reply and admin_response (frontend uses admin_response)
                const replyText = store_reply || admin_response;
                if (typeof replyText === 'string') {
                    updateData.store_reply = replyText.trim().slice(0, 500) || null;
                    updateData.store_reply_at = replyText.trim() ? new Date().toISOString() : null;
                }

                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({ error: 'No valid fields to update' });
                }

                const { error } = await supabase
                    .from('reviews')
                    .update(updateData)
                    .eq('id', reviewId);

                if (error) throw error;

                res.json({ ok: true });
            } catch (error) {
                console.error('Admin review update error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // DELETE /api/admin/reviews/:id - Excluir avaliacao (admin)
        app.delete('/api/admin/reviews/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const reviewId = req.params.id;

                const { error } = await supabase
                    .from('reviews')
                    .delete()
                    .eq('id', reviewId);

                if (error) throw error;

                res.json({ ok: true });
            } catch (error) {
                console.error('Admin review delete error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // =====================================================
        // CAMPAIGN BANNERS API
        // =====================================================

        // GET /api/public/banners - Buscar banners ativos (publico)
        app.get('/api/public/banners', async (req, res) => {
            try {
                const position = req.query.position || null;
                const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 50);

                let query = supabase
                    .from('campaign_banners')
                    .select('id,title,subtitle,button_label,button_url,image_url,bg_color,text_color,button_color,button_text_color,position,priority,start_at,end_at')
                    .eq('is_active', true)
                    .lte('start_at', new Date().toISOString())
                    .or(`end_at.is.null,end_at.gte.${new Date().toISOString()}`)
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (position && ['hero', 'bar', 'popup'].includes(position)) {
                    query = query.eq('position', position);
                }

                const { data, error } = await query;

                if (error) {
                    if (isMissingTableError(error, 'campaign_banners')) {
                        return res.json({ banners: [], message: 'Campaign banners table not found. Run supabase_campaign_banners.sql' });
                    }
                    throw error;
                }

                res.json({ banners: data || [] });
            } catch (error) {
                console.error('Banners fetch error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // POST /api/public/banners/:id/impression - Registrar impressao
        app.post('/api/public/banners/:id/impression', async (req, res) => {
            try {
                const bannerId = req.params.id;
                await supabase.rpc('increment_banner_impressions', { banner_id: bannerId });
                res.json({ ok: true });
            } catch (error) {
                console.error('Banner impression error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // POST /api/public/banners/:id/click - Registrar clique
        app.post('/api/public/banners/:id/click', async (req, res) => {
            try {
                const bannerId = req.params.id;
                await supabase.rpc('increment_banner_clicks', { banner_id: bannerId });
                res.json({ ok: true });
            } catch (error) {
                console.error('Banner click error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // GET /api/admin/banners - Listar todos banners (admin)
        app.get('/api/admin/banners', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const position = req.query.position || null;
                const active = req.query.active;
                const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
                const offset = Math.max(0, Number(req.query.offset) || 0);

                let query = supabase
                    .from('campaign_banners')
                    .select('*')
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (position && ['hero', 'bar', 'popup'].includes(position)) {
                    query = query.eq('position', position);
                }

                if (active === 'true') {
                    query = query.eq('is_active', true);
                } else if (active === 'false') {
                    query = query.eq('is_active', false);
                }

                const { data, error } = await query;

                if (error) {
                    if (isMissingTableError(error, 'campaign_banners')) {
                        return res.json({ banners: [], message: 'Campaign banners table not found. Run supabase_campaign_banners.sql' });
                    }
                    throw error;
                }

                res.json({ banners: data || [] });
            } catch (error) {
                console.error('Admin banners fetch error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // POST /api/admin/banners - Criar banner (admin)
        app.post('/api/admin/banners', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const {
                    title, subtitle, button_label, button_url, image_url,
                    bg_color, text_color, button_color, button_text_color,
                    position, priority, is_active, start_at, end_at
                } = req.body || {};

                if (!title || typeof title !== 'string' || title.trim().length < 2) {
                    return res.status(400).json({ error: 'Titulo e obrigatorio (min 2 caracteres)' });
                }

                const validPositions = ['hero', 'bar', 'popup'];
                const bannerPosition = validPositions.includes(position) ? position : 'hero';

                const insertData = {
                    title: title.trim().slice(0, 100),
                    subtitle: subtitle ? String(subtitle).trim().slice(0, 200) : null,
                    button_label: button_label ? String(button_label).trim().slice(0, 50) : null,
                    button_url: button_url ? String(button_url).trim().slice(0, 500) : null,
                    image_url: image_url ? String(image_url).trim().slice(0, 1000) : null,
                    bg_color: bg_color && /^#[0-9A-Fa-f]{6}$/.test(bg_color) ? bg_color : '#1e293b',
                    text_color: text_color && /^#[0-9A-Fa-f]{6}$/.test(text_color) ? text_color : '#ffffff',
                    button_color: button_color && /^#[0-9A-Fa-f]{6}$/.test(button_color) ? button_color : '#ffffff',
                    button_text_color: button_text_color && /^#[0-9A-Fa-f]{6}$/.test(button_text_color) ? button_text_color : '#1e293b',
                    position: bannerPosition,
                    priority: typeof priority === 'number' ? Math.max(0, Math.min(100, priority)) : 0,
                    is_active: typeof is_active === 'boolean' ? is_active : true,
                    start_at: start_at ? new Date(start_at).toISOString() : new Date().toISOString(),
                    end_at: end_at ? new Date(end_at).toISOString() : null,
                };

                const { data, error } = await supabase
                    .from('campaign_banners')
                    .insert(insertData)
                    .select('*')
                    .single();

                if (error) throw error;

                res.json({ ok: true, banner: data });
            } catch (error) {
                console.error('Admin banner create error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // PUT /api/admin/banners/:id - Atualizar banner (admin)
        app.put('/api/admin/banners/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const bannerId = req.params.id;
                const {
                    title, subtitle, button_label, button_url, image_url,
                    bg_color, text_color, button_color, button_text_color,
                    position, priority, is_active, start_at, end_at
                } = req.body || {};

                const updateData = {};

                if (title !== undefined) {
                    if (typeof title !== 'string' || title.trim().length < 2) {
                        return res.status(400).json({ error: 'Titulo deve ter min 2 caracteres' });
                    }
                    updateData.title = title.trim().slice(0, 100);
                }

                if (subtitle !== undefined) updateData.subtitle = subtitle ? String(subtitle).trim().slice(0, 200) : null;
                if (button_label !== undefined) updateData.button_label = button_label ? String(button_label).trim().slice(0, 50) : null;
                if (button_url !== undefined) updateData.button_url = button_url ? String(button_url).trim().slice(0, 500) : null;
                if (image_url !== undefined) updateData.image_url = image_url ? String(image_url).trim().slice(0, 1000) : null;

                if (bg_color !== undefined && /^#[0-9A-Fa-f]{6}$/.test(bg_color)) updateData.bg_color = bg_color;
                if (text_color !== undefined && /^#[0-9A-Fa-f]{6}$/.test(text_color)) updateData.text_color = text_color;
                if (button_color !== undefined && /^#[0-9A-Fa-f]{6}$/.test(button_color)) updateData.button_color = button_color;
                if (button_text_color !== undefined && /^#[0-9A-Fa-f]{6}$/.test(button_text_color)) updateData.button_text_color = button_text_color;

                if (position !== undefined && ['hero', 'bar', 'popup'].includes(position)) updateData.position = position;
                if (typeof priority === 'number') updateData.priority = Math.max(0, Math.min(100, priority));
                if (typeof is_active === 'boolean') updateData.is_active = is_active;

                if (start_at !== undefined) updateData.start_at = start_at ? new Date(start_at).toISOString() : new Date().toISOString();
                if (end_at !== undefined) updateData.end_at = end_at ? new Date(end_at).toISOString() : null;

                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({ error: 'Nenhum campo valido para atualizar' });
                }

                const { data, error } = await supabase
                    .from('campaign_banners')
                    .update(updateData)
                    .eq('id', bannerId)
                    .select('*')
                    .single();

                if (error) throw error;

                res.json({ ok: true, banner: data });
            } catch (error) {
                console.error('Admin banner update error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // DELETE /api/admin/banners/:id - Excluir banner (admin)
        app.delete('/api/admin/banners/:id', async (req, res) => {
            try {
                const { user, error: authError } = await getAdminUserFromRequest(req);
                if (authError || !user) {
                    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError });
                }

                const bannerId = req.params.id;

                const { error } = await supabase
                    .from('campaign_banners')
                    .delete()
                    .eq('id', bannerId);

                if (error) throw error;

                res.json({ ok: true });
            } catch (error) {
                console.error('Admin banner delete error:', error);
                res.status(500).json({ error: errorToMessage(error) });
            }
        });

        // =====================================================
        // SUPERFRETE API PROXY
        // =====================================================
        app.post('/api/superfrete', rateLimit({ windowMs: 1 * 60 * 1000, max: 20 }), async (req, res) => {
            try {
                const { action, payload } = req.body;
                const token = process.env.SUPERFRETE_TOKEN;

                if (!token) {
                    return res.status(500).json({ error: 'SUPERFRETE_TOKEN nao configurado no servidor (.env)' });
                }

                const apiUrl = 'https://api.superfrete.com/api/v0';

                if (action === 'calculate') {
                    if (!payload || !payload.from || !payload.to) {
                        return res.status(400).json({ error: 'Payload de calculo invalido' });
                    }

                    const sfResponse = await fetch(`${apiUrl}/calculator`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'User-Agent': 'DeLuKids/1.0'
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await sfResponse.json();

                    if (!sfResponse.ok) {
                        console.error("SuperFrete Error:", data);
                        return res.status(400).json({ error: data.message || 'Erro ao calcular frete no SuperFrete' });
                    }

                    return res.json(data);
                }

                if (action === 'cart') {
                    if (!payload || !payload.from || !payload.to) {
                        return res.status(400).json({ error: 'Payload de carrinho invalido' });
                    }

                    const sfResponse = await fetch(`${apiUrl}/cart`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'User-Agent': 'DeLuKids/1.0'
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await sfResponse.json();

                    if (!sfResponse.ok) {
                        console.error("SuperFrete Cart Error:", data);
                        return res.status(400).json({ error: data.message || 'Erro ao adicionar ao carrinho SuperFrete' });
                    }

                    return res.json(data);
                }

                return res.status(400).json({ error: 'Acão não encontrada. Use action: "calculate" ou "cart"' });

            } catch (error) {
                console.error("SuperFrete Exception:", error);
                res.status(500).json({ error: error.message || 'Internal Server Error ao chamar SuperFrete' });
            }
        });

        // API error handler (consistent JSON)
        app.use((err, req, res, next) => {
            try {
                const isApi = typeof req.path === 'string' && req.path.startsWith('/api');
                if (!isApi) return next(err);
                if (res.headersSent) return next(err);

                const statusFromErr = (() => {
                    if (!err || typeof err !== 'object') return null;
                    // body-parser style
                    // @ts-ignore
                    if (typeof err.status === 'number') return err.status;
                    // @ts-ignore
                    if (typeof err.statusCode === 'number') return err.statusCode;
                    return null;
                })();

                // body-parser uses these types
                // @ts-ignore
                const errType = err && typeof err === 'object' && 'type' in err ? String(err.type) : '';
                const status = statusFromErr || (errType === 'entity.parse.failed' ? 400 : errType === 'entity.too.large' ? 413 : 500);

                console.error('API error:', {
                    requestId: String(res.getHeader('x-request-id') || '') || null,
                    method: req.method,
                    path: req.path,
                    status,
                    type: errType || null,
                    message: errorToMessage(err),
                });

                const errorMessage = status === 400 ? 'Invalid JSON' : status === 413 ? 'Payload too large' : 'Internal error';
                return res.status(status).json({
                    error: errorMessage,
                    requestId: String(res.getHeader('x-request-id') || '') || null,
                });
            } catch {
                return next(err);
            }
        });

        // API 404 handler (avoid sending index.html for API calls)
        app.use('/api/', (req, res) => {
            return res.status(404).json({
                error: 'Not found',
                requestId: String(res.getHeader('x-request-id') || '') || null,
            });
        });


        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });

        app.listen(port, '0.0.0.0', () => console.log(`Server running on ${port}`));

    } catch (e) {
        console.error("Server Start Failed:", e);
        process.exit(1);
    }
}

startServer();
