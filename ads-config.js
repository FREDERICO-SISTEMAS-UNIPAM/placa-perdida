/**
 * Configuração de Espaço Publicitário & Monetização - Placa Perdida
 * Personalize com seus patrocinadores ou configure seu WhatsApp para novos anunciantes.
 */

window.ADS_CONFIG = {
  // WhatsApp do administrador do site para receber propostas de anúncio
  adminWhatsApp: '5534999999999', // Substitua pelo seu WhatsApp oficial
  adminName: 'Equipe Comercial Placa Perdida',

  // Anúncios patrocinados padrão
  banners: [
    {
      id: 'seguros-1',
      categoria: 'Seguro & Proteção Veicular',
      titulo: 'Proteja seu Veículo com até 40% de Desconto',
      descricao: 'Cobertura completa contra roubo, furto, colisão e assistência 24h em todo o Brasil. Sem análise de perfil!',
      icone: '🛡️',
      tag: 'Patrocinador Oficial',
      ctaText: 'Simular Seguro Grátis',
      linkWhatsApp: '5534999999999',
      mensagemPadrao: 'Olá! Vi o anúncio no Placa Perdida e quero simular um seguro para meu veículo.'
    },
    {
      id: 'chaveiro-enigma',
      tema: 'enigma',
      categoria: 'Chaveiro 24h',
      titulo: 'Perdeu a chave ou trancou dentro do carro?',
      servicos: [
        'Abertura de veículos e residências',
        'Cópia de chaves codificadas',
        'Controles e telecomandos'
      ],
      telefoneFixo: '+553438257643',
      telefoneFixoTexto: '(34) 3825-7643',
      endereco: 'Nº 579',
      ctaText: 'Chamar no WhatsApp',
      linkWhatsApp: '5534999267863',
      mensagemPadrao: 'Olá, Chaveiro Enigma! Vi o anúncio no site e preciso de um chaveiro.'
    },
    {
      id: 'guincho-1',
      categoria: 'Guincho & Auto Socorro',
      titulo: 'Guincho Rápido para Carros, Motos e Caminhões',
      descricao: 'Socorro emergencial, recarga de bateria, troca de pneus e reboque plataforma disponível 24 horas por dia.',
      icone: '🚛',
      tag: 'Socorro Imediato',
      ctaText: 'Solicitar Guincho',
      linkWhatsApp: '5534999999999',
      mensagemPadrao: 'Olá! Preciso de um guincho com urgência, vi o anúncio no site Placa Perdida.'
    }
  ]
};
