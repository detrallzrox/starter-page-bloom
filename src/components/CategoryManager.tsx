import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, FolderOpen, Search, X } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useToast } from '@/components/ui/use-toast';
import { AdBanner } from "@/components/AdBanner";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";

const ICON_OPTIONS = [
  // Finance & Money (30)
  "💰", "💵", "💳", "🏦", "💎", "🪙", "📊", "📈", "📉", "🧾",
  "💴", "💶", "💷", "💸", "🏧", "💹", "🔢", "💱", "🧮", "📋",
  "💼", "💲", "🏛️", "🪪", "📃", "📄", "📜", "🔐", "💯", "🆔",
  
  // Shopping & Retail (30)
  "🛍️", "🛒", "🏪", "🏬", "📦", "🎁", "🏷️", "🛵", "🏢", "🏭",
  "🏘️", "🏰", "🏯", "🗼", "⛪", "🕌", "🛕", "🕍", "⛩️", "🎪",
  "🎠", "🎡", "🎢", "🎭", "🏟️", "🏗️", "🏚️", "🏠", "🏡", "🏦",
  
  // Food & Dining (40)
  "🍔", "🍕", "🍜", "☕", "🍺", "🥘", "🍰", "🥗", "🍳", "🥙",
  "🍎", "🍌", "🍇", "🍓", "🥝", "🍑", "🥭", "🍍", "🥥", "🥑",
  "🥐", "🥖", "🧀", "🥩", "🍖", "🐟", "🍤", "🦀", "🦞", "🐙",
  "🍪", "🍩", "🍫", "🍬", "🍭", "🧁", "🥧", "🍮", "🍯", "🥛",
  
  // Transport (30)
  "🚗", "🚕", "🚌", "✈️", "🚆", "🚲", "⛽", "🅿️", "🛣️", "🚇",
  "🛴", "🛺", "🚜", "🚛", "🚐", "🏍️", "🚁", "🛩️", "🚀", "🛸",
  "⛵", "🚤", "🛥️", "🚢", "⚓", "🛟", "🚏", "🚥", "🚦", "🛑",
  
  // Home & Utilities (30)
  "🏠", "🔌", "💡", "🚿", "🔥", "❄️", "📱", "💻", "📺", "🛋️",
  "🛏️", "🚪", "🪟", "🚽", "🛁", "🪞", "🕯️", "🔦", "🪔", "🧹",
  "🧽", "🧴", "🧼", "🪣", "🧺", "🪒", "🧯", "🔧", "🔨", "⚡",
  
  // Health & Medical (30)
  "🏥", "💊", "🩺", "💉", "🦷", "👓", "🧼", "🏃", "💪", "🧠",
  "🧬", "🔬", "🩹", "🩼", "🩽", "🦽", "🦼", "🩸", "🫀", "🫁",
  "👁️", "👂", "👃", "👄", "🦴", "🧘‍♀️", "🧘‍♂️", "🤸", "🤾", "⚕️",
  
  // Entertainment (30)
  "🎬", "🎵", "🎮", "📚", "🎭", "🎨", "🎸", "🎲", "🎪", "🎯",
  "🎳", "🕹️", "🃏", "🀄", "🎴", "🖼️", "🎼", "🎤", "🎧", "📻",
  "📽️", "🎞️", "📸", "📷", "📹", "💿", "💽", "💾", "🎺", "🥁",
  
  // Work & Education (30)
  "🏢", "📝", "✏️", "📖", "🎓", "📊", "📋", "🖨️", "⌨️", "🖱️",
  "📏", "📐", "✂️", "📌", "📎", "🖇️", "📁", "📂", "🗂️", "🗄️",
  "📇", "📑", "📒", "📓", "📔", "📕", "📗", "📘", "📙", "🔖",
  
  // Sports & Fitness (30)
  "⚽", "🏀", "🎾", "🏊", "🚴", "🏋️", "🧘", "🥊", "⛳", "🏃",
  "🏈", "⚾", "🥎", "🏐", "🏉", "🎱", "🪀", "🏓", "🏸", "🥍",
  "🏹", "🎣", "🥅", "⛸️", "🥌", "🛷", "🏂", "⛷️", "🤿", "🏄",
  
  // Travel & Tourism (30)
  "🗺️", "🎒", "🏨", "⛺", "🎡", "🎢", "🏖️", "⛱️", "🌍", "🌎",
  "🏔️", "⛰️", "🌋", "🏕️", "🏞️", "🗿", "🕊️", "🦅", "🌅", "🌇",
  "🐘", "🐅", "🦁", "🐺", "🐻", "🐼", "🐨", "🐯", "🦒", "🦓",
  
  // Nature & Animals (30)
  "🌱", "🌿", "🍀", "🌳", "🌲", "🌴", "🌵", "🌾", "🌺", "🌻",
  "🌷", "🌹", "💐", "🌸", "🌼", "🦋", "🐝", "🐞", "🕷️", "🦗",
  "🐛", "🐜", "🐌", "🦑", "🦐", "🐠", "🐟", "🐡", "🐢", "🦎",
  
  // Technology & Gaming (20)
  "🖥️", "⌨️", "🖱️", "📞", "☎️", "📠", "🔌", "🔋", "📡", "🛰️"
];

