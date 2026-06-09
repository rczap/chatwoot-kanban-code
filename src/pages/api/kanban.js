export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    
    // Rota explícita especificando o tipo de conversa para evitar listas vazias por escopo de agente
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=all&conversation_type=all`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erro Chatwoot: ${response.status}` });
    }
    
    const data = await response.json();
    
    // Mapeamento dinâmico para varrer qualquer estrutura de retorno do Chatwoot (Array direto ou payload)
    let conversations = [];
    if (data) {
      if (Array.isArray(data)) conversations = data;
      else if (data.payload && Array.isArray(data.payload)) conversations = data.payload;
      else if (data.data && Array.isArray(data.data)) conversations = data.data;
    }

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    conversations.forEach(conv => {
      // Normaliza status para cair nas colunas corretas do Kanban
      let status = conv.status;
      if (status === 'all' || !statusColumns[status]) {
        status = 'open'; 
      }
      
      const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
      
      let lastMsg = 'Mídia ou Mensagem do Sistema';
      if (conv.messages && conv.messages.length > 0) {
        lastMsg = conv.messages[0].content || lastMsg;
      }

      statusColumns[status].cards.push({
        id: conv.id.toString(),
        display_id: conv.display_id,
        contact_name: contactName,
        last_message: lastMsg
      });
    });

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
