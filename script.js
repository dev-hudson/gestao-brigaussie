// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCx-RmdAAEn0j_f2ovkKsxSp9lym4KbiVw",
    authDomain: "brigaussie-precificador.firebaseapp.com",
    projectId: "brigaussie-precificador",
    storageBucket: "brigaussie-precificador.firebasestorage.app",
    messagingSenderId: "1075009848995",
    appId: "1:1075009848995:web:9cceeb4182c61f3235e116"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
window.auth = auth;

// CAPTURA O RESULTADO DO REDIRECIONAMENTO DO GOOGLE
auth.getRedirectResult().catch((error) => {
    console.error("Erro no redirect do Google:", error);
    alert("Erro no login com Google: " + error.message);
});

// MONITOR DE LOGIN
window.auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-logged-out').style.display = 'none';
        document.getElementById('auth-logged-in').style.display = 'flex';
        document.getElementById('user-display').innerText = user.email;
        // Salva o e-mail localmente para referência
        setAuthEmail(user.email);
    } else {
        document.getElementById('auth-logged-out').style.display = 'flex';
        document.getElementById('auth-logged-in').style.display = 'none';
    }
});

// 3. FUNÇÕES DE AUTENTICAÇÃO
async function criarContaEmail() {
    const emailInput = document.getElementById('auth-email');
    const senhaInput = document.getElementById('auth-senha');
    
    if (!emailInput || !senhaInput) {
        alert("Erro crítico: Elementos de input não encontrados no HTML.");
        return;
    }

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        alert("Por favor, preencha o e-mail e a senha.");
        return;
    }

    try {
        await window.auth.createUserWithEmailAndPassword(email, senha);
        alert("Conta criada e logada com sucesso!");
    } catch (error) {
        alert("Erro ao criar conta: " + error.message);
    }
}

async function entrarComEmail() {
    const emailInput = document.getElementById('auth-email');
    const senhaInput = document.getElementById('auth-senha');
    
    if (!emailInput || !senhaInput) return;

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        alert("Por favor, preencha o e-mail e a senha.");
        return;
    }

    try {
        await window.auth.signInWithEmailAndPassword(email, senha);
    } catch (error) {
        alert("Erro ao entrar: Verifique e-mail e senha.");
    }
}

async function entrarComGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await window.auth.signInWithRedirect(provider);
    } catch (error) {
        alert("Erro ao iniciar login com Google: " + error.message);
    }
}

async function fazerLogout() {
    try {
        await window.auth.signOut();
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
}

// ====== VARIÁVEIS GERAIS ======
let configuracoes = { salario: 0, horas: 0, taxaFixa: 0, valorHora: 0 };
let ingredientes = [];
let embalagens = [];
let receitas = [];
let receitaAtualComposicao = []; 
let kitAtualComposicao = [];
let emailAuth = localStorage.getItem('emailAuth') || '';

// NOVO: Controle de pastas e ordenação
let categoriasExpandidas = new Set();
let ordemCategorias = []; 
let ordemManual = false; 
let dragCatId = null;
let dragId = null;

// ====== INICIALIZAÇÃO ======
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-email').value = emailAuth;
    carregarDadosLocal();
});

// ====== NAVEGAÇÃO DE ABAS ======
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// -----------------------------------------------------
// 1. CLOUD SAVE E AUTENTICAÇÃO (PYTHON BACKEND)
// -----------------------------------------------------
function setAuthEmail(email) {
    emailAuth = email;
    localStorage.setItem('emailAuth', email);
}

async function sincronizarNuvem() {
    const user = auth.currentUser;
    if (!user) return alert("Faça login para salvar na nuvem.");

    document.getElementById("cloud-status").innerText = "Salvando...";
    
    try {
        const token = await user.getIdToken();
        
        // Mapeamento exato das suas variáveis globais
        const dados = {
            receitas: receitas || [],
            ingredientes: ingredientes || [],
            embalagens: embalagens || [],
            configuracoes: configuracoes || {},
            ordemCategorias: ordemCategorias || [],
            ordemManual: ordemManual || false
        };

        const res = await fetch('https://brigaussie-api.onrender.com/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ dados })
        });

        if (res.ok) {
            document.getElementById("cloud-status").innerText = "Salvo na nuvem!";
            setTimeout(() => document.getElementById("cloud-status").innerText = "", 3000);
        } else {
            throw new Error("Erro no backend");
        }
    } catch (erro) {
        document.getElementById("cloud-status").innerText = "Erro ao salvar";
    }
}

async function baixarNuvem() {
    const user = auth.currentUser;
    if (!user) return alert("Faça login para puxar os dados.");

    document.getElementById("cloud-status").innerText = "Baixando...";
    
    try {
        const token = await user.getIdToken();
        
        const res = await fetch('https://brigaussie-api.onrender.com/api/dados', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const json = await res.json();
            const dados = json.dados || {};

            // Substitui as variáveis locais pelo que veio do banco de dados
            if (dados.receitas) receitas = dados.receitas;
            if (dados.ingredientes) ingredientes = dados.ingredientes;
            if (dados.embalagens) embalagens = dados.embalagens;
            if (dados.configuracoes) configuracoes = dados.configuracoes;
            if (dados.ordemCategorias) ordemCategorias = dados.ordemCategorias;
            if (dados.ordemManual !== undefined) ordemManual = dados.ordemManual;

            // Salva fisicamente no navegador para não perder ao fechar a aba
            salvarNoNavegador();

            // Atualiza todas as abas da tela dinamicamente, sem F5
            atualizarTelaConfiguracoes();
            atualizarTabelaIngredientes();
            atualizarTabelaEmbalagens();
            atualizarSelects();
            atualizarTelaReceitas();
            preencherSelectLote();
            
            document.getElementById("cloud-status").innerText = "Dados carregados!";
            setTimeout(() => document.getElementById("cloud-status").innerText = "", 3000);
        }
    } catch (erro) {
        document.getElementById("cloud-status").innerText = "Erro ao puxar dados";
    }
}

