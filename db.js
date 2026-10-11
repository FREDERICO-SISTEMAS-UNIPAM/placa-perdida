/**
 * Módulo de Banco de Dados - Placa Perdida
 * Suporta persistência local resiliente, sincronização global via Firebase
 * e importação/exportação instantânea via URL/QR Code entre celular e computador.
 */

const STORAGE_KEY = 'placa_perdida_veiculos_v1';
const FIREBASE_URL_KEY = 'placa_perdida_firebase_url';

// Dados iniciais de demonstração para testes imediatos
const INITIAL_VEHICLES = [
  {
    placa: 'BRA2E19',
    tipo: 'Carro',
    modelo: 'Chevrolet Onix',
    cor: 'Branco',
    cidade: 'Patos de Minas',
    estado: 'MG',
    proprietario: 'Lucas Silva',
    whatsapp: '34999123456',
    pin: '1234',
    criadoEm: '2026-10-01T10:00:00Z'
  },
  {
    placa: 'ABC1234',
    tipo: 'Carro',
    modelo: 'Volkswagen Gol',
    cor: 'Prata',
    cidade: 'Uberlândia',
    estado: 'MG',
    proprietario: 'Mariana Costa',
    whatsapp: '34998877665',
    pin: '2026',
    criadoEm: '2026-10-05T14:30:00Z'
  },
  {
    placa: 'MOT3A21',
    tipo: 'Moto',
    modelo: 'Honda CG 160 Titan',
    cor: 'Vermelha',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    proprietario: 'Carlos Eduardo',
    whatsapp: '31991238899',
    pin: '9988',
    criadoEm: '2026-10-08T09:15:00Z'
  }
];

class PlacaDB {
  constructor() {
    this.init();
  }

