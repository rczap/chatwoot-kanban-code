export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=open`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'api_access_token': token, 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // RETORNO DE DIAGNÓSTICO: Mostra na tela exatamente a estrutura bruta do Chatwoot
    return res.status(200).json({
      tipo_recebido: typeof data,
      tem_payload: !!data.payload,
      e_array: Array.isArray(data),
      chaves_do_objeto: Object.keys(data),
      dados_brutos: data
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
