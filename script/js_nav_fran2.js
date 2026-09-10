document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('LGFran_play');
    const pauseButton = document.getElementById('LGFran_pause');
    const prevSegmentButton = document.getElementById('LGFran_prevSegment');
    const nextSegmentButton = document.getElementById('LGFran_nextSegment');
    const toggleLoopButton = document.getElementById('LGFran_toggleLoop');
    const toggleABModeButton = document.getElementById('LGFran_toggleABMode');
    const toggleMuteButton = document.getElementById('LGFran_toggleMute');
    const changeAudioButton = document.getElementById('LGFran_changeAudio');
    const dialogContent = document.getElementById('LGFran_dialogContent');
    const dialogBlocks = document.querySelectorAll('.LGFran_dialog-block');
    const dialogTitle = document.getElementById('LGFran_dialogTitle');
    const stopButton = document.getElementById('LGFran_stop');

    const repWordButton = document.getElementById('LGFran_repWord');
    const repFrasButton = document.getElementById('LGFran_repFras');
    const time4Button = document.getElementById('LGFran_time4');
    const slowDownAudioButton = document.getElementById('LGFran_slowDownAudio'); // Novo botão para desacelerar

    // NOVO: Seleção de idioma
    const languageSelect = document.getElementById('LGFran_languageSelect');

    let currentUtterance = null;
    let speaking = false;
    let paused = false;
    let loopMode = false;
    let abMode = false;
    let abStartParagraphIndex = -1;
    let abEndParagraphIndex = -1;
    let currentParagraphIndex = -1;
    let isMuted = false;
    let repetitionMode = ''; // 'word', 'phrase', ou '' (para repetição normal de parágrafo)
    let delayMode = false; // Novo estado para o botão de 4s
    let loopTimeout = null; // Para controlar o tempo de espera no loop
    let clickDelayTimeout = null; // Novo timeout para o atraso ao clicar
    let countdownInterval = null; // NOVO: Para o contador regressivo no botão 4s

    let currentAudioRate = 1.0; // Velocidade inicial do áudio
    let isSlowed = false; // Para controlar se o áudio está desacelerado

    // NOVO: Variável para controlar o idioma de fala e exibição
    let currentDisplayLanguage = 'fr'; // Idioma de exibição dos textos originais (fr, en, ru, zh)
    let currentSpeechLanguage = 'fr-FR'; // Idioma para a síntese de fala (ex: fr-FR, en-US)

    // NOVO: Mapeamento de idiomas para vozes da API SpeechSynthesis
    const langToVoiceMap = {
        'fr': 'fr-FR', // Francês
        'en': 'en-US', // Inglês (EUA)
        'ru': 'ru-RU', // Russo
        'zh': 'zh-CN', // Mandarim (China continental)
        'pt-br': 'fr-FR' // Mapeia "Português" para voz francesa para fala
    };

    // NOVO: Atraso mínimo para loops e repetições para evitar travamentos
    const MIN_LOOP_DELAY = 500; // 500 milissegundos = 0.5 segundos. Ajuste conforme necessário.

    // Variáveis para armazenar a última palavra/frase clicada para repetição em loop
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null; // Armazena o elemento <p> da frase clicada
    let currentABIndex = -1; // Adicionado para controlar o índice atual no modo AB

    // NOVO: Variáveis para armazenar o estado dos modos antes de um clique no conteúdo
    // REMOVIDO: Não usaremos mais estas variáveis para desativar botões
    // let wasLoopModeActive = false;
    // let wasABModeActive = false;
    // let wasRepetitionModeActive = ''; // Armazena 'word', 'phrase', ou ''
// ========== 1. DECLARAÇÕES NO TOPO DO ARQUIVO (ESCOPO GLOBAL) ==========
const dialogues = [
    { id: 'LGFran_dialog_BE_Ser_Estar', title: 'BE = Ser / Estar' },
    { id: 'LGFran_dialog_WHERE_Onde_De_Onde', title: 'WHERE = Onde / De Onde' },
    { id: 'LGFran_dialog_TO_WANT_Querer', title: 'QUERER' },
    { id: 'LGFran_dialog_CAN_Poder_Conseguir', title: 'CONSEGUIR' },
    { id: 'LGFran_dialog_TO_KNOW_Saber_Conhecer', title: 'SABER / CONHECER' },
    { id: 'LGFran_dialog_WHAT_O_Que_Qual', title: 'QUE / QUAL' },
    { id: 'LGFran_dialog_WHY_BECAUSE_Por_Que', title: 'POR QUE?' },
    { id: 'LGFran_dialog_CHOICE_TO_CHOOSE_Escolha', title: 'ESCOLHA' },
    { id: 'LGFran_dialog_WHILE_Enquanto', title: 'ENQUANTO' },
    { id: 'LGFran_dialog_HAVE_Ter', title: 'TER' },
    { id: 'LGFran_dialog_TO_GET_Conseguir_Obter', title: 'CONSEGUIR (OBTER)' },
    { id: 'LGFran_dialog_TO_TAKE_Tomar_Levar_Pegar', title: 'TOMAR / LEVAR / PEGAR' },
    { id: 'LGFran_dialog_TO_GIVE_Dar', title: 'DAR' },
    { id: 'LGFran_dialog_TO_BORROW_TO_LEND_Pedir_Emprestado_Emprestar', title: 'EMPRESTADO / EMPRESTAR' },
    { id: 'LGFran_dialog_TO_GRAB_Pegar_Rapido_Agarrar', title: 'PEGAR / AGARRAR' },
    { id: 'LGFran_dialog_TO_ARRIVE_Chegar', title: 'CHEGAR' },
    { id: 'LGFran_dialog_TO_GO_Ir', title: 'IR' },
    { id: 'LGFran_dialog_TO_BUY_Comprar', title: 'COMPRAR' },
    { id: 'LGFran_dialog_EXPRESSIONS_OF_QUANTITY_AND_LOCATION', title: 'EXPRESSÕES DE QUANTIDADE' },
    { id: 'LGFran_dialog_EXPRESSIONS_OF_LOCATION_POSITION', title: 'EXPRESSÕES DE POSIÇÃO' }
];

