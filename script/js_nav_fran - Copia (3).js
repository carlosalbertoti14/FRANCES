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
    let wasLoopModeActive = false;
    let wasABModeActive = false;
    let wasRepetitionModeActive = ''; // Armazena 'word', 'phrase', ou ''

    const dialogues = [
        { id: 'LGFran_dialog_Dialogo_do_Cafe', title: 'Diálogo do Café' },
        { id: 'LGFran_dialog_Caio_et_Ayheon_Vieux_Amis', title: 'Caio e Ayheon - Velhos Amigos' },
        { id: 'LGFran_dialog_Caio_et_la_Francaise', title: 'Caio e a Francesa' },
        { id: 'LGFran_dialog_Parler_de_Relations_Amoureuses', title: 'Parler de Relations Amoureuses' },
        { id: 'LGFran_dialog_Confronto_Inesperado', title: 'Confronto Inesperado' },
        { id: 'LGFran_dialog_DIALOGO_FAMILIAR1', title: 'DIALOGO FAMILIAR - PAI E FILHO' }
    ];
    let currentDialogueIndex = 0;

    // --- Nova Função paradalternar ---
    function paradalternar() {
        // Primeiro, para qualquer fala em andamento para garantir que não haja interrupção
        stopSpeaking();
        // Em seguida, alterna o estado do botão de mudo.
        // Se estava desmutado, muta. Se estava mutado, desmuta.
        /*  toggleMuteButton.click();  */

        // Aguarda 2 segundos antes de potencialmente desmutar novamente.
        setTimeout(() => {
            // Se o áudio ainda estiver mutado após os 2 segundos (o que significa que
            // o clique anterior no toggleMuteButton o deixou mutado), então desmuta.
            // Isso cria a "janela de silêncio".
            if (isMuted) {
                /*  toggleMuteButton.click(); */ // Desmuta o áudio
                stopSpeaking(); // Garante que nenhuma fala residual comece inesperadamente
            }
        }, 2000); // 2000 milissegundos = 2 segundos
    }

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

            // LÓGICA DE CONTINUAÇÃO APÓS A FALA
            if (loopMode || (abMode && (currentABIndex <= abEndParagraphIndex || (currentABIndex === abEndParagraphIndex + 1 && loopMode)))) {
                const delay = delayMode ? 4000 : MIN_LOOP_DELAY; // Usa 4s se delayMode, senão MIN_LOOP_DELAY

                loopTimeout = setTimeout(() => {
                    if (abMode) {
                        currentABIndex++; // Avança para o próximo parágrafo no segmento AB
                        if (currentABIndex <= abEndParagraphIndex) { // Ainda dentro do segmento AB
                            playNextABParagraph(); // Continua para o próximo parágrafo do segmento AB
                        } else if (loopMode) { // Terminou o segmento AB, e está em loop
                            currentABIndex = abStartParagraphIndex; // Reinicia o índice AB
                            playNextABParagraph(); // Começa o segmento AB novamente
                        } else { // Terminou o segmento AB e não está em loop
                            stopSpeaking();
                            toggleABModeButton.classList.remove('LGFran_active');
                            abMode = false;
                            abStartParagraphIndex = -1;
                            abEndParagraphIndex = -1;
                            currentParagraphIndex = -1;
                            updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
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
            console.log("stop apertado");
        });

        currentUtterance.onerror = (event) => {
            console.error('Erro na síntese de fala:', event.error);
            speaking = false;
            paused = false; // Em caso de erro, também considera que a fala foi pausada/interrompida

            // Se houver um erro, ainda tenta continuar o loop/próxima fala
            // para evitar que o player pare completamente.
            if (loopMode || abMode) {
                const delay = delayMode ? 4000 : MIN_LOOP_DELAY;
                loopTimeout = setTimeout(() => {
                    if (abMode) {
                        currentABIndex++; // Tenta avançar mesmo com erro para não travar
                        if (currentABIndex <= abEndParagraphIndex || loopMode) {
                            if (loopMode && currentABIndex > abEndParagraphIndex) currentABIndex = abStartParagraphIndex; // Reinicia se for o fim e loop
                            playNextABParagraph();
                        } else {
                            stopSpeaking(); // Se não for para loop, para.
                            toggleABModeButton.classList.remove('LGFran_active');
                            abMode = false;
                            abStartParagraphIndex = -1;
                            abEndParagraphIndex = -1;
                            currentParagraphIndex = -1;
                            updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
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
            toggleABModeButton.classList.remove('LGFran_active');
            abMode = false;
        }
        // Chamada para atualizar o ícone do botão AB ao inicializar um novo diálogo
        updateABButtonIcon(); // Adicionado aqui

        repWordButton.classList.remove('LGFran_active');
        repFrasButton.classList.remove('LGFran_active');
        repetitionMode = '';
        toggleLoopButton.classList.remove('LGFran_active');
        loopMode = false;
        time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s
        delayMode = false;
        slowDownAudioButton.classList.remove('LGFran_active'); // Desativa o botão de desacelerar
        isSlowed = false;
        currentAudioRate = 1.0; // Reinicia a velocidade do áudio
        toggleMuteButton.classList.remove('LGFran_active');
        isMuted = false;
        toggleMuteButton.innerHTML = '🔊'; // Resetar ícone
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

    // Se estiver em modo de fala, parar e reiniciar (ou pausar) para usar o novo idioma
    /*     if (speaking || paused) {
            stopSpeaking(); // Parar completamente
         }
         // Ajusta o idioma de fala para a síntese
         currentSpeechLanguage = selectedLang;
         // Se o idioma for pt-br na seleção, defina a voz como fr-FR para a síntese
         // Caso contrário, use o mapeamento para o idioma selecionado
         if (selectedLang === 'pt-br') { // Opção "Francês" na combobox
            currentSpeechLanguage = 'fr'; // Usamos 'fr' para buscar a voz francesa
         } else {
            currentSpeechLanguage = selectedLang;
         } */

    // Se o idioma atual for o padrão 'fr' na combobox, os outros estariam ocultos por padrão
    // mas a voz ainda precisa ser ajustada.
    // Já populamos as vozes ao carregar, então a lógica em speakText já deve funcionar.

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
            toggleABModeButton.classList.remove('LGFran_active');
            abMode = false;
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
            toggleABModeButton.classList.remove('LGFran_active');
            abMode = false;
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
                toggleABModeButton.classList.remove('LGFran_active');
                abMode = false;
                abStartParagraphIndex = -1;
                abEndParagraphIndex = -1;
                currentParagraphIndex = -1;
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
        }
    }


    dialogContent.addEventListener('click', (event) => {
        const clickedParagraph = event.target.closest('.LGFran_dialog-block > p');
        if (!clickedParagraph) return; // Garante que clicamos em um parágrafo de diálogo

        // CHAMA A NOVA FUNÇÃO AQUI NO INÍCIO DE CADA CLIQUE
        paradalternar();

        // Armazena o estado atual dos modos ANTES de qualquer alteração adicional
        wasLoopModeActive = loopMode;
        wasABModeActive = abMode;
        wasRepetitionModeActive = repetitionMode;

        // Limpa qualquer timeout de clique pendente ANTES de definir um novo
        clearTimeout(clickDelayTimeout);

        // Desativa visualmente e logicamente todos os modos relevantes.
        // Isso é importante porque paradalternar não lida com o estado dos botões.
        loopMode = false;
        toggleLoopButton.classList.remove('LGFran_active');

        // AB Mode handling
        // ONLY reset AB points if AB mode was NOT active and is now being activated by this click
        // OR if it's already active and we're clicking to define points.
        // If we are just playing a paragraph in normal mode, don't touch AB points.
        if (abMode) { // If AB mode is currently active (before any clicks logic)
            // Do not reset abStartParagraphIndex / abEndParagraphIndex here.
            // Let the logic below handle defining/resetting AB points.
        } else { // If AB mode is not active, ensure all AB related states are clean
            abStartParagraphIndex = -1;
            abEndParagraphIndex = -1;
            currentABIndex = -1;
            document.querySelectorAll('.LGFran_highlight-ab').forEach(p => p.classList.remove('LGFran_highlight-ab'));
            updateABButtonIcon(); // Atualiza o ícone do AB para o estado desativado
        }


        repetitionMode = '';
        repWordButton.classList.remove('LGFran_active');
        repFrasButton.classList.remove('LGFran_active');

        // Define o atraso inicial. O atraso de 2s da paradalternar é para *depois* do clique.
        // Este delay é para a *próxima* fala, se delayMode estiver ativo.
        const initialDelay = delayMode ? 4000 : 0;

        // Agende a execução da lógica de clique principal após o possível atraso.
        // Este setTimeout será executado *após* a lógica imediata da paradalternar.
        clickDelayTimeout = setTimeout(() => {
            // Lógica principal do clique, baseada nos estados salvos:
            if (wasRepetitionModeActive === 'word') {
                repetitionMode = 'word';
                repWordButton.classList.add('LGFran_active');

                const clickedWord = getWordAtPoint(event.target, event.clientX, event.clientY);
                if (clickedWord) {
                    lastClickedWord = clickedWord;
                    speakText(clickedWord, currentAudioRate, true, currentSpeechLanguage);
                }
            } else if (wasRepetitionModeActive === 'phrase') {
                repetitionMode = 'phrase';
                repFrasButton.classList.add('LGFran_active');

                lastClickedPhraseParagraph = clickedParagraph;
                speakParagraph(clickedParagraph, true);
            } else if (wasABModeActive) { // Lógica para definir os pontos A e B
                abMode = true;
                toggleABModeButton.classList.add('LGFran_active');

                const paragraphs = getActiveParagraphs();
                const clickedIndex = paragraphs.indexOf(clickedParagraph);

                if (clickedIndex === -1) return;

                if (abStartParagraphIndex === -1) {
                    abStartParagraphIndex = clickedIndex;
                    highlightParagraph(clickedParagraph);
                    updateABButtonIcon(); // Atualiza o ícone para 🅰️❌
                    /*                     alert('Ponto A definido. Agora clique no parágrafo final para o Ponto B.');
                     */
                } else if (abEndParagraphIndex === -1) {
                    abEndParagraphIndex = clickedIndex;
                    if (abEndParagraphIndex < abStartParagraphIndex) {
                        [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                    }
                    playButton.click();
                    /*                     alert(`Segmento A-B definido do parágrafo ${abStartParagraphIndex + 1} ao ${abEndParagraphIndex + 1}. Clique em Play para iniciar.`);
                     */
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
                    /*                     alert('Modo A-B resetado. Clique novamente para definir um novo segmento A-B.');
                     */
                }
            } else { // Comportamento padrão: clique para ler o parágrafo
                currentParagraphIndex = getActiveParagraphs().indexOf(clickedParagraph);
                if (currentParagraphIndex !== -1) {
                    speakParagraph(clickedParagraph);
                }
            }

            // Reativa o modo de loop se ele estava ativo ANTES do clique e se a lógica de clique atual não é para definir AB
            if (wasLoopModeActive && !abMode) {
                loopMode = true;
                toggleLoopButton.classList.add('LGFran_active');
            }

        }, initialDelay); // Fecha o setTimeout
    });

    // --- Event Listeners dos Botões ---

    playButton.addEventListener('click', () => {
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;

            // Se loop e repetição de palavra/frase estão ativos, mas nada foi clicado ainda
            if (loopMode && (repetitionMode === 'word' && !lastClickedWord || repetitionMode === 'phrase' && !lastClickedPhraseParagraph)) {
                /*                 alert('Por favor, clique em uma palavra/frase no texto para iniciar a repetição em loop.');
                 */
                return;
            }

            stopSpeaking(); // Limpa qualquer coisa anterior
            clearTimeout(clickDelayTimeout); // Limpa o timeout de clique

            const initialDelay = delayMode ? 4000 : 0; // Atraso inicial para a primeira fala, se delayMode ativo

            clickDelayTimeout = setTimeout(() => {
                if (abMode) {
                    playABSegment();
                } else if (loopMode) {
                    handleLoopRepetition(); // handleLoopRepetition agora se encarrega de iniciar o loop corretamente
                } else {
                    if (currentParagraphIndex === -1) {
                        currentParagraphIndex = 0;
                    }
                    speakParagraph(paragraphs[currentParagraphIndex]);
                }
            }, initialDelay);

        } else if (paused) {
            resumeSpeaking();
        } else if (speaking) {
            // Se já está falando, parar e reiniciar (comportamento de resetar para o início do parágrafo atual)
            stopSpeaking();
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0 && currentParagraphIndex !== -1) {
                const initialDelay = delayMode ? 4000 : 0;
                clickDelayTimeout = setTimeout(() => {
                    if (abMode) {
                        playABSegment();
                    } else if (loopMode) {
                        handleLoopRepetition();
                    } else {
                        speakParagraph(paragraphs[currentParagraphIndex]);
                    }
                }, initialDelay);
            }
        }
        playButton.classList.add('LGFran_active');
        pauseButton.classList.remove('LGFran_active');
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
        mutepalternar()
        if (!loopMode) {
            clearTimeout(loopTimeout); // Garante que o loop seja interrompido
        } else {
            // DESATIVAR repWordButton e repFrasButton ao ativar o loopMode
 /*            repetitionMode = '';
            repWordButton.classList.remove('LGFran_active');
            repFrasButton.classList.remove('LGFran_active'); */

            // Se ativou o loop e já está falando, ou está pausado, reiniciar o loop
            if (speaking || paused) {
                stopSpeaking(); // Parar antes de iniciar o loop para aplicar a lógica
                // Se já estava em um modo de repetição específico, continuar nesse modo
                // Caso contrário, iniciar loop de parágrafo
                if (abMode) {
                    playABSegment();
                } else { // Comportamento padrão de loop de parágrafo
                    // Inicia do parágrafo atual se houver, senão do primeiro
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

        if (abMode) {
            // Desativa outros modos de repetição se AB for ativado
            repetitionMode = '';
            repWordButton.classList.remove('LGFran_active');
            repFrasButton.classList.remove('LGFran_active');
            updateABButtonIcon(); // Atualiza o ícone para ❌❌ quando o modo AB é ativado
            /* alert('Modo A-B ativado. Clique no parágrafo inicial (Ponto A), e depois no parágrafo final (Ponto B).'); */
        } else {
            updateABButtonIcon(); // Atualiza o ícone para 🅰️🅱️ quando o modo AB é desativado
        }
    });

    repWordButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'word') ? '' : 'word';
        mutepalternar()
        repWordButton.classList.toggle('LGFran_active', repetitionMode === 'word');
        repFrasButton.classList.remove('LGFran_active'); // Desativa o outro modo
        // Desativa o modo loop quando ativa repetição de palavra
/*         loopMode = false;
        toggleLoopButton.classList.remove('LGFran_active'); */
        stopSpeaking();
        if (repetitionMode === 'word') {
            /*             alert('Modo "Repetir Palavra" ativado. Clique em qualquer palavra no texto para ouvi-la.'); */
        } else {
            lastClickedWord = ''; // Limpa a última palavra
        }
    });

    repFrasButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        mutepalternar()
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton.classList.remove('LGFran_active'); // Desativa o outro modo
        // Desativa o modo loop quando ativa repetição de frase
/*         loopMode = false;
        toggleLoopButton.classList.remove('LGFran_active'); */
        stopSpeaking();
        if (repetitionMode === 'phrase') {
            /*             alert('Modo "Repetir Frase" ativado. Clique em qualquer parágrafo para ouvi-lo como frase.');
             */
        } else {
            lastClickedPhraseParagraph = null; // Limpa a última frase
        }
    });

    time4Button.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        if (delayMode) {
            /*             alert('Atraso de 4 segundos ativado para loops e repetições.');
             */
        } else {
            /*             alert('Atraso de 4 segundos desativado.');
             */
        }
    });

    slowDownAudioButton.addEventListener('click', () => {
        paradalternar()
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