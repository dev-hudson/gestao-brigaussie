// ====== VARIÁVEIS GERAIS ======
let configuracoes = { salario: 0, horas: 0, taxaFixa: 0, valorHora: 0 };
let ingredientes = [];
let embalagens = [];
let receitas = [];
let receitaAtualComposicao = []; 

// ====== INICIALIZAÇÃO ======
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    atualizarTelaConfiguracoes();
    atualizarTabelaIngredientes();
    atualizarTabelaEmbalagens();
    atualizarSelectItensReceita();
    atualizarTelaReceitas();
});

// ====== NAVEGAÇÃO DE ABAS ======
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
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
    
    document.getElementById('valor-hora-display').innerText = 
        `R$ ${configuracoes.valorHora.toFixed(2).replace('.', ',')}`;
}

// ====== LÓGICA DE INGREDIENTES ======
function salvarIngrediente() {
    const idEdit = document.getElementById('ing-id').value;
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
            ingredientes[index] = { id: idEdit, nome, peso, preco, unidade };
        }
    } else {
        const novoIngrediente = {
            id: 'ing_' + Date.now().toString(),
            nome,
            peso,
            preco,
            unidade
        };
        ingredientes.push(novoIngrediente);
    }

    document.getElementById('ing-id').value = '';
    document.getElementById('ing-nome').value = '';
    document.getElementById('ing-unidade').value = 'g';
    document.getElementById('ing-peso').value = '';
    document.getElementById('ing-preco').value = '';

    salvarNoNavegador();
    atualizarTabelaIngredientes();
    atualizarSelectItensReceita(); 
    atualizarTelaReceitas();
}

function atualizarTabelaIngredientes() {
    const tbody = document.getElementById('tabela-ingredientes-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    ingredientes.forEach(ing => {
        const und = ing.unidade || 'g/ml'; 
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ing.nome}</td>
            <td>${ing.peso} ${und}</td>
            <td>R$ ${ing.preco.toFixed(2).replace('.', ',')}</td>
            <td class="acoes-tabela">
                <button class="btn-editar" onclick="editarIngrediente('${ing.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-excluir" onclick="excluirIngrediente('${ing.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarIngrediente(id) {
    const ing = ingredientes.find(i => i.id === id);
    if (ing) {
        document.getElementById('ing-id').value = ing.id;
        document.getElementById('ing-nome').value = ing.nome;
        document.getElementById('ing-unidade').value = ing.unidade || 'g'; 
        document.getElementById('ing-peso').value = ing.peso;
        document.getElementById('ing-preco').value = ing.preco;
    }
}

function excluirIngrediente(id) {
    if(confirm("Tem certeza que deseja excluir este ingrediente?")) {
        ingredientes = ingredientes.filter(i => i.id !== id);
        salvarNoNavegador();
        atualizarTabelaIngredientes();
    }
}

// ====== SALVAMENTO E BACKUP (LOCALSTORAGE) ======
function salvarNoNavegador() {
    const dados = { configuracoes, ingredientes, embalagens, receitas };
    localStorage.setItem('dadosConfeitaria', JSON.stringify(dados));
}

function carregarDados() {
    const dadosSalvos = localStorage.getItem('dadosConfeitaria');
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);
        configuracoes = dados.configuracoes || configuracoes;
        ingredientes = dados.ingredientes || [];
        embalagens = dados.embalagens || [];
        receitas = dados.receitas || [];
    }
}