// Mapeamento de ícones para palavras-chave de busca
const ICON_KEYWORDS: { [key: string]: string[] } = {
  // Finance & Money
  "💰": ["dinheiro", "moeda", "financeiro", "pagamento", "money"],
  "💵": ["dolar", "nota", "dinheiro", "papel", "dollar"],
  "💳": ["cartao", "credito", "debito", "pagamento", "card"],
  "🏦": ["banco", "financeiro", "instituicao", "bank"],
  "💎": ["diamante", "joia", "valor", "luxo", "diamond"],
  "🪙": ["moeda", "dinheiro", "valor", "coin"],
  "📊": ["grafico", "estatistica", "dados", "relatorio", "chart"],
  "📈": ["crescimento", "alta", "lucro", "investimento", "growth"],
  "📉": ["queda", "baixa", "perda", "declinio", "loss"],
  "🧾": ["recibo", "nota", "comprovante", "receipt"],
  "💴": ["yen", "japao", "dinheiro", "japanese"],
  "💶": ["euro", "europa", "dinheiro", "european"],
  "💷": ["libra", "reino unido", "dinheiro", "pound"],
  "💸": ["gasto", "despesa", "perda", "expense"],
  "🏧": ["caixa", "atm", "saque", "withdraw"],
  "💹": ["bolsa", "acao", "investimento", "stock"],
  "🔢": ["numero", "calculo", "matematica", "number"],
  "💱": ["cambio", "troca", "moeda", "exchange"],
  "🧮": ["calculadora", "conta", "calculo", "calculator"],
  "📋": ["lista", "relatorio", "documento", "clipboard"],
  "💼": ["maleta", "trabalho", "negocios", "briefcase"],
  "💲": ["dolar", "preco", "valor", "price"],
  "🏛️": ["governo", "banco", "instituicao", "government"],
  "🪪": ["identidade", "documento", "carteira", "id"],
  "📃": ["documento", "papel", "arquivo", "document"],
  "📄": ["papel", "documento", "arquivo", "paper"],
  "📜": ["contrato", "documento", "pergaminho", "scroll"],
  "🔐": ["seguranca", "chave", "protecao", "security"],
  "💯": ["cem", "perfeito", "completo", "hundred"],
  "🆔": ["identidade", "documento", "id", "identification"],

  // Shopping & Retail
  "🛍️": ["compra", "shopping", "sacola", "shopping"],
  "🛒": ["carrinho", "compra", "mercado", "cart"],
  "🏪": ["loja", "comercio", "varejo", "store"],
  "🏬": ["shopping", "loja", "departamento", "mall"],
  "📦": ["caixa", "entrega", "pacote", "package"],
  "🎁": ["presente", "gift", "surpresa", "gift"],
  "🏷️": ["etiqueta", "preco", "tag", "label"],
  "🛵": ["entrega", "moto", "delivery", "scooter"],
  "🏢": ["predio", "empresa", "escritorio", "building"],
  "🏭": ["fabrica", "industria", "producao", "factory"],

  // Food & Dining
  "🍔": ["hamburguer", "comida", "lanche", "fast food", "burger"],
  "🍕": ["pizza", "comida", "italiana", "pizza"],
  "🍜": ["sopa", "macarrao", "comida", "noodles"],
  "☕": ["cafe", "bebida", "cafeina", "coffee"],
  "🍺": ["cerveja", "bebida", "alcool", "beer"],
  "🥘": ["comida", "prato", "refeicao", "food"],
  "🍰": ["bolo", "doce", "sobremesa", "cake"],
  "🥗": ["salada", "verdura", "saudavel", "salad"],
  "🍳": ["ovo", "fritura", "cozinha", "egg"],
  "🥙": ["wrap", "sanduiche", "comida", "wrap"],
  "🍎": ["maca", "fruta", "saudavel", "apple"],
  "🍌": ["banana", "fruta", "amarelo", "banana"],
  "🍇": ["uva", "fruta", "vinho", "grape"],
  "🍓": ["morango", "fruta", "doce", "strawberry"],
  "🥝": ["kiwi", "fruta", "verde", "kiwi"],
  "🍑": ["pessego", "fruta", "doce", "peach"],
  "🥭": ["manga", "fruta", "tropical", "mango"],
  "🍍": ["abacaxi", "fruta", "tropical", "pineapple"],
  "🥥": ["coco", "fruta", "tropical", "coconut"],
  "🥑": ["abacate", "fruta", "verde", "avocado"],
  "🥐": ["croissant", "pao", "frances", "croissant"],
  "🥖": ["pao", "frances", "baguete", "bread"],
  "🧀": ["queijo", "lacteo", "dairy", "cheese"],
  "🥩": ["carne", "bife", "proteina", "meat"],
  "🍖": ["carne", "costeleta", "proteina", "meat"],
  "🐟": ["peixe", "frutos do mar", "proteina", "fish"],
  "🍤": ["camarao", "frutos do mar", "proteina", "shrimp"],
  "🦀": ["caranguejo", "frutos do mar", "crab"],
  "🦞": ["lagosta", "frutos do mar", "luxo", "lobster"],
  "🐙": ["polvo", "frutos do mar", "octopus"],
  "🍪": ["biscoito", "doce", "cookie", "cookie"],
  "🍩": ["rosquinha", "doce", "donut", "donut"],
  "🍫": ["chocolate", "doce", "candy", "chocolate"],
  "🍬": ["bala", "doce", "candy", "candy"],
  "🍭": ["pirulito", "doce", "candy", "lollipop"],
  "🧁": ["cupcake", "doce", "bolo", "cupcake"],
  "🥧": ["torta", "doce", "pie", "pie"],
  "🍮": ["pudim", "doce", "sobremesa", "pudding"],
  "🍯": ["mel", "doce", "natural", "honey"],
  "🥛": ["leite", "bebida", "lacteo", "milk"],

  // Transport
  "🚗": ["carro", "veiculo", "transporte", "car"],
  "🚕": ["taxi", "transporte", "corrida", "taxi"],
  "🚌": ["onibus", "transporte", "publico", "bus"],
  "✈️": ["aviao", "viagem", "voo", "airplane"],
  "🚆": ["trem", "transporte", "trilho", "train"],
  "🚲": ["bicicleta", "bike", "exercicio", "bicycle"],
  "⛽": ["combustivel", "gasolina", "posto", "fuel"],
  "🅿️": ["estacionamento", "parking", "vaga", "parking"],
  "🛣️": ["estrada", "via", "rodovia", "road"],
  "🚇": ["metro", "subterraneo", "transporte", "subway"],
  "🛴": ["patinete", "scooter", "mobilidade", "scooter"],
  "🛺": ["tuk tuk", "transporte", "asia", "tuktuk"],
  "🚜": ["trator", "agricultura", "campo", "tractor"],
  "🚛": ["caminhao", "transporte", "carga", "truck"],
  "🚐": ["van", "transporte", "familia", "van"],
  "🏍️": ["moto", "motocicleta", "velocidade", "motorcycle"],
  "🚁": ["helicoptero", "voo", "emergencia", "helicopter"],
  "🛩️": ["aviao pequeno", "voo", "particular", "plane"],
  "🚀": ["foguete", "espaco", "velocidade", "rocket"],
  "🛸": ["ovni", "espaco", "alienigena", "ufo"],
  "⛵": ["veleiro", "barco", "vela", "sailboat"],
  "🚤": ["lancha", "barco", "velocidade", "speedboat"],
  "🛥️": ["iate", "barco", "luxo", "yacht"],
  "🚢": ["navio", "cruzeiro", "grande", "ship"],
  "⚓": ["ancora", "nautico", "porto", "anchor"],
  "🛟": ["boia", "seguranca", "agua", "lifesaver"],
  "🚏": ["ponto", "onibus", "parada", "bus stop"],
  "🚥": ["semaforo", "transito", "sinal", "traffic light"],
  "🚦": ["semaforo", "transito", "vertical", "traffic light"],
  "🛑": ["pare", "stop", "sinal", "stop"],

  // Home & Utilities
  "🏠": ["casa", "lar", "moradia", "home"],
  "🔌": ["tomada", "energia", "eletricidade", "plug"],
  "💡": ["lampada", "luz", "ideia", "bulb"],
  "🚿": ["chuveiro", "banho", "agua", "shower"],
  "🔥": ["fogo", "calor", "energia", "fire"],
  "❄️": ["gelo", "frio", "inverno", "cold"],
  "📱": ["celular", "telefone", "mobile", "phone"],
  "💻": ["laptop", "computador", "notebook", "computer"],
  "📺": ["televisao", "tv", "entretenimento", "television"],
  "🛋️": ["sofa", "movel", "sala", "sofa"],
  "🛏️": ["cama", "dormir", "quarto", "bed"],
  "🚪": ["porta", "entrada", "casa", "door"],
  "🪟": ["janela", "vista", "casa", "window"],
  "🚽": ["vaso", "banheiro", "sanitario", "toilet"],
  "🛁": ["banheira", "banho", "relaxar", "bathtub"],
  "🪞": ["espelho", "reflexo", "banheiro", "mirror"],
  "🕯️": ["vela", "luz", "romantico", "candle"],
  "🔦": ["lanterna", "luz", "emergencia", "flashlight"],
  "🪔": ["lamparina", "luz", "oleo", "lamp"],
  "🧹": ["vassoura", "limpeza", "casa", "broom"],
  "🧽": ["esponja", "limpeza", "pia", "sponge"],
  "🧴": ["frasco", "shampoo", "produto", "bottle"],
  "🧼": ["sabao", "limpeza", "higiene", "soap"],
  "🪣": ["balde", "limpeza", "agua", "bucket"],
  "🧺": ["cesta", "roupa", "lavanderia", "basket"],
  "🪒": ["barbeador", "higiene", "barba", "razor"],
  "🧯": ["extintor", "seguranca", "fogo", "extinguisher"],
  "🔧": ["chave", "ferramenta", "reparo", "wrench"],
  "🔨": ["martelo", "ferramenta", "construcao", "hammer"],
  "⚡": ["raio", "energia", "eletricidade", "electricity"],

  // Health & Medical
  "🏥": ["hospital", "saude", "medico", "hospital"],
  "💊": ["remedio", "medicamento", "pilula", "pill"],
  "🩺": ["estetoscopio", "medico", "exame", "stethoscope"],
  "💉": ["injecao", "vacina", "seringa", "injection"],
  "🦷": ["dente", "dentista", "oral", "tooth"],
  "👓": ["oculos", "vista", "lentes", "glasses"],
  
  "💪": ["musculo", "forca", "exercicio", "muscle"],
  "🧠": ["cerebro", "mente", "inteligencia", "brain"],
  "🧬": ["dna", "genetica", "ciencia", "dna"],
  "🔬": ["microscopio", "laboratorio", "pesquisa", "microscope"],
  "🩹": ["curativo", "band-aid", "ferimento", "bandage"],
  "🩼": ["muleta", "apoio", "lesao", "crutch"],
  "🩽": ["gesso", "fratura", "osso", "cast"],
  "🦽": ["cadeira de rodas", "mobilidade", "deficiencia", "wheelchair"],
  "🦼": ["cadeira motorizada", "mobilidade", "eletrica", "motorized wheelchair"],
  "🩸": ["sangue", "doacao", "vermelho", "blood"],
  "🫀": ["coracao", "cardiovascular", "amor", "heart"],
  "🫁": ["pulmao", "respiracao", "ar", "lungs"],
  "👁️": ["olho", "vista", "visao", "eye"],
  "👂": ["ouvido", "audicao", "som", "ear"],
  "👃": ["nariz", "olfato", "respiracao", "nose"],
  "👄": ["boca", "labios", "fala", "mouth"],
  "🦴": ["osso", "esqueleto", "calcio", "bone"],
  "🧘‍♀️": ["yoga", "meditacao", "relaxamento", "yoga"],
  "🧘‍♂️": ["yoga", "meditacao", "zen", "yoga"],
  "🤸": ["ginastica", "acrobacia", "flexibilidade", "gymnastics"],
  "🤾": ["handebol", "esporte", "jogo", "handball"],
  "⚕️": ["medicina", "saude", "medico", "medical"],

  // Entertainment
  "🎬": ["cinema", "filme", "entretenimento", "movie"],
  "🎵": ["musica", "nota", "som", "music"],
  "🎮": ["videogame", "jogo", "diversao", "game"],
  "📚": ["livro", "leitura", "educacao", "book"],
  "🎭": ["teatro", "drama", "arte", "theater"],
  "🎨": ["arte", "pintura", "criativo", "art"],
  "🎸": ["guitarra", "musica", "instrumento", "guitar"],
  "🎲": ["dado", "jogo", "sorte", "dice"],
  "🎪": ["circo", "espetaculo", "diversao", "circus"],
  "🎯": ["alvo", "precisao", "objetivo", "target"],
  "🎳": ["boliche", "bowling", "esporte", "bowling"],
  "🕹️": ["joystick", "videogame", "controle", "joystick"],
  "🃏": ["carta", "jogo", "coringa", "joker"],
  "🀄": ["mahjong", "jogo", "chines", "mahjong"],
  "🎴": ["carta", "jogo", "japones", "cards"],
  "🖼️": ["quadro", "arte", "pintura", "frame"],
  "🎼": ["partitura", "musica", "notas", "music sheet"],
  "🎤": ["microfone", "cantar", "audio", "microphone"],
  "🎧": ["fone", "audio", "musica", "headphones"],
  "📻": ["radio", "audio", "transmissao", "radio"],
  "📽️": ["projetor", "cinema", "filme", "projector"],
  "🎞️": ["filme", "cinema", "rolo", "film"],
  "📸": ["camera", "foto", "instantanea", "camera"],
  "📷": ["camera", "fotografia", "digital", "camera"],
  "📹": ["filmadora", "video", "gravacao", "video camera"],
  "💿": ["cd", "disco", "musica", "cd"],
  "💽": ["disco", "minidisc", "audio", "minidisc"],
  "💾": ["disquete", "save", "arquivo", "floppy"],
  "🎺": ["trombeta", "musica", "instrumento", "trumpet"],
  "🥁": ["bateria", "musica", "instrumento", "drums"],

  // Work & Education
  
  "📝": ["escrever", "nota", "documento", "write"],
  "✏️": ["lapis", "escrever", "desenhar", "pencil"],
  "📖": ["livro", "leitura", "aberto", "book"],
  "🎓": ["formatura", "educacao", "diploma", "graduation"],
  "🖨️": ["impressora", "imprimir", "papel", "printer"],
  "⌨️": ["teclado", "digitar", "teclas", "keyboard"],
  "🖱️": ["mouse", "clique", "ponteiro", "mouse"],
  "📏": ["regua", "medida", "geometria", "ruler"],
  "📐": ["esquadro", "angulo", "geometria", "triangle"],
  "✂️": ["tesoura", "cortar", "artesanato", "scissors"],
  "📌": ["alfinete", "fixar", "quadro", "pin"],
  "📎": ["clipe", "papel", "prender", "paperclip"],
  "🖇️": ["clipes", "papel", "ligacao", "paperclips"],
  "📁": ["pasta", "arquivo", "organizacao", "folder"],
  "📂": ["pasta", "aberta", "documentos", "folder"],
  "🗂️": ["fichario", "organizacao", "indice", "files"],
  "🗄️": ["arquivo", "gaveta", "organizacao", "cabinet"],
  "📇": ["rolodex", "contatos", "cartoes", "rolodex"],
  "📑": ["marcador", "pagina", "bookmark", "bookmark"],
  "📒": ["caderno", "agenda", "anotacao", "notebook"],
  "📓": ["caderno", "escola", "notas", "notebook"],
  "📔": ["caderno", "decorativo", "pessoal", "notebook"],
  "📕": ["livro", "vermelho", "fechado", "book"],
  "📗": ["livro", "verde", "fechado", "book"],
  "📘": ["livro", "azul", "fechado", "book"],
  "📙": ["livro", "laranja", "fechado", "book"],
  "🔖": ["marcador", "bookmark", "pagina", "bookmark"],

  // Sports & Fitness
  "⚽": ["futebol", "bola", "esporte", "soccer"],
  "🏀": ["basquete", "bola", "cesta", "basketball"],
  "🎾": ["tenis", "bola", "raquete", "tennis"],
  "🏊": ["natacao", "piscina", "agua", "swimming"],
  "🚴": ["ciclismo", "bike", "pedalar", "cycling"],
  "🏋️": ["musculacao", "peso", "academia", "weightlifting"],
  "🧘": ["yoga", "meditacao", "zen", "yoga"],
  "🥊": ["boxe", "luta", "soco", "boxing"],
  "⛳": ["golfe", "bandeira", "campo", "golf"],
  "🏃‍♂️": ["corrida", "atletismo", "maratona", "running"],
  "🏈": ["futebol americano", "nfl", "oval", "american football"],
  "⚾": ["baseball", "taco", "diamante", "baseball"],
  "🥎": ["softball", "baseball", "feminino", "softball"],
  "🏐": ["volei", "rede", "praia", "volleyball"],
  "🏉": ["rugby", "oval", "tackle", "rugby"],
  "🎱": ["sinuca", "bilhar", "mesa", "pool"],
  "🪀": ["ioio", "brinquedo", "cordinha", "yoyo"],
  "🏓": ["ping pong", "tenis de mesa", "raquete", "ping pong"],
  "🏸": ["badminton", "peteca", "raquete", "badminton"],
  "🥍": ["lacrosse", "stick", "rede", "lacrosse"],
  "🏹": ["tiro com arco", "flecha", "alvo", "archery"],
  "🎣": ["pesca", "anzol", "rio", "fishing"],
  "🥅": ["gol", "meta", "rede", "goal"],
  "⛸️": ["patinacao", "gelo", "inverno", "ice skating"],
  "🥌": ["curling", "gelo", "pedra", "curling"],
  "🛷": ["treno", "neve", "inverno", "sled"],
  "🏂": ["snowboard", "neve", "montanha", "snowboard"],
  "⛷️": ["esqui", "neve", "montanha", "skiing"],
  "🤿": ["mergulho", "mascara", "oceano", "diving"],
  "🏄": ["surf", "onda", "prancha", "surfing"],

  // Travel & Tourism
  "🗺️": ["mapa", "viagem", "navegacao", "map"],
  "🎒": ["mochila", "viagem", "aventura", "backpack"],
  "🏨": ["hotel", "hospedagem", "viagem", "hotel"],
  "⛺": ["barraca", "camping", "natureza", "tent"],
  "🎡": ["roda gigante", "parque", "diversao", "ferris wheel"],
  "🎢": ["montanha russa", "parque", "adrenalina", "roller coaster"],
  "🏖️": ["praia", "areia", "verao", "beach"],
  "⛱️": ["guarda-sol", "praia", "sombra", "umbrella"],
  "🌍": ["mundo", "terra", "planeta", "world"],
  "🌎": ["americas", "continente", "terra", "americas"],
  "🏔️": ["montanha", "neve", "pico", "mountain"],
  "⛰️": ["montanha", "escalada", "natureza", "mountain"],
  "🌋": ["vulcao", "lava", "geologico", "volcano"],
  "🏕️": ["camping", "natureza", "aventura", "camping"],
  "🏞️": ["parque", "natureza", "paisagem", "park"],
  "🗿": ["moai", "estatua", "pascoa", "moai"],
  "🕊️": ["pomba", "paz", "branco", "dove"],
  "🦅": ["aguia", "ave", "predador", "eagle"],
  "🌅": ["nascer do sol", "amanhecer", "horizonte", "sunrise"],
  "🌇": ["por do sol", "anoitecer", "cidade", "sunset"],
  "🐘": ["elefante", "africa", "grande", "elephant"],
  "🐅": ["tigre", "felino", "listras", "tiger"],
  "🦁": ["leao", "rei", "africa", "lion"],
  "🐺": ["lobo", "matilha", "selvagem", "wolf"],
  "🐻": ["urso", "floresta", "grande", "bear"],
  "🐼": ["panda", "china", "bambu", "panda"],
  "🐨": ["coala", "australia", "eucalipto", "koala"],
  "🐯": ["tigre", "rosto", "felino", "tiger"],
  "🦒": ["girafa", "pescoço", "alto", "giraffe"],
  "🦓": ["zebra", "listras", "africa", "zebra"],

  // Nature & Animals
  "🌱": ["broto", "planta", "crescimento", "seedling"],
  "🌿": ["folha", "verde", "natureza", "herb"],
  "🍀": ["trevo", "sorte", "verde", "clover"],
  "🌳": ["arvore", "natureza", "folhas", "tree"],
  "🌲": ["pinheiro", "conífera", "verde", "evergreen"],
  "🌴": ["palmeira", "tropical", "coco", "palm"],
  "🌵": ["cacto", "deserto", "espinho", "cactus"],
  "🌾": ["trigo", "cereal", "campo", "wheat"],
  "🌺": ["flor", "tropical", "colorida", "hibiscus"],
  "🌻": ["girassol", "amarelo", "grande", "sunflower"],
  "🌷": ["tulipa", "primavera", "bulbo", "tulip"],
  "🌹": ["rosa", "amor", "espinho", "rose"],
  "💐": ["buque", "flores", "presente", "bouquet"],
  "🌸": ["flor", "cerejeira", "rosa", "cherry blossom"],
  "🌼": ["margarida", "branca", "simples", "daisy"],
  "🦋": ["borboleta", "colorida", "metamorfose", "butterfly"],
  "🐝": ["abelha", "mel", "polinizacao", "bee"],
  "🐞": ["joaninha", "vermelha", "pontos", "ladybug"],
  "🕷️": ["aranha", "teia", "oito patas", "spider"],
  "🦗": ["grilo", "som", "noite", "cricket"],
  "🐛": ["lagarta", "verde", "folha", "caterpillar"],
  "🐜": ["formiga", "trabalho", "colonia", "ant"],
  "🐌": ["caracol", "lento", "concha", "snail"],
  "🦑": ["lula", "tentaculos", "tinta", "squid"],
  "🦐": ["camarao", "crustaceo", "pequeno", "shrimp"],
  "🐠": ["peixe", "tropical", "colorido", "fish"],
  
  "🐡": ["baiacu", "espinhos", "defesa", "blowfish"],
  "🐢": ["tartaruga", "lenta", "casco", "turtle"],
  "🦎": ["lagarto", "reptil", "cauda", "lizard"],

  // Technology & Gaming
  "🖥️": ["monitor", "desktop", "tela", "desktop"],
  "📞": ["telefone", "ligacao", "comunicacao", "phone"],
  "☎️": ["telefone", "antigo", "fixo", "phone"],
  "📠": ["fax", "documento", "transmissao", "fax"],
  "🔋": ["bateria", "energia", "portatil", "battery"],
  "📡": ["antena", "sinal", "comunicacao", "satellite"],
  "🛰️": ["satelite", "espaco", "comunicacao", "satellite"]
};

