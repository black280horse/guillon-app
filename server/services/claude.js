const Anthropic = require('@anthropic-ai/sdk');

// El modelo solicitado por el usuario
const MODEL = 'claude-sonnet-4-0';

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'tu_anthropic_api_key') {
    return null;
  }
  return new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── Análisis de ventas (respuesta completa) ──────────────────────────────────
async function analyzeProduct({ productName, kpis, dailySeries, prevKpis }) {
  const client = getClient();
  if (!client) return { error: 'ANTHROPIC_API_KEY no configurada' };

  const bestDay = dailySeries.reduce((a, b) => (b.revenue > a.revenue ? b : a), dailySeries[0] || {})
  const worstDay = dailySeries.reduce((a, b) => (b.revenue < a.revenue ? b : a), dailySeries[0] || {})
  const pctChange = prevKpis?.total_revenue > 0
    ? (((kpis.total_revenue - prevKpis.total_revenue) / prevKpis.total_revenue) * 100).toFixed(1)
    : null

  const prompt = `Sos un analista de marketing experto en e-commerce y publicidad digital.
Analizá el rendimiento del producto "${productName}" y generá un análisis claro y accionable.

DATOS DEL PERÍODO:
- Ingresos totales: $${kpis.total_revenue}
- Inversión total: $${kpis.total_investment}
- Ganancia neta: $${kpis.net_profit}
- ROAS: ${kpis.roas}x
- Registros: ${kpis.total_records} días
${pctChange ? `- Cambio vs período anterior: ${pctChange > 0 ? '+' : ''}${pctChange}%` : ''}

DÍAS DESTACADOS:
- Mejor día: ${bestDay.date} con $${bestDay.revenue} de ingresos
- Peor día: ${worstDay.date} con $${worstDay.revenue} de ingresos

SERIE DIARIA (últimos datos):
${dailySeries.slice(-7).map(d => `  ${d.date}: ingresos $${d.revenue}, inversión $${d.investment}, ROAS ${d.roas ?? 'N/A'}x`).join('\n')}

Respondé en español, de forma concisa y directa (máximo 4 párrafos). Incluí:
1. Evaluación del ROAS y rentabilidad
2. Tendencia detectada (crecimiento, caída, estabilidad)
3. 2-3 recomendaciones concretas y accionables
No uses markdown excesivo, solo texto fluido con saltos de línea para separar ideas.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || ''
    return {
      analysis: text,
      meta: {
        bestDay,
        worstDay,
        pctChange: pctChange ? parseFloat(pctChange) : null,
      },
    }
  } catch (err) {
    console.error('Claude analyze error:', err.message);
    return { error: err.message };
  }
}

// ─── Chat streaming (SSE) ─────────────────────────────────────────────────────
async function chatStream({ messages, businessContext, res }) {
  const client = getClient();
  if (!client) {
    res.write(`data: ${JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' })}\n\n`);
    res.end();
    return;
  }

  const systemPrompt = `Sos un asistente de negocios experto en análisis de ventas, marketing digital y publicidad.
Tenés acceso a los datos del negocio del usuario y respondés de forma concisa, clara y accionable.
Siempre respondés en español. Usás datos concretos cuando están disponibles.

CONTEXTO DEL NEGOCIO:
${businessContext}

Cuando te pregunten sobre rendimiento, usá los datos del contexto. Si no tenés datos para algo específico, decilo claramente.`

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Claude chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

module.exports = { analyzeProduct, chatStream };
