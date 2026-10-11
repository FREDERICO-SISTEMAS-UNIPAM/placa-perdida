# 🚗 Placa Perdida - Ache o Dono da Placa & Rede Cidadã

O **Placa Perdida** é um serviço web comunitário e de utilidade pública criado para conectar pessoas a proprietários de veículos sem qualquer burocracia do Detran.

Se você:
1. 🔍 **Achou uma placa de veículo caída na rua** e quer devolver ao dono;
2. 🚨 **Viu um carro com alarme disparado** e quer avisar o proprietário antes de descarregar a bateria;
3. 🚗💥 **Esbarrou em um veículo estacionado** e quer agir honestamente pagando pelo prejuízo;
4. 💡 **Notou um veículo com farol aceso ou vidro aberto** na rua;

Basta digitar a placa no site e enviar uma mensagem direta com 1 clique pelo WhatsApp!

---

## 🚀 Como Funciona

- **Busca Rápida de Placa**: Suporta tanto o padrão novo **Mercosul** (`BRA2E19`) quanto o padrão antigo tradicional (`ABC-1234`).
- **Visualizador Gráfico Interativo**: Exibe a placa gráfica estilizada em tempo real conforme você digita.
- **Ações Imediatas de WhatsApp**: O sistema gera automaticamente mensagens pré-formatadas contextualizadas com local e dados do veículo.
- **Cadastro Simples com PIN**: Em menos de 1 minuto o proprietário cadastra seu veículo e define um PIN de 4 dígitos para gerenciar ou excluir quando vender o carro.
- **Espaço Publicitário & Monetização**: Banners integrados para parceiros como chaveiros 24h, seguradoras, guinchos e oficinas mecânicas, com botão direto para novos anunciantes.

---

## ☁️ Hospedagem 24/7 na Nuvem

Este projeto foi construído para rodar **100% independente do seu computador**:
- Publicado via **GitHub Pages**:
  - `https://frederico-sistemas-unipam.github.io/placa-perdida/`
- Gratuito, seguro com certificado SSL e acessível de qualquer celular ou computador no mundo.

---

## 🛠️ Personalização e Anúncios

Para alterar os anunciantes ou o WhatsApp para onde vão as propostas comerciais de patrocínio, basta editar o arquivo `ads-config.js`:
```javascript
window.ADS_CONFIG = {
  adminWhatsApp: '5534999999999', // Seu WhatsApp
  banners: [ ... ]
};
```
