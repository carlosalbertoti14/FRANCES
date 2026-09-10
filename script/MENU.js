document.addEventListener('DOMContentLoaded', function() {

    // 1. Liste aqui APENAS os IDs das divs/seções reais do seu projeto atual
    const divsDeConteudo = [
        'mercado'
        // Adicione aqui outros IDs se houver, ex: 'dialogos', 'gramatica'
    ];

    // Função para esconder todas as seções de conteúdo
    function esconderTodasDivs() {
        divsDeConteudo.forEach(function(divId) {
            const div = document.getElementById(divId);
            if (div) {
                div.style.display = 'none';
            }
        });
    }

    // --- CONTROLE DOS SUBMENUS ---
    const linksComSubmenu = document.querySelectorAll("#navmenu > a + ul.submenu");
    let submenuAberto = null;

    linksComSubmenu.forEach(function(submenu) {
        const link = submenu.previousElementSibling;

        if (link) {
            link.addEventListener("click", function(event) {
                event.preventDefault();

                // Esconde submenu anterior se houver outro aberto
                if (submenuAberto && submenuAberto !== submenu) {
                    submenuAberto.style.display = "none";
                }

                // Alterna o submenu atual
                const estaVisivel = submenu.style.display === "block";
                submenu.style.display = estaVisivel ? "none" : "block";
                submenuAberto = estaVisivel ? null : submenu;
            });
        }

        // Fecha o submenu ao clicar em uma das opções internas
        submenu.addEventListener("click", function(event) {
            if (event.target.tagName === 'A' || event.target.tagName === 'LI') {
                submenu.style.display = "none";
                submenuAberto = null;
            }
        });
    });

    // Fecha o submenu se clicar em qualquer lugar fora dele na tela
    document.addEventListener("click", function(event) {
        if (submenuAberto) {
            const linkPai = submenuAberto.previousElementSibling;
            if (!submenuAberto.contains(event.target) && (!linkPai || !linkPai.contains(event.target))) {
                submenuAberto.style.display = "none";
                submenuAberto = null;
            }
        }
    });

    // --- NAVEGAÇÃO DOS LINKS DOS SUBMENUS ---
    // Captura cliques em links para alternar exibições de conteúdo (se houver)
    const linksNav = document.querySelectorAll('#navmenu a[id^="mostrar-"], #navmenu a[id^="mostrar_"]');
    
    linksNav.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            // Pega o ID da div tirando o prefixo 'mostrar-' ou 'mostrar_'
            const targetId = this.id.replace(/^mostrar[-_]/, '');
            const targetDiv = document.getElementById(targetId);

            if (targetDiv) {
                esconderTodasDivs();
                targetDiv.style.display = 'block';
            }
        });
    });

});