let currentDialogueIndex = 0; // Garante que a variável do índice exista globalmente

// ========== 2. FUNÇÃO INITIALIZEDIALOG ==========
function initializeDialog() {
    stopSpeaking();
    clearHighlight();
    dialogBlocks.forEach(block => block.classList.add('LGFran_hidden'));
    
    if (dialogues[currentDialogueIndex]) {
        const activeDialogBlock = document.getElementById(dialogues[currentDialogueIndex].id);
        if (activeDialogBlock) {
            activeDialogBlock.classList.remove('LGFran_hidden');
            const titleFromData = activeDialogBlock.getAttribute('data-title');
            dialogTitle.textContent = titleFromData || dialogues[currentDialogueIndex].title;
            currentParagraphIndex = -1;
            abStartParagraphIndex = -1;
            abEndParagraphIndex = -1;
            currentABIndex = -1;
            document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab'));
            updateABButtonIcon();
        }
    }
}

    // --- SEÇÃO DO BOTÃO DE AJUDA ---
    const helpButton = document.getElementById('LGFran_AJUDA');
    let helpModal = null; // Variável para armazenar a referência à modal de ajuda

    function createHelpModal() {
        if (helpModal) return; // Se a modal já existe, não crie novamente

        helpModal = document.createElement('div');
        helpModal.id = 'LGFran_helpModal';
        helpModal.classList.add('LGFran_help-modal');

        helpModal.innerHTML = `
            <div class="LGFran_help-modal-content">
                <span class="LGFran_close-button" id="LGFran_closeHelpModal">&times;</span>
                <h2>LEGENDA DOS ICONES DO MENU</h2>
                <div class="LGFran_help-grid">
                    <div>
                        <p><strong><button class="LGFran_icon-button-legend">🔠</button> MODO PALAVRA:</strong> Mantenha ativada para falar e clique em alguma palavra do diálogo, para repetir somente ela.</p>
                        <p><strong><button class="LGFran_icon-button-legend">💬</button> MODO FRASE:</strong> Ative ela Clique no parágrafo que deseja ouvir, sem dar continuidade ao restante dos parágrafos.</p>
                        <p><strong><button class="LGFran_icon-button-legend">🔁</button> MODO REPETIÇÃO:</strong> Repete continuamente sem a necessidade de varios cliques, seja na MODO PALAVRA, NO MODO PARAGRAFO ou MODO AB.</p>
                        <p><strong><button class="LGFran_icon-button-legend">4s</button> ESPERA 4s:</strong> Adiciona uma pausa de 4 segundos entre as repetições no modo de loop, para que não fique repetindo rápido de mais.</p>
                        <p><strong><button class="LGFran_icon-button-legend">🐢</button> RETARDA O AUDIO:</strong> Alterna a velocidade da fala, deixando-a um pouco mais lenta, para facilitar a compreensão.</p>
                        <p><strong><button class="LGFran_icon-button-legend">📝</button> MUDA O DIÁLO:</strong> Carrega o próximo diálogo disponível na lista.</p>
                    </div>
                    <div>
                        <p><strong><button class="LGFran_icon-button-legend">▶️</button> PLAY:</strong> Inicia a leitura do áudio do segmento atual ou retoma de onde parou.</p>
                        <p><strong><button class="LGFran_icon-button-legend">⏸️</button> PAUSE:</strong> Pausa a leitura do áudio.</p>
                        <p><strong><button class="LGFran_icon-button-legend">⏹️</button> STOP:</strong> Para completamente a leitura do áudio e reinicia o segmento.</p>
                        <p><strong><button class="LGFran_icon-button-legend">⏪</button> VOLTAR PARAGRAFO:</strong> Volta para o parágrafo (segmento) anterior.</p>
                        <p><strong><button class="LGFran_icon-button-legend">⏩</button> PRÓXIMO PARAGRAFO:</strong> Avança para o próximo parágrafo (segmento).</p>
                        <p><strong><button class="LGFran_icon-button-legend">🅰️🅱️</button> MODO AB:</strong> Permite selecionar um início (A) de um parágrafo e um fim (B) do parágrafo, para repetir um trecho específico do diálogo.</p>
                        <p><strong><button class="LGFran_icon-button-legend">🔇</button> DESATIVA AUDIO:</strong> Muta ou desmuta o áudio da síntese de fala, também server para corrigir erros, caso ocorrra.</p>
                        <p><strong><button class="LGFran_icon-button-legend">❓</button> AJUDA:</strong> Exibe esta janela de ajuda com a explicação de todos os botões.</p>
                        <p><strong><button class="LGFran_icon-button-legend"> - </button> Obs.:</strong> Você pode precionar a palavra ou selecionar um trecho especifico, e escolher a opção para o seu proprio navegador traduzir aquiele trecho, ele também pronuncia.</p>
                    
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(helpModal);

        // Adiciona event listener para fechar a modal
        document.getElementById('LGFran_closeHelpModal').addEventListener('click', closeHelpModal);
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) { // Fecha se clicar fora do conteúdo da modal
                closeHelpModal();
            }
        });
    }

    function openHelpModal() {
        createHelpModal(); // Garante que a modal seja criada
        helpModal.style.display = 'flex'; // Torna a modal visível
    }

    function closeHelpModal() {
        if (helpModal) {
            helpModal.style.display = 'none'; // Esconde a modal
        }
    }

    // Adiciona o event listener ao botão de ajuda
    helpButton.addEventListener('click', openHelpModal);
    // --- FIM SEÇÃO DO BOTÃO DE AJUDA ---

/* FIM DO BOTÃO AJUDA ... */


    // --- Nova Função paradalternar ---
function paradalternar() {
    // Primeiro, para qualquer fala em andamento para garantir que não haja interrupção
    stopSpeaking();
    // Em seguida, alterna o estado do botão de mudo.
    // Se estava desmutado, muta. Se estava mutado, desmuta.
    /* toggleMuteButton.click();  */

    // --- Início da adição da mensagem temporária ---
    const mensagemDiv = document.createElement('div');
    mensagemDiv.textContent = "⏳ Aguarde ...";
    mensagemDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 9999; /* Garante que fique acima de tudo */
        font-size: 1.2em;
        text-align: center;
    `;
    document.body.appendChild(mensagemDiv);
    // --- Fim da adição da mensagem temporária ---

    // Aguarda 2 segundos antes de potencialmente desmutar novamente.
    setTimeout(() => {
        // Se o áudio ainda estiver mutado após os 2 segundos (o que significa que
        // o clique anterior no toggleMuteButton o deixou mutado), então desmuta.
        // Isso cria a "janela de silêncio".
        if (isMuted) {
            /* toggleMuteButton.click(); */ // Desmuta o áudio
            stopSpeaking(); // Garante que nenhuma fala residual comece inesperadamente
        }

        // --- Início da remoção da mensagem temporária ---
        // A mensagem será removida junto com o desmute/ação após os 2 segundos.
        if (document.body.contains(mensagemDiv)) {
            document.body.removeChild(mensagemDiv);
        }
        // --- Fim da remoção da mensagem temporária ---

    }, 2000); // 2000 milissegundos = 2 segundos
}