// ====== SALVAMENTO E LOCALSTORAGE ======
function salvarNoNavegador() {
    const dados = { configuracoes, ingredientes, embalagens, receitas, ordemCategorias, ordemManual };
    localStorage.setItem('dadosConfeitaria', JSON.stringify(dados));
    atualizarSelects();
    preencherSelectLote();
}

function carregarDadosLocal() {
    const dadosSalvos = localStorage.getItem('dadosConfeitaria');
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);
        configuracoes = dados.configuracoes || configuracoes;
        ingredientes = dados.ingredientes || [];
        embalagens = dados.embalagens || [];
        receitas = dados.receitas || [];
        ordemCategorias = dados.ordemCategorias || [];
        ordemManual = dados.ordemManual || false;
    }
    atualizarTelaConfiguracoes();
    atualizarTabelaIngredientes();
    atualizarTabelaEmbalagens();
    atualizarSelects();
    atualizarTelaReceitas();
    preencherSelectLote();
}

// ====== LÓGICA DE CONFIGURAÇÕES ======
function salvarConfiguracoes() {
    const salario = parseFloat(document.getElementById('conf-salario').value) || 0;
    const horas = parseFloat(document.getElementById('conf-horas').value) || 0;
    const taxaFixa = parseFloat(document.getElementById('conf-taxa').value) || 0;

    let valorHora = 0;
    if (horas > 0) {
        valorHora = salario / horas;
    }

    configuracoes = { salario, horas, taxaFixa, valorHora };
    salvarNoNavegador();
    atualizarTelaConfiguracoes();
    atualizarTelaReceitas();
    alert('Configurações salvas com sucesso!');
}

function atualizarTelaConfiguracoes() {
    document.getElementById('conf-salario').value = configuracoes.salario || '';
    document.getElementById('conf-horas').value = configuracoes.horas || '';
    document.getElementById('conf-taxa').value = configuracoes.taxaFixa || '';
    
    const displayHora = document.getElementById('valor-hora-display');
    if(displayHora) {
        displayHora.innerText = `R$ ${configuracoes.valorHora.toFixed(2).replace('.', ',')}`;
    }
}

// -----------------------------------------------------
// 3 & 7. ESTOQUE (CATEGORIAS E BUSCA INTELIGENTE)
// -----------------------------------------------------
function salvarIngrediente() {
    const idEdit = document.getElementById('ing-id').value;
    const cat = document.getElementById('ing-cat').value || 'Geral';
    const nome = document.getElementById('ing-nome').value;
    const unidade = document.getElementById('ing-unidade').value;
    const peso = parseFloat(document.getElementById('ing-peso').value);
    const preco = parseFloat(document.getElementById('ing-preco').value);

    if (!nome || !peso || !preco) {
        alert("Preencha todos os campos do ingrediente!");
        return;
    }

    if (idEdit) {
        const index = ingredientes.findIndex(i => i.id === idEdit);
        if (index !== -1) {
            ingredientes[index] = { id: idEdit, cat, nome, peso, preco, unidade };
        }
    } else {
        const novoIngrediente = {
            id: 'ing_' + Date.now().toString(),
            cat,
            nome,
            peso,
            preco,
            unidade
        };
        ingredientes.push(novoIngrediente);
    }

    document.getElementById('ing-id').value = '';
    document.getElementById('ing-cat').value = '';
    document.getElementById('ing-nome').value = '';
    document.getElementById('ing-unidade').value = 'g';
    document.getElementById('ing-peso').value = '';
    document.getElementById('ing-preco').value = '';

    salvarNoNavegador();
    atualizarTabelaIngredientes();
}

