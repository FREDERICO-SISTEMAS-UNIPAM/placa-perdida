/**
 * Lógica Principal - Placa Perdida
 * Máscaras, busca em tempo real, integração WhatsApp, sincronização em nuvem e QR Code.
 */

class PlacaApp {
  constructor() {
    this.currentPlateInView = null;
    this.init();
  }

  init() {
    this.setupPlateInputWatchers();
    this.setupPhoneMasks();
    this.renderAds();
    
    // Verifica parâmetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Importação direta via payload codificado (ex: vindo de QR Code ou link compartilhado)
    const importPayload = urlParams.get('import');
    if (importPayload) {
      const veiculoImportado = window.placaDB.importFromPayload(importPayload);
      if (veiculoImportado) {
        this.showToast(`Veículo ${veiculoImportado.placa} recebido e sincronizado no seu celular!`, 'success');
        this.fillSearch(veiculoImportado.placa);
        return;
      }
    }

    // Busca direta por parâmetro ?p=ABC1234
    const initialPlate = urlParams.get('p') || urlParams.get('placa');
    if (initialPlate) {
      this.fillSearch(initialPlate);
    }
  }

  // Monitora digitação na barra de busca para atualizar a placa gráfica em tempo real
  setupPlateInputWatchers() {
    const searchInput = document.getElementById('plateSearchInput');
    const plateLiveText = document.getElementById('plateLiveText');
    const plateVisualDisplay = document.getElementById('plateVisualDisplay');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Auto-formatação se for padrão antigo
        if (val.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(val)) {
          e.target.value = `${val.slice(0, 3)}-${val.slice(3)}`;
        } else {
          e.target.value = val;
        }

        // Atualiza a placa gráfica
        const clean = val.slice(0, 7);
        if (plateLiveText) {
          plateLiveText.textContent = clean || 'PLACA';
        }

        // Alterna entre estilo Mercosul e estilo cinza antigo
        if (plateVisualDisplay) {
          if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
            plateVisualDisplay.classList.add('plate-old');
          } else {
            plateVisualDisplay.classList.remove('plate-old');
          }
        }
      });
    }

    // Monitora também o campo de cadastro
    const regPlateInput = document.getElementById('regPlate');
    if (regPlateInput) {
      regPlateInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(val)) {
          e.target.value = `${val.slice(0, 3)}-${val.slice(3)}`;
        } else {
          e.target.value = val;
        }
      });
    }
  }

  // Máscara inteligente para telefone celular brasileiro
  setupPhoneMasks() {
    const phoneInput = document.getElementById('regWhatsapp');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);

        if (v.length > 10) {
          e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
        } else if (v.length > 6) {
          e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
        } else if (v.length > 2) {
          e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        } else if (v.length > 0) {
          e.target.value = `(${v}`;
        }
      });
    }
  }

  // Preenche a busca rapidamente ao clicar nas tags de exemplo
  fillSearch(plate) {
    const input = document.getElementById('plateSearchInput');
    if (input) {
      input.value = plate;
      input.dispatchEvent(new Event('input'));
      this.handleSearch();
      
      const searchSection = document.getElementById('searchSection');
      if (searchSection) {
        searchSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Executa a busca de placa no banco de dados (async com suporte a nuvem)
  async handleSearch() {
    const input = document.getElementById('plateSearchInput');
    if (!input || !input.value.trim()) {
      this.showToast('Por favor, digite uma placa para buscar.', 'error');
      return;
    }

    const query = input.value.trim();
    const resultsSection = document.getElementById('resultsSection');
    const container = document.getElementById('resultsContainer');
    if (!resultsSection || !container) return;

    // Feedback visual de carregamento
    resultsSection.style.display = 'block';
    container.innerHTML = `
      <div class="result-card" style="text-align: center; padding: 30px;">
        <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
        <p style="color: var(--text-muted);">Consultando placa na rede e na nuvem...</p>
      </div>
    `;

    const veiculo = await window.placaDB.buscarPlaca(query);
    this.currentPlateInView = veiculo;

    if (veiculo) {
      const placaFormatada = window.placaDB.formatPlate(veiculo.placa);
      const isMercosul = window.placaDB.isMercosul(veiculo.placa);

      // Formata telefone visível
      const tel = veiculo.whatsapp;
      const telFormatado = tel.length === 11 
        ? `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}` 
        : tel;

      container.innerHTML = `
        <div class="result-card" id="cardFound">
          <div class="result-header">
            <div>
              <span class="result-status-badge">✔ Proprietário Cadastrado</span>
              <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 8px;">
                ${placaFormatada}
                <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted);">
                  (${isMercosul ? 'Padrão Mercosul' : 'Padrão Tradicional'})
                </span>
              </h2>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="quick-tag-btn" style="padding: 8px 14px; font-size: 0.85rem; background: hsla(188, 94%, 48%, 0.15); border-color: var(--accent-cyan);" onclick="window.app.openShareModal()">
                📲 Abrir no Celular / QR Code
              </button>
              <button class="quick-tag-btn" style="padding: 8px 14px; font-size: 0.85rem;" onclick="window.app.openManageModal('${veiculo.placa}')">
                ⚙️ Gerenciar
              </button>
            </div>
          </div>

          <!-- Grade de Informações do Veículo -->
          <div class="result-details-grid">
            <div class="detail-item">
              <div class="detail-label">Proprietário / Contato</div>
              <div class="detail-value">${this.escapeHtml(veiculo.proprietario)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">WhatsApp</div>
              <div class="detail-value" style="color: var(--accent-emerald); font-family: var(--font-mono);">
                ${telFormatado}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Veículo</div>
              <div class="detail-value">
                ${veiculo.tipo} ${veiculo.modelo ? '• ' + this.escapeHtml(veiculo.modelo) : ''}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Cidade / Estado</div>
              <div class="detail-value">
                ${this.escapeHtml(veiculo.cidade)} / ${veiculo.estado}
              </div>
            </div>
          </div>

          <!-- Painel de Disparo de WhatsApp -->
          <div class="actions-panel">
            <h3 class="actions-title">
              <span>💬</span> Escolha o motivo do contato e envie no WhatsApp:
            </h3>
            <p class="actions-subtitle">
              Ao clicar no botão, a conversa será aberta automaticamente no WhatsApp com a mensagem pronta.
            </p>

            <div class="location-input-group">
              <label for="resultLocationInput">Onde você está? (Opcional - será adicionado à mensagem):</label>
              <input 
                type="text" 
                id="resultLocationInput" 
                class="location-input" 
                placeholder="Ex: Rua Major Gote, Centro - em frente à farmácia"
              >
            </div>

            <div class="whatsapp-buttons-grid">
              
              <!-- Botão 1: Achei sua placa -->
              <button class="wa-btn wa-btn-lost" onclick="window.app.sendWhatsApp('lost')">
                <span class="wa-btn-icon">🔍</span>
                <span class="wa-btn-content">
                  <span class="wa-btn-title">Achei sua Placa Perdida</span>
                  <span class="wa-btn-desc">Avisar que achou e onde combinam</span>
                </span>
              </button>

              <!-- Botão 2: Alarme Disparado -->
              <button class="wa-btn wa-btn-alarm" onclick="window.app.sendWhatsApp('alarm')">
                <span class="wa-btn-icon">🚨</span>
                <span class="wa-btn-content">
                  <span class="wa-btn-title">Alarme Disparado</span>
                  <span class="wa-btn-desc">Avisar que o carro está disparando</span>
                </span>
              </button>

              <!-- Botão 3: Esbarrão no Veículo -->
              <button class="wa-btn wa-btn-bump" onclick="window.app.sendWhatsApp('bump')">
                <span class="wa-btn-icon">🚗💥</span>
                <span class="wa-btn-content">
                  <span class="wa-btn-title">Esbarrei no seu Veículo</span>
                  <span class="wa-btn-desc">Assumir o dano e acertar conserto</span>
                </span>
              </button>

              <!-- Botão 4: Farol / Vidro Aberto -->
              <button class="wa-btn wa-btn-warning" onclick="window.app.sendWhatsApp('warning')">
                <span class="wa-btn-icon">💡</span>
                <span class="wa-btn-content">
                  <span class="wa-btn-title">Vidro Aberto / Farol Aceso</span>
                  <span class="wa-btn-desc">Aviso preventivo ao condutor</span>
                </span>
              </button>

              <!-- Botão 5: Mensagem Personalizada -->
              <button class="wa-btn wa-btn-custom" onclick="window.app.sendWhatsApp('custom')">
                <span class="wa-btn-icon">✍️</span>
                <span class="wa-btn-content">
                  <span class="wa-btn-title">Mensagem Personalizada</span>
                  <span class="wa-btn-desc">Escreva seu próprio aviso</span>
                </span>
              </button>

            </div>
          </div>
        </div>
      `;
      this.showToast('Veículo localizado com sucesso!', 'success');
    } else {
      const placaFormatada = window.placaDB.formatPlate(query);
      container.innerHTML = `
        <div class="result-card not-found-card" id="cardNotFound">
          <div class="not-found-icon">🔎</div>
          <h2 class="not-found-title">Placa "${placaFormatada}" não encontrada</h2>
          <p class="not-found-text">
            Esta placa ainda não foi cadastrada na nossa rede comunitária voluntária.
            Se você é o proprietário deste veículo, cadastre agora gratuitamente em menos de 1 minuto para ser avisado sempre que necessário!
          </p>
          <button class="btn-primary-action" onclick="window.app.prepareRegisterWithPlate('${query}')">
            <span>➕</span> Cadastrar Placa "${placaFormatada}" Agora
          </button>
        </div>
      `;
      this.showToast('Placa não encontrada na base.', 'info');
    }

    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Prepara formulário de cadastro com a placa que não foi encontrada
  prepareRegisterWithPlate(plate) {
    const regInput = document.getElementById('regPlate');
    if (regInput) {
      regInput.value = plate.toUpperCase();
      regInput.dispatchEvent(new Event('input'));
    }
    const regSection = document.getElementById('registerSection');
    if (regSection) {
      regSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Constrói e abre a mensagem formatada no WhatsApp
  sendWhatsApp(actionType) {
    if (!this.currentPlateInView) return;

    const v = this.currentPlateInView;
    const placaFmt = window.placaDB.formatPlate(v.placa);
    const dono = v.proprietario || 'Amigo(a)';
    const modelo = v.modelo ? ` (${v.modelo})` : '';

    const locationInput = document.getElementById('resultLocationInput');
    const local = locationInput && locationInput.value.trim() 
      ? ` no local: "${locationInput.value.trim()}"` 
      : '';

    let mensagem = '';

    switch (actionType) {
      case 'lost':
        mensagem = `Olá ${dono}! Encontrei a placa do seu veículo ${placaFmt}${modelo}${local}. Encontrei seu contato cadastrado no site Placa Perdida! Por favor, me responda aqui para combinarmos a devolução.`;
        break;

      case 'alarm':
        mensagem = `Olá ${dono}! Vi o seu veículo de placa ${placaFmt}${modelo}${local} com o alarme disparado. Achei seu contato no site Placa Perdida e resolvi te avisar para evitar transtornos ou descarregar a bateria!`;
        break;

      case 'bump':
        mensagem = `Olá ${dono}! Infelizmente acabei dando um esbarrão no seu veículo de placa ${placaFmt}${modelo}${local}. Como não encontrei você no local, pesquisei sua placa no site Placa Perdida para te avisar com honestidade. Me chame aqui para combinarmos o conserto do estrago!`;
        break;

      case 'warning':
        mensagem = `Olá ${dono}! Passei pelo seu veículo placa ${placaFmt}${modelo}${local} e reparei que está com o farol aceso ou vidro aberto. Te localizei pelo Placa Perdida para avisar por segurança!`;
        break;

      case 'custom':
      default:
        const textoCustom = prompt('Digite a mensagem que deseja enviar ao proprietário:');
        if (!textoCustom) return;
        mensagem = `Olá ${dono}! Sobre o seu veículo placa ${placaFmt}${modelo}${local}: ${textoCustom}`;
        break;
    }

    const tel = v.whatsapp.startsWith('55') ? v.whatsapp : `55${v.whatsapp}`;
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
    
    // Abre a conversa no WhatsApp
    window.open(url, '_blank');
  }

  // Cadastro de novo veículo
  async handleRegister() {
    const regPlate = document.getElementById('regPlate').value;
    const regType = document.getElementById('regType').value;
    const regModel = document.getElementById('regModel').value;
    const regColor = document.getElementById('regColor').value;
    const regOwner = document.getElementById('regOwner').value;
    const regWhatsapp = document.getElementById('regWhatsapp').value;
    const regCity = document.getElementById('regCity').value;
    const regState = document.getElementById('regState').value;
    const regPin = document.getElementById('regPin').value;
    const regConsent = document.getElementById('regConsent').checked;

    if (!regConsent) {
      this.showToast('É necessário aceitar os termos de utilidade pública.', 'error');
      return;
    }

    try {
      const novo = await window.placaDB.cadastrar({
        placa: regPlate,
        tipo: regType,
        modelo: regModel,
        cor: regColor,
        proprietario: regOwner,
        whatsapp: regWhatsapp,
        cidade: regCity,
        estado: regState,
        pin: regPin
      });

      this.showToast(`Veículo ${novo.placa} cadastrado com sucesso!`, 'success');
      
      // Limpa formulário
      document.getElementById('vehicleRegisterForm').reset();

      // Executa a busca imediatamente para mostrar o resultado ao usuário
      await this.fillSearch(novo.placa);

      // Abre automaticamente a opção de sincronizar no celular
      setTimeout(() => {
        this.openShareModal();
      }, 700);

    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Modal de Compartilhamento / QR Code
  openShareModal() {
    if (!this.currentPlateInView) return;
    const v = this.currentPlateInView;
    const payload = window.placaDB.createSharePayload(v);
    
    // Constrói link direto
    const baseUrl = window.location.origin + window.location.pathname;
    const directUrl = `${baseUrl}?import=${payload}`;

    const linkInput = document.getElementById('shareLinkInput');
    const qrImg = document.getElementById('shareQrImage');
    const modal = document.getElementById('shareModal');

    if (linkInput) linkInput.value = directUrl;
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(directUrl)}`;
    }
    if (modal) modal.classList.add('active');
  }

  closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.remove('active');
  }

  copyShareLink() {
    const linkInput = document.getElementById('shareLinkInput');
    if (linkInput && linkInput.value) {
      navigator.clipboard.writeText(linkInput.value).then(() => {
        this.showToast('Link copiado! Cole no WhatsApp ou abra no celular.', 'success');
      }).catch(() => {
        linkInput.select();
        document.execCommand('copy');
        this.showToast('Link copiado!', 'success');
      });
    }
  }

  // Modal de Nuvem Global (Firebase)
  openCloudModal() {
    const modal = document.getElementById('cloudModal');
    const input = document.getElementById('firebaseUrlInput');
    if (input) {
      input.value = window.placaDB.getFirebaseUrl();
    }
    if (modal) modal.classList.add('active');
  }

  closeCloudModal() {
    const modal = document.getElementById('cloudModal');
    if (modal) modal.classList.remove('active');
  }

  saveCloudUrl() {
    const input = document.getElementById('firebaseUrlInput');
    const val = input ? input.value : '';
    const saved = window.placaDB.setFirebaseUrl(val);

    if (saved) {
      this.showToast('Banco em nuvem conectado com sucesso!', 'success');
    } else {
      this.showToast('Modo de nuvem desativado. Usando armazenamento local e QR Code.', 'info');
    }
    this.closeCloudModal();
  }

  // Modais de Gerenciamento & PIN
  openManageModal(placa) {
    this.plateToManage = placa;
    const modal = document.getElementById('manageModal');
    const pinInput = document.getElementById('managePinInput');
    if (pinInput) pinInput.value = '';
    if (modal) modal.classList.add('active');
  }

  closeManageModal() {
    const modal = document.getElementById('manageModal');
    if (modal) modal.classList.remove('active');
  }

  async deleteCurrentPlate() {
    const pin = document.getElementById('managePinInput').value;
    if (!pin) {
      this.showToast('Digite o PIN de 4 dígitos para autorizar a exclusão.', 'error');
      return;
    }

    if (!confirm('Tem certeza que deseja remover o cadastro desta placa da rede?')) {
      return;
    }

    try {
      await window.placaDB.excluir(this.plateToManage, pin);
      this.showToast('Cadastro excluído com sucesso.', 'info');
      this.closeManageModal();
      
      const resultsSection = document.getElementById('resultsSection');
      if (resultsSection) resultsSection.style.display = 'none';
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleManageAction() {
    const pin = document.getElementById('managePinInput').value;
    if (!pin) {
      this.showToast('Digite seu PIN.', 'error');
      return;
    }

    const veiculo = await window.placaDB.buscarPlaca(this.plateToManage);
    if (!veiculo || veiculo.pin !== pin.trim()) {
      this.showToast('PIN incorreto.', 'error');
      return;
    }

    this.showToast('PIN autenticado! Preenchendo dados no formulário para edição.', 'success');
    this.closeManageModal();

    // Carrega dados no formulário de cadastro para reenvio
    document.getElementById('regPlate').value = window.placaDB.formatPlate(veiculo.placa);
    document.getElementById('regType').value = veiculo.tipo;
    document.getElementById('regModel').value = veiculo.modelo || '';
    document.getElementById('regColor').value = veiculo.cor || '';
    document.getElementById('regOwner').value = veiculo.proprietario;
    document.getElementById('regCity').value = veiculo.cidade;
    document.getElementById('regState').value = veiculo.estado;
    document.getElementById('regPin').value = veiculo.pin;
    
    const w = veiculo.whatsapp;
    if (w.length === 11) {
      document.getElementById('regWhatsapp').value = `(${w.slice(0, 2)}) ${w.slice(2, 7)}-${w.slice(7)}`;
    } else {
      document.getElementById('regWhatsapp').value = w;
    }

    await window.placaDB.excluir(veiculo.placa, pin);

    const regSection = document.getElementById('registerSection');
    if (regSection) regSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Modais de Anúncios
  openAdModal() {
    const modal = document.getElementById('adModal');
    if (modal) modal.classList.add('active');
  }

  closeAdModal() {
    const modal = document.getElementById('adModal');
    if (modal) modal.classList.remove('active');
  }

  contactAdminForAds() {
    const cfg = window.ADS_CONFIG || {};
    const adminTel = cfg.adminWhatsApp || '5534999999999';
    const msg = 'Olá! Acessei o site Placa Perdida e tenho interesse em anunciar minha empresa no espaço publicitário.';
    window.open(`https://wa.me/${adminTel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // Renderiza Banners Patrocinados
  renderAds() {
    const container = document.getElementById('adsGridContainer');
    if (!container || !window.ADS_CONFIG || !window.ADS_CONFIG.banners) return;

    const banners = window.ADS_CONFIG.banners;
    container.innerHTML = banners.map(ad => {
      if (ad.tema === 'enigma') {
        return `
      <article class="ad-card ad-enigma" id="ad-${ad.id}">
        <div class="enigma-head">
          <div class="enigma-brand">
            <span class="enigma-line1">CHAVEIRO</span>
            <span class="enigma-line2">Enigma</span>
          </div>
          <span class="enigma-badge">24<small>HORAS</small></span>
        </div>
        <div class="enigma-body">
          <p class="enigma-title">${ad.titulo}</p>
          ${ad.avaliacao ? `<p class="enigma-rating">${ad.avaliacao}</p>` : ''}
          <ul class="enigma-list">
            ${(ad.servicos || []).map(s => `<li>${s}</li>`).join('')}
          </ul>
          <div class="enigma-info">
            <a href="tel:${ad.telefoneFixo}">📞 ${ad.telefoneFixoTexto}</a>
            <a href="${ad.rotaUrl}" target="_blank" rel="noopener">📍 ${ad.endereco} · Ver rota</a>
          </div>
        </div>
        <button class="enigma-cta" onclick="window.app.triggerAdClick('${ad.linkWhatsApp}', '${encodeURIComponent(ad.mensagemPadrao)}')">
          💬 ${ad.ctaText}
        </button>
      </article>`;
      }
      return `
      <article class="ad-card" id="ad-${ad.id}">
        <div class="ad-card-top">
          <div class="ad-tag">
            <span>${ad.icone}</span>
            <span>${ad.tag}</span>
          </div>
          <h3 class="ad-title">${ad.titulo}</h3>
          <p class="ad-desc">${ad.descricao}</p>
        </div>
        <button class="ad-cta-btn" onclick="window.app.triggerAdClick('${ad.linkWhatsApp}', '${encodeURIComponent(ad.mensagemPadrao)}')">
          <span>${ad.ctaText}</span> ➔
        </button>
      </article>`;
    }).join('');
  }

  triggerAdClick(tel, encodedMsg) {
    window.open(`https://wa.me/${tel}?text=${encodedMsg}`, '_blank');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = '0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Inicializa a aplicação
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PlacaApp();
});

// Barra fixa do patrocinador aparece quando o destaque do topo sai da tela
(function () {
  const hero = document.getElementById('sponsorHero');
  const bar = document.getElementById('sponsorSticky');
  if (!hero || !bar || !('IntersectionObserver' in window)) { if (bar) bar.classList.add('visible'); return; }
  new IntersectionObserver(([e]) => bar.classList.toggle('visible', !e.isIntersecting)).observe(hero);
})();
