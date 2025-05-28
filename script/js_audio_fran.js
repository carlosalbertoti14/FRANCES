document.addEventListener('DOMContentLoaded', () => {
    const LGFran_audioPlayer = document.getElementById('LGFran_audioPlayer');
    const LGFran_dialogContentContainer = document.getElementById('LGFran_dialogContent');
    const LGFran_dialogTitle = document.getElementById('LGFran_dialogTitle');

    // Botões de controle
    const LGFran_changeAudioBtn = document.getElementById('LGFran_changeAudio');
    const LGFran_playBtn = document.getElementById('LGFran_play');
    const LGFran_pauseBtn = document.getElementById('LGFran_pause');
    const LGFran_prevSegmentBtn = document.getElementById('LGFran_prevSegment');
    const LGFran_nextSegmentBtn = document.getElementById('LGFran_nextSegment');
    const LGFran_toggleLoopBtn = document.getElementById('LGFran_toggleLoop');
    const LGFran_toggleABModeBtn = document.getElementById('LGFran_toggleABMode');
    const LGFran_toggleMuteBtn = document.getElementById('LGFran_toggleMute');
    const LGFran_gotoTimeInput = document.getElementById('LGFran_gotoTime');
    const LGFran_gotoButton = document.getElementById('LGFran_gotoButton');

    let LGFran_currentAudioIndex = 0;
    let LGFran_segments = []; // Segmentos do diálogo ATIVO
    let LGFran_currentSegmentIndex = 0;
    let LGFran_loopMode = true; // Modo repetição habilitado por padrão (loop A-B)
    let LGFran_abModeEnabled = true; // Modo AB habilitado por padrão
    let LGFran_loopInterval;
    let LGFran_continuousLoopActive = false; // Controla o loop contínuo do botão '>'
    let LGFran_isWaiting = false; // Flag para controlar o tempo de espera
    const LGFran_loopWaitTime = 4000; // 4 segundos de espera (em milissegundos)

    // Mapeamento dos áudios para os IDs dos blocos de diálogo no HTML
const LGFran_audioData = [
        {
            name: "Diálogo do Café",
            src: "midia/Dialogo_do_Cafe.mp3", // <-- CONFIRME ESTE CAMINHO
            dialogBlockId: "LGFran_dialog_Dialogo_do_Cafe"
        },
        {
            name: "Caio et Ayheon - Vieux Amis",
            src: "midia/Caio_et_Ayheon_Vieux_Amis.mp3", // <-- CONFIRME ESTE CAMINHO
            dialogBlockId: "LGFran_dialog_Caio_et_Ayheon_Vieux_Amis"
        },
        {
            name: "Caio et la Française - Une Touriste Fait Connaissance",
            src: "midia/Caio_et_la_Francaise.mp3", // <-- CONFIRME ESTE CAMINHO
            dialogBlockId: "LGFran_dialog_Caio_et_la_Francaise"
        }
    ];

    // Função auxiliar para converter tempo para segundos
    function parseTimeToSeconds(timeStr) {
        const parts = String(timeStr).split(':');
        if (parts.length === 1) {
            return parseFloat(timeStr);
        } else if (parts.length === 2) {
            const [min, secMs] = parts;
            const [sec, ms] = secMs.split('.');
            return parseInt(min) * 60 + parseInt(sec) + (parseInt(ms) / 100 || 0);
        } else if (parts.length === 3) {
            const [hr, min, secMs] = parts;
            const [sec, ms] = secMs.split('.');
            return parseInt(hr) * 3600 + parseInt(min) * 60 + parseInt(sec) + (parseInt(ms) / 100 || 0);
        }
        return 0;
    }

    // Função para carregar o áudio e exibir o diálogo correspondente
    function loadAudio(index) {
        document.querySelectorAll('.LGFran_dialog-block').forEach(block => {
            block.classList.add('LGFran_hidden');
        });

        const currentAudioData = LGFran_audioData[index];
        LGFran_audioPlayer.src = currentAudioData.src;
        LGFran_dialogTitle.textContent = currentAudioData.name;
        LGFran_audioPlayer.load();

        const currentDialogBlock = document.getElementById(currentAudioData.dialogBlockId);
        if (currentDialogBlock) {
            currentDialogBlock.classList.remove('LGFran_hidden');
            setupDialogueSegments(currentDialogBlock);
        } else {
            console.error(`Bloco de diálogo com ID ${currentAudioData.dialogBlockId} não encontrado.`);
            LGFran_dialogContentContainer.innerHTML = '<p>Diálogo não encontrado.</p>';
            LGFran_segments = [];
        }

        LGFran_currentSegmentIndex = 0;
        if (LGFran_abModeEnabled && LGFran_segments.length > 0) {
            startLoop();
        } else {
            clearInterval(LGFran_loopInterval);
            LGFran_isWaiting = false; // Garante que a flag de espera seja resetada
        }
    }

    // Função para ler os segmentos do HTML e adicionar listeners
    function setupDialogueSegments(dialogBlock) {
        LGFran_segments = [];
        const paragraphs = dialogBlock.querySelectorAll('p');

        paragraphs.forEach((p, index) => {
            const start = parseTimeToSeconds(p.dataset.start);
            const end = parseTimeToSeconds(p.dataset.end);

            if (!isNaN(start) && !isNaN(end)) {
                LGFran_segments.push({ start: start, end: end, element: p });
                p.dataset.index = index;

                p.removeEventListener('click', handleParagraphClick);
                p.addEventListener('click', handleParagraphClick);
            } else {
                console.warn(`Parágrafo com dados de tempo inválidos no índice ${index}:`, p);
            }
        });
    }

    // Handler para o clique no parágrafo
    function handleParagraphClick(event) {
        const clickedParagraph = event.currentTarget;
        const index = parseInt(clickedParagraph.dataset.index);
        const startTime = parseFloat(clickedParagraph.dataset.start);

        if (!isNaN(index) && !isNaN(startTime)) {
            LGFran_currentSegmentIndex = index;
            LGFran_audioPlayer.currentTime = startTime;
            LGFran_audioPlayer.play();
            if (LGFran_abModeEnabled) {
                startLoop();
            } else {
                clearInterval(LGFran_loopInterval);
                highlightSegment(index);
                LGFran_continuousLoopActive = false;
            }
        } else {
            console.error('Erro: Dados de tempo ou índice inválidos no parágrafo clicado.', { index, startTime, clickedParagraph });
        }
    }

    function highlightSegment(index) {
        const currentDialogBlock = document.getElementById(LGFran_audioData[LGFran_currentAudioIndex].dialogBlockId);
        if (!currentDialogBlock) {
            return;
        }

        const paragraphs = currentDialogBlock.querySelectorAll('p');
        paragraphs.forEach((p, i) => {
            if (i === index) {
                p.classList.add('LGFran_highlight');
                p.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                p.classList.remove('LGFran_highlight');
            }
        });
    }

    function updateHighlight() {
        if (LGFran_abModeEnabled) return;

        const currentTime = LGFran_audioPlayer.currentTime;
        for (let i = 0; i < LGFran_segments.length; i++) {
            if (currentTime >= LGFran_segments[i].start && currentTime < LGFran_segments[i].end) {
                if (LGFran_currentSegmentIndex !== i) {
                    LGFran_currentSegmentIndex = i;
                    highlightSegment(i);
                }
                break;
            }
        }
    }

    function startLoop() {
        clearInterval(LGFran_loopInterval);
        LGFran_isWaiting = false; // Reseta a flag de espera

        if (!LGFran_abModeEnabled || LGFran_segments.length === 0) return;

        const currentSegment = LGFran_segments[LGFran_currentSegmentIndex];
        if (!currentSegment) {
            console.warn("Nenhum segmento atual para iniciar o loop.");
            return;
        }

        LGFran_audioPlayer.currentTime = currentSegment.start;
        LGFran_audioPlayer.play();
        highlightSegment(LGFran_currentSegmentIndex);

        LGFran_loopInterval = setInterval(() => {
            if (LGFran_isWaiting) return; // Se estiver esperando, não faz nada

            if (LGFran_audioPlayer.currentTime >= currentSegment.end) {
                if (LGFran_loopMode) {
                    // Entra em modo de espera
                    LGFran_audioPlayer.pause(); // Pausa o áudio
                    LGFran_isWaiting = true;
                    // console.log(`Esperando ${LGFran_loopWaitTime / 1000} segundos...`);
                    setTimeout(() => {
                        LGFran_audioPlayer.currentTime = currentSegment.start; // Volta para o início
                        LGFran_audioPlayer.play(); // Inicia novamente
                        LGFran_isWaiting = false; // Sai do modo de espera
                    }, LGFran_loopWaitTime);
                } else {
                    LGFran_audioPlayer.pause();
                    clearInterval(LGFran_loopInterval);
                }
            }
        }, 50);
    }

    // --- Listeners de Eventos para Botões ---

    LGFran_changeAudioBtn.addEventListener('click', () => {
        LGFran_currentAudioIndex = (LGFran_currentAudioIndex + 1) % LGFran_audioData.length;
        loadAudio(LGFran_currentAudioIndex);
        LGFran_audioPlayer.play();
    });

    LGFran_playBtn.addEventListener('click', () => {
        LGFran_audioPlayer.play();
        if (LGFran_abModeEnabled && LGFran_segments.length > 0) {
            startLoop();
        } else {
            clearInterval(LGFran_loopInterval);
            LGFran_continuousLoopActive = false;
        }
        LGFran_isWaiting = false; // Garante que a espera seja desativada ao dar play
    });

    LGFran_pauseBtn.addEventListener('click', () => {
        LGFran_audioPlayer.pause();
        clearInterval(LGFran_loopInterval);
        LGFran_continuousLoopActive = false;
        LGFran_isWaiting = false; // Garante que a espera seja desativada ao pausar
    });

    LGFran_prevSegmentBtn.addEventListener('click', () => {
        if (LGFran_segments.length === 0) return;
        LGFran_currentSegmentIndex = (LGFran_currentSegmentIndex - 1 + LGFran_segments.length) % LGFran_segments.length;
        LGFran_audioPlayer.currentTime = LGFran_segments[LGFran_currentSegmentIndex].start;
        LGFran_audioPlayer.play();
        if (LGFran_abModeEnabled) {
            startLoop();
        } else {
            clearInterval(LGFran_loopInterval);
            highlightSegment(LGFran_currentSegmentIndex);
        }
        LGFran_isWaiting = false; // Reseta a espera ao pular segmento
    });

    LGFran_nextSegmentBtn.addEventListener('click', () => {
        if (LGFran_segments.length === 0) return;
        LGFran_currentSegmentIndex = (LGFran_currentSegmentIndex + 1) % LGFran_segments.length;
        LGFran_audioPlayer.currentTime = LGFran_segments[LGFran_currentSegmentIndex].start;
        LGFran_audioPlayer.play();
        if (LGFran_abModeEnabled) {
            startLoop();
        } else {
            clearInterval(LGFran_loopInterval);
            highlightSegment(LGFran_currentSegmentIndex);
        }
        LGFran_isWaiting = false; // Reseta a espera ao pular segmento
    });

    LGFran_toggleLoopBtn.addEventListener('click', () => {
        if (!LGFran_abModeEnabled) {
            LGFran_continuousLoopActive = !LGFran_continuousLoopActive;
            if (LGFran_continuousLoopActive) {
                LGFran_toggleLoopBtn.textContent = '⏯️';
                clearInterval(LGFran_loopInterval);
                LGFran_audioPlayer.play();
            } else {
                LGFran_toggleLoopBtn.textContent = '🔁';
                clearInterval(LGFran_loopInterval);
            }
        } else {
            LGFran_loopMode = !LGFran_loopMode;
            LGFran_toggleLoopBtn.textContent = LGFran_loopMode ? '🔁' : '▶️';
            if (LGFran_loopMode && LGFran_audioPlayer.paused && LGFran_segments.length > 0) {
                startLoop();
            }
        }
        LGFran_isWaiting = false; // Reseta a espera ao alternar loop
    });

    LGFran_toggleABModeBtn.addEventListener('click', () => {
        LGFran_abModeEnabled = !LGFran_abModeEnabled;
        LGFran_toggleABModeBtn.textContent = LGFran_abModeEnabled ? '🅰️🅱️' : '▶️';
        if (LGFran_abModeEnabled) {
            LGFran_loopMode = true;
            LGFran_toggleLoopBtn.textContent = '🔁';
            if (!LGFran_audioPlayer.paused && LGFran_segments.length > 0) {
                startLoop();
            } else if (LGFran_audioPlayer.paused && LGFran_segments.length > 0) {
                LGFran_audioPlayer.currentTime = LGFran_segments[LGFran_currentSegmentIndex].start;
                highlightSegment(LGFran_currentSegmentIndex);
            }
        } else {
            clearInterval(LGFran_loopInterval);
            LGFran_continuousLoopActive = false;
            LGFran_toggleLoopBtn.textContent = '🔁';
        }
        LGFran_isWaiting = false; // Reseta a espera ao alternar modo AB
    });

    LGFran_toggleMuteBtn.addEventListener('click', () => {
        LGFran_audioPlayer.muted = !LGFran_audioPlayer.muted;
        LGFran_toggleMuteBtn.textContent = LGFran_audioPlayer.muted ? '🔇' : '🔊';
    });

    LGFran_gotoButton.addEventListener('click', () => {
        const timeStr = LGFran_gotoTimeInput.value;
        const seconds = parseTimeToSeconds(timeStr);
        if (!isNaN(seconds) && seconds >= 0 && seconds < LGFran_audioPlayer.duration) {
            LGFran_audioPlayer.currentTime = seconds;
            LGFran_audioPlayer.play();
            clearInterval(LGFran_loopInterval);
            LGFran_abModeEnabled = false;
            LGFran_toggleABModeBtn.textContent = '▶️';
            LGFran_continuousLoopActive = false;
            LGFran_toggleLoopBtn.textContent = '🔁';
            updateHighlight();
        } else {
            alert('Formato de tempo inválido ou fora do limite do áudio. Use hh:mm:ss ou mm:ss.');
        }
        LGFran_isWaiting = false; // Reseta a espera ao ir para tempo
    });

    // Evento para atualizar o destaque do texto conforme o áudio avança
    LGFran_audioPlayer.addEventListener('timeupdate', () => {
        if (LGFran_abModeEnabled || LGFran_isWaiting) return; // Não atualiza destaque se estiver em loop AB ou esperando

        if (LGFran_continuousLoopActive) {
            const currentSegment = LGFran_segments[LGFran_currentSegmentIndex];
            if (currentSegment && LGFran_audioPlayer.currentTime >= currentSegment.end) {
                LGFran_audioPlayer.currentTime = currentSegment.start;
            }
            highlightSegment(LGFran_currentSegmentIndex);
        } else {
            updateHighlight();
        }
    });

    // Inicialização
    loadAudio(LGFran_currentAudioIndex);

    LGFran_audioPlayer.addEventListener('loadedmetadata', () => {
        if (LGFran_abModeEnabled && LGFran_segments.length > 0) {
            startLoop();
        } else if (LGFran_segments.length > 0) {
            highlightSegment(0);
        }
    });
});