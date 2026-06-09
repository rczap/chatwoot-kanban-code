export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  const baseUrl = chatwootUrl.replace(/\/$/, '');

  // --- TRATAMENTO PARA QUANDO VOCÊ ARRASTA O CARD NA TELA (MUDAR STATUS) ---
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { cardId, targetColumnId } = req.body; // Pega o ID da conversa e a coluna de destino

      if (!cardId || !targetColumnId) {
        return res.status(400).json({ error: 'Parâmetros cardId ou targetColumnId ausentes.' });
      }

      // Rota do Chatwoot para alterar o status de uma conversa específica
      const updateUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${cardId}`;
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'api_access_token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: targetColumnId }) // targetColumnId deve ser 'open', 'snoozed' ou 'resolved'
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Falha ao atualizar status no Chatwoot` });
      }

      return res.status(200).json({ success: true, message: 'Conversa atualizada com sucesso!' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- COMPORTAMENTO PADRÃO (GET): LISTAR AS CONVERSAS NA TELA ---
  if (req.method === 'GET') {
    try {
      const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=open`;
      
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
      
      let conversations = [];
      if (data && data.data && data.data.payload) {
        conversations = data.data.payload;
      } else if (data && data.payload) {
        conversations = data.payload;
      } else if (data && data.data) {
        conversations = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        conversations = data;
      }

      const statusColumns = {
        'open': { id: 'open', name: 'Em Aberto', cards: [] },
        'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
        'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
      };

      if (Array.isArray(conversations)) {
        conversations.forEach(conv => {
          const status = (conv.status === 'snoozed' || conv.status === 'resolved') ? conv.status : 'open';
          const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
          
          let lastMsg = 'Mídia ou Mensagem do Sistema';
          if (conv.messages && conv.messages.length > 0) {
            lastMsg = conv.messages[0].content || lastMsg;
          } else if (conv.last_non_activity_message && conv.last_non_activity_message.content) {
            lastMsg = conv.last_non_activity_message.content;
          }

          statusColumns[status].cards.push({
            id: conv.id.toString(),
            display_id: conv.display_id,
            title: contactName,
            contact_name: contactName,
            description: lastMsg,
            last_message: lastMsg
          });
        });
      }

      return res.status(200).json({ lists: Object.values(statusColumns) });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
