export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes no Easypanel.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    // Rota direta e global do Chatwoot sem parâmetros que filtram ou escondem chats
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Chatwoot respondeu status: ${response.status}` });
    }
    
    const data = await response.json();
    
    // Tratamento para garantir que leremos a lista independente de como o Chatwoot envie (payload ou direto)
    const conversations = data.payload || (Array.isArray(data) ? data : data.data || []);

    // Estrutura exata exigida pelo front-end para renderizar as colunas do Kanban
    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        // Mapeia o status básico (se for diferente dos 3, joga para 'open')
        const status = (conv.status === 'snoozed' || conv.status === 'resolved') ? conv.status : 'open';
        
        // Coleta o nome do cliente de forma totalmente segura pelas propriedades do Chatwoot
        const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
        
        // Coleta o texto da última mensagem para exibir no cartão
        let lastMsg = 'Mídia ou Mensagem do Sistema';
        if (conv.messages && conv.messages.length > 0) {
          lastMsg = conv.messages[0].content || lastMsg;
        }

        // Insere o card com a nomenclatura exata que a tela lê
        statusColumns[status].cards.push({
          id: conv.id.toString(),
          display_id: conv.display_id,
          title: contactName, // Algumas versões usam 'title' ou 'contact_name'
          contact_name: contactName,
          description: lastMsg, // Algumas versões usam 'description' ou 'last_message'
          last_message: lastMsg
        });
      });
    }

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
