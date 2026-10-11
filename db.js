/**
 * Módulo de Banco de Dados - Placa Perdida
 * Suporta persistência local resiliente e sincronização em nuvem.
 */

const STORAGE_KEY = 'placa_perdida_veiculos_v1';

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
    this.cloudConfig = null;
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

  // Normaliza placa (remove traços, espaços e converte para maiúsculo)
  cleanPlate(plate) {
    if (!plate) return '';
    return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  // Formata placa visualmente
  formatPlate(cleanPlate) {
    cleanPlate = this.cleanPlate(cleanPlate);
    if (cleanPlate.length === 7) {
      // Padrão antigo: ABC1234 -> ABC-1234
      if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
        return `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
      }
      // Mercosul: ABC1D23
      return cleanPlate;
    }
    return cleanPlate;
  }

  isMercosul(cleanPlate) {
    return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanPlate);
  }

  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : (this.memoryDb || INITIAL_VEHICLES);
    } catch (e) {
      return this.memoryDb || INITIAL_VEHICLES;
    }
  }

  saveAll(vehicles) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch (e) {
      this.memoryDb = vehicles;
    }
    // Dispara evento de sincronização se configurado
    this.syncToCloud(vehicles);
  }

  buscarPlaca(placaBuscada) {
    const limpa = this.cleanPlate(placaBuscada);
    if (!limpa) return null;

    const lista = this.getAll();
    const veiculo = lista.find(v => this.cleanPlate(v.placa) === limpa);
    return veiculo ? { ...veiculo } : null;
  }

  cadastrar(veiculo) {
    const limpa = this.cleanPlate(veiculo.placa);
    if (!limpa || limpa.length !== 7) {
      throw new Error('A placa deve conter exatamente 7 caracteres válidos (Mercosul ou padrão antigo).');
    }

    const lista = this.getAll();
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
    this.saveAll(lista);
    return novoVeiculo;
  }

  atualizar(placa, pin, novosDados) {
    const limpa = this.cleanPlate(placa);
    const lista = this.getAll();
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
      placa: limpa, // Não permite mudar placa diretamente
      whatsapp: novosDados.whatsapp ? novosDados.whatsapp.replace(/\D/g, '') : lista[index].whatsapp,
      atualizadoEm: new Date().toISOString()
    };

    this.saveAll(lista);
    return lista[index];
  }

  excluir(placa, pin) {
    const limpa = this.cleanPlate(placa);
    const lista = this.getAll();
    const index = lista.findIndex(v => this.cleanPlate(v.placa) === limpa);

    if (index === -1) {
      throw new Error('Veículo não encontrado.');
    }

    if (lista[index].pin !== pin.trim()) {
      throw new Error('PIN de segurança incorreto. Não foi possível excluir o cadastro.');
    }

    lista.splice(index, 1);
    this.saveAll(lista);
    return true;
  }

  // Hook preparado para sincronização em nuvem
  syncToCloud(vehicles) {
    if (this.cloudConfig && this.cloudConfig.endpoint) {
      try {
        fetch(this.cloudConfig.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicles })
        }).catch(err => console.debug('Sync cloud silencioso:', err));
      } catch (err) {
        // silencioso
      }
    }
  }
}

window.placaDB = new PlacaDB();
