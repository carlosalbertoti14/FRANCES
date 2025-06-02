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

    // NOVO: Atraso mínimo para loops e repetições para evitar travamentos
    const MIN_LOOP_DELAY = 500; // 500 milissegundos = 0.5 segundos. Ajuste conforme necessário.

    // Variáveis para armazenar a última palavra/frase clicada para repetição em loop
    let lastClickedWord = '';
    let lastClickedPhraseParagraph = null; // Armazena o elemento <p> da frase clicada
    let currentABIndex = -1; // Adicionado para controlar o índice atual no modo AB

    const dialogues = [
        { id: 'LGFran_dialog_Dialogo_do_Cafe', title: 'Diálogo do Café' },
        { id: 'LGFran_dialog_Caio_et_Ayheon_Vieux_Amis', title: 'Caio e Ayheon - Velhos Amigos' },
        { id: 'LGFran_dialog_Caio_et_la_Francaise', title: 'Caio e a Francesa' },
        { id: 'LGFran_dialog_Parler_de_Relations_Amoureuses', title: 'Parler de Relations Amoureuses' },
        { id: 'LGFran_dialog_Confronto_Inesperado', title: 'Confronto Inesperado' }
    ];
    let currentDialogueIndex = 0;

    // --- Funções de Leitura (Speech Synthesis) ---

    let voices = [];
    let preferredVoice = null;

    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices();
        const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr-') || voice.lang === 'fr-FR');
        if (frenchVoices.length > 0) {
            preferredVoice = frenchVoices.find(voice => voice.name.includes('Google Français')) || frenchVoices[0];
            console.log('Voz francesa preferida:', preferredVoice ? preferredVoice.name : 'Nenhuma voz específica encontrada.');
        } else {
            console.warn('Nenhuma voz francesa encontrada. A síntese de fala pode não funcionar como esperado.');
        }
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();

    // Função para ler um texto específico
    function speakText(text, rate = currentAudioRate, isRepetition = false) {
        if (isMuted) {
            speaking = false;
            return;
        }

        speechSynthesis.cancel(); // Cancela qualquer fala anterior
        clearTimeout(loopTimeout); // Limpa o timeout de loop existente
        clearTimeout(clickDelayTimeout); // Limpa o timeout de clique, se houver

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'fr-FR';
        currentUtterance.rate = rate;

        if (preferredVoice) {
            currentUtterance.voice = preferredVoice;
        }

        currentUtterance.onend = () => {
            speaking = false;
            paused = false;

            // LÓGICA DE CONTINUAÇÃO APÓS A FALA
            // Esta é a parte crucial. SEMPRE adicione um atraso se estiver em loop.
            // O delayMode (4s) tem prioridade, senão usa o atraso mínimo.

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
            // Nota: O 'speaking = true' 2 segundos depois do stop não faz muito sentido aqui
            // se o objetivo é parar a fala. Se a intenção é outra, reavalie.
            // set Timeout(() => { speaking = true; console.log("2 segundos se passaram!"); }, 2000);
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
            const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
            if (originalTextSpan) {
                const textToSpeak = originalTextSpan.textContent;
                highlightParagraph(paragraph);
                speakText(textToSpeak, currentAudioRate, isRepetition);
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
    }

    // --- Lógica de Repetição em Loop (centralizada) ---
    // Esta função agora apenas INICIA a repetição, a continuação é no onend de speakText
    function handleLoopRepetition() {
        if (!loopMode) {
            stopSpeaking();
            return;
        }

        if (repetitionMode === 'word' && lastClickedWord) {
            speakText(lastClickedWord, currentAudioRate, true);
        } else if (repetitionMode === 'phrase' && lastClickedPhraseParagraph) {
            speakParagraph(lastClickedPhraseParagraph, true);
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

    // --- Event Listeners ---

    playButton.addEventListener('click', () => {
        if (!speaking && !paused) {
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length === 0) return;

            // Se loop e repetição de palavra/frase estão ativos, mas nada foi clicado ainda
            if (loopMode && (repetitionMode === 'word' && !lastClickedWord || repetitionMode === 'phrase' && !lastClickedPhraseParagraph)) {
                alert('Por favor, clique em uma palavra/frase no texto para iniciar a repetição em loop.');
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

    nextSegmentButton.addEventListener('click', () => {
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        highlightNextParagraph();
        // Limpa o estado da última palavra/frase clicada ao avançar
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    });

    prevSegmentButton.addEventListener('click', () => {
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        highlightPrevParagraph();
        // Limpa o estado da última palavra/frase clicada ao retroceder
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;
    });

    repWordButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'word') ? '' : 'word';
        repWordButton.classList.toggle('LGFran_active', repetitionMode === 'word');
        repFrasButton.classList.remove('LGFran_active');
        console.log('Modo de repetição de palavra:', repetitionMode === 'word' ? 'ativado' : 'desativado');
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        currentABIndex = -1; // Resetar o índice AB
        // Limpa a última palavra clicada se o modo for desativado
        if (repetitionMode !== 'word') {
            lastClickedWord = '';
        }
        lastClickedPhraseParagraph = null; // Garante que o outro modo de repetição esteja limpo
    });

    repFrasButton.addEventListener('click', () => {
        repetitionMode = (repetitionMode === 'phrase') ? '' : 'phrase';
        repFrasButton.classList.toggle('LGFran_active', repetitionMode === 'phrase');
        repWordButton.classList.remove('LGFran_active');
        console.log('Modo de repetição de frase:', repetitionMode === 'phrase' ? 'ativado' : 'desativado');
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        currentABIndex = -1; // Resetar o índice AB
        // Limpa a última frase clicada se o modo for desativado
        if (repetitionMode !== 'phrase') {
            lastClickedPhraseParagraph = null;
        }
        lastClickedWord = ''; // Garante que o outro modo de repetição esteja limpo
    });

    toggleLoopButton.addEventListener('click', () => {
        loopMode = !loopMode;
        toggleLoopButton.classList.toggle('LGFran_active', loopMode);
        console.log('Modo Loop:', loopMode ? 'ativado' : 'desativado');
        stopSpeaking(); // Sempre para a fala atual ao alternar o loop

        // Ao ativar/desativar o loop, se os modos de repetição de palavra/frase já estiverem ativos,
        // ele tentará iniciar/parar a repetição em loop imediatamente
        if (loopMode && (repetitionMode === 'word' && lastClickedWord || repetitionMode === 'phrase' && lastClickedPhraseParagraph)) {
            handleLoopRepetition();
        } else if (loopMode && !abMode) {
            // Se loop ativado e não está em modo AB e não tem repetição de palavra/frase definida
            // Começa a repetir o parágrafo atual
            const paragraphs = getActiveParagraphs();
            if (paragraphs.length > 0) {
                if (currentParagraphIndex === -1) {
                    currentParagraphIndex = 0; // Começa do primeiro se nenhum selecionado
                }
                // Chama speakParagraph, que vai lidar com o delayMode via speakText.onend
                speakParagraph(paragraphs[currentParagraphIndex], false);
            }
        }
        // Ao ativar/desativar o loop, desativa o modo AB
        toggleABModeButton.classList.remove('LGFran_active');
        abMode = false;
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        currentABIndex = -1; // Resetar o índice AB
    });

    // Event Listener para o botão de 4 segundos
    time4Button.addEventListener('click', () => {
        delayMode = !delayMode;
        time4Button.classList.toggle('LGFran_active', delayMode);
        console.log('Modo de espera de 4s:', delayMode ? 'ativado' : 'desativado');

        // Se o loop já estiver ativo e houver uma repetição em andamento, reinicia para aplicar o delay
        if (loopMode && speaking) {
            stopSpeaking(); // Para a fala atual e limpa o timeout
            // A proxima fala do loop vai pegar o delayMode automaticamente
            handleLoopRepetition();
        } else if (loopMode && paused) {
            // Se estava pausado no loop, não inicia a fala, mas prepara o próximo resume com delay
            // A lógica de resume já lida com o delayMode
        }
    });

    // NOVO Event Listener para o botão de desacelerar o áudio
    slowDownAudioButton.addEventListener('click', () => {
        isSlowed = !isSlowed; // Alterna o estado de desaceleração
        currentAudioRate = isSlowed ? 0.70 : 1.0; // Define a taxa de acordo com o estado
        slowDownAudioButton.classList.toggle('LGFran_active', isSlowed); // Ativa/desativa a classe visual

        console.log('Velocidade do áudio definida para:', currentAudioRate);

        // Se algo estiver falando, para e reinicia para aplicar a nova velocidade imediatamente
        if (speechSynthesis.speaking) {
            stopSpeaking();
            if (loopMode) {
                handleLoopRepetition();
            } else if (abMode) {
                playABSegment();
            } else if (currentParagraphIndex !== -1) {
                const paragraphs = getActiveParagraphs();
                if (paragraphs[currentParagraphIndex]) {
                    speakParagraph(paragraphs[currentParagraphIndex], false); // Re-fala o parágrafo atual com a nova taxa
                }
            }
        } else if (paused && currentParagraphIndex !== -1) {
            // Se pausado, apenas atualiza a taxa para quando for resumido
            // Nenhuma ação extra é necessária aqui, pois o resumeSpeaking usará a nova taxa
        } else if (!speechSynthesis.speaking && currentParagraphIndex !== -1 && (loopMode || abMode)) {
            // Se não estava falando, mas estava em modo loop ou AB (ex: após carregamento inicial ou pausa)
            // Reinicia o fluxo de fala para aplicar a nova velocidade.
            if (loopMode) {
                handleLoopRepetition();
            } else if (abMode) {
                playABSegment();
            }
        }
    });

    toggleABModeButton.addEventListener('click', () => {
        abMode = !abMode;
        toggleABModeButton.classList.toggle('LGFran_active', abMode);
        stopSpeaking(); // Garante que a fala anterior e o timeout sejam cancelados
        abStartParagraphIndex = -1;
        abEndParagraphIndex = -1;
        currentABIndex = -1; // Resetar o índice AB
        clearHighlight();

        // Ao ativar este modo, desativa repetição de palavra/frase e loop visualmente e logicamente
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

        if (abMode) {
            alert('Modo AB ativado. Clique no início e no fim do trecho que deseja repetir.');
        } else {
            alert('Modo AB desativado.');
        }
    });

    toggleMuteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        toggleMuteButton.innerHTML = isMuted ? '🔇' : '🔊'; // Altera o ícone
        toggleMuteButton.classList.toggle('LGFran_active', isMuted); // Ativa/desativa a classe
        if (isMuted) {
            stopSpeaking();
        } else {
            // Se desmutar, pode retomar a fala se estava pausada e era para estar falando
            if (currentUtterance && !speechSynthesis.speaking && paused) {
                resumeSpeaking();
            }
        }
    });

    changeAudioButton.addEventListener('click', () => {
        currentDialogueIndex = (currentDialogueIndex + 1) % dialogues.length;
        initializeDialog(); // Garante que a fala anterior e o timeout sejam cancelados
    });

    // Clique em um parágrafo para iniciar a leitura ou definir o modo AB
    dialogContent.addEventListener('click', (event) => {
        const clickedParagraph = event.target.closest('p');
        if (!clickedParagraph) return;

        const paragraphs = getActiveParagraphs();
        const index = paragraphs.indexOf(clickedParagraph);

        if (index === -1) return;

        stopSpeaking(); // Limpa tudo antes de processar o novo clique

        currentParagraphIndex = index;

        // Limpa lastClickedWord/PhraseParagraph para evitar repetição indesejada
        lastClickedWord = '';
        lastClickedPhraseParagraph = null;

        // Desativa modos de repetição e loop se um parágrafo é clicado para reprodução normal
        // Apenas se não estiver em modo AB ou de repetição (word/phrase)
        if (!abMode && repetitionMode === '' && !loopMode) {
            toggleLoopButton.classList.remove('LGFran_active');
            loopMode = false;
            time4Button.classList.remove('LGFran_active'); // Desativa o botão 4s visualmente
            delayMode = false; // Desativa o modo 4s logicamente
            repWordButton.classList.remove('LGFran_active');
            repFrasButton.classList.remove('LGFran_active');
            repetitionMode = '';
        }

        if (abMode) {
            if (abStartParagraphIndex === -1) {
                abStartParagraphIndex = index;
                highlightParagraph(clickedParagraph);
                alert('Início do trecho AB definido.');
            } else if (abEndParagraphIndex === -1) {
                abEndParagraphIndex = index;
                if (abStartParagraphIndex > abEndParagraphIndex) {
                    [abStartParagraphIndex, abEndParagraphIndex] = [abEndParagraphIndex, abStartParagraphIndex];
                }
                highlightParagraph(paragraphs[abEndParagraphIndex]);
                alert('Fim do trecho AB definido. Reproduzindo...');
                playABSegment(); // playABSegment já lida com o atraso inicial
            } else {
                abStartParagraphIndex = index;
                abEndParagraphIndex = -1;
                highlightParagraph(clickedParagraph);
                alert('Início do trecho AB redefinido. Clique no novo fim.');
            }
        } else if (repetitionMode === 'phrase') {
            lastClickedPhraseParagraph = clickedParagraph; // Salva o parágrafo para loop futuro
            const delay = delayMode ? 4000 : 0; // Atraso inicial se delayMode ativo
            clearTimeout(clickDelayTimeout);
            clickDelayTimeout = setTimeout(() => {
                if (loopMode) {
                    handleLoopRepetition(); // handleLoopRepetition já lida com o delay
                } else {
                    speakParagraph(clickedParagraph, true); // speakParagraph já lida com o delay via speakText
                }
            }, delay);

        } else if (repetitionMode === 'word') {
            if (event.target.classList.contains('LGFran_original-text')) {
                const word = getWordAtPoint(event.target, event.clientX, event.clientY);
                if (word) {
                    lastClickedWord = word; // Salva a palavra para loop futuro
                    const delay = delayMode ? 4000 : 0; // Atraso inicial se delayMode ativo
                    clearTimeout(clickDelayTimeout);
                    clickDelayTimeout = setTimeout(() => {
                        if (loopMode) {
                            handleLoopRepetition(); // handleLoopRepetition já lida com o delay
                        } else {
                            speakText(word, currentAudioRate, true); // speakText já lida com o delay
                        }
                    }, delay);
                } else {
                    // Fallback para frase se palavra não for encontrada, mas ainda dentro do modo word
                    lastClickedPhraseParagraph = clickedParagraph;
                    const delay = delayMode ? 4000 : 0;
                    clearTimeout(clickDelayTimeout);
                    clickDelayTimeout = setTimeout(() => {
                        if (loopMode) {
                            handleLoopRepetition(); // Inicia o loop de frase como fallback
                        } else {
                            speakParagraph(clickedParagraph, true); // Fala a frase como fallback
                        }
                    }, delay);
                }
            } else {
                // Fallback para frase se clique não for em span, mas ainda dentro do modo word
                lastClickedPhraseParagraph = clickedParagraph;
                const delay = delayMode ? 4000 : 0;
                clearTimeout(clickDelayTimeout);
                clickDelayTimeout = setTimeout(() => {
                    if (loopMode) {
                        handleLoopRepetition(); // Inicia o loop de frase como fallback
                    } else {
                        speakParagraph(clickedParagraph, true); // Fala a frase como fallback
                    }
                }, delay);
            }
        } else {
            // Comportamento padrão: apenas clica e começa a ler dali para a frente
            const delay = delayMode ? 4000 : 0; // Atraso inicial se delayMode ativo
            clearTimeout(clickDelayTimeout);
            clickDelayTimeout = setTimeout(() => {
                speakParagraph(clickedParagraph); // speakParagraph já lida com o delay
            }, delay);
        }
    });

    // Função auxiliar para capturar a palavra clicada
    function getWordAtPoint(element, clientX, clientY) {
        const range = document.caretRangeFromPoint(clientX, clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer;
            const text = textNode.textContent;
            const offset = range.startOffset;

            // Encontra o início da palavra
            let start = offset;
            while (start > 0 && /\S/.test(text[start - 1])) {
                start--;
            }

            // Encontra o fim da palavra
            let end = offset;
            while (end < text.length && /\S/.test(text[end])) {
                end++;
            }
            return text.substring(start, end);
        }
        return null;
    }

    // --- Funções de Modo AB ---
    function playABSegment() {
        const paragraphs = getActiveParagraphs();
        if (abStartParagraphIndex === -1 || abEndParagraphIndex === -1 || paragraphs.length === 0) {
            console.warn('Modo AB não configurado corretamente.');
            return;
        }

        // Se está iniciando o segmento AB, defina o currentABIndex para o início
        if (!speaking && !paused) { // Só reseta o índice se não estiver falando/pausado
             currentABIndex = abStartParagraphIndex;
        }

        stopSpeaking(); // Garante que qualquer fala anterior seja parada

        const initialDelay = delayMode ? 4000 : 0; // Atraso inicial só para delayMode, pois o loop interno já tem o MIN_LOOP_DELAY

        clearTimeout(clickDelayTimeout); // Garante que não haja outros pendentes
        clickDelayTimeout = setTimeout(() => {
            playNextABParagraph(); // Inicia a reprodução do primeiro parágrafo do segmento AB
        }, initialDelay);
    }

    // Função interna para tocar o próximo parágrafo no segmento AB
    function playNextABParagraph() {
        const paragraphs = getActiveParagraphs(); // Obter parágrafos novamente para garantir que estão atualizados
        if (currentABIndex <= abEndParagraphIndex) {
            const paragraph = paragraphs[currentABIndex];
            if (paragraph) {
                highlightParagraph(paragraph);
                const originalTextSpan = paragraph.querySelector('.LGFran_original-text');
                const textToSpeak = originalTextSpan ? originalTextSpan.textContent : '';
                speakText(textToSpeak, currentAudioRate, false); // speakText.onend vai chamar playNextABParagraph ou reiniciar o loop
            }
        }
        // A lógica de avanço e reinício do loop agora está em speakText.onend
    }


    // --- Inicialização ---
    initializeDialog();
});