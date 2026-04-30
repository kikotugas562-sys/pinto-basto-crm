
PINTO BASTO CRM PREMIUM FINAL

Melhorias:
- Login com logo centralizado.
- Logo no menu no canto superior esquerdo.
- Dashboard premium com cards, gráficos e prioridades.
- Vídeos de demonstração gerados.
- Clientes mais completos.
- Chat local.
- Reunião com áudio, conversa e resumo.

Como abrir:
1. Extrai o ZIP.
2. Abre login.html com Live Server.
3. Cria conta ou usa contas demo.

Contas demo:
marta@pintobasto.pt / 1234
ricardo@pintobasto.pt / 1234


NOVIDADES - INTERAÇÕES E ÁUDIO PRO:
- Interação estruturada com cliente, contacto, cargo, canal e follow-up.
- Gravação inicia também a transcrição automática quando suportada pelo Chrome.
- Falas aparecem em cartões e numa tabela.
- Deteção automática local de "Pessoa 1", "Pessoa 2", "Pessoa 3" por pausas/turnos.
- Permite corrigir manualmente o falante de cada fala.
- Resumo profissional com temas, riscos, decisões e próximos passos.
- Exportação JSON estruturada.

NOTA:
Identificar automaticamente a identidade real da pessoa pela voz exige IA externa/servidor.
Esta versão local identifica falantes por turnos e pausas, sem Firebase e sem APIs pagas.


NOVIDADES - DEFINIÇÕES E NOTIFICAÇÕES PRO:
- Temas visuais: clássico, premium escuro, claro executivo, oceano, dourado.
- Densidade: confortável, compacta, espaçosa.
- Arredondamento: suave, muito arredondado, reto.
- Tamanho de fonte.
- Animações, efeito vidro, sombras, hover e reduzir movimento.
- Notificações internas reais:
  - cliente criado
  - interação guardada
  - mensagem enviada
  - gravação iniciada
  - definições alteradas
  - backup exportado
- Badge de notificações no menu.
- Painel de notificações com marcar como lidas.
- Opção para notificações do browser.
- Exportação de backup JSON.
- Estado da aplicação com contadores.


PORTAL DO CLIENTE:
- cliente-login.html = login separado para clientes
- cliente.html = portal do cliente
- O cliente NÃO tem dashboard interna nem modo reunião
- Cliente tem:
  - informação sobre a empresa
  - lista de pessoas da empresa
  - chat com contas internas
  - vídeos
  - definições ativas

CONTA DEMO CLIENTE:
cliente@empresa.pt / 1234

ENTRADAS:
- Equipa interna: login.html
- Cliente: cliente-login.html


CHAT INTERLIGADO:
- Operadores e clientes usam agora o mesmo histórico de mensagens.
- Mensagens guardadas na chave localStorage: pb_unified_messages.
- Cliente envia mensagem em cliente.html > Chat.
- Operador vê e responde em index.html > Chat.
- Operador também consegue iniciar conversa com clientes existentes.
- Como é versão local, funciona no mesmo browser/perfil. Para computadores diferentes em tempo real, será preciso backend/servidor.


ADIÇÕES ESTILO VÍDEO / POWER APPS CRM:
- Nova secção: CRM Lista.
- Lista rápida de clientes com estado por cor.
- Pesquisa e filtros por Cliente, País, Estado Cliente e Tipo Cliente.
- Detalhe do cliente com separadores:
  - Informação Geral
  - Gestão Utilizadores
  - Alertas
  - Histórico
- Campos adicionais:
  - Lead
  - Estado Cliente
  - Tipo Cliente
  - NIF
  - País
  - Domínio Email
  - Morada Sede
  - dynamics_number
  - Nº dias para alerta de inatividade
  - Última interação/alerta
- Alertas de inatividade reais baseados na última interação.
- Gestão de utilizadores/contactos por cliente.
- Histórico de interações por cliente.
- Interação rápida com cliente obrigatório, tipo obrigatório e caixa grande de interação.