  init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_VEHICLES));
      }
    } catch (e) {
      console.warn('LocalStorage indisponível, usando memória volátil:', e);
      this.memoryDb = [...INITIAL_VEHICLES];
    }
  }

  // Obtém a URL do Firebase configurada
  getFirebaseUrl() {
    try {
      const custom = localStorage.getItem(FIREBASE_URL_KEY);
      if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
    } catch (e) {}

    if (window.CLOUD_CONFIG && window.CLOUD_CONFIG.firebaseUrl) {
      return window.CLOUD_CONFIG.firebaseUrl.trim().replace(/\/+$/, '');
    }
    return '';
  }

  setFirebaseUrl(url) {
    const clean = (url || '').trim().replace(/\/+$/, '');
    try {
      if (clean) {
        localStorage.setItem(FIREBASE_URL_KEY, clean);
      } else {
        localStorage.removeItem(FIREBASE_URL_KEY);
      }
    } catch (e) {}
    return clean;
  }

  // Normaliza placa (remove traços, espaços e converte para maiúsculo)
  cleanPlate(plate) {
    if (!plate) return '';
    return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  // Formata placa visualmente
  formatPlate(cleanPlate) {
    cleanPlate = this.cleanPlate(cleanPlate);
    if (cleanPlate.length === 7) {
      if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
        return `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
      }
      return cleanPlate;
    }
    return cleanPlate;
  }

  isMercosul(cleanPlate) {
    return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanPlate);
  }

  getAllLocal() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : (this.memoryDb || INITIAL_VEHICLES);
    } catch (e) {
      return this.memoryDb || INITIAL_VEHICLES;
    }
  }

  saveAllLocal(vehicles) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch (e) {
      this.memoryDb = vehicles;
    }
  }

  // Busca placa (primeiro na nuvem, com fallback local instantâneo)
  async buscarPlaca(placaBuscada) {
    const limpa = this.cleanPlate(placaBuscada);
    if (!limpa) return null;

    const firebaseUrl = this.getFirebaseUrl();
    if (firebaseUrl) {
      try {
        const res = await fetch(`${firebaseUrl}/veiculos/${limpa}.json`);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData && cloudData.placa) {
            // Atualiza cache local
            const local = this.getAllLocal();
            const idx = local.findIndex(v => this.cleanPlate(v.placa) === limpa);
            if (idx >= 0) {
              local[idx] = cloudData;
            } else {
              local.push(cloudData);
            }
            this.saveAllLocal(local);
            return { ...cloudData };
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar Firebase:', err);
      }
    }

    // Consulta base local
    const lista = this.getAllLocal();
    const veiculo = lista.find(v => this.cleanPlate(v.placa) === limpa);
    return veiculo ? { ...veiculo } : null;
  }

  // Cadastra novo veículo (salva no banco local e na nuvem)
  async cadastrar(veiculo) {
    const limpa = this.cleanPlate(veiculo.placa);
    if (!limpa || limpa.length !== 7) {
      throw new Error('A placa deve conter exatamente 7 caracteres válidos (Mercosul ou padrão antigo).');
    }

    const lista = this.getAllLocal();
    const existe = lista.some(v => this.cleanPlate(v.placa) === limpa);
    if (existe) {
      throw new Error('Esta placa já está cadastrada! Para alterar os dados, utilize a opção "Gerenciar Meu Cadastro" com seu PIN.');
    }

    const novoVeiculo = {
      placa: limpa,
      tipo: veiculo.tipo || 'Carro',
      modelo: (veiculo.modelo || '').trim(),
      cor: (veiculo.cor || '').trim(),
      cidade: (veiculo.cidade || '').trim(),
      estado: (veiculo.estado || '').toUpperCase().trim(),
      proprietario: (veiculo.proprietario || 'Proprietário').trim(),
      whatsapp: veiculo.whatsapp.replace(/\D/g, ''),
      pin: (veiculo.pin || '1234').trim(),
      criadoEm: new Date().toISOString()
    };

    lista.push(novoVeiculo);
    this.saveAllLocal(lista);

    // Salva na nuvem se Firebase estiver ativo
    const firebaseUrl = this.getFirebaseUrl();
    if (firebaseUrl) {
      try {
        await fetch(`${firebaseUrl}/veiculos/${limpa}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novoVeiculo)
        });
      } catch (err) {
        console.warn('Erro ao salvar no Firebase:', err);
      }
    }

    return novoVeiculo;
  }

  // Atualiza veículo
  async atualizar(placa, pin, novosDados) {
    const limpa = this.cleanPlate(placa);
    const lista = this.getAllLocal();
    const index = lista.findIndex(v => this.cleanPlate(v.placa) === limpa);

    if (index === -1) {
      throw new Error('Veículo não encontrado.');
    }

    if (lista[index].pin !== pin.trim()) {
      throw new Error('PIN de segurança incorreto. Não foi possível alterar o cadastro.');
    }

    lista[index] = {
      ...lista[index],
      ...novosDados,
      placa: limpa,
      whatsapp: novosDados.whatsapp ? novosDados.whatsapp.replace(/\D/g, '') : lista[index].whatsapp,
      atualizadoEm: new Date().toISOString()
    };

    this.saveAllLocal(lista);

    const firebaseUrl = this.getFirebaseUrl();
    if (firebaseUrl) {
      try {
        await fetch(`${firebaseUrl}/veiculos/${limpa}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lista[index])
        });
      } catch (err) {}
    }

    return lista[index];
  }

  // Exclui veículo
  async excluir(placa, pin) {
    const limpa = this.cleanPlate(placa);
    const lista = this.getAllLocal();
    const index = lista.findIndex(v => this.cleanPlate(v.placa) === limpa);

    if (index === -1) {
      throw new Error('Veículo não encontrado.');
    }

    if (lista[index].pin !== pin.trim()) {
      throw new Error('PIN de segurança incorreto. Não foi possível excluir o cadastro.');
    }

    lista.splice(index, 1);
    this.saveAllLocal(lista);

    const firebaseUrl = this.getFirebaseUrl();
    if (firebaseUrl) {
      try {
        await fetch(`${firebaseUrl}/veiculos/${limpa}.json`, {
          method: 'DELETE'
        });
      } catch (err) {}
    }

    return true;
  }

  // Cria payload portátil codificado para transferir o veículo para outro dispositivo via link/QR Code
  createSharePayload(veiculo) {
    try {
      const json = JSON.stringify(veiculo);
      return btoa(encodeURIComponent(json));
    } catch (e) {
      return '';
    }
  }

  // Importa veículo a partir do payload recebido por link ou QR Code
  importFromPayload(payloadString) {
    try {
      const json = decodeURIComponent(atob(payloadString));
      const veiculo = JSON.parse(json);
      if (!veiculo || !veiculo.placa) return null;

      const limpa = this.cleanPlate(veiculo.placa);
      const lista = this.getAllLocal();
      const idx = lista.findIndex(v => this.cleanPlate(v.placa) === limpa);

      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...veiculo, placa: limpa };
      } else {
        lista.push({ ...veiculo, placa: limpa });
      }
      this.saveAllLocal(lista);
      return veiculo;
    } catch (e) {
      console.error('Falha ao decodificar payload de veículo:', e);
      return null;
    }
  }
}

window.placaDB = new PlacaDB();
