export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  const baseUrl = chatwootUrl.replace(/\/$/, '');

  // --- CORREÇÃO DO ARRASTAR E SOLTAR (POST/PUT) ---
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      // Aceita variações de nome que o front-end pode usar (id, cardId, conversationId)
      const cardId = req.body.cardId || req.body.id || req.body.conversationId;
      // Aceita variações para a coluna de destino (targetColumnId, columnId, status)
      let targetStatus = req.body.targetColumnId || req.body.columnId || req.body.status;

      if (!cardId || !targetStatus) {
        return res.status(400).json({ error: 'Identificadores do card ou da coluna ausentes no envio.' });
      }

      // Normaliza nomes de colunas caso o front use maiúsculas (ex: "EM ABERTO" -> "open")
      targetStatus = targetStatus.toString().toLowerCase();
      if (targetStatus.includes('aberto')) targetStatus = 'open';
      if (targetStatus.includes('agendado') || targetStatus.includes('snoozed')) targetStatus = 'snoozed';
      if (targetStatus.includes('resolvido') || targetStatus.includes('resolved')) targetStatus = 'resolved';

      const updateUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${cardId}`;
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'api_access_token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `O Chatwoot recusou a alteração.` });
      }

      // Retorna sucesso total e também repassa o que foi alterado para o front aceitar visualmente
      return res.status(200).json({ 
        success: true, 
        id: cardId, 
        status: targetStatus,
        message: 'Conversa movida e atualizada com sucesso!' 
      });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- LISTAR AS CONVERSAS (GET) ---
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

          // Envia propriedades duplicadas para blindar contra qualquer exigência do front-end
          statusColumns[status].cards.push({
            id: conv.id.toString(),
            cardId: conv.id.toString(),
            conversationId: conv.id.toString(),
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