function atualizarTabelaIngredientes() {
    const container = document.getElementById('tabela-ingredientes-container');
    if(!container) return;
    const buscaInput = document.getElementById('busca-estoque');
    const busca = (buscaInput ? buscaInput.value : '').toLowerCase();
    container.innerHTML = '';

    let grupos = {};
    ingredientes.filter(i => i.nome.toLowerCase().includes(busca)).forEach(i => {
        let c = i.cat || 'Geral';
        if(!grupos[c]) grupos[c] = [];
        grupos[c].push(i);
    });

    for(let cat in grupos) {
        let html = `
            <div class="categoria-titulo" style="background: var(--cor-30-escuro); padding: 10px; font-weight: bold; margin-top: 20px; border-radius: 5px; color: var(--cor-60);">${cat}</div>
            <table class="tabela-dados" style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; margin-top: 5px;">
            <thead><tr><th>Ingrediente</th><th>Pacote</th><th>Preço</th><th>Ações</th></tr></thead>
            <tbody>`;
        grupos[cat].forEach(ing => {
            const und = ing.unidade || 'g/ml';
            html += `<tr>
                <td>${ing.nome}</td>
                <td>${ing.peso} ${und}</td>
                <td>R$ ${ing.preco.toFixed(2).replace('.', ',')}</td>
                <td class="acoes-tabela" style="display: flex; gap: 5px;">
                    <button class="btn-editar" onclick="editarIngrediente('${ing.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-excluir" onclick="excluirIngrediente('${ing.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML += html;
    }
}

function editarIngrediente(id) {
    const ing = ingredientes.find(i => i.id === id);
    if (ing) {
        document.getElementById('ing-id').value = ing.id;
        document.getElementById('ing-cat').value = ing.cat || '';
        document.getElementById('ing-nome').value = ing.nome;
        document.getElementById('ing-unidade').value = ing.unidade || 'g'; 
        document.getElementById('ing-peso').value = ing.peso;
        document.getElementById('ing-preco').value = ing.preco;
        
        // Rola a página suavemente para o formulário no topo da aba
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function excluirIngrediente(id) {
    if(confirm("Tem certeza que deseja excluir este ingrediente?")) {
        ingredientes = ingredientes.filter(i => i.id !== id);
        salvarNoNavegador();
        atualizarTabelaIngredientes();
    }
}

// ==========================================
// LÓGICA DE EMBALAGENS
// ==========================================
function salvarEmbalagem() {
    const idEdit = document.getElementById('emb-id').value;
    const nome = document.getElementById('emb-nome').value;
    const qtd = parseFloat(document.getElementById('emb-qtd').value);
    const preco = parseFloat(document.getElementById('emb-preco').value);

    if (!nome || !qtd || !preco) return alert("Preencha todos os campos!");

    if (idEdit) {
        const index = embalagens.findIndex(e => e.id === idEdit);
        if (index !== -1) embalagens[index] = { id: idEdit, nome, qtd, preco };
    } else {
        embalagens.push({ id: 'emb_' + Date.now(), nome, qtd, preco });
    }

    document.getElementById('emb-id').value = '';
    document.getElementById('emb-nome').value = '';
    document.getElementById('emb-qtd').value = '';
    document.getElementById('emb-preco').value = '';

    salvarNoNavegador();
    atualizarTabelaEmbalagens();
}

function atualizarTabelaEmbalagens() {
    const tbody = document.getElementById('tabela-embalagens-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    embalagens.forEach(emb => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emb.nome}</td>
            <td>${emb.qtd} un</td>
            <td>R$ ${emb.preco.toFixed(2).replace('.', ',')}</td>
            <td class="acoes-tabela" style="display: flex; gap: 5px;">
                <button class="btn-editar" onclick="editarEmbalagem('${emb.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-excluir" onclick="excluirEmbalagem('${emb.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarEmbalagem(id) {
    const emb = embalagens.find(e => e.id === id);
    if (emb) {
        document.getElementById('emb-id').value = emb.id;
        document.getElementById('emb-nome').value = emb.nome;
        document.getElementById('emb-qtd').value = emb.qtd;
        document.getElementById('emb-preco').value = emb.preco;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function excluirEmbalagem(id) {
    if(confirm("Excluir embalagem?")) {
        embalagens = embalagens.filter(e => e.id !== id);
        salvarNoNavegador();
        atualizarTabelaEmbalagens();
    }
}

// ==========================================
// SELECTS E COMPOSIÇÃO DE RECEITAS
// ==========================================
function atualizarSelects() {
    const select = document.getElementById('rec-item-select');
    const sk = document.getElementById('kit-item-select');
    
    if(select) {
        select.innerHTML = '<option value="">-- Escolha um Ingrediente ou Embalagem --</option>';
        ingredientes.forEach(ing => {
            select.innerHTML += `<option value="${ing.id}">${ing.nome} (${ing.peso}${ing.unidade || 'g'})</option>`;
        });
        embalagens.forEach(emb => {
            select.innerHTML += `<option value="${emb.id}">${emb.nome} (Embalagem)</option>`;
        });
    }

    if(sk) {
        sk.innerHTML = '<option value="">-- Escolha uma Receita ou Embalagem --</option>';
        receitas.filter(r => !r.isKit).forEach(r => {
            sk.innerHTML += `<option value="${r.id}">${r.nome} (Receita)</option>`;
        });
        embalagens.forEach(emb => {
            sk.innerHTML += `<option value="${emb.id}">${emb.nome} (Embalagem)</option>`;
        });
    }
}

function adicionarItemNaReceita() {
    const select = document.getElementById('rec-item-select');
    const valorSelect = select.value; 
    const qtdUsada = parseFloat(document.getElementById('rec-item-qtd').value);

    if (!valorSelect || !qtdUsada) return alert("Selecione um item e informe a quantidade usada!");

    let itemEstoque = ingredientes.find(i => i.id === valorSelect) || embalagens.find(e => e.id === valorSelect);
    let unidadeMedida = itemEstoque.unidade || 'un';

    receitaAtualComposicao.push({
        idUnico: Date.now().toString(),
        idOriginal: itemEstoque.id,
        nome: itemEstoque.nome,
        qtdUsada: qtdUsada,
        unidade: unidadeMedida
    });

    document.getElementById('rec-item-select').value = '';
    document.getElementById('rec-item-qtd').value = '';
    
    calcularCustosDaReceita();
}

function atualizarQtdInline(idUnico, novaQtd) {
    let item = receitaAtualComposicao.find(i => i.idUnico == idUnico);
    if(item) item.qtdUsada = parseFloat(novaQtd) || 0;
    calcularCustosDaReceita();
}

let custoTotalAtual = 0; 

function calcularCustosDaReceita() {
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const tempoMin = parseFloat(document.getElementById('rec-tempo').value) || 0;

    let custoInsumos = 0;
    const lista = document.getElementById('lista-composicao-receita');
    if(lista) {
        lista.innerHTML = '';
        receitaAtualComposicao.forEach(item => {
            let base = ingredientes.find(i=>i.id===item.idOriginal) || embalagens.find(e=>e.id===item.idOriginal);
            let custoReal = 0;
            if (base) {
                custoReal = base.id.includes('ing') ? (base.preco / base.peso) * item.qtdUsada : (base.preco / base.qtd) * item.qtdUsada;
            }
            item.custoReal = custoReal;
            custoInsumos += custoReal;

            lista.innerHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                    <span>${item.nome}</span> 
                    <span>
                        <input type="number" class="input-inline" value="${item.qtdUsada}" oninput="atualizarQtdInline(${item.idUnico}, this.value)" style="width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 4px;"> ${item.unidade}
                        | R$ ${custoReal.toFixed(2).replace('.', ',')}
                        <button class="btn-icon-small" style="background:transparent; color:#e74c3c; border:none; cursor:pointer; margin-left:8px;" onclick="removerItemDaReceita('${item.idUnico}')"><i class="fa-solid fa-xmark"></i></button>
                    </span>
                </li>`;
        });
    }

    let custoMaoDeObra = (configuracoes.valorHora / 60) * tempoMin;
    let subtotal = custoInsumos + custoMaoDeObra;
    let custoFixo = subtotal * ((configuracoes.taxaFixa || 0) / 100);

    custoTotalAtual = custoInsumos + custoMaoDeObra + custoFixo;
    let custoUnitario = custoTotalAtual / rendimento;

    const resTot = document.getElementById('res-custototal');
    const resUni = document.getElementById('res-custounitario');
    if(resTot) resTot.innerText = `R$ ${custoTotalAtual.toFixed(2).replace('.', ',')}`;
    if(resUni) resUni.innerText = `R$ ${custoUnitario.toFixed(2).replace('.', ',')}`;

    calcularPorMargem(); 
}