function exportarDados() {
    const dados = localStorage.getItem('dadosConfeitaria');
    if (!dados) {
        alert("Não há dados para exportar.");
        return;
    }
    const blob = new Blob([dados], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "backup_precificador.json";
    a.click();
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dadosImportados = JSON.parse(e.target.result);
            if (dadosImportados.configuracoes || dadosImportados.ingredientes) {
                localStorage.setItem('dadosConfeitaria', JSON.stringify(dadosImportados));
                carregarDados();
                atualizarTelaConfiguracoes();
                atualizarTabelaIngredientes();
                atualizarTelaReceitas();
                alert("Dados importados com sucesso!");
            } else {
                alert("Arquivo inválido.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo.");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// ====== LÓGICA DE EMBALAGENS ======
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
    atualizarSelectItensReceita();
    atualizarTelaReceitas(); 
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
            <td class="acoes-tabela">
                <button class="btn-excluir" onclick="excluirEmbalagem('${emb.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function excluirEmbalagem(id) {
    if(confirm("Excluir embalagem?")) {
        embalagens = embalagens.filter(e => e.id !== id);
        salvarNoNavegador();
        atualizarTabelaEmbalagens();
        atualizarSelectItensReceita();
    }
}

// ==========================================
// ====== LÓGICA DE CRIAR RECEITA ======
// ==========================================
function atualizarSelectItensReceita() {
    const select = document.getElementById('rec-item-select');
    if(!select) return;
    select.innerHTML = '<option value="">-- Escolha um Ingrediente ou Embalagem --</option>';
    
    const ingOrdenados = [...ingredientes].sort((a, b) => a.nome.localeCompare(b.nome));
    const embOrdenadas = [...embalagens].sort((a, b) => a.nome.localeCompare(b.nome));

    const optgroupIng = document.createElement('optgroup');
    optgroupIng.label = "Ingredientes";
    ingOrdenados.forEach(ing => {
        const und = ing.unidade || 'g/ml';
        optgroupIng.innerHTML += `<option value="${ing.id}">${ing.nome} (Estoque: ${ing.peso}${und} por R$${ing.preco.toFixed(2)})</option>`;
    });
    select.appendChild(optgroupIng);

    const optgroupEmb = document.createElement('optgroup');
    optgroupEmb.label = "Embalagens (Unidades)";
    embOrdenadas.forEach(emb => {
        optgroupEmb.innerHTML += `<option value="${emb.id}">${emb.nome} (Pacote c/ ${emb.qtd} por R$${emb.preco.toFixed(2)})</option>`;
    });
    select.appendChild(optgroupEmb);
}

function adicionarItemNaReceita() {
    const select = document.getElementById('rec-item-select');
    const valorSelect = select.value; 
    const qtdUsada = parseFloat(document.getElementById('rec-item-qtd').value);

    if (!valorSelect || !qtdUsada) return alert("Selecione um item e informe a quantidade usada!");

    const tipo = valorSelect.split('_')[0]; 
    
    let itemEstoque = null;
    let custoFracionado = 0;
    let unidadeMedida = '';

    if (tipo === 'ing') {
        itemEstoque = ingredientes.find(i => i.id === valorSelect);
        custoFracionado = (itemEstoque.preco / itemEstoque.peso) * qtdUsada;
        unidadeMedida = itemEstoque.unidade || 'g/ml';
    } else {
        itemEstoque = embalagens.find(e => e.id === valorSelect);
        custoFracionado = (itemEstoque.preco / itemEstoque.qtd) * qtdUsada;
        unidadeMedida = 'un';
    }

    receitaAtualComposicao.push({
        idUnico: Date.now().toString(),
        idOriginal: itemEstoque.id,
        tipo: tipo,
        nome: itemEstoque.nome,
        qtdUsada: qtdUsada,
        custoReal: custoFracionado,
        unidade: unidadeMedida
    });

    document.getElementById('rec-item-select').value = '';
    document.getElementById('rec-item-qtd').value = '';
    
    renderizarComposicaoReceita();
    calcularCustosDaReceita();
}

function renderizarComposicaoReceita() {
    const lista = document.getElementById('lista-composicao-receita');
    lista.innerHTML = '';

    if(receitaAtualComposicao.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999; font-size: 0.9rem;">Nenhum item adicionado.</p>';
        return;
    }

    receitaAtualComposicao.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.nome} <em>(${item.qtdUsada} ${item.unidade})</em></span> 
            <span>
                R$ ${item.custoReal.toFixed(2).replace('.', ',')}
                <button class="btn-icon" style="background:transparent; color:#e74c3c; padding:0; margin-left:10px;" onclick="removerItemDaReceita('${item.idUnico}')"><i class="fa-solid fa-xmark"></i></button>
            </span>
        `;
        lista.appendChild(li);
    });
}

function removerItemDaReceita(idUnico) {
    receitaAtualComposicao = receitaAtualComposicao.filter(i => i.idUnico !== idUnico);
    renderizarComposicaoReceita();
    calcularCustosDaReceita();
}

// ====== A CALCULADORA MAGNÍFICA ======
let custoTotalAtual = 0; 

function calcularCustosDaReceita() {
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const tempoMin = parseFloat(document.getElementById('rec-tempo').value) || 0;

    let custoInsumos = 0;
    receitaAtualComposicao.forEach(item => custoInsumos += item.custoReal);

    let custoMaoDeObra = (configuracoes.valorHora / 60) * tempoMin;
    let subtotal = custoInsumos + custoMaoDeObra;
    let custoFixo = subtotal * ((configuracoes.taxaFixa || 0) / 100);

    custoTotalAtual = custoInsumos + custoMaoDeObra + custoFixo;
    let custoUnitario = custoTotalAtual / rendimento;
    
    // Matemática exata do Raio-X Unitário para bater perfeitamente com o Custo Unitário
    let unitTotalArredondado = parseFloat(custoUnitario.toFixed(2));
    let unitInsumo = parseFloat((custoInsumos / rendimento).toFixed(2));
    let unitMaoObra = parseFloat((custoMaoDeObra / rendimento).toFixed(2));
    // O Custo Fixo absorve qualquer diferença de centavos do arredondamento
    let unitFixo = +(unitTotalArredondado - unitInsumo - unitMaoObra).toFixed(2);

    document.getElementById('res-insumos').innerText = `R$ ${custoInsumos.toFixed(2).replace('.', ',')}`;
    document.getElementById('res-maodeobra').innerText = `R$ ${custoMaoDeObra.toFixed(2).replace('.', ',')}`;
    document.getElementById('res-custosfixos').innerText = `R$ ${custoFixo.toFixed(2).replace('.', ',')}`;
    
    document.getElementById('res-custototal').innerText = `R$ ${custoTotalAtual.toFixed(2).replace('.', ',')}`;
    document.getElementById('res-custounitario').innerText = `R$ ${custoUnitario.toFixed(2).replace('.', ',')}`;

    document.getElementById('res-raiox').innerHTML = `
        <div class="raiox-unitario" style="margin-bottom: 20px; border-top: 1px dashed #ccc; padding-top: 10px;">
            <strong>Raio-X Unitário:</strong> Insumos: R$ ${unitInsumo.toFixed(2).replace('.', ',')} | 
            Fixos: R$ ${unitFixo.toFixed(2).replace('.', ',')} | 
            Mão de Obra: <span>R$ ${unitMaoObra.toFixed(2).replace('.', ',')}</span>
        </div>`;

    calcularPorMargem(); 
}

function calcularPorMargem() {
    const margemInput = document.getElementById('rec-margem').value;
    if (margemInput === '') return;
    
    const margem = parseFloat(margemInput);
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const custoUnitario = custoTotalAtual / rendimento;
    
    const precoVendaUnitario = custoUnitario + (custoUnitario * (margem / 100));
    document.getElementById('rec-preco-venda').value = precoVendaUnitario.toFixed(2);
}

function calcularPorPreco() {
    const precoInput = document.getElementById('rec-preco-venda').value;
    if (precoInput === '') return;
    
    const precoDeVenda = parseFloat(precoInput);
    const rendimento = parseFloat(document.getElementById('rec-rendimento').value) || 1;
    const custoUnitario = custoTotalAtual / rendimento;
    
    if(custoUnitario > 0) {
        const margemReal = ((precoDeVenda - custoUnitario) / custoUnitario) * 100;
        document.getElementById('rec-margem').value = margemReal.toFixed(1);
    }
}

// ==========================================
// ====== LÓGICA DE SALVAR E EXIBIR RECEITAS ======
// ==========================================
function salvarReceitaCriada() {
    const nome = document.getElementById('rec-nome').value;
    const categoria = document.getElementById('rec-categoria').value || 'Outros'; 
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
        custos: { insumos: custoInsumos, maoDeObra: custoMaoDeObra, fixo: custoFixo, totalMassa: custoTotal, unitario: custoUnitario }
    };

    const indexExistente = receitas.findIndex(r => r.id === idReceita);
    if (indexExistente !== -1) receitas[indexExistente] = novaReceita;
    else receitas.push(novaReceita);

    salvarNoNavegador();
    limparFormularioReceita();
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
    renderizarComposicaoReceita();
    document.getElementById('res-insumos').innerText = 'R$ 0,00';
    document.getElementById('res-maodeobra').innerText = 'R$ 0,00';
    document.getElementById('res-custosfixos').innerText = 'R$ 0,00';
    document.getElementById('res-custototal').innerText = 'R$ 0,00';
    document.getElementById('res-custounitario').innerText = 'R$ 0,00';
    document.getElementById('res-raiox').innerHTML = ''; 
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
        let novoCustoInsumos = 0;
        rec.composicao.forEach(item => {
            if(item.tipo === 'ing') {
                const ing = ingredientes.find(i => i.id === item.idOriginal);
                if(ing) item.custoReal = (ing.preco / ing.peso) * item.qtdUsada;
            } else {
                const emb = embalagens.find(e => e.id === item.idOriginal);
                if(emb) item.custoReal = (emb.preco / emb.qtd) * item.qtdUsada;
            }
            novoCustoInsumos += item.custoReal;
        });

        rec.custos.insumos = novoCustoInsumos;
        rec.custos.maoDeObra = (configuracoes.valorHora / 60) * rec.tempo;
        rec.custos.fixo = (novoCustoInsumos + rec.custos.maoDeObra) * ((configuracoes.taxaFixa || 0) / 100);
        rec.custos.totalMassa = novoCustoInsumos + rec.custos.maoDeObra + rec.custos.fixo;
        rec.custos.unitario = rec.custos.totalMassa / rec.rendimento;
        
        if(rec.precoVenda > 0) {
            rec.margem = ((rec.precoVenda - rec.custos.unitario) / rec.custos.unitario) * 100;
        }
    });
    salvarNoNavegador();

    const receitasPorCategoria = {};
    
    receitas.forEach(rec => {
        const cat = rec.categoria || 'Outros';
        if(!receitasPorCategoria[cat]) receitasPorCategoria[cat] = [];
        receitasPorCategoria[cat].push(rec);
    });

    for (const categoria in receitasPorCategoria) {
        
        const headerCat = document.createElement('div');
        headerCat.innerHTML = `
            <h3 style="margin: 0; color: var(--cor-60); text-transform: uppercase; letter-spacing: 1px;">
                <i class="fa-solid fa-folder-open"></i> ${categoria}
            </h3>
            <i class="fa-solid fa-chevron-up icon-toggle" style="color: var(--cor-60); font-size: 1.2rem;"></i>
        `;
        headerCat.style = "display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid var(--cor-30-escuro); padding-bottom: 5px; cursor: pointer;";
        
        const divCatContent = document.createElement('div');
        divCatContent.id = `cat-content-${categoria.replace(/\s+/g, '-')}`;
        
        headerCat.onclick = () => {
            if(divCatContent.style.display === 'none') {
                divCatContent.style.display = 'block';
                headerCat.querySelector('.icon-toggle').classList.replace('fa-chevron-down', 'fa-chevron-up');
                headerCat.querySelector('.fa-folder').classList.replace('fa-folder', 'fa-folder-open'); 
            } else {
                divCatContent.style.display = 'none';
                headerCat.querySelector('.icon-toggle').classList.replace('fa-chevron-up', 'fa-chevron-down');
                headerCat.querySelector('.fa-folder-open').classList.replace('fa-folder-open', 'fa-folder'); 
            }
        };

        container.appendChild(headerCat);

        receitasPorCategoria[categoria].forEach(rec => {
            let htmlComposicao = '';
            rec.composicao.forEach(item => {
                htmlComposicao += `<li><span>${item.nome} (${item.qtdUsada} ${item.unidade})</span> <span>R$ ${item.custoReal.toFixed(2).replace('.', ',')}</span></li>`;
            });

            let lucroUnidade = rec.precoVenda - rec.custos.unitario;

            // Matemática exata do Raio-X nos cartões salvos
            let unitTotalArredondado = parseFloat(rec.custos.unitario.toFixed(2));
            let unitInsumo = parseFloat((rec.custos.insumos / rec.rendimento).toFixed(2));
            let unitMaoObra = parseFloat((rec.custos.maoDeObra / rec.rendimento).toFixed(2));
            // O Custo Fixo absorve qualquer diferença de centavos
            let unitFixo = +(unitTotalArredondado - unitInsumo - unitMaoObra).toFixed(2);

            const div = document.createElement('div');
            div.className = 'card-receita';
            
            div.innerHTML = `
                <div class="card-receita-resumo">
                    <div class="info-principal">
                        <h3>${rec.nome}</h3>
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
                    <div class="acoes" style="display: flex; gap: 8px;">
                        <button class="btn-icon-small" onclick="moverReceita('${rec.id}', 'up')" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>
                        <button class="btn-icon-small" onclick="moverReceita('${rec.id}', 'down')" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>
                        <button class="btn-detalhes" onclick="toggleDetalhes('${rec.id}')">
                            <i class="fa-solid fa-chevron-down"></i> Detalhes
                        </button>
                    </div>
                    <div class="raiox-unitario">
                        <strong>Raio-X Unitário:</strong> Insumos: R$ ${unitInsumo.toFixed(2).replace('.', ',')} | 
                        Fixos: R$ ${unitFixo.toFixed(2).replace('.', ',')} | 
                        Mão de Obra: <span>R$ ${unitMaoObra.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                
                <div id="detalhes-${rec.id}" class="card-receita-detalhes" style="display: none;">
                    <hr>
                    <h4>Custos Atualizados (Baseados no Estoque Atual)</h4>
                    <ul class="lista-detalhes">
                        ${htmlComposicao}
                        <li style="color: var(--cor-60); font-weight: bold; background: #f9f9f9; padding: 5px;">
                            <span>Seu Tempo (${rec.tempo} min)</span> <span>R$ ${rec.custos.maoDeObra.toFixed(2).replace('.', ',')}</span>
                        </li>
                        <li style="color: var(--cor-60); font-weight: bold; background: #f9f9f9; padding: 5px;">
                            <span>Custos Fixos/Invisíveis</span> <span>R$ ${rec.custos.fixo.toFixed(2).replace('.', ',')}</span>
                        </li>
                    </ul>
                    <div class="totais-detalhes">
                        <p><strong>Custo Total (Massa):</strong> R$ ${rec.custos.totalMassa.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Lucro Líquido Real:</strong> <span style="color: ${lucroUnidade >= 0 ? 'var(--cor-10)' : 'red'};">R$ ${lucroUnidade.toFixed(2).replace('.', ',')} (${rec.margem.toFixed(1)}%)</span></p>
                    </div>
                    <div class="acoes-edicao">
                        <button class="btn-icon" style="background-color: var(--cor-60);" onclick="duplicarReceita('${rec.id}')"><i class="fa-solid fa-copy"></i> Duplicar</button>
                        <button class="btn-editar" onclick="editarReceitaSalva('${rec.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button class="btn-excluir" onclick="excluirReceita('${rec.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
                    </div>
                </div>
            `;
            divCatContent.appendChild(div);
        });

        container.appendChild(divCatContent);
    }
}

function toggleDetalhes(id) {
    const divDetalhes = document.getElementById(`detalhes-${id}`);
    if (divDetalhes.style.display === 'none') {
        divDetalhes.style.display = 'block';
    } else {
        divDetalhes.style.display = 'none';
    }
}

function excluirReceita(id) {
    if(confirm("Tem certeza que deseja apagar esta receita definitivamente?")) {
        receitas = receitas.filter(r => r.id !== id);
        salvarNoNavegador();
        atualizarTelaReceitas();
    }
}

function editarReceitaSalva(id) {
    const rec = receitas.find(r => r.id === id);
    if(!rec) return;

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
    renderizarComposicaoReceita();
    calcularCustosDaReceita();
}

function duplicarReceita(id) {
    const rec = receitas.find(r => r.id === id);
    if(!rec) return;

    const novaReceita = JSON.parse(JSON.stringify(rec)); 
    
    novaReceita.id = 'rec_' + Date.now().toString();
    novaReceita.nome = novaReceita.nome + ' (Cópia)';

    receitas.push(novaReceita);
    salvarNoNavegador();
    atualizarTelaReceitas();
    alert("Receita duplicada com sucesso! Você já pode editá-la.");
}

function moverReceita(id, direcao) {
    const indexGeral = receitas.findIndex(r => r.id === id);
    if (indexGeral === -1) return;

    const cat = receitas[indexGeral].categoria || 'Outros';
    
    const receitasDaCat = receitas.filter(r => (r.categoria || 'Outros') === cat);
    const indexNaCat = receitasDaCat.findIndex(r => r.id === id);

    if (direcao === 'up' && indexNaCat > 0) {
        const idTroca = receitasDaCat[indexNaCat - 1].id;
        const indexTroca = receitas.findIndex(r => r.id === idTroca);
        
        const temp = receitas[indexGeral];
        receitas[indexGeral] = receitas[indexTroca];
        receitas[indexTroca] = temp;
        
    } else if (direcao === 'down' && indexNaCat < receitasDaCat.length - 1) {
        const idTroca = receitasDaCat[indexNaCat + 1].id;
        const indexTroca = receitas.findIndex(r => r.id === idTroca);
        
        const temp = receitas[indexGeral];
        receitas[indexGeral] = receitas[indexTroca];
        receitas[indexTroca] = temp;
    }

    salvarNoNavegador();
    atualizarTelaReceitas();
}