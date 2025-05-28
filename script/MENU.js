document.addEventListener('DOMContentLoaded', function() {
    // Array para armazenar todas as divs de conteúdo que podem ser exibidas/ocultadas
    // IMPORTANTE: Verifique se os IDs aqui correspondem EXATAMENTE aos IDs no seu HTML.
    const divsDeConteudo = [
        'mercado',
        'soma_dinamica',
        'sites_criados'
        // Adicione outros IDs de divs de conteúdo conforme você os criar
    ];

    // Função para esconder todas as divs de conteúdo
    function esconderTodasDivs() {
        console.log("Escondendo todas as divs..."); // Para depuração
        divsDeConteudo.forEach(function(divId) {
            const div = document.getElementById(divId);
            if (div) {
                div.style.display = 'none';
                console.log(`Div ${divId} escondida.`); // Para depuração
            } else {
                console.warn(`Atenção: Div com ID "${divId}" não encontrada.`); // Para depuração
            }
        });
    }

    // Controle de submenus padrão
    const linksComSubmenu = document.querySelectorAll("#navmenu > a + ul.submenu");
    let submenuAberto = null; // Variável para rastrear o submenu aberto

    linksComSubmenu.forEach(function(submenu) {
        const link = submenu.previousElementSibling; // Pega o elemento anterior (o link)

        link.addEventListener("click", function(event) {
            event.preventDefault();

            // Fecha o submenu atualmente aberto, se houver e não for o atual
            if (submenuAberto && submenuAberto !== submenu) {
                submenuAberto.style.display = "none";
            }

            // Abre ou fecha o submenu atual
            submenu.style.display = submenu.style.display === "block" ? "none" : "block";

            // Atualiza a variável de submenu aberto
            submenuAberto = submenu.style.display === "block" ? submenu : null;
        });

        // Adiciona event listener para os cliques dentro do submenu
        submenu.addEventListener("click", function(event) {
            // Verifica se o clique ocorreu em um item do submenu (você pode refinar essa lógica se necessário)
            if (event.target.tagName === 'A' || event.target.tagName === 'LI') {
                // Pequeno atraso para o clique ser registrado antes de fechar
                setTimeout(function() {
                    submenu.style.display = "none";
                    submenuAberto = null; // Reseta a variável
                }, 5);
            }
        });
    });

    document.addEventListener("click", function(event) {
        // Verifica se o clique ocorreu fora do menu e do link que o abriu
        if (submenuAberto && !submenuAberto.contains(event.target) && !submenuAberto.previousElementSibling.contains(event.target)) {
            // Pequeno atraso para o clique ser registrado antes de fechar
            setTimeout(function() {
                if (submenuAberto) {
                    submenuAberto.style.display = "none";
                    submenuAberto = null; // Reseta a variável
                }
            }, 5);
        }
    });

    // --- Funcionalidades específicas para mostrar/esconder divs de conteúdo ---
document.addEventListener('DOMContentLoaded', function () {
    const divsDeConteudo = ['mercado', 'soma_dinamica', 'sites_criados'];

    function fecharTudo() {
        divsDeConteudo.forEach(divId => {
            const div = document.getElementById(divId);
            if (div) div.style.display = 'none';
        });
    }

document.querySelectorAll('#utilitarioslist a').forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();

        // Esconde todas as divs ativas
        esconderTodasDivs();

        const targetId = link.id.replace('mostrar-', '');
        const targetDiv = document.getElementById(targetId);

        if (targetDiv) {
            targetDiv.style.display = 'block'; // Mostra apenas a div desejada
        } else {
            console.warn(`Elemento com ID '${targetId}' não encontrado.`);
        }
    });
});
});

    // Funcionalidade para "CALCULOS DINÂMICOS"
    const mostrarSomaDinamicaLink = document.getElementById('mostrar-soma_dinamica');
    const somaDinamicaDiv = document.getElementById('soma_dinamica');

    if (mostrarSomaDinamicaLink && somaDinamicaDiv) {
        mostrarSomaDinamicaLink.addEventListener('click', function(event) {
            event.preventDefault();
            esconderTodasDivs(); // <--- CHAMA A FUNÇÃO AQUI
            somaDinamicaDiv.style.display = 'block';
            console.log("Cálculos Dinâmicos exibidos."); // Para depuração
        });
    }

    // Funcionalidade específica para "SITES CRIADOS"
    const mostrarSitesCriadosLink = document.getElementById('mostrar_sites_criados');
    const sitesCriadosDiv = document.getElementById('sites_criados');

    if (mostrarSitesCriadosLink && sitesCriadosDiv) {
        mostrarSitesCriadosLink.addEventListener('click', function(event) {
            event.preventDefault();
            esconderTodasDivs(); // <--- CHAMA A FUNÇÃO AQUI
            sitesCriadosDiv.style.display = 'block';
            console.log("Sites Criados exibidos."); // Para depuração
        });
    }

    // Funcionalidade para o botão "Fechar Comparativo" dentro de "CALCULOS DINÂMICOS"
    const fecharSomaDinamicaButton = document.getElementById('fechar-soma_dinamica');

    if (fecharSomaDinamicaButton && somaDinamicaDiv) {
        fecharSomaDinamicaButton.addEventListener('click', function() {
            somaDinamicaDiv.style.display = 'none'; // Força o fechamento ao clicar no botão
            console.log("Cálculos Dinâmicos fechados pelo botão."); // Para depuração
        });
    }

    // Funcionalidade para o botão "Resetar Valores" dentro de "CALCULOS DINÂMICOS"
    const resetarValoresButton = document.getElementById('resetar-valores');
    const tabelaCalculosDinamicos = document.getElementById('tabela-corpo');

    if (resetarValoresButton && tabelaCalculosDinamicos) {
        resetarValoresButton.addEventListener('click', function() {
            const inputsParaResetar = tabelaCalculosDinamicos.querySelectorAll('input[type="number"], input[type="text"]');
            inputsParaResetar.forEach(input => {
                input.value = '';
            });
            console.log("Valores resetados."); // Para depuração
        });
    }

    // --- Nova funcionalidade para o botão "Fechar" da div "sites_criados" ---
    const fecharSitesCriadosButton = document.getElementById('fechar-sites_crados'); // ID do seu botão
    if (fecharSitesCriadosButton && sitesCriadosDiv) {
        fecharSitesCriadosButton.addEventListener('click', function() {
            sitesCriadosDiv.style.display = 'none'; // Esconde a div "sites_criados"
            console.log("Sites Criados fechados pelo botão."); // Para depuração
        });
    }

    // --- Nova função para fechar todas as divs de conteúdo (conforme solicitado) ---
    // Você pode chamar esta função se precisar esconder todas as divs a partir de outro evento,
    // como um botão "Fechar Tudo" geral.
    function fecharTudo() {
        console.log("Executando fecharTudo()..."); // Para depuração
        esconderTodasDivs();
    }
});