function removerItemDaReceita(idUnico) {
    receitaAtualComposicao = receitaAtualComposicao.filter(i => i.idUnico !== idUnico);
    calcularCustosDaReceita();
}

function calcularPorMargem() {
    const margemInput = document.getElementById('rec-margem');
    if(!margemInput || margemInput.value === '') return;
    
    const margem = parseFloat(margemInput.value);
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const custoUnitario = custoTotalAtual / rendimento;
    
    const precoVendaUnitario = custoUnitario + (custoUnitario * (margem / 100));
    document.getElementById('rec-preco-venda').value = precoVendaUnitario.toFixed(2);
}

function calcularPorPreco() {
    const precoInput = document.getElementById('rec-preco-venda');
    if(!precoInput || precoInput.value === '') return;
    
    const precoDeVenda = parseFloat(precoInput.value);
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const custoUnitario = custoTotalAtual / rendimento;
    
    if(custoUnitario > 0) {
        const margemReal = ((precoDeVenda - custoUnitario) / custoUnitario) * 100;
        document.getElementById('rec-margem').value = margemReal.toFixed(1);
    }
}

function salvarReceitaCriada() {
    const nome = document.getElementById('rec-nome').value;
    const categoria = document.getElementById('rec-categoria').value || 'Geral'; 
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value);
    const tempo = parseFloat(document.getElementById('rec-tempo').value);
    const margem = parseFloat(document.getElementById('rec-margem').value) || 0;
    const precoVenda = parseFloat(document.getElementById('rec-preco-venda').value) || 0;

    if (!nome || receitaAtualComposicao.length === 0) return alert("Dê um nome e adicione ingredientes!");
    if (precoVenda === 0) return alert("Defina Margem ou Preço de Venda!");

    let custoInsumos = 0;
    receitaAtualComposicao.forEach(item => custoInsumos += item.custoReal);
    let custoMaoDeObra = (configuracoes.valorHora / 60) * tempo;
    let custoFixo = (custoInsumos + custoMaoDeObra) * ((configuracoes.taxaFixa || 0) / 100);
    let custoTotal = custoInsumos + custoMaoDeObra + custoFixo;
    let custoUnitario = custoTotal / rendimento;

    let hiddenIdInput = document.getElementById('rec-id-edit');
    let idReceita = hiddenIdInput ? hiddenIdInput.value : '';
    if (!idReceita) idReceita = 'rec_' + Date.now().toString();

    const novaReceita = {
        id: idReceita,
        nome,
        categoria, 
        rendimento,
        tempo,
        margem,
        precoVenda,
        composicao: [...receitaAtualComposicao],
        custos: { insumos: custoInsumos, maoDeObra: custoMaoDeObra, fixo: custoFixo, totalMassa: custoTotal, unitario: custoUnitario },
        isKit: false
    };

    const indexExistente = receitas.findIndex(r => r.id === idReceita);
    if (indexExistente !== -1) receitas[indexExistente] = novaReceita;
    else receitas.push(novaReceita);

    limparFormularioReceita();
    salvarNoNavegador();
    atualizarTelaReceitas();
    
    alert("Receita salva com sucesso!");
    openTab('receitas');
}