// --- fim da Nova Função paradalternar ---

        function mutepalternar() {
        // Primeiro, para qualquer fala em andamento para garantir que não haja interrupção
        stopSpeaking();
        // Em seguida, alterna o estado do botão de mudo.
        // Se estava desmutado, muta. Se estava mutado, desmuta.
          toggleMuteButton.click();  

        // Aguarda 2 segundos antes de potencialmente desmutar novamente.
        setTimeout(() => {
            // Se o áudio ainda estiver mutado após os 2 segundos (o que significa que
            // o clique anterior no toggleMuteButton o deixou mutado), então desmuta.
            // Isso cria a "janela de silêncio".
            if (isMuted) {
                toggleMuteButton.click(); // Desmuta o áudio
                stopSpeaking(); // Garante que nenhuma fala residual comece inesperadamente
            }
        }, 2000); // 2000 milissegundos = 2 segundos
    }
    // --- Fim da Nova Função paradalternar ---

    // NOVO: Função para iniciar/atualizar a contagem regressiva no botão 4s
    function startCountdown(duration) {
        let timeLeft = duration / 1000; // Converte ms para segundos
        time4Button.textContent = `${timeLeft}s`;

        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                time4Button.textContent = `${timeLeft}s`;
            } else {
                clearInterval(countdownInterval);
                time4Button.textContent = '4s'; // Volta ao texto original após a contagem
            }
        }, 1000); // Atualiza a cada segundo
    }

    // NOVO: Função para parar a contagem regressiva e resetar o texto do botão
    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        time4Button.textContent = '4s'; // Garante que o texto volte ao original
    }

    // --- Funções de Leitura (Speech Synthesis) ---

    let voices = [];
    let preferredVoices = {}; // Armazena uma voz preferencial para cada idioma

    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices();
        // Tenta encontrar uma voz "Google" para cada idioma suportado
        Object.keys(langToVoiceMap).forEach(shortLang => {
            const fullLangCode = langToVoiceMap[shortLang];
            const foundVoice = voices.find(voice =>
                voice.lang === fullLangCode && voice.name.includes('Google')
            ) || voices.find(voice => voice.lang.startsWith(shortLang)); // Fallback para qualquer voz do idioma

            if (foundVoice) {
                preferredVoices[shortLang] = foundVoice;
            } else {
                console.warn(`Nenhuma voz 'Google' ou voz genérica encontrada para ${fullLangCode}. A síntese de fala pode não funcionar como esperado para este idioma.`);
            }
        });
        console.log('Vozes preferidas carregadas:', preferredVoices);
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList(); // Chama para carregar as vozes inicialmente

    // Função para ler um texto específico
    // NOVO: Adicionado 'langToSpeak' como parâmetro para garantir a voz e pronúncia corretas
    function speakText(text, rate = currentAudioRate, isRepetition = false, langToSpeak = currentSpeechLanguage) {
        if (isMuted) {
            speaking = false;
            return;
        }

        speechSynthesis.cancel(); // Cancela qualquer fala anterior
        clearTimeout(loopTimeout); // Limpa o timeout de loop existente
        clearTimeout(clickDelayTimeout); // Limpa o timeout de clique, se houver
        stopCountdown(); // NOVO: Para a contagem regressiva ao iniciar uma nova fala

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.rate = rate;

        // Tenta usar o código de idioma completo do mapeamento, senão usa o shortLang como base
        const synthesisLang = langToVoiceMap[langToSpeak] || `${langToSpeak}-${langToSpeak.toUpperCase()}`;
        currentUtterance.lang = synthesisLang;

        // Seleciona a voz com base no idioma de fala
        const voiceForLang = preferredVoices[langToSpeak.split('-')[0]] || // Tenta buscar pela parte curta (ex: 'fr')
                                voices.find(voice => voice.lang === synthesisLang); // Fallback para qualquer voz com o código completo

        if (voiceForLang) {
            currentUtterance.voice = voiceForLang;
        } else {
            console.warn(`Nenhuma voz adequada encontrada para o idioma "${langToSpeak}". Usando a voz padrão do navegador.`);
        }

        currentUtterance.onend = () => {
            speaking = false;
            paused = false;
            stopCountdown(); // NOVO: Para a contagem regressiva quando a fala termina

            // LÓGICA DE CONTINUAÇÃO APÓS A FALA
            if (loopMode || (abMode && (currentABIndex <= abEndParagraphIndex || (currentABIndex === abEndParagraphIndex + 1 && loopMode)))) {
                const delay = delayMode ? 4000 : MIN_LOOP_DELAY; // Usa 4s se delayMode, senão MIN_LOOP_DELAY

                if (delayMode) { // NOVO: Inicia a contagem regressiva se delayMode estiver ativo
                    startCountdown(delay);
                }

                loopTimeout = setTimeout(() => {
                    stopCountdown(); // NOVO: Garante que a contagem pare antes de continuar
                    if (abMode) {
                        currentABIndex++; // Avança para o próximo parágrafo no segmento AB
                        if (currentABIndex <= abEndParagraphIndex) { // Ainda dentro do segmento AB
                            playNextABParagraph(); // Continua para o próximo parágrafo do segmento AB
                        } else if (loopMode) { // Terminou o segmento AB, e está em loop
                            currentABIndex = abStartParagraphIndex; // Reinicia o índice AB
                            playNextABParagraph(); // Começa o segmento AB novamente
                        } else { // Terminou o segmento AB e não está em loop
                            stopSpeaking();
                            // Não desativa abMode ou remove classe 'LGFran_active' aqui
                            // Pois o objetivo é que os botões permaneçam ativos após o clique
                            // toggleABModeButton.classList.remove('LGFran_active');
                            // abMode = false;
                            // abStartParagraphIndex = -1;
                            // abEndParagraphIndex = -1;
                            // currentParagraphIndex = -1;
                            // updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
                        }
                    } else if (repetitionMode === 'word' || repetitionMode === 'phrase') {
                        handleLoopRepetition(); // Continua a repetição de palavra/frase
                    } else {
                        highlightNextParagraph(true); // Continua o loop de parágrafo
                    }
                }, delay);
            } else if (!isRepetition && !abMode && !paused) {
                // Comportamento normal: avança para o próximo parágrafo se não for repetição isolada e não estiver em modo AB
                highlightNextParagraph();
            } else if (isRepetition && repetitionMode !== '') {
                // Para repetições isoladas (word/phrase) sem loop, não faz nada depois de falar
                clearHighlight();
            }
        };

        stopButton.addEventListener('click', () => {
            stopSpeaking();
            stopCountdown(); // NOVO: Para a contagem regressiva ao parar
            console.log("stop apertado");
        });

        currentUtterance.onerror = (event) => {
            console.error('Erro na síntese de fala:', event.error);
            speaking = false;
            paused = false; // Em caso de erro, também considera que a fala foi pausada/interrompida
            stopCountdown(); // NOVO: Para a contagem regressiva em caso de erro

            // Se houver um erro, ainda tenta continuar o loop/próxima fala
            // para evitar que o player pare completamente.
            if (loopMode || abMode) {
                const delay = delayMode ? 4000 : MIN_LOOP_DELAY;
                if (delayMode) { // NOVO: Inicia a contagem regressiva se delayMode estiver ativo
                    startCountdown(delay);
                }
                loopTimeout = setTimeout(() => {
                    stopCountdown(); // NOVO: Garante que a contagem pare antes de continuar
                    if (abMode) {
                        currentABIndex++; // Tenta avançar mesmo com erro para não travar
                        if (currentABIndex <= abEndParagraphIndex || loopMode) {
                            if (loopMode && currentABIndex > abEndParagraphIndex) currentABIndex = abStartParagraphIndex; // Reinicia se for o fim e loop
                            playNextABParagraph();
                        } else {
                            stopSpeaking(); // Se não for para loop, para.
                            // Não desativa abMode ou remove classe 'LGFran_active' aqui
                            // toggleABModeButton.classList.remove('LGFran_active');
                            // abMode = false;
                            // abStartParagraphIndex = -1;
                            // abEndParagraphIndex = -1;
                            // currentParagraphIndex = -1;
                            // updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
                        }
                    } else if (repetitionMode === 'word' || repetitionMode === 'phrase') {
                        handleLoopRepetition();
                    } else {
                        highlightNextParagraph(true);
                    }
                }, delay);
            }
        };

        speechSynthesis.speak(currentUtterance);
        speaking = true;
        paused = false;

        playButton.classList.add('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
    }

    // Função para parar a leitura
    function stopSpeaking() {
        speechSynthesis.cancel();
        clearTimeout(loopTimeout); // Limpa qualquer timeout de loop
        clearTimeout(clickDelayTimeout); // Limpa o timeout de clique também
        stopCountdown(); // NOVO: Para a contagem regressiva
        speaking = false;
        paused = false;
        clearHighlight();
        playButton.classList.remove('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
    }

    // Função para pausar a leitura
    function pauseSpeaking() {
        if (speaking && !paused) {
            speechSynthesis.pause();
            clearTimeout(loopTimeout); // Limpa o timeout ao pausar
            clearTimeout(clickDelayTimeout); // Limpa o timeout de clique ao pausar
            stopCountdown(); // NOVO: Para a contagem regressiva ao pausar
            paused = true;
            pauseButton.classList.add('LGFran_active');
            playButton.classList.remove('LGFran_active');
        }
    }

    // Função para continuar a leitura
    function resumeSpeaking() {
        if (speaking && paused) {
            speechSynthesis.resume();
            paused = false;
            playButton.classList.add('LGFran_active');
            pauseButton.classList.remove('LGFran_active');
        } else if (!speaking && currentParagraphIndex !== -1) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;

            const initialDelay = delayMode ? 4000 : 0; // Atraso inicial para resume se delayMode ativo

            clearTimeout(clickDelayTimeout); // Limpa o timeout de clique
            // Não vamos mais parar a contagem regressiva aqui, pois ela só deve acontecer no `speakText`
            // if (delayMode) startCountdown(initialDelay); // NÃO AQUI, POIS É SÓ O ATRASO INICIAL, NÃO O LOOP

            clickDelayTimeout = setTimeout(() => {
                if (loopMode) {
                    handleLoopRepetition(); // Retoma o loop
                } else if (abMode) {
                    playABSegment(); // Retoma o modo AB
                } else {
                    // Senão, retoma a fala do parágrafo atual
                    const paragraph = paragraphs[currentParagraphIndex];
                    if (paragraph) {
                        speakParagraph(paragraph);
                    }
                }
            }, initialDelay);
        }
    }
    // --- Funções de Controle de Diálogo e Destaque ---

    function getActiveParagraphs() {
        const activeDialogBlock = document.getElementById(dialogues[currentDialogueIndex].id);
        return activeDialogBlock ? Array.from(activeDialogBlock.querySelectorAll('p')) : [];
    }

    function clearHighlight() {
        document.querySelectorAll('.LGFran_highlight').forEach(p => {
            p.classList.remove('LGFran_highlight');
        });
    }

    function highlightParagraph(paragraph) {
        clearHighlight();
        if (paragraph) {
            paragraph.classList.add('LGFran_highlight');
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Função para iniciar a fala de um parágrafo
    function speakParagraph(paragraph, isRepetition = false) {
        if (paragraph) {
            const originalTextSpanWrapper = paragraph.querySelector('.LGFran_original-text');
            if (originalTextSpanWrapper) {
                // Pega o texto do span visível dentro do wrapper, que corresponde ao idioma atual
                const visibleLangSpan = originalTextSpanWrapper.querySelector(`span[data-lang="${currentDisplayLanguage}"]:not(.LGFran_hidden)`);
                const textToSpeak = visibleLangSpan ? visibleLangSpan.textContent : '';

                highlightParagraph(paragraph);
                // Passamos o idioma de exibição atual para speakText, que usará o mapeamento
                speakText(textToSpeak, currentAudioRate, isRepetition, currentDisplayLanguage);
            }
        }
    }

    // Função para avançar para o próximo parágrafo (usado no modo normal e loop de parágrafo)
    function highlightNextParagraph(isLooping = false) {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;

        currentParagraphIndex++;
        if (currentParagraphIndex >= paragraphs.length) {
            currentParagraphIndex = 0; // Volta ao início para loop

            if (!loopMode && !isLooping) { // Se não estiver em loop, para ao chegar ao fim
                stopSpeaking();
                return;
            }
        }
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    // Função para voltar para o parágrafo anterior
    function highlightPrevParagraph() {
        stopSpeaking(); // Para a fala atual antes de mudar para o parágrafo anterior
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0) return;

        currentParagraphIndex--;
        if (currentParagraphIndex < 0) {
            currentParagraphIndex = paragraphs.length - 1;
        }
        speakParagraph(paragraphs[currentParagraphIndex]);
    }

    // Inicializa o diálogo atual, esconde os outros e atualiza o título
    function initializeDialog() {
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        clearHighlight();
        dialogBlocks.forEach(block => block.classList.add('LGFran_hidden'));
        const activeDialogBlock = document.getElementById(dialogues[currentDialogueIndex].id);
        if (activeDialogBlock) {
            activeDialogBlock.classList.remove('LGFran_hidden');
            dialogTitle.textContent = dialogues[currentDialogueIndex].title;
            currentParagraphIndex = -1;
            abStartParagraphIndex = -1;
            abEndParagraphIndex = -1;
            currentABIndex = -1; // Resetar o índice AB também
            // Garante que os modos são desativados visualmente e logicamente
            // REMOVIDO: Não desativamos mais os modos ao inicializar o diálogo, apenas limpamos os pontos AB
            // toggleABModeButton.classList.remove('LGFran_active');
            // abMode = false;
        }
        // Chamada para atualizar o ícone do botão AB ao inicializar um novo diálogo
        updateABButtonIcon(); // Adicionado aqui

        // REMOVIDO: Não desativamos mais os modos de repetição e loop ao inicializar o diálogo
        // repWordButton.classList.remove('LGFran_active');
        // repFrasButton.classList.remove('LGFran_active');
        // repetitionMode = '';
        // toggleLoopButton.classList.remove('LGFran_active');
        // loopMode = false;

        time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s
        delayMode = false;
        stopCountdown(); // Garante que o contador esteja parado e o texto restaurado

        slowDownAudioButton.classList.remove('LGFran_active'); // Desativa o botão de desacelerar
        isSlowed = false;
        currentAudioRate = 1.0; // Reinicia a velocidade do áudio

        // Manter o estado do mudo
        // toggleMuteButton.classList.remove('LGFran_active');
        // isMuted = false;
        // toggleMuteButton.innerHTML = '🔊'; // Resetar ícone

        lastClickedWord = '';
        lastClickedPhraseParagraph = null;

        // NOVO: Atualiza a exibição do diálogo para o idioma atual
        updateDialogLanguage(currentDisplayLanguage);
    }

    // NOVO: Função para atualizar a exibição do idioma no diálogo
    function updateDialogLanguage(selectedLang) {
        currentDisplayLanguage = selectedLang; // Atualiza o idioma de exibição
        currentSpeechLanguage = selectedLang; // Atualiza o idioma de fala

        dialogBlocks.forEach(block => {
            const originalTextSpans = block.querySelectorAll('.LGFran_original-text');
            originalTextSpans.forEach(originalSpanWrapper => {
                // Oculta todos os spans de idioma dentro deste LGFran_original-text
                originalSpanWrapper.querySelectorAll('span[data-lang]').forEach(langSpan => {
                    langSpan.classList.add('LGFran_hidden');
                });

                // Exibe apenas o span do idioma selecionado
                const targetLangSpan = originalSpanWrapper.querySelector(`span[data-lang="${selectedLang}"]`);
                if (targetLangSpan) {
                    targetLangSpan.classList.remove('LGFran_hidden');
                } else {
                    // Fallback para francês se o idioma selecionado não for encontrado
                    const fallbackLangSpan = originalSpanWrapper.querySelector('span[data-lang="fr"]');
                    if (fallbackLangSpan) {
                        fallbackLangSpan.classList.remove('LGFran_hidden');
                        console.warn(`Idioma "${selectedLang}" não encontrado para um parágrafo. Revertendo para Francês.`);
                        // Se reverteu para francês, a fala também deve ser francesa
                        currentSpeechLanguage = 'fr';
                    }
                }
            });
        });
    }

    // --- Lógica de Repetição em Loop (centralizada) ---
    // Esta função agora apenas INICIA a repetição, a continuação é no onend de speakText
    function handleLoopRepetition() {
        if (!loopMode) {
            stopSpeaking();
            return;
        }

        if (repetitionMode === 'word' && lastClickedWord) {
            speakText(lastClickedWord, currentAudioRate, true, currentSpeechLanguage); // Usa o idioma de fala
        } else if (repetitionMode === 'phrase' && lastClickedPhraseParagraph) {
            speakParagraph(lastClickedPhraseParagraph, true); // speakParagraph já usa o idioma de fala
        } else if (abMode) {
            playABSegment(); // Inicia o loop AB (que internamente chamará speakText)
        } else {
            // Comportamento padrão de loop de parágrafo
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0) {
                if (currentParagraphIndex === -1) {
                    currentParagraphIndex = 0; // Começa do primeiro se nenhum selecionado
                }
                speakParagraph(paragraphs[currentParagraphIndex], false);
            }
        }
    }

    // --- Lógica de Modo AB ---
    function playABSegment() {
        const paragraphs = getActiveParagraphs();
        if (paragraphs.length === 0 || abStartParagraphIndex === -1 || abEndParagraphIndex === -1 || abStartParagraphIndex > abEndParagraphIndex) {
            console.warn("Segmento A-B inválido ou não definido.");
            stopSpeaking();
            // REMOVIDO: Não desativamos mais o abMode ou removemos a classe 'LGFran_active' aqui
            // toggleABModeButton.classList.remove('LGFran_active');
            // abMode = false;
            updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
            return;
        }

        if (currentABIndex === -1 || currentABIndex > abEndParagraphIndex) {
            currentABIndex = abStartParagraphIndex; // Reinicia o AB loop
        }

        if (currentABIndex < paragraphs.length) {
            currentParagraphIndex = currentABIndex; // Sincroniza o índice de parágrafo atual
            speakParagraph(paragraphs[currentABIndex]);
        } else {
            // Isso só deve acontecer se abEndParagraphIndex for inválido, mas por segurança
            stopSpeaking();
            // REMOVIDO: Não desativamos mais o abMode ou removemos a classe 'LGFran_active' aqui
            // toggleABModeButton.classList.remove('LGFran_active');
            // abMode = false;
            updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
        }
    }

    function playNextABParagraph() {
        const paragraphs = getActiveParagraphs();
        if (currentABIndex < paragraphs.length) {
            currentParagraphIndex = currentABIndex; // Sincroniza o índice de parágrafo atual
            speakParagraph(paragraphs[currentABIndex]);
        } else {
            // Se chegou ao fim do segmento AB e não está em loop, para
            if (!loopMode) {
                stopSpeaking();
                // REMOVIDO: Não desativamos mais o abMode ou removemos a classe 'LGFran_active' aqui
                // toggleABModeButton.classList.remove('LGFran_active');
                // abMode = false;
                // abStartParagraphIndex = -1;
                // abEndParagraphIndex = -1;
                // currentParagraphIndex = -1;
                updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
            } else {
                // Se está em loop, reinicia o segmento AB
                currentABIndex = abStartParagraphIndex;
                currentParagraphIndex = currentABIndex;
                speakParagraph(paragraphs[currentABIndex]);
            }
        }
    }

    // --- Lógica de Clique em Palavra/Frase (para modo repetição) ---
    // NOVO: Função auxiliar para capturar a palavra clicada
    function getWordAtPoint(element, clientX, clientY) {
        // Se o clique foi no wrapper LGFran_original-text, tentamos encontrar o span visível dentro
        if (element.classList.contains('LGFran_original-text')) {
            element = element.querySelector(`span[data-lang="${currentDisplayLanguage}"]:not(.LGFran_hidden)`);
            if (!element) return null; // Se não encontrar o span visível, não há palavra para pegar
        }

        // Verifica se o elemento clicado é um span com texto de idioma
        if (element.nodeType === Node.ELEMENT_NODE && element.hasAttribute('data-lang')) {
            const range = document.caretRangeFromPoint(clientX, clientY);
            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer;
                const text = textNode.textContent;
                const offset = range.startOffset;

                // Encontra o início da palavra
                let start = offset;
                while (start > 0 && /\p{L}|\p{N}/u.test(text[start - 1])) { // Usa regex para caracteres unicode
                    start--;
                }

                // Encontra o fim da palavra
                let end = offset;
                while (end < text.length && /\p{L}|\p{N}/u.test(text[end])) { // Usa regex para caracteres unicode
                    end++;
                }
                const word = text.substring(start, end);
                return word.trim() !== '' ? word.trim() : null; // Retorna null se for apenas espaço ou vazio
            }
        }
        return null;
    }

    // Função para atualizar o ícone do botão A-B
    function updateABButtonIcon() {
        if (!abMode) {
            toggleABModeButton.innerHTML = '🅰️🅱️'; // Desativado
            return;
        }

        if (abStartParagraphIndex === -1 && abEndParagraphIndex === -1) {
            toggleABModeButton.innerHTML = '❌❌'; // Modo ativado, mas nenhum ponto definido
        } else if (abStartParagraphIndex !== -1 && abEndParagraphIndex === -1) {
            toggleABModeButton.innerHTML = '🅰️❌'; // Ponto A definido, esperando B
        } else if (abStartParagraphIndex !== -1 && abEndParagraphIndex !== -1) {
            toggleABModeButton.innerHTML = '🅰️🅱️'; // Segmento A-B definido
            playButton.click()

        }
    }


    dialogContent.addEventListener('click', (event) => {
        const clickedParagraph = event.target.closest('.LGFran_dialog-block > p');
        if (!clickedParagraph) return; // Garante que clicamos em um parágrafo de diálogo
        
        // Garante que qualquer mensagem anterior seja removida antes de criar uma nova
        // Isso é crucial para evitar múltiplas mensagens se houver cliques rápidos.
        const existingMensagemDiv = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
        if (existingMensagemDiv && document.body.contains(existingMensagemDiv)) {
            document.body.removeChild(existingMensagemDiv);
        }

        // --- Início da adição da mensagem temporária ---
        const mensagemDiv = document.createElement('div');
        mensagemDiv.textContent = "⏳ Aguarde ...";
        mensagemDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 9999; /* Garante que fique acima de tudo */
            font-size: 1.2em;
            text-align: center;
        `;
        document.body.appendChild(mensagemDiv);
        // --- Fim da adição da mensagem temporária ---
        
        stopSpeaking(); // Parar qualquer fala atual. Essa função agora também remove a mensagem.
        toggleMuteButton.click(); // Alterna o estado do mudo para "silenciar" rapidamente

        // Limpa qualquer timeout de clique pendente ANTES de definir um novo
        clearTimeout(clickDelayTimeout);
        stopCountdown(); // Garante que qualquer contagem anterior pare ao clicar no texto

        // NOVO: Inicia a contagem regressiva se delayMode estiver ativo para o clique no texto
        // Isso acontecerá *antes* da mensagem de "Aguarde..." sumir, e *antes* da fala começar
        const initialDelay = delayMode ? 4000 : 0;
        if (delayMode && initialDelay > 0) {
            startCountdown(initialDelay);
        }

        // Este setTimeout será executado APÓS a "janela de silêncio" de 2 segundos do mutepalternar
        // e APÓS o possível atraso inicial do delayMode.
        clickDelayTimeout = setTimeout(() => {
            // A mensagem "Aguarde..." já deve ter sido removida por `stopSpeaking()` ou
            // pela lógica de `toggleMuteButton.click()`/`mutepalternar()`.
            // No entanto, para redundância e segurança, podemos chamar a remoção de forma mais genérica.
            // É melhor não usar a referência `mensagemDiv` local aqui,
            // mas sim a verificação global para a div de espera.
            const currentMensagemDiv = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.7)"]');
            if (currentMensagemDiv && document.body.contains(currentMensagemDiv)) {
                document.body.removeChild(currentMensagemDiv);
                console.log("mensagemDiv removida dentro do setTimeout do clique.");
            }

            stopCountdown(); // Garante que a contagem pare antes da fala começar
            
            // Se o áudio ainda estiver mutado após a "janela de silêncio", desmuta.
            if (isMuted) {
                toggleMuteButton.click();
            }

            // Lógica principal do clique, baseada nos modos ATIVOS
            if (repetitionMode === 'word') {
                const clickedWord = getWordAtPoint(event.target, event.clientX, event.clientY);
                if (clickedWord) {
                    lastClickedWord = clickedWord;
                    speakText(clickedWord, currentAudioRate, true, currentSpeechLanguage);
                }
            } else if (repetitionMode === 'phrase') {
                lastClickedPhraseParagraph = clickedParagraph;
                speakParagraph(clickedParagraph, true);
            } else if (abMode) { // Lógica para definir os pontos A e B
                const paragraphs = getActiveParagraphs();
                const clickedIndex = paragraphs.indexOf(clickedParagraph);

                if (clickedIndex === -1) return;

                if (abStartParagraphIndex === -1) {
                    abStartParagraphIndex = clickedIndex;
                    highlightParagraph(clickedParagraph);
                    updateABButtonIcon(); // Atualiza o ícone para 🅰️❌
                } else if (abEndParagraphIndex === -1) {
                    abEndParagraphIndex = clickedIndex;
                    if (abEndParagraphIndex < abStartParagraphIndex) {
                        [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                    }
                    for (let i = abStartParagraphIndex; i <= abEndParagraphIndex; i++) {
                        if (paragraphs[i]) {
                            paragraphs[i].classList.add('LGFran_highlight-ab');
                        }
                    }
                    clearHighlight();
                    updateABButtonIcon(); // Atualiza o ícone para 🅰️🅱️
                } else { // Se ambos A e B já estão definidos, um novo clique reseta
                    abStartParagraphIndex = -1;
                    abEndParagraphIndex = -1;
                    currentABIndex = -1;
                    document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab'));
                    updateABButtonIcon(); // Atualiza o ícone para ❌❌
                }
            } else { // Comportamento padrão: clique para ler o parágrafo
                currentParagraphIndex = getActiveParagraphs().indexOf(clickedParagraph);
                if (currentParagraphIndex !== -1) {
                    speakParagraph(clickedParagraph);
                }
            }
        }, 2000); // Este setTimeout encapsula a lógica principal de clique, com 2s de "silêncio"
    });


    // --- Event Listeners dos Botões ---

// --- Event Listener do Botão Play (Com Diagnóstico) ---
    playButton.addEventListener('click', () => {  
        console.log("1. Botão Play clicado!");

        const paragraphs = getActiveParagraphs();
        console.log("2. Parágrafos encontrados:", paragraphs.length);

        if (paragraphs.length === 0) {
            console.warn("ALERTA: Nenhum parágrafo ativo encontrado. Verifique a função getActiveParagraphs().");
            return;
        }

        // Se loop e repetição de palavra/frase estão ativos, mas nada foi clicado ainda
        if (loopMode && (repetitionMode === 'word' && !lastClickedWord || repetitionMode === 'phrase' && !lastClickedPhraseParagraph)) {
            console.log("3. Bloqueado pelo modo Loop (aguardando seleção de palavra/frase).");
            return;
        }

        // Aplica o estado visual ATIVO imediatamente ao clicar
        playButton.classList.add('LGFran_active');
        pauseButton.classList.remove('LGFran_active');

        if (paused) {
            console.log("4. Resumindo áudio pausado...");
            resumeSpeaking();
            return;
        }

        if (speaking) {
            console.log("4. Reiniciando fala atual...");
            stopSpeaking();
        }

        clearTimeout(clickDelayTimeout);

        const initialDelay = delayMode ? 4000 : 0;

        if (delayMode && initialDelay > 0) {
            startCountdown(initialDelay);
        }

        clickDelayTimeout = setTimeout(() => {
            stopCountdown();
            
            if (abMode) {
                console.log("5. Executando Modo AB...");
                playABSegment();
            } else if (loopMode) {
                console.log("5. Executando Modo Loop...");
                handleLoopRepetition();
            } else {
                if (currentParagraphIndex === -1) {
                    currentParagraphIndex = 0;
                }
                console.log("5. Falando parágrafo índice:", currentParagraphIndex);
                speakParagraph(paragraphs[currentParagraphIndex]);
            }
        }, initialDelay);
    });

    pauseButton.addEventListener('click', () => {
        pauseSpeaking();
    });

    prevSegmentButton.addEventListener('click', () => {
        stopSpeaking();
        highlightPrevParagraph();
    });

    nextSegmentButton.addEventListener('click', () => {
        stopSpeaking();
        highlightNextParagraph();
    });

    changeAudioButton.addEventListener('click', () => {
        currentDialogueIndex = (currentDialogueIndex + 1) % dialogues.length;
        initializeDialog();
    });

    toggleLoopButton.addEventListener('click', () => { 
        loopMode = !loopMode;
        toggleLoopButton.classList.toggle('LGFran_active', loopMode);
        mutepalternar(); // Mantido conforme seu código

        if (!loopMode) {
            clearTimeout(loopTimeout); // Garante que o loop seja interrompido
            stopCountdown(); // NOVO: Para a contagem regressiva quando o loop é desativado
        } else {
            // Se ativou o loop e já está falando, ou está pausado, reiniciar o loop
            if (speaking || paused) {
                stopSpeaking(); // Parar antes de iniciar o loop para aplicar a lógica
                if (abMode) {
                    playABSegment();
                } else { // Comportamento padrão de loop de parágrafo
                    const paragraphs = getActiveParagraphs();
                    if (paragraphs.length > 0) {
                        currentParagraphIndex = (currentParagraphIndex === -1) ? 0 : currentParagraphIndex;
                        speakParagraph(paragraphs[currentParagraphIndex]);
                    }
                }
            }
        }
    });

    toggleABModeButton.addEventListener('click', () => {
        abMode = !abMode;
        toggleABModeButton.classList.toggle('LGFran_active', abMode);
        stopSpeaking(); // Sempre para a fala ao mudar o modo A-B
        document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab')); // Limpa destaque AB
        abStartParagraphIndex = -1; // Reseta pontos A e B
        abEndParagraphIndex = -1;
        currentABIndex = -1;
        updateABButtonIcon(); // Atualiza o ícone (❌❌ ou 🅰️🅱️)
    });

    repWordButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'word') ? '' : 'word';
        mutepalternar(); // Mantido conforme seu código
        repWordButton.classList.toggle('LGFran_active', repetitionMode === 'word');
        repFrasButton.classList.remove('LGFran_active'); // Desativa o outro modo
        
        stopSpeaking();
        if (repetitionMode === '') { // Se desativou o modo palavra
            lastClickedWord = ''; // Limpa a última palavra
        }
    });

    repFrasButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        mutepalternar(); // Mantido conforme seu código
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton.classList.remove('LGFran_active'); // Desativa o outro modo
        
        stopSpeaking();
        if (repetitionMode === '') { // Se desativou o modo frase
            lastClickedPhraseParagraph = null; // Limpa a última frase
        }
    });

    time4Button.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        stopCountdown(); // Garante que o contador seja parado e resetado
    });

    slowDownAudioButton.addEventListener('click', () => {
        /* paradalternar(); */ // Mantido conforme seu código
        isSlowed = !isSlowed;
        currentAudioRate = isSlowed ? 0.70 : 1.0; // Define a velocidade
        slowDownAudioButton.classList.toggle('LGFran_active', isSlowed);

        if (speaking || paused) {
            // Se estiver falando ou pausado, para e reinicia com a nova velocidade
            stopSpeaking();
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                speakParagraph(paragraphs[currentParagraphIndex]);
            }
        }
    });

    toggleMuteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        toggleMuteButton.classList.toggle('LGFran_active', isMuted);
        if (isMuted) {
            stopSpeaking(); // Para a fala se mutar
            toggleMuteButton.innerHTML = '🔇';
        } else {
            toggleMuteButton.innerHTML = '🔊';
        }
    });

    // NOVO: Event Listener para a caixa de seleção de idioma
    languageSelect.addEventListener('change', (event) => {
        const selectedLang = event.target.value;
        updateDialogLanguage(selectedLang);
    });

    // Inicialização
    initializeDialog();
    // NOVO: Define o idioma inicial na caixa de seleção para "Francês" (fr)
    languageSelect.value = 'fr'; // Garante que a caixa de seleção inicie com a opção correta
    updateDialogLanguage('fr'); // Chama para exibir o francês no carregamento
    updateABButtonIcon(); // Chama para definir o ícone inicial do AB
});

/* fim do script */