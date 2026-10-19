// Plantillas por edición. Las listas son datos iniciales editables (fuente: PDF de investigación del usuario).
// 'flag' / 'logo' son opcionales: sin imagen la UI muestra una insignia neutral.
const L = s => s.split('|');
export const TEMPLATES = [
 {id:'eurocopa',name:'Eurocopa',edition:'UEFA Euro 2024',icon:'🏆',pool:L('Alemania|Escocia|Hungría|Suiza|España|Croacia|Italia|Albania|Eslovenia|Dinamarca|Serbia|Inglaterra|Polonia|Países Bajos|Austria|Francia|Bélgica|Eslovaquia|Rumanía|Ucrania|Turquía|Georgia|Portugal|Chequia')},
 {id:'mundial-clubes',name:'Mundial de Clubes',edition:'FIFA 2025 · 32 clubes',icon:'🌍',pool:L('Al Ahly|Al Ain|Al Hilal|Atlético de Madrid|Auckland City|Bayern Múnich|Benfica|Boca Juniors|Borussia Dortmund|Botafogo|Chelsea|Espérance de Túnez|Flamengo|Red Bull Salzburgo|Fluminense|Inter de Milán|Inter Miami|Juventus|Los Angeles FC|Manchester City|Mamelodi Sundowns|Monterrey|Paris Saint-Germain|Pachuca|Palmeiras|Porto|Real Madrid|River Plate|Seattle Sounders|Ulsan HD|Urawa Red Diamonds|Wydad AC')},
 {id:'mundial-selecciones',name:'Copa Mundial FIFA',edition:'FIFA 2026 · 48 selecciones',icon:'⚽',pool:L('Alemania|Arabia Saudita|Argelia|Argentina|Australia|Austria|Bélgica|Bosnia y Herzegovina|Brasil|Cabo Verde|Canadá|Catar|Chequia|Colombia|Corea del Sur|Costa de Marfil|Croacia|Curaçao|Ecuador|Egipto|Escocia|España|Estados Unidos|Francia|Ghana|Haití|Países Bajos|Inglaterra|Irán|Irak|Japón|Jordania|Marruecos|México|Nueva Zelanda|Noruega|Panamá|Paraguay|Portugal|RD del Congo|Senegal|Sudáfrica|Suecia|Suiza|Túnez|Turquía|Uruguay|Uzbekistán')},
 {id:'copa-america',name:'Copa América',edition:'Estados Unidos 2024',icon:'🌎',pool:L('Argentina|Bolivia|Brasil|Canadá|Chile|Colombia|Costa Rica|Ecuador|Estados Unidos|Jamaica|México|Panamá|Paraguay|Perú|Uruguay|Venezuela')},
 {id:'champions',name:'UEFA Champions League',edition:'2025/26 · fase liga 36',icon:'⭐',pool:L('Ajax|Arsenal|Atalanta|Athletic Club|Atlético de Madrid|Barcelona|Bayern Múnich|Benfica|Bodø/Glimt|Borussia Dortmund|Chelsea|Club Brugge|Copenhague|Eintracht Frankfurt|Galatasaray|Inter de Milán|Juventus|Kairat Almaty|Bayer Leverkusen|Liverpool|Manchester City|Marsella|Mónaco|Napoli|Newcastle United|Olympiacos|Pafos|Paris Saint-Germain|PSV Eindhoven|Qarabağ|Real Madrid|Slavia Praga|Sporting CP|Tottenham Hotspur|Union Saint-Gilloise|Villarreal')},
];
// El formato del Excel exige 32 equipos: si el pool es mayor se sortean 32; si es menor se completan con "Por definir N" (editables; el sistema advierte).
export function buildTeams(tpl, rng = Math.random){
  let p=[...tpl.pool];
  if(p.length>32){p=p.map(x=>[rng(),x]).sort((a,b)=>a[0]-b[0]).slice(0,32).map(x=>x[1]);}
  for(let i=1;p.length<32;i++)p.push('Por definir '+i);
  return p.map(name=>({name,flag:'',logo:''}));
}