function limparFormularioReceita() {
    let hiddenId = document.getElementById('rec-id-edit');
    if(hiddenId) hiddenId.value = '';
    
    document.getElementById('rec-nome').value = '';
    document.getElementById('rec-categoria').value = ''; 
    document.getElementById('rec-rendimento').value = '1';
    document.getElementById('rec-tempo').value = '0';
    document.getElementById('rec-margem').value = '';
    document.getElementById('rec-preco-venda').value = '';
    
    receitaAtualComposicao = [];
    calcularCustosDaReceita();
}

// -----------------------------------------------------
// 6. MÓDULO DE KITS E ENCOMENDAS
// -----------------------------------------------------
function adicionarItemNoKit() {
    const id = document.getElementById('kit-item-select').value;
    const qtd = parseFloat(document.getElementById('kit-item-qtd').value);
    if(!id || !qtd) return alert("Selecione um item e a quantidade!");

    kitAtualComposicao.push({ idUnico: Date.now().toString(), idOriginal: id, qtdUsada: qtd });
    document.getElementById('kit-item-qtd').value = '';
    calcularCustosKit();
}

function atualizarQtdKit(idUnico, novaQtd) {
    let item = kitAtualComposicao.find(i => i.idUnico == idUnico);
    if(item) item.qtdUsada = parseFloat(novaQtd) || 0;
    calcularCustosKit();
}

let custoTotalKitAtual = 0;

