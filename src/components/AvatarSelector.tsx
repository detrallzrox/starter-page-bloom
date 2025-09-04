import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarSelected: (avatarId: string) => void;
}

const AVATARS = [
  // Animais Domésticos e Fazenda
  { id: 'pig', name: 'Porquinho', emoji: '🐷', color: '#FFD700' },
  { id: 'cat', name: 'Gatinho', emoji: '🐱', color: '#FF8C42' },
  { id: 'dog', name: 'Cachorrinho', emoji: '🐶', color: '#8B4513' },
  { id: 'chicken', name: 'Pintinho', emoji: '🐥', color: '#FFD700' },
  { id: 'cow', name: 'Vaquinha', emoji: '🐄', color: '#FFFFFF' },
  { id: 'sheep', name: 'Ovelhinha', emoji: '🐑', color: '#FFFFFF' },
  { id: 'rabbit', name: 'Coelhinho', emoji: '🐰', color: '#FFFFFF' },
  { id: 'horse', name: 'Cavalinho', emoji: '🐴', color: '#8B4513' },
  { id: 'duck', name: 'Patinho', emoji: '🦆', color: '#FFD700' },
  { id: 'goat', name: 'Cabrinha', emoji: '🐐', color: '#FFFFFF' },
  
  // Animais Selvagens
  { id: 'lion', name: 'Leão', emoji: '🦁', color: '#FFA500' },
  { id: 'tiger', name: 'Tigre', emoji: '🐯', color: '#FF8C00' },
  { id: 'elephant', name: 'Elefante', emoji: '🐘', color: '#708090' },
  { id: 'giraffe', name: 'Girafa', emoji: '🦒', color: '#FFD700' },
  { id: 'zebra', name: 'Zebra', emoji: '🦓', color: '#000000' },
  { id: 'bear', name: 'Ursinho', emoji: '🐻', color: '#8B4513' },
  { id: 'fox', name: 'Raposa', emoji: '🦊', color: '#FF6B35' },
  { id: 'wolf', name: 'Lobo', emoji: '🐺', color: '#696969' },
  { id: 'panda', name: 'Panda', emoji: '🐼', color: '#000000' },
  { id: 'koala', name: 'Coala', emoji: '🐨', color: '#808080' },
  
  { id: 'gorilla', name: 'Gorila', emoji: '🦍', color: '#2F4F4F' },
  { id: 'rhino', name: 'Rinoceronte', emoji: '🦏', color: '#696969' },
  { id: 'hippo', name: 'Hipopótamo', emoji: '🦛', color: '#708090' },
  
  // Aves
  { id: 'owl', name: 'Coruja', emoji: '🦉', color: '#4A90E2' },
  { id: 'penguin', name: 'Pinguim', emoji: '🐧', color: '#000000' },
  { id: 'eagle', name: 'Águia', emoji: '🦅', color: '#8B4513' },
  { id: 'parrot', name: 'Papagaio', emoji: '🦜', color: '#228B22' },
  { id: 'flamingo', name: 'Flamingo', emoji: '🦩', color: '#FF69B4' },
  { id: 'peacock', name: 'Pavão', emoji: '🦚', color: '#4169E1' },
  { id: 'swan', name: 'Cisne', emoji: '🦢', color: '#FFFFFF' },
  { id: 'turkey', name: 'Peru', emoji: '🦃', color: '#8B4513' },
  
  // Animais Aquáticos
  { id: 'frog', name: 'Sapo', emoji: '🐸', color: '#00FF00' },
  { id: 'turtle', name: 'Tartaruga', emoji: '🐢', color: '#228B22' },
  { id: 'fish', name: 'Peixe', emoji: '🐟', color: '#00BFFF' },
  { id: 'dolphin', name: 'Golfinho', emoji: '🐬', color: '#00BFFF' },
  { id: 'whale', name: 'Baleia', emoji: '🐳', color: '#4169E1' },
  { id: 'shark', name: 'Tubarão', emoji: '🦈', color: '#708090' },
  { id: 'octopus', name: 'Polvo', emoji: '🐙', color: '#9370DB' },
  { id: 'crab', name: 'Caranguejo', emoji: '🦀', color: '#FF4500' },
  { id: 'lobster', name: 'Lagosta', emoji: '🦞', color: '#DC143C' },
  { id: 'shrimp', name: 'Camarão', emoji: '🦐', color: '#FFA500' },
  
  // Insetos e Pequenos Animais
  { id: 'butterfly', name: 'Borboleta', emoji: '🦋', color: '#9370DB' },
  { id: 'bee', name: 'Abelha', emoji: '🐝', color: '#FFD700' },
  { id: 'ladybug', name: 'Joaninha', emoji: '🐞', color: '#DC143C' },
  { id: 'spider', name: 'Aranha', emoji: '🕷️', color: '#2F4F4F' },
  { id: 'snail', name: 'Caracol', emoji: '🐌', color: '#8B4513' },
  { id: 'ant', name: 'Formiga', emoji: '🐜', color: '#2F4F4F' },
  { id: 'cricket', name: 'Grilo', emoji: '🦗', color: '#228B22' },
  
  // Pessoas e Diversidade
  { id: 'man', name: 'Homem', emoji: '👨', color: '#F4C2A1' },
  { id: 'woman', name: 'Mulher', emoji: '👩', color: '#F4C2A1' },
  { id: 'boy', name: 'Menino', emoji: '👦', color: '#F4C2A1' },
  { id: 'girl', name: 'Menina', emoji: '👧', color: '#F4C2A1' },
  { id: 'baby', name: 'Bebê', emoji: '👶', color: '#FFB6C1' },
  { id: 'grandpa', name: 'Vovô', emoji: '👴', color: '#F4C2A1' },
  { id: 'grandma', name: 'Vovó', emoji: '👵', color: '#F4C2A1' },
  { id: 'princess', name: 'Princesa', emoji: '👸', color: '#FFB6C1' },
  { id: 'prince', name: 'Príncipe', emoji: '🤴', color: '#4169E1' },
  
  // Profissões
  { id: 'doctor', name: 'Médico', emoji: '👨‍⚕️', color: '#FFFFFF' },
  { id: 'teacher', name: 'Professor', emoji: '👨‍🏫', color: '#4A90E2' },
  { id: 'chef', name: 'Chef', emoji: '👨‍🍳', color: '#FFFFFF' },
  { id: 'artist', name: 'Artista', emoji: '👨‍🎨', color: '#9B59B6' },
  { id: 'scientist', name: 'Cientista', emoji: '👨‍🔬', color: '#FFFFFF' },
  { id: 'pilot', name: 'Piloto', emoji: '👨‍✈️', color: '#4A90E2' },
  { id: 'firefighter', name: 'Bombeiro', emoji: '👨‍🚒', color: '#FF0000' },
  { id: 'police', name: 'Policial', emoji: '👮', color: '#0000FF' },
  { id: 'mechanic', name: 'Mecânico', emoji: '👨‍🔧', color: '#696969' },
  { id: 'farmer', name: 'Fazendeiro', emoji: '👨‍🌾', color: '#228B22' },
  { id: 'singer', name: 'Cantor', emoji: '👨‍🎤', color: '#9370DB' },
  { id: 'dancer', name: 'Dançarino', emoji: '🕺', color: '#FF69B4' },
  { id: 'judge', name: 'Juiz', emoji: '👨‍⚖️', color: '#2F4F4F' },
  { id: 'detective', name: 'Detetive', emoji: '🕵️', color: '#8B4513' },
  { id: 'construction', name: 'Construtor', emoji: '👷', color: '#FFA500' },
  { id: 'guard', name: 'Guarda', emoji: '💂', color: '#DC143C' },
  
  // Comidas Doces
  { id: 'cake', name: 'Bolo', emoji: '🎂', color: '#FFB6C1' },
  { id: 'donut', name: 'Rosquinha', emoji: '🍩', color: '#FFD700' },
  { id: 'cookie', name: 'Biscoito', emoji: '🍪', color: '#D2691E' },
  { id: 'candy', name: 'Doce', emoji: '🍬', color: '#FF69B4' },
  { id: 'lollipop', name: 'Pirulito', emoji: '🍭', color: '#FF1493' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', color: '#8B4513' },
  { id: 'icecream', name: 'Sorvete', emoji: '🍦', color: '#FFB6C1' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', color: '#FFB6C1' },
  { id: 'honey', name: 'Mel', emoji: '🍯', color: '#FFD700' },
  
  // Comidas Salgadas
  { id: 'pizza', name: 'Pizza', emoji: '🍕', color: '#FF6347' },
  { id: 'burger', name: 'Hambúrguer', emoji: '🍔', color: '#8B4513' },
  { id: 'hotdog', name: 'Cachorro-quente', emoji: '🌭', color: '#DC143C' },
  { id: 'fries', name: 'Batata Frita', emoji: '🍟', color: '#FFD700' },
  { id: 'taco', name: 'Taco', emoji: '🌮', color: '#D2691E' },
  { id: 'sandwich', name: 'Sanduíche', emoji: '🥪', color: '#D2691E' },
  { id: 'pretzel', name: 'Pretzel', emoji: '🥨', color: '#8B4513' },
  { id: 'popcorn', name: 'Pipoca', emoji: '🍿', color: '#FFFF00' },
  
  // Frutas
  { id: 'apple', name: 'Maçã', emoji: '🍎', color: '#FF0000' },
  { id: 'banana', name: 'Banana', emoji: '🍌', color: '#FFD700' },
  { id: 'strawberry', name: 'Morango', emoji: '🍓', color: '#FF69B4' },
  { id: 'orange', name: 'Laranja', emoji: '🍊', color: '#FFA500' },
  { id: 'grape', name: 'Uva', emoji: '🍇', color: '#9370DB' },
  { id: 'watermelon', name: 'Melancia', emoji: '🍉', color: '#228B22' },
  { id: 'pineapple', name: 'Abacaxi', emoji: '🍍', color: '#FFD700' },
  { id: 'cherry', name: 'Cereja', emoji: '🍒', color: '#DC143C' },
  { id: 'peach', name: 'Pêssego', emoji: '🍑', color: '#FFCCCB' },
  { id: 'coconut', name: 'Coco', emoji: '🥥', color: '#8B4513' },
  { id: 'avocado', name: 'Abacate', emoji: '🥑', color: '#228B22' },
  { id: 'lemon', name: 'Limão', emoji: '🍋', color: '#FFFF00' },
  
  // Bebidas
  { id: 'coffee', name: 'Café', emoji: '☕', color: '#8B4513' },
  { id: 'tea', name: 'Chá', emoji: '🍵', color: '#228B22' },
  { id: 'juice', name: 'Suco', emoji: '🧃', color: '#FFA500' },
  { id: 'milk', name: 'Leite', emoji: '🥛', color: '#FFFFFF' },
  { id: 'cocktail', name: 'Coquetel', emoji: '🍹', color: '#FF69B4' },
  { id: 'beer', name: 'Cerveja', emoji: '🍺', color: '#FFD700' },
  { id: 'wine', name: 'Vinho', emoji: '🍷', color: '#8B0000' },
  
  // Esportes e Atividades
  { id: 'soccer', name: 'Futebol', emoji: '⚽', color: '#000000' },
  { id: 'basketball', name: 'Basquete', emoji: '🏀', color: '#FF8C00' },
  { id: 'tennis', name: 'Tênis', emoji: '🎾', color: '#FFFF00' },
  { id: 'volleyball', name: 'Vôlei', emoji: '🏐', color: '#4169E1' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾', color: '#FFFFFF' },
  { id: 'football', name: 'Futebol Americano', emoji: '🏈', color: '#8B4513' },
  { id: 'rugby', name: 'Rugby', emoji: '🏉', color: '#8B4513' },
  { id: 'golf', name: 'Golfe', emoji: '⛳', color: '#228B22' },
  { id: 'bowling', name: 'Boliche', emoji: '🎳', color: '#FF0000' },
  { id: 'pingpong', name: 'Ping Pong', emoji: '🏓', color: '#FF6347' },
  { id: 'badminton', name: 'Badminton', emoji: '🏸', color: '#FFFF00' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒', color: '#2F4F4F' },
  { id: 'swimming', name: 'Natação', emoji: '🏊', color: '#00BFFF' },
  { id: 'surfing', name: 'Surf', emoji: '🏄', color: '#00BFFF' },
  { id: 'skiing', name: 'Esqui', emoji: '⛷️', color: '#87CEEB' },
  { id: 'cycling', name: 'Ciclismo', emoji: '🚴', color: '#FFD700' },
  { id: 'running', name: 'Corrida', emoji: '🏃', color: '#FF69B4' },
  { id: 'boxing', name: 'Boxe', emoji: '🥊', color: '#DC143C' },
  { id: 'weightlifting', name: 'Musculação', emoji: '🏋️', color: '#2F4F4F' },
  
  // Natureza - Celestial
  { id: 'sun', name: 'Sol', emoji: '☀️', color: '#FFD700' },
  { id: 'moon', name: 'Lua', emoji: '🌙', color: '#C0C0C0' },
  { id: 'star', name: 'Estrela', emoji: '⭐', color: '#FFD700' },
  { id: 'comet', name: 'Cometa', emoji: '☄️', color: '#FF4500' },
  { id: 'earth', name: 'Terra', emoji: '🌍', color: '#4169E1' },
  { id: 'saturn', name: 'Saturno', emoji: '🪐', color: '#D2691E' },
  
  // Natureza - Plantas
  { id: 'flower', name: 'Flor', emoji: '🌸', color: '#FFB6C1' },
  { id: 'rose', name: 'Rosa', emoji: '🌹', color: '#DC143C' },
  { id: 'tulip', name: 'Tulipa', emoji: '🌷', color: '#FF69B4' },
  { id: 'sunflower', name: 'Girassol', emoji: '🌻', color: '#FFD700' },
  { id: 'tree', name: 'Árvore', emoji: '🌳', color: '#228B22' },
  { id: 'cactus', name: 'Cacto', emoji: '🌵', color: '#228B22' },
  { id: 'mushroom', name: 'Cogumelo', emoji: '🍄', color: '#DC143C' },
  { id: 'clover', name: 'Trevo', emoji: '🍀', color: '#228B22' },
  
  // Natureza - Paisagens
  { id: 'mountain', name: 'Montanha', emoji: '🏔️', color: '#708090' },
  { id: 'volcano', name: 'Vulcão', emoji: '🌋', color: '#DC143C' },
  { id: 'beach', name: 'Praia', emoji: '🏖️', color: '#F4A460' },
  { id: 'desert', name: 'Deserto', emoji: '🏜️', color: '#D2691E' },
  { id: 'rainbow', name: 'Arco-íris', emoji: '🌈', color: '#FF69B4' },
  { id: 'ocean', name: 'Oceano', emoji: '🌊', color: '#00BFFF' },
  { id: 'cloud', name: 'Nuvem', emoji: '☁️', color: '#C0C0C0' },
  { id: 'lightning', name: 'Raio', emoji: '⚡', color: '#FFD700' },
  { id: 'tornado', name: 'Tornado', emoji: '🌪️', color: '#708090' },
  { id: 'snowflake', name: 'Floco de Neve', emoji: '❄️', color: '#87CEEB' },
  
  // Transporte
  { id: 'car', name: 'Carro', emoji: '🚗', color: '#FF0000' },
  { id: 'truck', name: 'Caminhão', emoji: '🚚', color: '#4169E1' },
  { id: 'bus', name: 'Ônibus', emoji: '🚌', color: '#FFD700' },
  { id: 'taxi', name: 'Táxi', emoji: '🚕', color: '#FFD700' },
  { id: 'motorcycle', name: 'Moto', emoji: '🏍️', color: '#DC143C' },
  { id: 'bicycle', name: 'Bicicleta', emoji: '🚲', color: '#228B22' },
  { id: 'scooter', name: 'Patinete', emoji: '🛴', color: '#FF69B4' },
  { id: 'train', name: 'Trem', emoji: '🚆', color: '#4169E1' },
  { id: 'metro', name: 'Metrô', emoji: '🚇', color: '#2F4F4F' },
  { id: 'plane', name: 'Avião', emoji: '✈️', color: '#C0C0C0' },
  { id: 'helicopter', name: 'Helicóptero', emoji: '🚁', color: '#228B22' },
  { id: 'ship', name: 'Navio', emoji: '🚢', color: '#4169E1' },
  { id: 'boat', name: 'Barco', emoji: '⛵', color: '#FFFFFF' },
  { id: 'submarine', name: 'Submarino', emoji: '🚤', color: '#2F4F4F' },
  { id: 'rocket', name: 'Foguete', emoji: '🚀', color: '#FF0000' },
  
  // Tecnologia e Objetos
  { id: 'computer', name: 'Computador', emoji: '💻', color: '#708090' },
  { id: 'phone', name: 'Telefone', emoji: '📱', color: '#2F4F4F' },
  { id: 'camera', name: 'Câmera', emoji: '📷', color: '#000000' },
  { id: 'headphones', name: 'Fones', emoji: '🎧', color: '#2F4F4F' },
  { id: 'microphone', name: 'Microfone', emoji: '🎤', color: '#C0C0C0' },
  { id: 'television', name: 'Televisão', emoji: '📺', color: '#2F4F4F' },
  { id: 'radio', name: 'Rádio', emoji: '📻', color: '#8B4513' },
  { id: 'gamepad', name: 'Controle', emoji: '🎮', color: '#4169E1' },
  { id: 'joystick', name: 'Joystick', emoji: '🕹️', color: '#DC143C' },
  { id: 'battery', name: 'Bateria', emoji: '🔋', color: '#228B22' },
  { id: 'lightbulb', name: 'Lâmpada', emoji: '💡', color: '#FFD700' },
  { id: 'flashlight', name: 'Lanterna', emoji: '🔦', color: '#FFD700' },
  
  // Instrumentos Musicais
  { id: 'guitar', name: 'Violão', emoji: '🎸', color: '#8B4513' },
  { id: 'piano', name: 'Piano', emoji: '🎹', color: '#000000' },
  { id: 'drums', name: 'Bateria', emoji: '🥁', color: '#8B4513' },
  { id: 'trumpet', name: 'Trompete', emoji: '🎺', color: '#FFD700' },
  { id: 'violin', name: 'Violino', emoji: '🎻', color: '#8B4513' },
  { id: 'saxophone', name: 'Saxofone', emoji: '🎷', color: '#FFD700' },
  { id: 'music', name: 'Música', emoji: '🎵', color: '#9B59B6' },
  
  // Símbolos e Emoções
  { id: 'heart', name: 'Coração', emoji: '❤️', color: '#FF0000' },
  { id: 'diamond', name: 'Diamante', emoji: '💎', color: '#00BFFF' },
  { id: 'crown', name: 'Coroa', emoji: '👑', color: '#FFD700' },
  { id: 'gem', name: 'Gema', emoji: '💍', color: '#FFD700' },
  { id: 'trophy', name: 'Troféu', emoji: '🏆', color: '#FFD700' },
  { id: 'medal', name: 'Medalha', emoji: '🏅', color: '#FFD700' },
  { id: 'gift', name: 'Presente', emoji: '🎁', color: '#DC143C' },
  { id: 'balloon', name: 'Balão', emoji: '🎈', color: '#FF69B4' },
  { id: 'party', name: 'Festa', emoji: '🎉', color: '#FFD700' },
  { id: 'fireworks', name: 'Fogos', emoji: '🎆', color: '#FF69B4' },
  { id: 'confetti', name: 'Confete', emoji: '🎊', color: '#FF69B4' },
  { id: 'magic', name: 'Mágica', emoji: '✨', color: '#FFD700' },
  { id: 'fire', name: 'Fogo', emoji: '🔥', color: '#FF4500' },
  { id: 'bomb', name: 'Bomba', emoji: '💣', color: '#2F4F4F' },
  
  // Livros e Educação
  { id: 'book', name: 'Livro', emoji: '📚', color: '#8B4513' },
  { id: 'notebook', name: 'Caderno', emoji: '📓', color: '#FF69B4' },
  { id: 'pencil', name: 'Lápis', emoji: '✏️', color: '#FFD700' },
  { id: 'pen', name: 'Caneta', emoji: '🖊️', color: '#4169E1' },
  { id: 'graduate', name: 'Formatura', emoji: '🎓', color: '#2F4F4F' },
  { id: 'school', name: 'Escola', emoji: '🏫', color: '#DC143C' },
  { id: 'backpack', name: 'Mochila', emoji: '🎒', color: '#228B22' },
  
  // Fantasia e Diversão
  { id: 'unicorn', name: 'Unicórnio', emoji: '🦄', color: '#FFB6C1' },
  { id: 'dragon', name: 'Dragão', emoji: '🐉', color: '#228B22' },
  { id: 'fairy', name: 'Fada', emoji: '🧚', color: '#FFB6C1' },
  { id: 'wizard', name: 'Mago', emoji: '🧙', color: '#9370DB' },
  { id: 'genie', name: 'Gênio', emoji: '🧞', color: '#4169E1' },
  { id: 'vampire', name: 'Vampiro', emoji: '🧛', color: '#8B0000' },
  { id: 'zombie', name: 'Zumbi', emoji: '🧟', color: '#228B22' },
  { id: 'ghost', name: 'Fantasma', emoji: '👻', color: '#FFFFFF' },
  { id: 'robot', name: 'Robô', emoji: '🤖', color: '#C0C0C0' },
  { id: 'alien', name: 'Alien', emoji: '👽', color: '#00FF00' },
  { id: 'monster', name: 'Monstro', emoji: '👹', color: '#DC143C' },
  { id: 'demon', name: 'Demônio', emoji: '👺', color: '#8B0000' },
  { id: 'ogre', name: 'Ogro', emoji: '👹', color: '#228B22' },
  
  // Profissões Especiais
  { id: 'superhero', name: 'Super-herói', emoji: '🦸', color: '#DC143C' },
  { id: 'villain', name: 'Vilão', emoji: '🦹', color: '#2F4F4F' },
  { id: 'pirate', name: 'Pirata', emoji: '🏴‍☠️', color: '#2F4F4F' },
  { id: 'cowboy', name: 'Cowboy', emoji: '🤠', color: '#8B4513' },
  { id: 'knight', name: 'Cavaleiro', emoji: '⚔️', color: '#C0C0C0' },
  { id: 'samurai', name: 'Samurai', emoji: '🗾', color: '#DC143C' },
  
  // Tempo e Clima
  { id: 'thermometer', name: 'Termômetro', emoji: '🌡️', color: '#FF0000' },
  { id: 'umbrella', name: 'Guarda-chuva', emoji: '☂️', color: '#4169E1' },
  { id: 'snowman', name: 'Boneco de Neve', emoji: '☃️', color: '#FFFFFF' },
  { id: 'hourglass', name: 'Ampulheta', emoji: '⏳', color: '#D2691E' },
  { id: 'clock', name: 'Relógio', emoji: '🕐', color: '#2F4F4F' },
  { id: 'watch', name: 'Relógio de Pulso', emoji: '⌚', color: '#2F4F4F' },
  { id: 'calendar', name: 'Calendário', emoji: '📅', color: '#DC143C' },
];

const AVATARS_PER_ROW = 4;

export const AvatarSelector = ({ isOpen, onClose, onAvatarSelected }: AvatarSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar || !user) return;

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar: selectedAvatar }
      });

      if (error) throw error;

      // Aguardar um pouco para garantir que os dados foram atualizados
      setTimeout(() => {
        onAvatarSelected(selectedAvatar);
        toast({
          title: "Avatar atualizado!",
          description: "Seu avatar foi alterado com sucesso",
        });
        onClose();
        setIsUpdating(false);
      }, 500);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avatar",
        description: error.message,
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu Avatar</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um avatar divertido para representar você
          </p>
          
          <div className={`grid grid-cols-${AVATARS_PER_ROW} gap-3 p-4 max-h-96 overflow-y-auto`}>
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar.id)}
                className={`relative p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedAvatar === avatar.id 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-white shadow-md"
                    style={{ backgroundColor: `${avatar.color}20` }}
                  >
                    {avatar.emoji}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight px-1">
                    {avatar.name}
                  </span>
                </div>
                
                {selectedAvatar === avatar.id && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAvatar} 
              disabled={!selectedAvatar || isUpdating}
              className="flex-1"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Avatar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};