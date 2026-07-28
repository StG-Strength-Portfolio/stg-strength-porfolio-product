// Vahvuusmittari — 26 strengths, two statements each.
// Content quoted verbatim from the workbook "Vahvuusportfolio lukiolaiselle"
// (Vahvuusmittari, PDF pages 1–30). Order matches the workbook exactly.
// `reversed: true` marks statements where the workbook prints the scale 5→1
// (a higher self-rating means a LOWER score for that strength).

export type Virtue =
  | "Viisaus ja tieto"
  | "Rohkeus"
  | "Inhimillisyys"
  | "Oikeudenmukaisuus"
  | "Kohtuullisuus"
  | "Henkisyys";

export interface MeterStatement {
  text: string;
  reversed?: boolean;
}

export interface MeterStrength {
  id: string;            // stable registry id
  meterFieldId?: string; // alias used for DB field keys when it differs from id
  name: string;          // display name
  virtue: Virtue;
  statements: [MeterStatement, MeterStatement];
}

export const METER_STRENGTHS: MeterStrength[] = [
  {
    id: "luovuus", name: "Luovuus", virtue: "Viisaus ja tieto",
    statements: [
      { text: "”Saan usein kuulla toisilta, että keksin omaperäisiä ideoita.”" },
      { text: "”Haluan tehdä asiat aina samalla, tutulla tavalla.”", reversed: true },
    ],
  },
  {
    id: "uteliaisuus", name: "Uteliaisuus", virtue: "Viisaus ja tieto",
    statements: [
      { text: "”Uteliaisuuteni pursuaa monille elämänaloille, kuten opiskeluun, matkusteluun ja uusiin ihmisiin tutustumiseen.”" },
      { text: "”Haluan jatkuvasti oppia uutta ja olen laajalti kiinnostunut asioista, ihmisistä, ilmiöistä.”" },
    ],
  },
  {
    id: "arviointikyky", name: "Arviointikyky", virtue: "Viisaus ja tieto",
    statements: [
      { text: "”Osaan ajatella järkevästi erilaisissa tilanteissa ja harkita eri vaihtoehtoja.”" },
      { text: "”Teen päätöksiä vasta kun tiedän asiasta kaiken.”" },
    ],
  },
  {
    id: "oppimisen_ilo", name: "Oppimisen ilo", virtue: "Viisaus ja tieto",
    statements: [
      { text: "”Olen kiinnostunut lukuisista asioista ja haluan jatkuvasti oppia uutta.”" },
      { text: "”Vierailen mielelläni kirjastossa, luen paljon tai seuraan eri uutiskanavia.”" },
    ],
  },
  {
    id: "nakokulmanottokyky", name: "Näkökulmanottokyky", virtue: "Viisaus ja tieto",
    statements: [
      { text: "”Kykenen punnitsemaan eri vaihtoehtoja ja vaihtamaan tapaani ajatella.”" },
      { text: "”Minulta pyydetään usein neuvoja ja koen että mielipiteitäni arvostetaan.”" },
    ],
  },
  {
    id: "rohkeus", name: "Rohkeus", virtue: "Rohkeus",
    statements: [
      { text: "”Puolustan mielipidettäni ja uskallan kertoa, mitä ajattelen, vaikka kohtaisin jyrkkääkin vastustusta.”" },
      { text: "”Uudet asiat ja tilanteet rajoittavat usein tekemisiäni.”", reversed: true },
    ],
  },
  {
    id: "sinnikkyys", name: "Sinnikkyys", virtue: "Rohkeus",
    statements: [
      { text: "”Jos päätän jotain, teen sen, vaikka haasteita ja vastoinkäymisiä ilmenisi.”" },
      { text: "”En pysy asettamissani tavoitteissa ja vastoinkäymiset saavat minut luovuttamaan herkästi.”", reversed: true },
    ],
  },
  {
    id: "rehellisyys", name: "Rehellisyys", virtue: "Rohkeus",
    statements: [
      { text: "”Puhun kaunistelematta sen puolesta, mikä on mielestäni oikein ja totta.”" },
      { text: "”Saatan joissakin tilanteissa/usein ajatella tai käyttäytyä toisin kuin tavallisesti, jotta minut hyväksytään.”", reversed: true },
    ],
  },
  {
    id: "innokkuus", name: "Innokkuus", virtue: "Rohkeus",
    statements: [
      { text: "”Ystäväni kuvailisivat minua energiseksi, tarmokkaaksi ja hyväntuuliseksi.”" },
      { text: "”Olen passiivinen enkä innostu helposti uusista asioista ja ihmistä.”", reversed: true },
    ],
  },
  {
    id: "sisu", meterFieldId: "sisukkuus", name: "Sisukkuus", virtue: "Rohkeus",
    statements: [
      { text: "”Teen mitä tehdä pitää, vaikka vastoinkäymisiä ilmenisi.”" },
      { text: "”Pystyn tarvittaessa parantamaan suoritustani ja ponnistelemaan vielä tehokkaammin.”" },
    ],
  },
  {
    id: "myotatunto", name: "Myötätunto", virtue: "Inhimillisyys",
    statements: [
      { text: "”Kun tiedän, että jollain ihmisellä on vaikea tilanne, koen paljon myötätuntoa häntä kohtaan.”" },
      { text: "”Yksi elämääni eniten merkitystä tuovista asioista on muiden ihmisten auttaminen.”" },
    ],
  },
  {
    id: "rakkaus", name: "Rakkaus", virtue: "Inhimillisyys",
    statements: [
      { text: "”Osoitan läheisilleni välittämistäni sanoin, teoin ja viettämällä paljon aikaa heidän kanssaan.”" },
      { text: "”Minun on vaikea ottaa vastaan toisten osoittamaa läheisyyttä ja rakkautta.”", reversed: true },
    ],
  },
  {
    id: "ystavallisyys", name: "Ystävällisyys", virtue: "Inhimillisyys",
    statements: [
      { text: "”Olen mielelläni avuksi tai hyödyksi.”" },
      { text: "”Tunnen, että ’toisten onni on minulta pois’ enkä osaa iloita toisen onnistumisista.”", reversed: true },
    ],
  },
  {
    id: "sosiaalinen_alykkyys", name: "Sosiaalinen älykkyys", virtue: "Inhimillisyys",
    statements: [
      { text: "”Pärjään hyvin erilaisissa sosiaalisissa tilanteissa ja uusien ihmisten parissa.”" },
      { text: "”Minun on vaikea tunnistaa muiden ihmisten tunnetiloja.”", reversed: true },
    ],
  },
  {
    id: "ryhmatyotaito", name: "Ryhmätyötaidot", virtue: "Oikeudenmukaisuus",
    statements: [
      { text: "”Parhaat puoleni pääsevät käyttöön ryhmässä, ja minua motivoi ryhmän onnistuminen.”" },
      { text: "”En ota mielelläni vastuuta ryhmän jäsenenä ja olen mieluummin hieman passiivinen.”", reversed: true },
    ],
  },
  {
    id: "reiluus", name: "Reiluus", virtue: "Oikeudenmukaisuus",
    statements: [
      { text: "”Minulle on tärkeää kohdella kaikkia tasapuolisesti.”" },
      { text: "”Ennakkoluuloni ja tunteeni vaikuttavat siihen, miten kohtelen toisia ihmisiä.”", reversed: true },
    ],
  },
  {
    id: "johtajuus", name: "Johtajuus", virtue: "Oikeudenmukaisuus",
    statements: [
      { text: "”Minua voisi kuvailla vahvaksi ja reiluksi johtajaksi.”" },
      { text: "”En saa kovin helposti toisia innostettua mukaan yhteiseen tekemiseen.”", reversed: true },
    ],
  },
  {
    id: "anteeksiantavuus", name: "Anteeksiantavuus", virtue: "Kohtuullisuus",
    statements: [
      { text: "”En kaivele menneitä vaan minun on helppo irrottautua niistä ja mennä elämässä eteenpäin.”" },
      { text: "”Muistan selkeästi aiemmin kokemani vääryydet.”", reversed: true },
    ],
  },
  {
    id: "vaatimattomuus", name: "Vaatimattomuus", virtue: "Kohtuullisuus",
    statements: [
      { text: "”En tee itsestäni numeroa missään tilanteissa ja pitäydyn mielelläni taustalla.”" },
      { text: "”Ystäväni kuvailisivat minua vaatimattomaksi.”" },
    ],
  },
  {
    id: "harkitsevuus", name: "Harkitsevuus", virtue: "Kohtuullisuus",
    statements: [
      { text: "”Teen aina harkittuja päätöksiä.”" },
      { text: "”Olen spontaani ja elän hetkessä.”", reversed: true },
    ],
  },
  {
    id: "itsesaately", name: "Itsesäätely", virtue: "Kohtuullisuus",
    statements: [
      { text: "”Pystyn säätelemään tunteitani ja käytöstäni tilanteisiin sopivaksi.”" },
      { text: "”Minun on vaikea vastustaa turhaa tekemistä, vaikka olisin niin päättänyt (esimerkiksi kännykän jatkuva näpelöinti).”", reversed: true },
    ],
  },
  {
    id: "kauneuden_arvostaminen", meterFieldId: "kauneuden_arvostus", name: "Kauneuden ja erinomaisuuden arvostus", virtue: "Henkisyys",
    statements: [
      { text: "”Huomaan kauniita yksityiskohtia ja pysähdyn usein niiden äärellä.”" },
      { text: "”Pysähdyn harvoin taiteen tai ympäristön kauneuden äärelle, enkä kiinnitä usein huomiotani yksityiskohtiin.”", reversed: true },
    ],
  },
  {
    id: "kiitollisuus", name: "Kiitollisuus", virtue: "Henkisyys",
    statements: [
      { text: "”En juurikaan koe kiitollisuutta elämän pienistä asioista.”", reversed: true },
      { text: "”Perheeni kertoisi, että kiitän usein ja olen vilpittömästi kiitollinen.”" },
    ],
  },
  {
    id: "toiveikkuus", name: "Toiveikkuus", virtue: "Henkisyys",
    statements: [
      { text: "”Minun on helppoa nähdä asioissa niiden hyvät puolet ja näen tulevaisuuden myönteisenä.”" },
      { text: "”Minun on vaikea nähdä ulospääsyä vastoinkäymisistä.”", reversed: true },
    ],
  },
  {
    id: "huumorintaju", name: "Huumorintaju", virtue: "Henkisyys",
    statements: [
      { text: "”Löydän vaikeistakin elämäntilanteista huumoria ja pieniä ilon pilkahduksia.”" },
      { text: "”Kerron mielelläni vitsejä ja saan muut nauramaan / iloitsemaan.”" },
    ],
  },
  {
    id: "hengellisyys", name: "Hengellisyys", virtue: "Henkisyys",
    statements: [
      { text: "”Ajattelen, että elämällä on jokin syvempi tarkoitus.”" },
      { text: "”En juuri koskaan mieti elämän suurempiin merkityksiin liittyviä asioita.”", reversed: true },
    ],
  },
];

export const VIRTUES: Virtue[] = [
  "Viisaus ja tieto",
  "Rohkeus",
  "Inhimillisyys",
  "Oikeudenmukaisuus",
  "Kohtuullisuus",
  "Henkisyys",
];

export function strengthsByVirtue(v: Virtue): MeterStrength[] {
  return METER_STRENGTHS.filter((s) => s.virtue === v);
}

// Screen 77 = intro, 78..103 = 26 strengths, 104 = yhteenveto, 105 = pohdinta, 106 = top 5/3
export const METER_FIRST_SCREEN = 77;
export const METER_STRENGTH_FIRST = 78;
export const METER_SUMMARY = 104;
export const METER_REFLECT = 105;
export const METER_TOP = 106;

export function strengthForScreen(n: number): MeterStrength | null {
  const idx = n - METER_STRENGTH_FIRST;
  if (idx < 0 || idx >= METER_STRENGTHS.length) return null;
  return METER_STRENGTHS[idx];
}

export function fieldKeyFor(strengthId: string, idx: 0 | 1): string {
  const s = METER_STRENGTHS.find((x) => x.id === strengthId);
  const dbId = s?.meterFieldId ?? strengthId;
  return `meter2_${dbId}_s${idx + 1}`;
}
