// Dominus: função "claude" (Supabase Edge Function).
//
// O app chama esta função; ela confere quem é o usuário, aplica os limites e repassa o
// pedido para a API do Claude com a chave guardada no servidor. A chave da API nunca vai
// para o celular.
//
// Segredos (Edge Functions > Secrets no painel do Supabase):
//   ANTHROPIC_API_KEY          obrigatório: chave da API do Claude (console.anthropic.com)
//   DOMINUS_EMAILS_PERMITIDOS  recomendado: e-mails que podem usar o monitor, separados por vírgula.
//                              Vazio = qualquer pessoa com conta no Dominus pode usar (e gastar seus créditos).
//   DOMINUS_LIMITE_DIARIO      opcional: pedidos por pessoa por dia (padrão 80)
//   DOMINUS_MODELO             opcional: modelo das respostas normais (padrão claude-sonnet-5-5)
//   DOMINUS_MODELO_RAPIDO      opcional: modelo das tarefas simples (padrão claude-haiku-5-5)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { code: "method", message: "Use POST." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const autorizacao = req.headers.get("authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!autorizacao.startsWith("Bearer ")) return json(401, { code: "session_expired", message: "Entre de novo no Dominus." });

  // 1. Quem está pedindo? (confere o token de login no próprio Supabase)
  const ru = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: autorizacao, apikey } });
  if (!ru.ok) return json(401, { code: "session_expired", message: "Sua sessão expirou. Entre de novo no Dominus." });
  const usuario = await ru.json();
  const email = String(usuario?.email ?? "").toLowerCase();

  // 2. Essa pessoa pode usar o monitor?
  const permitidos = (Deno.env.get("DOMINUS_EMAILS_PERMITIDOS") ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (permitidos.length && !permitidos.includes(email)) {
    return json(403, { code: "not_granted", message: "O monitor com IA ainda não foi liberado para a sua conta." });
  }

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) return json(503, { code: "sampling_disabled", message: "O monitor com IA ainda não foi ativado no servidor." });

  // 3. Confere o pedido antes de contar no limite
  let corpo: any;
  try { corpo = await req.json(); } catch { return json(400, { code: "invalid", message: "Pedido inválido." }); }
  const mensagens = Array.isArray(corpo?.messages) ? corpo.messages : null;
  if (!mensagens || !mensagens.length) return json(400, { code: "invalid", message: "Pedido sem mensagens." });
  for (const m of mensagens) {
    if (m?.role !== "user" && m?.role !== "assistant") return json(400, { code: "invalid", message: "Mensagem inválida." });
    if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b?.type === "image" && !TIPOS_IMAGEM.includes(b?.source?.media_type)) {
          return json(400, { code: "image_rejected", message: "Tipo de imagem não aceito. Use PNG, JPG ou WebP." });
        }
      }
    }
  }

  // 4. Limite diário por pessoa (conta no banco, com o login da própria pessoa)
  const limite = Number(Deno.env.get("DOMINUS_LIMITE_DIARIO") ?? "80") || 80;
  const rl = await fetch(`${supabaseUrl}/rest/v1/rpc/registrar_uso_claude`, {
    method: "POST",
    headers: { Authorization: autorizacao, apikey, "Content-Type": "application/json" },
    body: JSON.stringify({ limite }),
  });
  if (!rl.ok) {
    return json(500, { code: "config", message: "O controle de uso do monitor não está configurado. Rode o arquivo supabase/monitor.sql no SQL Editor." });
  }
  const restante = Number(await rl.json());
  if (restante < 0) {
    return json(429, { code: "rate_limited", message: `Você chegou ao limite de ${limite} pedidos ao monitor por hoje. O limite volta amanhã.` });
  }

  // 5. Repassa o pedido para a API do Claude
  const rapido = corpo.modelTier === "quick";
  const modelo = rapido
    ? (Deno.env.get("DOMINUS_MODELO_RAPIDO") ?? "claude-haiku-5-5")
    : (Deno.env.get("DOMINUS_MODELO") ?? "claude-sonnet-5-5");
  const maxTokens = Math.max(256, Math.min(Number(corpo.max_tokens) || 4096, rapido ? 2048 : 8192));
  const pedido: Record<string, unknown> = { model: modelo, max_tokens: maxTokens, messages: mensagens, stream: !!corpo.stream };
  if (typeof corpo.system === "string" && corpo.system.trim()) pedido.system = corpo.system.slice(0, 20000);

  const ra = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });

  if (!ra.ok) {
    const texto = await ra.text();
    console.error("Erro da API do Claude", ra.status, texto.slice(0, 500));
    if (ra.status === 429 || ra.status === 529) return json(429, { code: "rate_limited", message: "O monitor está muito ocupado agora. Tente de novo em alguns instantes." });
    if (ra.status === 413 || /prompt is too long|too many tokens/i.test(texto)) return json(413, { code: "prompt_too_large", message: "O texto é grande demais para o monitor." });
    if (ra.status === 401 || ra.status === 403) return json(503, { code: "sampling_disabled", message: "A chave da API do Claude no servidor está inválida ou sem acesso." });
    if (/credit balance/i.test(texto)) return json(503, { code: "sampling_disabled", message: "A conta da API do Claude está sem créditos." });
    if (/image/i.test(texto)) return json(400, { code: "image_rejected", message: "Uma das imagens não pôde ser lida." });
    return json(502, { code: "upstream", message: "O monitor não conseguiu responder agora. Tente de novo." });
  }

  if (pedido.stream) {
    return new Response(ra.body, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }
  return new Response(await ra.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
});