function calcularCustosKit() {
    let custoTotal = 0;
    const lista = document.getElementById('lista-composicao-kit'); 
    if(!lista) return;
    lista.innerHTML = '';
    
    kitAtualComposicao.forEach(item => {
        let rec = receitas.find(r => r.id === item.idOriginal);
        let emb = embalagens.find(e => e.id === item.idOriginal);
        let nome = rec ? rec.nome : (emb ? emb.nome : 'Item');
        
        let custoUnit = 0;
        if(rec) {
            let cInsumo = 0;
            rec.composicao.forEach(i => {
                let base = ingredientes.find(x => x.id === i.idOriginal) || embalagens.find(x => x.id === i.idOriginal);
                if(base) {
                    let div = base.id.includes('ing') ? base.peso : base.qtd;
                    cInsumo += (base.preco / div) * i.qtdUsada;
                }
            });
            let cMaoObra = (configuracoes.valorHora / 60) * rec.tempo;
            let cFixo = (cInsumo + cMaoObra) * (configuracoes.taxaFixa / 100);
            custoUnit = (cInsumo + cMaoObra + cFixo) / rec.rendimento;
        } else if(emb) {
            custoUnit = emb.preco / emb.qtd;
        }

        let custoLinha = custoUnit * item.qtdUsada;
        custoTotal += custoLinha;

        lista.innerHTML += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                <span>${nome}</span>
                <span>
                    <input type="number" class="input-inline" value="${item.qtdUsada}" oninput="atualizarQtdKit(${item.idUnico}, this.value)" style="width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 4px;"> un
                    | R$ ${custoLinha.toFixed(2).replace('.', ',')}
                    <button class="btn-icon-small" style="background:transparent; color:#e74c3c; border:none; cursor:pointer; margin-left:8px;" onclick="kitAtualComposicao=kitAtualComposicao.filter(i=>i.idUnico!=${item.idUnico});calcularCustosKit()"><i class="fa-solid fa-xmark"></i></button>
                </span>
            </li>`;
    });

    custoTotalKitAtual = custoTotal;
    document.getElementById('kit-custototal').innerText = `R$ ${custoTotal.toFixed(2).replace('.', ',')}`;
    calcularMargemKit();
}

function calcularMargemKit() {
    let mInput = document.getElementById('kit-margem');
    if(!mInput || mInput.value === '') return;
    let m = parseFloat(mInput.value);
    document.getElementById('kit-preco').value = (custoTotalKitAtual * (1 + (m / 100))).toFixed(2);
}

function calcularPrecoKit() {
    let pvInput = document.getElementById('kit-preco');
    if(!pvInput || pvInput.value === '') return;
    let pv = parseFloat(pvInput.value);
    if(pv && custoTotalKitAtual > 0) {
        document.getElementById('kit-margem').value = (((pv - custoTotalKitAtual) / custoTotalKitAtual) * 100).toFixed(1);
    }
}

function salvarKit() {
    const nome = document.getElementById('kit-nome').value;
    const categoria = document.getElementById('kit-categoria').value || 'Kits';
    const margem = parseFloat(document.getElementById('kit-margem').value) || 0;
    const precoVenda = parseFloat(document.getElementById('kit-preco').value) || 0;

    if(!nome || kitAtualComposicao.length === 0) return alert("Dê um nome e adicione itens ao kit!");
    if(precoVenda === 0) return alert("Defina a margem ou o preço de venda!");

    let hiddenId = document.getElementById('kit-id-edit').value;
    const obj = {
        id: hiddenId || 'kit_' + Date.now().toString(),
        nome,
        categoria,
        rendimento: 1, 
        tempo: 0,
        margem,
        precoVenda,
        composicao: [...kitAtualComposicao],
        custos: { unitario: custoTotalKitAtual, insumos: custoTotalKitAtual, maoDeObra: 0, fixo: 0, totalMassa: custoTotalKitAtual },
        isKit: true
    };

    const idx = receitas.findIndex(r => r.id === obj.id);
    if(idx > -1) receitas[idx] = obj;
    else receitas.push(obj);

    document.getElementById('kit-id-edit').value = '';
    document.getElementById('kit-nome').value = '';
    document.getElementById('kit-margem').value = '';
    document.getElementById('kit-preco').value = '';
    kitAtualComposicao = [];
    
    salvarNoNavegador(); 
    atualizarTelaReceitas(); 
    openTab('receitas');
}

// -----------------------------------------------------
// 4 & 5. DRAG & DROP + COLAPSÁVEIS + RENDERIZAÇÃO
// -----------------------------------------------------
function toggleCategoria(cat) {
    if(categoriasExpandidas.has(cat)) categoriasExpandidas.delete(cat);
    else categoriasExpandidas.add(cat);
    atualizarTelaReceitas(); 
}

function atualizarTelaReceitas() {
    const container = document.getElementById('lista-receitas-salvas');
    if(!container) return;
    container.innerHTML = '';

    if (receitas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 30px;">Nenhuma receita salva ainda.</p>';
        return;
    }

    receitas.forEach(rec => {
        if (!rec.isKit) {
            let novoCustoInsumos = 0;
            rec.composicao.forEach(item => {
                let base = ingredientes.find(i => i.id === item.idOriginal) || embalagens.find(e => e.id === item.idOriginal);
                if (base) {
                    item.custoReal = base.id.includes('ing') ? (base.preco / base.peso) * item.qtdUsada : (base.preco / base.qtd) * item.qtdUsada;
                    novoCustoInsumos += item.custoReal;
                }
            });
            rec.custos = rec.custos || {};
            rec.custos.insumos = novoCustoInsumos;
            rec.custos.maoDeObra = (configuracoes.valorHora / 60) * rec.tempo;
            rec.custos.fixo = (novoCustoInsumos + rec.custos.maoDeObra) * ((configuracoes.taxaFixa || 0) / 100);
            rec.custos.totalMassa = novoCustoInsumos + rec.custos.maoDeObra + rec.custos.fixo;
            rec.custos.unitario = rec.custos.totalMassa / rec.rendimento;
            
            if(rec.precoVenda > 0) rec.margem = ((rec.precoVenda - rec.custos.unitario) / rec.custos.unitario) * 100;
        } else {
            let custoTotalKit = 0;
            rec.composicao.forEach(item => {
                let recInterna = receitas.find(r => r.id === item.idOriginal);
                let emb = embalagens.find(e => e.id === item.idOriginal);
                if (recInterna) custoTotalKit += recInterna.custos.unitario * item.qtdUsada;
                else if (emb) custoTotalKit += (emb.preco / emb.qtd) * item.qtdUsada;
            });
            rec.custos = { unitario: custoTotalKit, insumos: custoTotalKit, maoDeObra: 0, fixo: 0, totalMassa: custoTotalKit };
            if(rec.precoVenda > 0) rec.margem = ((rec.precoVenda - rec.custos.unitario) / rec.custos.unitario) * 100;
        }
    });
    salvarNoNavegador();

    let grupos = {};
    receitas.forEach(r => { 
        let c = r.categoria || 'Geral';
        if(!grupos[c]) grupos[c] = []; 
        grupos[c].push(r); 
    });

    let categoriasAtuais = Object.keys(grupos);
    if (!ordemManual) {
        ordemCategorias = categoriasAtuais.sort((a, b) => a.localeCompare(b));
    } else {
        ordemCategorias = ordemCategorias.filter(c => categoriasAtuais.includes(c));
        let novas = categoriasAtuais.filter(c => !ordemCategorias.includes(c)).sort((a,b) => a.localeCompare(b));
        ordemCategorias.push(...novas);
    }

    ordemCategorias.forEach(cat => {
        const isAberta = categoriasExpandidas.has(cat);
        
        let htmlCat = `
            <div class="categoria-container" draggable="true" ondragstart="iniciarDragCat(event, '${cat}')" ondragover="event.preventDefault(); this.classList.add('drag-over-cat')" ondragleave="this.classList.remove('drag-over-cat')" ondrop="soltarDragCat(event, '${cat}')" ondragend="this.classList.remove('drag-over-cat'); this.style.opacity='1'">
                <div class="categoria-header" onclick="toggleCategoria('${cat}')">
                    <h3 style="color:var(--cor-60); margin:0;"><i class="fa-solid fa-folder${isAberta?'-open':''}"></i> ${cat}</h3>
                    <i class="fa-solid fa-chevron-${isAberta?'up':'down'}" style="color:var(--cor-60);"></i>
                </div>
                <div class="categoria-content" style="display: ${isAberta ? 'block' : 'none'}; padding-top: 15px;">`;

        if(grupos[cat]) {
            grupos[cat].forEach(rec => {
                let htmlComposicao = '';
                rec.composicao.forEach(item => {
                    let custoExibicao = item.custoReal || 0;
                    if (rec.isKit) {
                        let recInterna = receitas.find(r => r.id === item.idOriginal);
                        let emb = embalagens.find(e => e.id === item.idOriginal);
                        if (recInterna) custoExibicao = recInterna.custos.unitario * item.qtdUsada;
                        else if (emb) custoExibicao = (emb.preco / emb.qtd) * item.qtdUsada;
                    }
                    let nomeExibicao = item.nome || (receitas.find(r=>r.id===item.idOriginal)?.nome) || (embalagens.find(e=>e.id===item.idOriginal)?.nome);
                    htmlComposicao += `<li><span>${nomeExibicao} (${item.qtdUsada} ${item.unidade || 'un'})</span> <span>R$ ${custoExibicao.toFixed(2).replace('.', ',')}</span></li>`;
                });

                let lucroUnidade = rec.precoVenda - rec.custos.unitario;
                let unitTotalArredondado = parseFloat(rec.custos.unitario.toFixed(2));
                let unitInsumo = parseFloat((rec.custos.insumos / rec.rendimento).toFixed(2));
                let unitMaoObra = parseFloat((rec.custos.maoDeObra / rec.rendimento).toFixed(2));
                let unitFixo = +(unitTotalArredondado - unitInsumo - unitMaoObra).toFixed(2);
                
                if(rec.isKit) { unitInsumo = unitTotalArredondado; unitMaoObra = 0; unitFixo = 0; }

                htmlCat += `
                <div class="card-receita" draggable="true" ondragstart="iniciarDragReceita(event, '${rec.id}')" ondragend="this.style.opacity='1'" ondragover="event.preventDefault(); event.stopPropagation(); this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="soltarDragReceita(event, '${rec.id}')">
                    
                    <div class="card-receita-resumo">
                        <div class="info-principal">
                            <h3 style="margin: 0; color: var(--cor-60); margin-bottom: 5px;">${rec.nome} ${rec.isKit?'(KIT)':''}</h3>
                            <p class="rendimento">Rende: ${rec.rendimento} unidades</p>
                        </div>
                        <div class="valores-resumo">
                            <div class="valor">
                                <small>Custo Unit.</small>
                                <span>R$ ${rec.custos.unitario.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div class="valor destaque">
                                <small>Venda (Unid.)</small>
                                <span>R$ ${rec.precoVenda.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-receita-footer">
                        <div class="card-footer-topo">
                            <div class="raiox-unitario" style="text-align: left;">
                                <strong>Raio-X Unitário:</strong> Insumos: R$ ${unitInsumo.toFixed(2).replace('.', ',')} | 
                                Fixos: R$ ${unitFixo.toFixed(2).replace('.', ',')} | 
                                Mão de Obra: <span>R$ ${unitMaoObra.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <button class="btn-detalhes" onclick="toggleDetalhes(event, '${rec.id}')">
                                <i class="fa-solid fa-chevron-down"></i> Detalhes
                            </button>
                        </div>
                    </div>
                    
                    <div id="detalhes-${rec.id}" class="card-receita-detalhes" style="display: none; cursor: default;" onmousedown="event.stopPropagation()">
                        <hr>
                        <h4 style="color: var(--cor-60); margin-bottom: 15px;">Custos Atualizados (Baseados no Estoque Atual)</h4>
                        <ul class="lista-detalhes">
                            ${htmlComposicao}
                            ${!rec.isKit ? `
                            <li style="color: var(--cor-60); font-weight: bold; background: #f9f9f9; padding: 5px;">
                                <span>Seu Tempo (${rec.tempo} min)</span> <span>R$ ${rec.custos.maoDeObra.toFixed(2).replace('.', ',')}</span>
                            </li>
                            <li style="color: var(--cor-60); font-weight: bold; background: #f9f9f9; padding: 5px;">
                                <span>Custos Fixos/Invisíveis</span> <span>R$ ${rec.custos.fixo.toFixed(2).replace('.', ',')}</span>
                            </li>` : ''}
                        </ul>
                        <div class="totais-detalhes" style="background-color: var(--cor-30-escuro); padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: right;">
                            <p><strong>Custo Total (Massa):</strong> R$ ${rec.custos.totalMassa.toFixed(2).replace('.', ',')}</p>
                            <p><strong>Lucro Líquido Real:</strong> <span style="color: ${lucroUnidade >= 0 ? 'var(--cor-10)' : 'red'};">R$ ${lucroUnidade.toFixed(2).replace('.', ',')} (${(rec.margem || 0).toFixed(1)}%)</span></p>
                        </div>
                        <div class="acoes-edicao" style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn-icon" style="background-color: var(--cor-60);" onclick="duplicarReceita(event, '${rec.id}')"><i class="fa-solid fa-copy"></i> Duplicar</button>
                            <button class="btn-editar" onclick="editarReceitaSalva(event, '${rec.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                            <button class="btn-excluir" onclick="excluirReceitaUnica(event, '${rec.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
                        </div>
                    </div>
                </div>`;
            });
        }
        htmlCat += `</div></div>`;
        container.innerHTML += htmlCat;
    });
}
// DRAG & DROP DE CATEGORIAS
function iniciarDragCat(event, cat) {
    dragCatId = cat;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.style.opacity = '0.5', 0);
}

function soltarDragCat(event, catDestino) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over-cat');
    event.currentTarget.style.opacity = '1';

    if (dragCatId && dragCatId !== catDestino && !dragId) {
        ordemManual = true;
        let idxOrigem = ordemCategorias.indexOf(dragCatId);
        let idxDestino = ordemCategorias.indexOf(catDestino);
        
        let item = ordemCategorias.splice(idxOrigem, 1)[0];
        ordemCategorias.splice(idxDestino, 0, item);
        
        salvarNoNavegador();
        atualizarTelaReceitas();
    }
    dragCatId = null;
}

// DRAG & DROP DE RECEITAS
function iniciarDragReceita(event, id) {
    event.stopPropagation(); 
    dragId = id;
    dragCatId = null; 
    setTimeout(() => event.target.style.opacity = '0.5', 0);
}

function soltarDragReceita(event, idDestino) {
    event.preventDefault();
    event.stopPropagation(); 
    event.currentTarget.classList.remove('drag-over');
    event.currentTarget.style.opacity = '1';

    if(dragId && dragId !== idDestino) {
        const idxOrigem = receitas.findIndex(r => r.id === dragId);
        const idxDestino = receitas.findIndex(r => r.id === idDestino);
        
        const item = receitas.splice(idxOrigem, 1)[0];
        receitas.splice(idxDestino, 0, item);
        
        receitas[idxDestino].categoria = receitas[idxDestino===0 ? 1 : idxDestino-1].categoria;
        
        salvarNoNavegador();
        atualizarTelaReceitas();
    }
    dragId = null;
}

function toggleDetalhes(event, id) {
    event.stopPropagation();
    const divDetalhes = document.getElementById(`detalhes-${id}`);
    if(divDetalhes) {
        divDetalhes.style.display = divDetalhes.style.display === 'none' ? 'block' : 'none';
    }
}

function excluirReceitaUnica(event, id) {
    event.stopPropagation(); 
    if(confirm("Tem certeza que deseja apagar esta receita definitivamente?")) {
        receitas = receitas.filter(r => r.id !== id);
        salvarNoNavegador();
        atualizarTelaReceitas();
    }
}

function duplicarReceita(event, id) {
    event.stopPropagation();
    const rec = receitas.find(r => r.id === id);
    if(!rec) return;

    const novaReceita = JSON.parse(JSON.stringify(rec)); 
    novaReceita.id = (novaReceita.isKit ? 'kit_' : 'rec_') + Date.now().toString();
    novaReceita.nome = novaReceita.nome + ' (Cópia)';

    receitas.push(novaReceita);
    salvarNoNavegador();
    atualizarTelaReceitas();
    alert("Receita duplicada com sucesso!");
}

function editarReceitaSalva(event, id) {
    event.stopPropagation();
    const rec = receitas.find(r => r.id === id);
    if(!rec) return;

    if (rec.isKit) {
        document.getElementById('kit-id-edit').value = rec.id;
        document.getElementById('kit-nome').value = rec.nome;
        document.getElementById('kit-categoria').value = rec.categoria || ''; 
        document.getElementById('kit-margem').value = rec.margem;
        document.getElementById('kit-preco').value = rec.precoVenda;
        kitAtualComposicao = [...rec.composicao];
        openTab('kits');
        calcularCustosKit();
    } else {
        let hiddenId = document.getElementById('rec-id-edit');
        if(!hiddenId) {
            hiddenId = document.createElement('input');
            hiddenId.type = 'hidden';
            hiddenId.id = 'rec-id-edit';
            document.getElementById('nova-receita').appendChild(hiddenId);
        }
        hiddenId.value = rec.id;

        document.getElementById('rec-nome').value = rec.nome;
        document.getElementById('rec-categoria').value = rec.categoria || ''; 
        document.getElementById('rec-rendimento').value = rec.rendimento;
        document.getElementById('rec-tempo').value = rec.tempo;
        document.getElementById('rec-margem').value = rec.margem;
        document.getElementById('rec-preco-venda').value = rec.precoVenda;

        receitaAtualComposicao = [...rec.composicao];
        openTab('nova-receita');
        calcularCustosDaReceita();
    }
}

// -----------------------------------------------------
// 8. AJUSTE DE MARGEM EM LOTE
// -----------------------------------------------------
function preencherSelectLote() {
    const sel = document.getElementById('lote-categoria');
    if(!sel) return;
    let cats = new Set(receitas.map(r => r.categoria || 'Geral'));
    sel.innerHTML = '<option value="TODAS">Todas as Categorias</option>';
    cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
}

function aplicarMargemEmLote() {
    const cat = document.getElementById('lote-categoria').value;
    const novaMargem = parseFloat(document.getElementById('lote-margem').value);
    
    if(!novaMargem) return alert("Digite uma margem válida.");
    if(!confirm(`Deseja aplicar ${novaMargem}% de lucro a todos os produtos de: ${cat}?`)) return;

    receitas.forEach(rec => {
        if(cat === 'TODAS' || (rec.categoria || 'Geral') === cat) {
            rec.margem = novaMargem;
            let custoBase = rec.custos ? rec.custos.unitario : 0;
            if(custoBase > 0) {
                rec.precoVenda = custoBase * (1 + (novaMargem / 100));
            }
        }
    });

    salvarNoNavegador();
    atualizarTelaReceitas();
    alert("Margens atualizadas em lote com sucesso!");
}