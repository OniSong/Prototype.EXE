// Vercel serverless function: proxies to OpenRouter or HuggingFace text generation
// Expects env OPENROUTER_API_KEY or HUGGINGFACE_API_KEY and AI_BACKEND_TYPE ("openrouter" or "huggingface")
// Returns minimal JSON: { lookAt: [x,y,z], blendshapes: { "Joy": 0.8 }, viseme: "AA" }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({error:'method'});
  const body = req.body || {};
  const input = body.inputText || '';

  const backend = process.env.AI_BACKEND_TYPE || (process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.HUGGINGFACE_API_KEY ? 'huggingface' : null));
  if (!backend) return res.status(500).json({ error: 'No AI backend configured' });

  // Prompt to request a JSON response with specific fields
  const prompt = `
You are an assistant that maps a short user instruction to a compact JSON command for a 3D avatar.
Return ONLY valid JSON with keys:
- lookAt: [x,y,z] absolute world coordinates (float) (optional)
- blendshapes: { "<name>": 0.0-1.0 } optional
- viseme: "<label>" optional
Example: {"lookAt":[0.5,1.4,0.8],"blendshapes":{"Joy":0.8},"viseme":"AA"}
User instruction: "${input}"
Be concise and return strictly JSON.
`;

  try {
    let aiRespText = '';
    if (backend === 'openrouter') {
      const key = process.env.OPENROUTER_API_KEY;
      const r = await fetch('https://api.openrouter.ai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: "gpt-4o-mini" /* adjust to available model */, messages:[{role:'user', content: prompt}], max_tokens:200
        })
      });
      const j = await r.json();
      aiRespText = j?.choices?.[0]?.message?.content || JSON.stringify(j);
    } else if (backend === 'huggingface') {
      const key = process.env.HUGGINGFACE_API_KEY;
      // Use a text-generation endpoint; adjust model and endpoint as you prefer
      const hfModel = process.env.HUGGINGFACE_MODEL || 'gpt2'; // replace with appropriate hosted model
      const r = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 200 } })
      });
      const j = await r.json();
      if (Array.isArray(j) && j[0] && j[0].generated_text) aiRespText = j[0].generated_text;
      else aiRespText = JSON.stringify(j);
    }

    // Attempt JSON parse from model output
    let json = {};
    const firstBrace = aiRespText.indexOf('{');
    const lastBrace = aiRespText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = aiRespText.substring(firstBrace, lastBrace+1);
      try { json = JSON.parse(candidate); }
      catch(e){ json = {raw: aiRespText}; }
    } else json = { raw: aiRespText };

    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'AI call failed', detail: String(e) });
  }
}