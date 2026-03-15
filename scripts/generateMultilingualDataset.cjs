const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.resolve('src/data/multilingualDataset.json');

const ENGLISH_DESTINATIONS = ['Tokyo', 'Auckland', 'Madrid', 'Dubai'];
const TIMES = ['tomorrow', 'this evening', 'next Friday', 'in the morning', 'two weeks from now'];
const ITEMS = ['pizza', 'sushi', 'coffee', 'books'];
const LOCATIONS = ['home', 'office', 'airport', 'downtown'];

function pushEnglish(dataset) {
  ENGLISH_DESTINATIONS.forEach((dest) => {
    TIMES.forEach((time) => {
      dataset.push({
        language: 'English',
        text: `Book a flight to ${dest} ${time}`,
        normalized_text: `Book a flight to ${dest} ${time}.`,
        intent: 'book_flight',
        entities: { destination: dest, date: time },
        source_style: 'standard',
      });
    });
  });

  ITEMS.forEach((item) => {
    LOCATIONS.forEach((place) => {
      dataset.push({
        language: 'English',
        text: `Order ${item} to ${place} pls`,
        normalized_text: `Order ${item} to ${place} please.`,
        intent: 'order_food',
        entities: { item, location: place },
        source_style: 'slang',
      });
    });
  });

  dataset.push({
    language: 'English',
    text: 'hw u been? cum ova 2 my place tmrw',
    normalized_text: 'How have you been? Come over to my place tomorrow.',
    intent: 'social_greeting',
    entities: { date: 'tomorrow', location: 'my place' },
    source_style: 'text-style',
  });
  dataset.push({
    language: 'English',
    text: 'Need a taxi from here to the airport now',
    normalized_text: 'I need a taxi from here to the airport now.',
    intent: 'book_ride',
    entities: { pickup: 'here', destination: 'airport', time: 'now' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'English',
    text: 'gonna run 5k later, remind me',
    normalized_text: 'I am going to run five kilometers later; remind me.',
    intent: 'set_reminder',
    entities: { distance: '5k', time: 'later' },
    source_style: 'text-style',
  });
}

function pushJapanese(dataset) {
  const japaneseTimes = ['明日', '今晩', '週末'];
  japaneseTimes.forEach((time) => {
    dataset.push({
      language: 'Japanese',
      text: `${time}東京へのフライトを予約したい`,
      normalized_text: `I want to book a flight to Tokyo ${time}.`,
      intent: 'book_flight',
      entities: { destination: 'Tokyo', date: time.replace('明日', 'tomorrow').replace('今晩', 'tonight').replace('週末', 'this weekend') },
      source_style: 'standard',
    });
  });

  dataset.push({
    language: 'Japanese',
    text: '天気どう？',
    normalized_text: 'How is the weather?',
    intent: 'check_weather',
    entities: {},
    source_style: 'text-style',
  });
  dataset.push({
    language: 'Japanese',
    text: '今晩、ピザとビールを頼みたい',
    normalized_text: 'I want to order pizza and beer tonight.',
    intent: 'order_food',
    entities: { item: 'pizza and beer', time: 'tonight' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Japanese',
    text: '明日朝6時に起こして',
    normalized_text: 'Wake me up at six a.m. tomorrow.',
    intent: 'set_alarm',
    entities: { time: '6am', date: 'tomorrow' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Japanese',
    text: '宇宙について教えて',
    normalized_text: 'Tell me about space.',
    intent: 'ask_definition',
    entities: { topic: 'space' },
    source_style: 'standard',
  });
}

function pushMaori(dataset) {
  dataset.push({
    language: 'Māori',
    text: 'Kei te pēhea koe?',
    normalized_text: 'How are you?',
    intent: 'social_greeting',
    entities: {},
    source_style: 'standard',
  });
  dataset.push({
    language: 'Māori',
    text: 'Homai he mōkī pīza ki taku whare',
    normalized_text: 'Deliver a pizza to my home.',
    intent: 'order_food',
    entities: { item: 'pizza', location: 'my home' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Māori',
    text: 'Me whakarite he rererangi ki Tokyo āpōpō',
    normalized_text: 'Book a flight to Tokyo tomorrow.',
    intent: 'book_flight',
    entities: { destination: 'Tokyo', date: 'tomorrow' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Māori',
    text: 'Anei te āhuarangi mō Tāmaki Makaurau',
    normalized_text: 'Here is the weather for Auckland.',
    intent: 'check_weather',
    entities: { location: 'Auckland' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Māori',
    text: 'Tukua mai he whakamārama mō te hangarau',
    normalized_text: 'Give me an explanation about technology.',
    intent: 'ask_definition',
    entities: { topic: 'technology' },
    source_style: 'standard',
  });
}

function pushArabic(dataset) {
  const arabicColors = ['غدًا', 'اليوم', 'مساءً'];
  arabicColors.forEach((time) => {
    dataset.push({
      language: 'Arabic',
      text: `أريد حجز رحلة إلى طوكيو ${time}`,
      normalized_text: `I want to book a flight to Tokyo ${time}.`,
      intent: 'book_flight',
      entities: { destination: 'Tokyo', date: time },
      source_style: 'standard',
    });
  });
  dataset.push({
    language: 'Arabic',
    text: 'كيف الطقس في عمان؟',
    normalized_text: 'How is the weather in Amman?',
    intent: 'check_weather',
    entities: { location: 'Amman' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Arabic',
    text: 'اطلبلي بيتزا مع جبنة زيادة',
    normalized_text: 'Order me pizza with extra cheese.',
    intent: 'order_food',
    entities: { item: 'pizza', modifier: 'extra cheese' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Arabic',
    text: 'اسمح لي بتذكير للاتصال بأمي',
    normalized_text: 'Remind me to call my mother.',
    intent: 'set_reminder',
    entities: { person: 'mother' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Arabic',
    text: 'شو رأيك؟',
    normalized_text: 'What do you think?',
    intent: 'ask_opinion',
    entities: {},
    source_style: 'text-style',
  });
}

function pushSpanish(dataset) {
  const spanishItems = ['paella', 'tacos', 'café'];
  spanishItems.forEach((item) => {
    dataset.push({
      language: 'Spanish',
      text: `Quiero ordenar ${item} para cenar`,
      normalized_text: `I want to order ${item} for dinner.`,
      intent: 'order_food',
      entities: { item },
      source_style: 'standard',
    });
  });
  dataset.push({
    language: 'Spanish',
    text: '¿Puedes recordarme llamar a mamá a las seis?',
    normalized_text: 'Can you remind me to call mom at six?',
    intent: 'set_reminder',
    entities: { person: 'mom', time: 'six' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Spanish',
    text: '¿Dónde está la mejor paella?',
    normalized_text: 'Where is the best paella?',
    intent: 'ask_recommendation',
    entities: { item: 'paella' },
    source_style: 'standard',
  });
  dataset.push({
    language: 'Spanish',
    text: '¿Cómo está el clima en Sevilla?',
    normalized_text: 'How is the weather in Seville?',
    intent: 'check_weather',
    entities: { location: 'Seville' },
    source_style: 'standard',
  });
}

async function main() {
  const dataset = [];
  pushEnglish(dataset);
  pushJapanese(dataset);
  pushMaori(dataset);
  pushArabic(dataset);
  pushSpanish(dataset);

  await fs.promises.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(dataset, null, 2), 'utf-8');
  console.info(`Generated ${dataset.length} dataset entries at ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
