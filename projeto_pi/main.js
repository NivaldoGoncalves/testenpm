// ==========================================
// 1. VARIÁVEIS DO HTML
// ==========================================
const mudarImg = document.getElementById("imgNaoUrgente");
const selecionarDivNome = document.getElementById("nomeCliente");
const dataLimite = document.getElementById("formularioData");
const formularioProblema = document.getElementById("selecionar_foto");
const imgProblema = document.getElementById("imagemProblema");
const selectServicos = document.getElementById("formularioServico");
const enderecoEscrito = document.getElementById("formularioEndereco");
const descServico = document.getElementById("formularioDescricao");
const btnSolicitar = document.getElementById("solicitarServico");

// ==========================================
// 2. VERIFICAÇÃO DE LOGIN E FOTO DE PERFIL
// ==========================================
const nomeSalvo = localStorage.getItem("usuarioNome");
const idSalvo = localStorage.getItem("usuarioId");
const spanImgSolicitante = document.getElementById("img_solicitante"); // Puxando o span da foto

// Se a div do nome existir na tela, ele verifica o login
if (selecionarDivNome) {
  if (!nomeSalvo || !idSalvo) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "telaLogin.html";
  } else {
    // 1. Escreve o nome do usuário no título
    selecionarDivNome.textContent = nomeSalvo;

    // 2. Cria o avatar com a primeira letra do nome
    if (spanImgSolicitante) {
      // Pega a primeira letra (posição 0) e deixa maiúscula
      const primeiraLetra = nomeSalvo.charAt(0).toUpperCase();
      spanImgSolicitante.textContent = primeiraLetra;
    }
  }
}

// ==========================================
// 3. LÓGICA DE URGÊNCIA E DATA
// ==========================================
const obterDataHoje = () => new Date().toLocaleDateString("en-ca");

function alterarUrgencia() {
  if (
    mudarImg &&
    mudarImg.getAttribute("src") === "fotos/iconNaoUrgencia.png"
  ) {
    mudarImg.src = "fotos/iconUrgencia.png";
  } else if (mudarImg) {
    mudarImg.src = "fotos/iconNaoUrgencia.png";
  }
  dataLimiteServicoUrgente();
}

const dataLimiteServicoUrgente = () => {
  if (!dataLimite || !mudarImg) return;
  const dataHoje = obterDataHoje();

  if (mudarImg.src.includes("iconNaoUrgencia.png")) {
    dataLimite.removeAttribute("max");
    dataLimite.min = dataHoje;
  } else {
    dataLimite.min = dataHoje;
    dataLimite.max = dataHoje;
    dataLimite.value = dataHoje;
  }
};

// Inicializa a data
if (dataLimite && mudarImg) dataLimiteServicoUrgente();

// ==========================================
// 4. LÓGICA DA IMAGEM DO PROBLEMA
// ==========================================
if (formularioProblema) {
  formularioProblema.addEventListener("change", function (e) {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const leitor = new FileReader();
      leitor.onload = function (event) {
        imgProblema.src = event.target.result;
        imgProblema.style.display = "block";
      };
      leitor.readAsDataURL(arquivo);
    }
  });
}

// ==========================================
// 5. ENVIO PARA O BANCO DE DADOS (O BOTÃO!)
// ==========================================
if (btnSolicitar) {
  btnSolicitar.addEventListener("click", async function (e) {
    e.preventDefault();

    // Validações iniciais
    if (!idSalvo) {
      alert("Erro: Você precisa estar logado para solicitar.");
      return;
    }

    if (!dataLimite.value || selectServicos.value === "Selecione uma Opção") {
      alert("Por favor, preencha a data e selecione o tipo de serviço.");
      return;
    }

    // NOVA VALIDAÇÃO: Bloqueia envio de endereço ou descrição vazios
    // O .trim() serve para evitar que o usuário digite só espaços em branco
    if (!enderecoEscrito.value.trim() || !descServico.value.trim()) {
      alert(
        "Por favor, preencha a sua localização e faça uma breve descrição do que precisa ser feito.",
      );

      // Coloca o cursor piscando no campo que está faltando!
      if (!enderecoEscrito.value.trim()) {
        enderecoEscrito.focus();
      } else {
        descServico.focus();
      }
      return; // Para tudo e não envia pro banco!
    }

    // Verifica se é urgente
    const isUrgente = mudarImg.src.includes("iconUrgencia.png");

    // Pega a imagem se ela foi alterada
    let imagemBase64 = "";
    if (
      imgProblema.src &&
      !imgProblema.src.includes("icon_adicionarFoto.png")
    ) {
      imagemBase64 = imgProblema.src;
    }

    const dadosSolicitacao = {
      idUsuario: idSalvo,
      urgente: isUrgente,
      dataServico: dataLimite.value,
      tipoServico: selectServicos.value,
      endereco: enderecoEscrito.value,
      descricao: descServico.value,
      imagem: imagemBase64,
    };

    try {
      // Mandando para a sua URL pública do Codespaces
      const resposta = await fetch("https://testenpm.vercel.app/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosSolicitacao),
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        alert(
          "Solicitação enviada com sucesso! O profissional entrará em contato.",
        );
        window.location.href = "home.html";
      } else {
        alert("Erro ao solicitar: " + resultado.erro);
      }
    } catch (error) {
      console.error("Erro ao enviar:", error);
      alert("Erro ao conectar com o servidor.");
    }
  });
}

// ==========================================
// 6. GEOLOCALIZAÇÃO COM PREENCHIMENTO AUTOMÁTICO
// ==========================================
function obterLocalizacao() {
  const status = document.getElementById("status");
  const campoEndereco = document.getElementById("formularioEndereco"); // Puxando a caixa de texto

  if (!navigator.geolocation) {
    status.textContent = "Geolocalização não é suportada pelo seu navegador.";
    return;
  }

  status.textContent = "Buscando sua localização... 🛰️";

  navigator.geolocation.getCurrentPosition(
    async (posicao) => {
      const lat = posicao.coords.latitude;
      const lon = posicao.coords.longitude;

      status.innerHTML = `✅ Coordenadas obtidas! Convertendo em endereço...`;

      try {
        // Mágica: Consulta uma API gratuita para converter as coordenadas em nome de rua!
        const resposta = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        );
        const dados = await resposta.json();

        if (dados && dados.display_name) {
          // Se achar a rua, preenche a caixa de texto
          campoEndereco.value = dados.display_name;
          status.innerHTML = `✅ Endereço preenchido com sucesso!`;
        } else {
          // Se não achar, coloca as coordenadas na caixa
          campoEndereco.value = `Lat: ${lat}, Lon: ${lon}`;
          status.innerHTML = `✅ Coordenadas preenchidas!`;
        }
      } catch (erro) {
        console.error("Erro ao converter endereço:", erro);
        campoEndereco.value = `Lat: ${lat}, Lon: ${lon}`;
        status.innerHTML = `✅ Coordenadas preenchidas!`;
      }
    },
    (erro) => {
      status.textContent =
        "Erro ao obter localização. Verifique se o GPS está ativo.";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

const btnLocalizacao = document.getElementById("btnLocalizacao");
if (btnLocalizacao) {
  btnLocalizacao.addEventListener("click", obterLocalizacao);
}