interface CategoryManagerProps {
  onCategoryAdded?: () => void;
}

export const CategoryManager = ({ onCategoryAdded }: CategoryManagerProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: '',
    icon: ''
  });

  const { categories } = useTransactions();
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Separate and sort categories by type
  const expenseCategories = categories
    .filter(cat => cat.type === 'expense')
    .sort((a, b) => a.name.localeCompare(b.name));
    
  const incomeCategories = categories
    .filter(cat => cat.type === 'income')
    .sort((a, b) => a.name.localeCompare(b.name));
    
  const savingsCategories = categories
    .filter(cat => cat.type === 'savings')
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter icons based on search and availability
  const filteredIcons = ICON_OPTIONS.filter(icon => {
    const usedIcons = categories.map(cat => cat.icon).filter(Boolean);
    const isAvailable = !usedIcons.includes(icon) || icon === newCategory.icon;
    
    if (!isAvailable) return false;
    
    if (iconSearch === '') return true;
    
    // Search in keywords
    const keywords = ICON_KEYWORDS[icon] || [];
    const searchTerm = iconSearch.toLowerCase().trim();
    
    return keywords.some(keyword => 
      keyword.toLowerCase().includes(searchTerm)
    );
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (category: typeof newCategory) => {
      if (!user || !currentAccount) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: currentAccount.id,
          name: category.name,
          type: category.type as 'expense' | 'income' | 'savings',
          icon: category.icon,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategory({ name: '', type: '', icon: '' });
      setIsAddingCategory(false);
      onCategoryAdded?.();
      toast({
        title: "Categoria criada!",
        description: "Nova categoria adicionada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!user || !currentAccount) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Categoria excluída!",
        description: "Categoria removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCategory = () => {
    if (!newCategory.name || !newCategory.type) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e tipo da categoria",
        variant: "destructive",
      });
      return;
    }

    addCategoryMutation.mutate(newCategory);
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"?`)) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'savings': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'income': return 'Receita';
      case 'expense': return 'Despesa';
      case 'savings': return 'Investimentos';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
          <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs sm:text-sm text-brand-purple font-medium">Categorias</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
        <div className="relative z-10 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              Gerenciar Categorias
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Organize suas finanças criando e gerenciando categorias personalizadas
            </p>
          </DialogHeader>
        
          <div className="p-6 space-y-6">
            {/* Add new category */}
            {isAddingCategory ? (
              <div className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
                <div className="relative z-10 p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Nova Categoria
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category-name" className="text-sm font-medium">Nome</Label>
                      <Input
                        id="category-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Digite o nome da categoria"
                        className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category-type" className="text-sm font-medium">Tipo</Label>
                      <Select value={newCategory.type} onValueChange={(value) => setNewCategory(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-xl">
                          <SelectItem value="expense" className="focus:bg-red-500/10 focus:text-red-600">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-xs">💸</span>
                              </div>
                              <span>Despesa</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="income" className="focus:bg-green-500/10 focus:text-green-600">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-xs">💰</span>
                              </div>
                              <span>Receita</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="savings" className="focus:bg-blue-500/10 focus:text-blue-600">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs">📈</span>
                              </div>
                              <span>Investimentos</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="category-icon" className="text-sm font-medium">Ícone</Label>
                    
                    {/* Search field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar ícone (ex: casa, comida, carro)..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                      />
                    </div>
                    
                    {/* Icon grid */}
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-purple-500/1 to-blue-500/2" />
                      <div className="relative z-10 p-4">
                        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                          {filteredIcons.map((icon, index) => (
                            <button
                              key={`${icon}-${index}`}
                              type="button"
                              onClick={() => setNewCategory(prev => ({ ...prev, icon }))}
                              className={`
                                w-10 h-10 rounded-xl flex items-center justify-center text-lg
                                transition-all duration-300 border-2 hover:scale-110 group
                                ${newCategory.icon === icon 
                                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary shadow-lg shadow-primary/20 scale-110' 
                                  : 'bg-background/80 border-border/30 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md'
                                }
                              `}
                              title={`Selecionar ${icon}`}
                            >
                              <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
                            </button>
                          ))}
                        </div>
                        
                        {filteredIcons.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                              <Search className="h-6 w-6 opacity-50" />
                            </div>
                            <p className="font-medium mb-1">Nenhum ícone encontrado</p>
                            {iconSearch && (
                              <p className="text-xs">
                                Tente buscar com outros termos como "casa", "comida", "transporte"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {newCategory.icon && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <span className="text-lg">{newCategory.icon}</span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Ícone selecionado</span>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/30"></div>
                      Total: {filteredIcons.length} ícones disponíveis
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={handleAddCategory} 
                      disabled={addCategoryMutation.isPending}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {addCategoryMutation.isPending ? "Salvando..." : "Salvar Categoria"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingCategory(false)}
                      className="border-border/50 hover:bg-muted/50 transition-all duration-300"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setIsAddingCategory(true)}
                className="w-full h-14 bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/15 hover:to-purple-500/15 border border-primary/20 hover:border-primary/30 text-primary hover:text-primary shadow-lg hover:shadow-xl transition-all duration-500 group"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Adicionar Nova Categoria</span>
                </div>
              </Button>
            )}

            {/* Categories list with tabs */}
            <div className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-purple-500/2 to-blue-500/3" />
              <div className="relative z-10">
                <Tabs defaultValue="expense" className="w-full">
                  <div className="p-4 sm:p-6 pb-4 border-b border-border/30">
                    <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 shadow-sm h-auto p-1">
                      <TabsTrigger 
                        value="expense" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/10 data-[state=active]:to-red-500/5 data-[state=active]:text-red-600 data-[state=active]:border-red-500/20 transition-all duration-300 py-2 px-3"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
                          <span className="text-xs sm:text-sm">💸</span>
                          <span className="text-xs sm:text-sm leading-tight">Despesas ({expenseCategories.length})</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="income"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/10 data-[state=active]:to-green-500/5 data-[state=active]:text-green-600 data-[state=active]:border-green-500/20 transition-all duration-300 py-2 px-3"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
                          <span className="text-xs sm:text-sm">💰</span>
                          <span className="text-xs sm:text-sm leading-tight">Receitas ({incomeCategories.length})</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="savings"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/10 data-[state=active]:to-blue-500/5 data-[state=active]:text-blue-600 data-[state=active]:border-blue-500/20 transition-all duration-300 py-2 px-3"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
                          <span className="text-xs sm:text-sm">📈</span>
                          <span className="text-xs sm:text-sm leading-tight">Investimentos ({savingsCategories.length})</span>
                        </div>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="p-6 pt-4">
                    <TabsContent value="expense" className="mt-0">
                      <div className="space-y-3">
                        {expenseCategories.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="p-4 rounded-full bg-red-500/10 w-fit mx-auto mb-4">
                              <span className="text-2xl">💸</span>
                            </div>
                            <p className="text-muted-foreground font-medium">Nenhuma categoria de despesa encontrada</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Adicione sua primeira categoria de despesa</p>
                          </div>
                        ) : (
                          expenseCategories.map((category) => (
                            <div key={category.id} className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/60 border border-border/30 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                  <span className="text-lg">{category.icon}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground group-hover:text-red-600 transition-colors duration-300">{category.name}</p>
                                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 text-xs">
                                    {getTypeName(category.type)}
                                  </Badge>
                                </div>
                              </div>
                              {!category.is_default && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  disabled={deleteCategoryMutation.isPending}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="income" className="mt-0">
                      <div className="space-y-3">
                        {incomeCategories.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-4">
                              <span className="text-2xl">💰</span>
                            </div>
                            <p className="text-muted-foreground font-medium">Nenhuma categoria de receita encontrada</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Adicione sua primeira categoria de receita</p>
                          </div>
                        ) : (
                          incomeCategories.map((category) => (
                            <div key={category.id} className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/60 border border-border/30 hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                  <span className="text-lg">{category.icon}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground group-hover:text-green-600 transition-colors duration-300">{category.name}</p>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                    {getTypeName(category.type)}
                                  </Badge>
                                </div>
                              </div>
                              {!category.is_default && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  disabled={deleteCategoryMutation.isPending}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="savings" className="mt-0">
                      <div className="space-y-3">
                        {savingsCategories.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="p-4 rounded-full bg-blue-500/10 w-fit mx-auto mb-4">
                              <span className="text-2xl">📈</span>
                            </div>
                            <p className="text-muted-foreground font-medium">Nenhuma categoria de investimentos encontrada</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Adicione sua primeira categoria de investimento</p>
                          </div>
                        ) : (
                          savingsCategories.map((category) => (
                            <div key={category.id} className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/60 border border-border/30 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                  <span className="text-lg">{category.icon}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground group-hover:text-blue-600 transition-colors duration-300">{category.name}</p>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    {getTypeName(category.type)}
                                  </Badge>
                                </div>
                              </div>
                              {!category.is_default && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  disabled={deleteCategoryMutation.isPending}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
          
          {/* Banner de Anúncios - apenas para contas gratuitas */}
          {!isPremium && (
            <div className="border-t border-border/30 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
              <AdBanner refreshInterval={45} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManager;